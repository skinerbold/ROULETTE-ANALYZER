'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  RouletteNumber, 
  RouletteMessage,
  RouletteInfo,
  WEBSOCKET_CONFIG,
  getRouletteColor,
  parseRouletteName,
  isAllowedProvider,
  isAllowedRoulette
} from '@/lib/roulette-websocket'
import { 
  initializeCache, 
  loadFromCache, 
  saveToCache 
} from '@/lib/roulette-cache'
import { 
  validateAndCorrectNumber, 
  logValidationError 
} from '@/lib/roulette-validation'

export interface UseRouletteWebSocketReturn {
  isConnected: boolean
  lastNumber: RouletteNumber | null
  recentNumbers: RouletteNumber[]
  error: string | null
  reconnectAttempts: number
  availableRoulettes: RouletteInfo[]
  selectedRoulette: string
  updateVersion: number // NOVO: força re-render
  connect: () => void
  disconnect: () => void
  sendMessage: (message: string) => void
  selectRoulette: (rouletteId: string) => void
  requestHistory: (rouletteId: string, limit?: number) => void // NOVO
  requestStatus: () => void // NOVO: diagnóstico
}

export function useRouletteWebSocket(): UseRouletteWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastNumber, setLastNumber] = useState<RouletteNumber | null>(null)
  const [recentNumbers, setRecentNumbers] = useState<RouletteNumber[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [availableRoulettes, setAvailableRoulettes] = useState<RouletteInfo[]>([])
  const [selectedRoulette, setSelectedRoulette] = useState<string>('')
  const [updateVersion, setUpdateVersion] = useState(0)
  
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const watchdogTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isIntentionalCloseRef = useRef(false)
  const discoveredRoulettesRef = useRef<Set<string>>(new Set())
  const rouletteHistoryRef = useRef<Map<string, RouletteNumber[]>>(new Map())
  const selectedRouletteRef = useRef<string>('') // REF para valor sempre atualizado
  const cacheInitializedRef = useRef(false) // Flag para inicialização única do cache
  const lastMessageTimeRef = useRef<number>(Date.now())

  // Inicializar cache na montagem do componente
  useEffect(() => {
    if (!cacheInitializedRef.current) {
      console.log('🗄️ Inicializando sistema de cache...')
      initializeCache()
      cacheInitializedRef.current = true
    }
  }, [])

  // Limpar timeouts
  const clearTimeouts = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current)
      watchdogTimeoutRef.current = null
    }
  }, [])

  // Iniciar heartbeat (manter conexão viva)
  const startHeartbeat = useCallback(() => {
    clearTimeouts()
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
      }
    }, WEBSOCKET_CONFIG.heartbeatInterval)
  }, [clearTimeouts])
  
  // Watchdog: verifica se mensagens estão chegando (60 segundos sem mensagens = reconectar)
  const startWatchdog = useCallback(() => {
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current)
    }
    
    const checkConnection = () => {
      const timeSinceLastMessage = Date.now() - lastMessageTimeRef.current
      const threshold = 60000 // 60 segundos
      
      if (timeSinceLastMessage > threshold && wsRef.current?.readyState === WebSocket.OPEN) {
        console.warn(`⚠️ WATCHDOG: ${Math.floor(timeSinceLastMessage/1000)}s sem mensagens - forçando reconexão`)
        // Forçar reconexão
        if (wsRef.current) {
          wsRef.current.close()
        }
      }
      
      // Verificar novamente em 30 segundos
      watchdogTimeoutRef.current = setTimeout(checkConnection, 30000)
    }
    
    watchdogTimeoutRef.current = setTimeout(checkConnection, 30000)
  }, [])

  // Processar mensagens recebidas
  const handleMessage = useCallback((data: string) => {
    try {
      // Tentar parsear como JSON
      const message: any = JSON.parse(data)
      
      // FORMATO 1: Railway - Lista de roletas disponíveis
      // 🔧 FIX: API pode enviar como array de strings simples OU array de objetos
      if (message.type === 'roulettes' && Array.isArray(message.data)) {
        console.log('📋 Recebida lista de roletas do Railway:', message.data.length)
        
        message.data.forEach((rouletteData: string | any) => {
          // 🔧 FIX: Lidar com strings simples ou objetos
          const rouletteName = typeof rouletteData === 'string' 
            ? rouletteData 
            : (rouletteData.name || rouletteData.id || String(rouletteData))
          
          if (!discoveredRoulettesRef.current.has(rouletteName)) {
            discoveredRoulettesRef.current.add(rouletteName)
            const newRouletteInfo = parseRouletteName(rouletteName)
            
            // 🎯 Filtrar apenas provedores E roletas específicas permitidas
            if (!isAllowedProvider(newRouletteInfo.provider)) {
              console.log(`   🚫 Roleta ignorada (provedor: ${newRouletteInfo.provider || 'N/A'}): ${rouletteName}`)
              return
            }
            
            // 🎯 SPECIAL: Tentar múltiplos provedores para "roleta brasileira" ambígua
            let isAllowed = isAllowedRoulette(rouletteName, newRouletteInfo.provider)
            
            if (!isAllowed && rouletteName.toLowerCase().includes('brasileira')) {
              // Tentar Playtech se não foi aceito no provedor detectado
              isAllowed = isAllowedRoulette(rouletteName, 'Playtech')
              if (isAllowed) {
                newRouletteInfo.provider = 'Playtech' // Corrigir provedor
              }
            }
            
            if (!isAllowed) {
              // 🔍 DEBUG TEMPORÁRIO: Mostrar Playtech especificamente
              if (newRouletteInfo.provider === 'Playtech') {
                console.log(`   🔍 PLAYTECH REJEITADA: "${rouletteName}" | Lower: "${rouletteName.toLowerCase()}"`)
              } else {
                console.log(`   🚫 Roleta não está na lista permitida: ${rouletteName} (${newRouletteInfo.provider})`)
              }
              return
            }
            
            setAvailableRoulettes(prev => {
              const exists = prev.some(r => r.id === rouletteName)
              if (!exists) {
                const updated = [...prev, newRouletteInfo].sort((a, b) => a.name.localeCompare(b.name))
                console.log(`   ✅ Roleta adicionada: ${rouletteName}`)
                return updated
              }
              return prev
            })
          }
        })
        return
      }
      
      // FORMATO 1.5: Railway - Histórico completo de uma roleta
      // Pode vir como {"type":"history","roulette":"...","numbers":[...]}
      // OU como {"type":"history","data":[...]} (sem identificar roleta - usar selecionada)
      if (message.type === 'history') {
        const numbers = message.numbers || message.data || []
        const rouletteId = message.roulette || selectedRouletteRef.current || ''
        
        if (!rouletteId) {
          console.warn('⚠️ Histórico recebido mas sem identificar roleta!')
          return
        }
        
        console.log(`📜 Histórico recebido para ${rouletteId}:`, numbers.length, 'números')
        console.log(`   Primeiros 10: [${numbers.slice(0, 10).join(', ')}]`)
        
        // Converter e validar cada número
        const now = Date.now()
        const history: RouletteNumber[] = []
        let validCount = 0
        let invalidCount = 0
        
        numbers.forEach((num: number, index: number) => {
          const estimatedTimestamp = now - (index * 60000) // Estimativa de 1 min entre spins
          
          const validationResult = validateAndCorrectNumber(
            num,
            null, // Histórico geralmente não tem cor
            estimatedTimestamp,
            history // Passar histórico já processado para detectar duplicatas
          )
          
          if (!validationResult.valid) {
            invalidCount++
            logValidationError(
              rouletteId,
              num,
              'N/A',
              estimatedTimestamp,
              validationResult.errors
            )
          } else {
            validCount++
          }
          
          history.push(validationResult.corrected)
        })
        
        console.log(`   ✅ Validação: ${validCount} válidos, ${invalidCount} inválidos`)
        
        // Salvar histórico
        rouletteHistoryRef.current.set(rouletteId, history)
        
        // Salvar no cache
        saveToCache(rouletteId, history)
        
        // Se for a roleta selecionada, atualizar tela IMEDIATAMENTE
        if (rouletteId === selectedRouletteRef.current) {
          console.log(`   ⚡⚡⚡ ATUALIZANDO TELA com histórico completo!`)
          setRecentNumbers([...history])
          if (history.length > 0) {
            setLastNumber({...history[0]})
          }
          setUpdateVersion(v => v + 1)
        }
        
        return
      }
      
      // FORMATO 2: Railway - Resultado individual
      if (message.type === 'result' && message.roulette && typeof message.number === 'number') {
        const rouletteId = message.roulette
        const number = message.number
        const isSelected = rouletteId === selectedRouletteRef.current
        
        const rouletteInfo = parseRouletteName(rouletteId)
        
        // 🎯 Filtrar apenas provedores E roletas específicas permitidas
        if (!isAllowedProvider(rouletteInfo.provider)) {
          return // Ignorar silenciosamente
        }
        
        if (!isAllowedRoulette(rouletteId, rouletteInfo.provider)) {
          return // Ignorar roletas não permitidas
        }
        
        console.log(`\n🎲 [RAILWAY] Resultado recebido:`)
        console.log(`   🎰 Roleta: ${rouletteId}`)
        console.log(`   🔢 Número: ${number}`)
        console.log(`   ✅ Selecionada?: ${isSelected}`)
        console.log(`   📝 Roleta selecionada atual: "${selectedRouletteRef.current}"`)
        
        // Adicionar roleta à lista se não existir
        if (!discoveredRoulettesRef.current.has(rouletteId)) {
          discoveredRoulettesRef.current.add(rouletteId)
          
          // 🎯 Filtrar apenas roletas permitidas antes de adicionar à lista
          if (isAllowedRoulette(rouletteId, rouletteInfo.provider)) {
            setAvailableRoulettes(prev => {
              const exists = prev.some(r => r.id === rouletteId)
              if (!exists) {
                console.log(`   🆕 Nova roleta adicionada: ${rouletteId}`)
                return [...prev, rouletteInfo].sort((a, b) => a.name.localeCompare(b.name))
              }
              return prev
            })
          } else {
            console.log(`   🚫 Roleta não permitida: ${rouletteId}`)
          }
        }
        
        // Pegar histórico atual
        const currentHistory = rouletteHistoryRef.current.get(rouletteId) || []
        
        // Validar e corrigir número
        const validationResult = validateAndCorrectNumber(
          number,
          message.color,
          message.timestamp,
          currentHistory
        )
        
        // Log de erro se inválido
        if (!validationResult.valid) {
          logValidationError(
            rouletteId,
            number,
            message.color || 'N/A',
            message.timestamp || Date.now(),
            validationResult.errors
          )
          // Continuar mesmo com erro (número foi corrigido)
        }
        
        const newEntry = validationResult.corrected
        
        const updatedHistory = [newEntry, ...currentHistory].slice(0, WEBSOCKET_CONFIG.maxHistorySize)
        rouletteHistoryRef.current.set(rouletteId, updatedHistory)
        
        console.log(`   📊 Histórico atualizado: ${updatedHistory.length} números`)
        
        // Salvar no cache
        saveToCache(rouletteId, updatedHistory)
        
        // Se estiver selecionada, atualizar estado
        if (isSelected) {
          console.log(`   ⚡⚡⚡ ATUALIZANDO TELA!`)
          console.log(`   📋 Primeiros 10 números: [${updatedHistory.slice(0, 10).map(n => n.number).join(', ')}]`)
          setRecentNumbers([...updatedHistory])
          setLastNumber({...newEntry})
          setUpdateVersion(v => v + 1)
        } else {
          console.log(`   🚫 Não atualizar tela (roleta não selecionada)`)
        }
        
        return
      }
      
      // FORMATO 3: API Local - Histórico completo (game, game_type, results)
      if (message.game && message.game_type === 'roleta' && Array.isArray(message.results)) {
        const rouletteId = message.game
        
        // 🔥 FILTRO CRÍTICO: Ignorar mensagens de roletas NÃO selecionadas
        // Isso evita que mensagens de outras roletas "contaminem" a tela
        const isSelected = rouletteId === selectedRouletteRef.current
        
        if (!isSelected && selectedRouletteRef.current !== '') {
          // Já temos uma roleta selecionada E esta mensagem é de outra roleta
          console.log(`🚫 [${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}] Mensagem IGNORADA de roleta não selecionada: ${rouletteId}`)
          console.log(`   Selecionada: ${selectedRouletteRef.current}`)
          console.log(`   Mensagem de: ${rouletteId}`)
          
          // Salvar no histórico interno para quando o usuário selecionar essa roleta
          // MAS NÃO ATUALIZAR O ESTADO REACT!
          const numbersFromAPI = message.results
            .map((r: any) => parseInt(r))
            .filter((n: number) => !isNaN(n) && n >= 0 && n <= 37)
            .slice(0, WEBSOCKET_CONFIG.maxHistorySize)
          
          if (numbersFromAPI.length > 0) {
            const now = Date.now()
            // 🔧 FIX: Sempre calcular cor localmente, pois API não envia
            const history: RouletteNumber[] = numbersFromAPI.map((num: number, index: number) => ({
              number: num,
              color: getRouletteColor(num), // Sempre calcular localmente
              timestamp: now - (index * 60000)
            }))
            rouletteHistoryRef.current.set(rouletteId, history)
          }
          
          // IMPORTANTE: Adicionar à lista de roletas disponíveis (se for nova)
          if (!discoveredRoulettesRef.current.has(rouletteId)) {
            discoveredRoulettesRef.current.add(rouletteId)
            const newRouletteInfo = parseRouletteName(rouletteId)
            
            // 🎯 Filtrar apenas provedores E roletas específicas permitidas
            if (!isAllowedProvider(newRouletteInfo.provider)) {
              console.log(`   🚫 Roleta ignorada (provedor: ${newRouletteInfo.provider || 'N/A'}): ${rouletteId}`)
              return
            }
            
            if (!isAllowedRoulette(rouletteId, newRouletteInfo.provider)) {
              console.log(`   🚫 Roleta não está na lista permitida: ${rouletteId}`)
              return
            }
            
            setAvailableRoulettes(prev => {
              const exists = prev.some(r => r.id === rouletteId)
              if (!exists) {
                const updated = [...prev, newRouletteInfo].sort((a, b) => a.name.localeCompare(b.name))
                console.log(`   📋 Adicionada à lista (total: ${updated.length})`)
                return updated
              }
              return prev
            })
          }
          
          return // PARAR AQUI - não processar mais nada
        }
        
        // LOG: Mostrar TODAS as mensagens com timestamp preciso
        const timestamp = new Date().toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit', 
          fractionalSecondDigits: 3 
        })
        
        if (isSelected) {
          console.log(`\n🔥🔥� [${timestamp}] MENSAGEM DA ROLETA SELECIONADA: ${rouletteId}`)
          console.log(`   📦 Dados COMPLETOS da API:`, JSON.stringify(message, null, 2))
          console.log(`   🎲 Primeiros 15 números: [${message.results.slice(0, 15).join(', ')}]`)
          console.log(`   📊 Total de números: ${message.results.length}`)
          console.log(`   🔑 Message keys:`, Object.keys(message))
        } else {
          // Log de mensagens de outras roletas (resumido)
          console.log(`📭 [${timestamp}] Mensagem de outra roleta: ${rouletteId} (${message.results.length} números)`)
        }
        
        // Adicionar roleta descoberta à lista
        if (!discoveredRoulettesRef.current.has(rouletteId)) {
          discoveredRoulettesRef.current.add(rouletteId)
          
          // Atualizar lista de roletas
          const newRouletteInfo = parseRouletteName(rouletteId)
          
          // 🎯 Filtrar apenas provedores E roletas específicas permitidas
          if (!isAllowedProvider(newRouletteInfo.provider)) {
            console.log(`   🚫 Roleta ignorada (provedor: ${newRouletteInfo.provider || 'N/A'}): ${rouletteId}`)
            return
          }
          
          if (!isAllowedRoulette(rouletteId, newRouletteInfo.provider)) {
            console.log(`   🚫 Roleta não está na lista permitida: ${rouletteId}`)
            return
          }
          
          setAvailableRoulettes(prev => {
            const exists = prev.some(r => r.id === rouletteId)
            if (!exists) {
              const updated = [...prev, newRouletteInfo].sort((a, b) => 
                a.name.localeCompare(b.name)
              )
              console.log(`\n🎰 🎰 🎰 NOVA ROLETA DESCOBERTA!`)
              console.log(`   🆔 ID: ${rouletteId}`)
              console.log(`   📛 Nome: ${newRouletteInfo.name}`)
              console.log(`   🏢 Provedor: ${newRouletteInfo.provider || 'N/A'}`)
              console.log(`   📊 Total de roletas disponíveis: ${updated.length}`)
              console.log(`   📋 Lista completa:`, updated.map(r => r.id))
              return updated
            }
            return prev
          })
        }
        
        // Converter results (strings) para números
        const numbersFromAPI = message.results
          .map((r: any) => {
            const parsed = parseInt(r)
            if (isNaN(parsed)) {
              console.warn(`⚠️ Número inválido recebido: "${r}" em ${rouletteId}`)
            }
            return parsed
          })
          .filter((n: number) => !isNaN(n) && n >= 0 && n <= 37) // 0-36 + 37 (00)
          .slice(0, WEBSOCKET_CONFIG.maxHistorySize)
        
        if (numbersFromAPI.length === 0) {
          console.warn(`⚠️ Nenhum número válido recebido de ${rouletteId}`)
          return
        }
        
        // Obter histórico atual desta roleta
        const currentHistory = rouletteHistoryRef.current.get(rouletteId) || []
        
        // Se não há histórico, inicializar com TODOS os números da API
        if (currentHistory.length === 0) {
          const now = Date.now()
          const history: RouletteNumber[] = []
          let validCount = 0
          let invalidCount = 0
          
          numbersFromAPI.forEach((num: number, index: number) => {
            const estimatedTimestamp = now - (index * 60000)
            
            const validationResult = validateAndCorrectNumber(
              num,
              null,
              estimatedTimestamp,
              history
            )
            
            if (!validationResult.valid) {
              invalidCount++
              logValidationError(
                rouletteId,
                num,
                'N/A',
                estimatedTimestamp,
                validationResult.errors
              )
            } else {
              validCount++
            }
            
            history.push(validationResult.corrected)
          })
          
          console.log(`   ✅ Validação: ${validCount} válidos, ${invalidCount} inválidos`)
          
          rouletteHistoryRef.current.set(rouletteId, history)
          
          // Salvar no cache
          saveToCache(rouletteId, history)
          
          // Se esta roleta estiver selecionada, atualizar estado
          if (rouletteId === selectedRoulette) {
            // FORÇA atualização com spread operator
            setRecentNumbers([...history])
            if (history.length > 0) {
              setLastNumber({...history[0]})
            }
            setUpdateVersion(v => v + 1) // Incrementar versão
            console.log(`📜 [SELECIONADA] Inicializado ${rouletteId}: ${history.length} números - [${history.slice(0, 5).map(n => n.number).join(', ')}...]`)
          }
          return
        }
        
        // SINCRONIZAÇÃO COMPLETA: Comparar arrays inteiros
        // A API sempre envia o histórico completo atualizado
        const currentNumbers = currentHistory.map(h => h.number)
        const areEqual = currentNumbers.length === numbersFromAPI.length && 
                        currentNumbers.every((n, i) => n === numbersFromAPI[i])
        
        // LOG para debug: mostrar resultado da comparação
        if (isSelected) {
          console.log(`   🔍 Comparação de arrays:`)
          console.log(`      Atual: [${currentNumbers.slice(0, 10).join(', ')}...] (${currentNumbers.length})`)
          console.log(`      Nova:  [${numbersFromAPI.slice(0, 10).join(', ')}...] (${numbersFromAPI.length})`)
          console.log(`      Arrays iguais? ${areEqual}`)
        }
        
        if (!areEqual) {
          // Houve mudança! Reconstruir histórico completo
          const now = Date.now()
          const isNewSpin = currentNumbers[0] !== numbersFromAPI[0]
          
          console.log(`\n🔍 [DEBUG] Detectada mudança em ${rouletteId}:`)
          console.log(`   Atual (${currentNumbers.length}): [${currentNumbers.slice(0, 10).join(', ')}]`)
          console.log(`   Nova  (${numbersFromAPI.length}): [${numbersFromAPI.slice(0, 10).join(', ')}]`)
          console.log(`   É novo spin? ${isNewSpin}`)
          console.log(`   Está selecionada? ${rouletteId === selectedRouletteRef.current}`) // USAR REF!
          
          const updatedHistory: RouletteNumber[] = numbersFromAPI.map((num: number, index: number) => {
            // Para o primeiro número (se for novo spin), usar timestamp atual
            if (index === 0 && isNewSpin) {
              return {
                number: num,
                color: getRouletteColor(num), // 🔧 FIX: Sempre calcular localmente
                timestamp: now
              }
            }
            
            // Para os outros, manter timestamp existente se estiver na mesma posição
            const existingAtSamePosition = currentHistory[index]
            if (existingAtSamePosition && existingAtSamePosition.number === num) {
              // Mesmo número na mesma posição = manter timestamp
              return {
                number: num,
                color: getRouletteColor(num), // 🔧 FIX: Sempre calcular localmente
                timestamp: existingAtSamePosition.timestamp
              }
            }
            
            // Número diferente ou posição nova = timestamp estimado
            return {
              number: num,
              color: getRouletteColor(num), // 🔧 FIX: Sempre calcular localmente
              timestamp: now - (index * 60000) // Aproximação
            }
          })
          
          // Salvar no histórico
          rouletteHistoryRef.current.set(rouletteId, updatedHistory)
          
          // Se esta roleta estiver selecionada, atualizar estado SEMPRE
          if (rouletteId === selectedRouletteRef.current) { // USAR REF!
            const timestampUpdate = new Date().toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit', 
              fractionalSecondDigits: 3 
            })
            
            console.log(`\n⚡⚡⚡ [${timestampUpdate}] ATUALIZANDO ESTADO REACT`)
            console.log(`   🎰 Roleta: ${rouletteId}`)
            console.log(`   📊 ANTES - números na tela: [${recentNumbers.slice(0, 10).map(n => n.number).join(', ')}...]`)
            console.log(`   📊 DEPOIS - novos números: [${updatedHistory.slice(0, 10).map(n => n.number).join(', ')}...]`)
            console.log(`   🔢 Quantidade: ${recentNumbers.length} → ${updatedHistory.length}`)
            console.log(`   🆕 É novo spin? ${isNewSpin}`)
            
            // FORÇA atualização criando novo array com spread
            setRecentNumbers([...updatedHistory])
            
            if (updatedHistory.length > 0) {
              setLastNumber({...updatedHistory[0]}) // Clone do objeto para forçar update
            }
            
            setUpdateVersion(v => v + 1)
            
            console.log(`   ✅ setRecentNumbers e setUpdateVersion chamados\n`)
          }
        }
        
        return
      }
      
      // FORMATO: Status do servidor (diagnóstico)
      if (message.type === 'status') {
        console.log('📊 STATUS DO SERVIDOR:')
        console.log(`   🔌 API Connection: ${message.apiConnection}`)
        console.log(`   📨 Last API Message: ${message.lastApiMessage || 'NENHUMA'}`)
        console.log(`   📊 API Message Count: ${message.apiMessageCount}`)
        console.log(`   🎰 Roulettes: ${message.roulettesCount}`)
        console.log(`   👥 Clients: ${message.clientsConnected}`)
        console.log(`   ⏱️ Uptime: ${Math.round(message.uptime)}s`)
        return
      }
      
      // Mensagens conhecidas que podem ser ignoradas silenciosamente
      if (message.type === 'connected' || message.type === 'pong') {
        // Ignorar silenciosamente
        return
      }
      
      // Se não for formato da API real, mostrar detalhes da mensagem
      console.log('⚠️ MENSAGEM IGNORADA (formato desconhecido)')
      console.log('   📦 Tipo:', typeof message)
      console.log('   🔑 Keys:', Object.keys(message))
      console.log('   📄 Conteúdo:', JSON.stringify(message).substring(0, 200))
    } catch (err) {
      // Ignorar mensagens que não são JSON válido
      console.log('ℹ️ Mensagem não-JSON ignorada:', typeof data === 'string' ? data.substring(0, 100) : data)
    }
  }, []) // REMOVIDO selectedRoulette - agora usa REF!

  // Tentar reconectar - SEM dependências para evitar stale closures
  const attemptReconnect = useCallback(() => {
    if (isIntentionalCloseRef.current) {
      console.log('⏹️ Reconexão cancelada (fechamento intencional)')
      return
    }

    // Verificar tentativas usando ref atualizado via setReconnectAttempts
    setReconnectAttempts(prev => {
      if (prev >= WEBSOCKET_CONFIG.maxReconnectAttempts) {
        setError(`Falha ao conectar após ${WEBSOCKET_CONFIG.maxReconnectAttempts} tentativas`)
        console.error('❌ Máximo de tentativas de reconexão atingido')
        return prev
      }

      console.log(`🔄 Tentando reconectar... (Tentativa ${prev + 1}/${WEBSOCKET_CONFIG.maxReconnectAttempts})`)
      
      // Limpar timeout anterior se existir
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('⚡ Executando reconexão...')
        // Forçar fechamento de conexão anterior se existir
        if (wsRef.current) {
          try {
            wsRef.current.close()
          } catch (e) {
            console.warn('Erro ao fechar WS anterior:', e)
          }
          wsRef.current = null
        }
        connectInternal()
      }, WEBSOCKET_CONFIG.reconnectInterval)
      
      return prev + 1
    })
  }, [])

  // Conectar ao WebSocket (função interna - não exportada)
  const connectInternal = useCallback(() => {
    // Evitar múltiplas conexões
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('⚠️ Já existe uma conexão ativa')
      return
    }

    try {
      console.log('🔌 Conectando ao WebSocket:', WEBSOCKET_CONFIG.url)
      
      const ws = new WebSocket(WEBSOCKET_CONFIG.url)
      wsRef.current = ws

      ws.addEventListener('open', () => {
        console.log('✅ ✅ ✅ CONECTADO AO SERVIDOR WebSocket!')
        console.log('   🌐 URL:', WEBSOCKET_CONFIG.url)
        console.log('   🔗 ReadyState:', ws.readyState)
        console.log('   ⏰ Timestamp:', new Date().toISOString())
        
        setIsConnected(true)
        setError(null)
        setReconnectAttempts(0)
        isIntentionalCloseRef.current = false
        lastMessageTimeRef.current = Date.now()
        
        // Iniciar heartbeat e watchdog
        startHeartbeat()
        startWatchdog()
        
        // Solicitar lista de roletas e histórico completo
        console.log('📤 Solicitando lista de roletas e histórico completo...')
        ws.send(JSON.stringify({ type: 'get_roulettes' }))
        ws.send(JSON.stringify({ type: 'get_all_history' }))
      })

      ws.addEventListener('message', (event) => {
        console.log('\n📨 📨 📨 MENSAGEM RECEBIDA DO WEBSOCKET:')
        console.log('   📏 Tamanho:', event.data.length, 'caracteres')
        console.log('   📄 Preview:', typeof event.data === 'string' ? event.data.substring(0, 200) : event.data)
        
        // Atualizar timestamp da última mensagem
        lastMessageTimeRef.current = Date.now()
        
        handleMessage(event.data)
      })

      ws.addEventListener('error', (event) => {
        console.error('❌ ❌ ❌ ERRO DE WEBSOCKET:')
        console.error('   🔴 Event:', event)
        console.error('   🔗 URL tentada:', WEBSOCKET_CONFIG.url)
        console.error('   🔗 ReadyState:', ws.readyState)
        setError('Erro na conexão WebSocket')
      })

      ws.addEventListener('close', (event) => {
        console.log(`🔌 Conexão fechada. Código: ${event.code}, Motivo: ${event.reason}`)
        console.log(`   🔍 Intencional?: ${isIntentionalCloseRef.current}`)
        setIsConnected(false)
        clearTimeouts()
        
        // Definir mensagem de erro apropriada
        if (!isIntentionalCloseRef.current) {
          setError('🔌 Conexão perdida. Tentando reconectar...')
          console.log('🔄 Iniciando processo de reconexão automática...')
          attemptReconnect()
        } else {
          console.log('⏹️ Conexão fechada intencionalmente, não reconectar')
        }
      })

    } catch (err) {
      console.error('❌ Erro ao criar WebSocket:', err)
      setError('Não foi possível conectar ao servidor')
      attemptReconnect()
    }
  }, [startHeartbeat, startWatchdog, handleMessage, attemptReconnect, clearTimeouts])
  
  // Função pública connect - reseta tentativas e conecta
  const connect = useCallback(() => {
    console.log('🎯 Connect() chamado - resetando contador de tentativas')
    setReconnectAttempts(0)
    isIntentionalCloseRef.current = false
    connectInternal()
  }, [connectInternal])

  // Desconectar do WebSocket
  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando do WebSocket...')
    isIntentionalCloseRef.current = true
    clearTimeouts()
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Desconexão intencional')
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [clearTimeouts])

  // Enviar mensagem
  const sendMessage = useCallback((message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message)
      console.log('📤 Mensagem enviada:', message)
    } else {
      console.warn('⚠️ WebSocket não está conectado')
    }
  }, [])

  // Função para selecionar roleta
  const selectRoulette = useCallback((rouletteId: string) => {
    console.log(`🎯 Selecionando roleta: ${rouletteId}`)
    setSelectedRoulette(rouletteId)
    selectedRouletteRef.current = rouletteId // Atualizar ref IMEDIATAMENTE
    
    // Tentar carregar do cache primeiro
    const cachedHistory = loadFromCache(rouletteId)
    
    // Carregar histórico desta roleta (cache ou memória)
    let history = rouletteHistoryRef.current.get(rouletteId) || []
    
    // Se cache tem mais números que memória, usar cache
    if (cachedHistory && cachedHistory.length > history.length) {
      console.log(`   💾 Cache carregado: ${cachedHistory.length} números (memória tinha ${history.length})`)
      history = cachedHistory
      rouletteHistoryRef.current.set(rouletteId, history)
    } else if (cachedHistory) {
      console.log(`   ℹ️ Cache ignorado: memória tem ${history.length}, cache tem ${cachedHistory.length}`)
    }
    
    // FORÇA atualização criando novo array
    setRecentNumbers([...history])
    
    if (history.length > 0) {
      setLastNumber({...history[0]})
      console.log(`   ✅ ${history.length} números carregados: [${history.slice(0, 5).map(n => n.number).join(', ')}...]`)
    } else {
      setLastNumber(null)
      console.log(`   ⏳ Aguardando dados... Enviando solicitação de histórico`)
      
      // Solicitar histórico se não temos dados
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'subscribe', roulette: rouletteId, limit: 500 }))
        wsRef.current.send(JSON.stringify({ type: 'get_history', roulette: rouletteId, limit: 500 }))
        wsRef.current.send(JSON.stringify({ type: 'history', roulette: rouletteId }))
        console.log(`   📤 Solicitações de histórico enviadas (3 formatos)`)
      }
    }
    
    setUpdateVersion(v => v + 1) // Incrementar versão para forçar re-render
  }, [])

  // Função para solicitar mais histórico (NOVA - para uso externo)
  const requestHistory = useCallback((rouletteId: string, limit: number = 500) => {
    if (!rouletteId) {
      console.warn('⚠️ requestHistory: rouletteId não fornecido')
      return
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`📤 [REQUEST HISTORY] Solicitando mais histórico para ${rouletteId} (limite: ${limit})`)
      // Tentar múltiplos formatos de solicitação
      wsRef.current.send(JSON.stringify({ type: 'subscribe', roulette: rouletteId, limit }))
      wsRef.current.send(JSON.stringify({ type: 'get_history', roulette: rouletteId, limit }))
      wsRef.current.send(JSON.stringify({ type: 'history', roulette: rouletteId }))
      console.log(`   ✅ 3 solicitações enviadas com limite ${limit}`)
    } else {
      console.warn('⚠️ requestHistory: WebSocket não está conectado')
    }
  }, [])

  // Solicitar status do servidor (para diagnóstico)
  const requestStatus = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'status' }))
      console.log('📤 Solicitando status do servidor...')
    } else {
      console.warn('⚠️ WebSocket não está conectado para solicitar status')
    }
  }, [])

  // Conectar automaticamente ao montar
  useEffect(() => {
    console.log('🚀 useEffect montagem - iniciando conexão automática')
    connect()

    // Cleanup ao desmontar
    return () => {
      console.log('🔌 useEffect desmontagem - desconectando')
      disconnect()
    }
  }, [connect, disconnect]) // Incluir dependências

  // Sincronizar ref com state sempre que selectedRoulette mudar
  useEffect(() => {
    selectedRouletteRef.current = selectedRoulette
    console.log(`🔄 [REF SYNC] selectedRouletteRef atualizada para: "${selectedRoulette}"`)
  }, [selectedRoulette])

  return {
    isConnected,
    lastNumber,
    recentNumbers,
    error,
    reconnectAttempts,
    availableRoulettes,
    selectedRoulette,
    updateVersion, // NOVO: versão para forçar re-render
    connect,
    disconnect,
    sendMessage,
    selectRoulette,
    requestHistory, // NOVO
    requestStatus // NOVO: diagnóstico
  }
}
