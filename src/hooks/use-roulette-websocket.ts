'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  RouletteNumber, 
  RouletteMessage,
  RouletteInfo,
  WEBSOCKET_CONFIG,
  getRouletteColor,
  parseRouletteName
} from '@/lib/roulette-websocket'

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
  const isIntentionalCloseRef = useRef(false)
  const discoveredRoulettesRef = useRef<Set<string>>(new Set())
  const rouletteHistoryRef = useRef<Map<string, RouletteNumber[]>>(new Map())
  const selectedRouletteRef = useRef<string>('') // REF para valor sempre atualizado

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

  // Processar mensagens recebidas
  const handleMessage = useCallback((data: string) => {
    try {
      // Tentar parsear como JSON
      const message: any = JSON.parse(data)
      
      // FORMATO 1: Railway - Lista de roletas disponíveis
      if (message.type === 'roulettes' && Array.isArray(message.data)) {
        console.log('📋 Recebida lista de roletas do Railway:', message.data.length)
        message.data.forEach((rouletteName: string) => {
          if (!discoveredRoulettesRef.current.has(rouletteName)) {
            discoveredRoulettesRef.current.add(rouletteName)
            const newRouletteInfo = parseRouletteName(rouletteName)
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
        
        // Converter para RouletteNumber[]
        const now = Date.now()
        const history: RouletteNumber[] = numbers.map((num: number, index: number) => ({
          number: num,
          color: getRouletteColor(num),
          timestamp: now - (index * 60000) // Estimativa de 1 min entre spins
        }))
        
        // Salvar histórico
        rouletteHistoryRef.current.set(rouletteId, history)
        
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
        
        console.log(`\n🎲 [RAILWAY] Resultado recebido:`)
        console.log(`   🎰 Roleta: ${rouletteId}`)
        console.log(`   🔢 Número: ${number}`)
        console.log(`   ✅ Selecionada?: ${isSelected}`)
        console.log(`   📝 Roleta selecionada atual: "${selectedRouletteRef.current}"`)
        
        // Adicionar roleta à lista se não existir
        if (!discoveredRoulettesRef.current.has(rouletteId)) {
          discoveredRoulettesRef.current.add(rouletteId)
          const newRouletteInfo = parseRouletteName(rouletteId)
          setAvailableRoulettes(prev => {
            const exists = prev.some(r => r.id === rouletteId)
            if (!exists) {
              console.log(`   🆕 Nova roleta adicionada: ${rouletteId}`)
              return [...prev, newRouletteInfo].sort((a, b) => a.name.localeCompare(b.name))
            }
            return prev
          })
        }
        
        // Pegar histórico atual
        const currentHistory = rouletteHistoryRef.current.get(rouletteId) || []
        
        // Adicionar novo número no início
        const now = Date.now()
        const newEntry: RouletteNumber = {
          number,
          color: getRouletteColor(number),
          timestamp: now
        }
        
        const updatedHistory = [newEntry, ...currentHistory].slice(0, WEBSOCKET_CONFIG.maxHistorySize)
        rouletteHistoryRef.current.set(rouletteId, updatedHistory)
        
        console.log(`   📊 Histórico atualizado: ${updatedHistory.length} números`)
        
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
            const history: RouletteNumber[] = numbersFromAPI.map((num: number, index: number) => ({
              number: num,
              color: getRouletteColor(num),
              timestamp: now - (index * 60000)
            }))
            rouletteHistoryRef.current.set(rouletteId, history)
          }
          
          // IMPORTANTE: Adicionar à lista de roletas disponíveis (se for nova)
          if (!discoveredRoulettesRef.current.has(rouletteId)) {
            discoveredRoulettesRef.current.add(rouletteId)
            const newRouletteInfo = parseRouletteName(rouletteId)
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
          const history: RouletteNumber[] = numbersFromAPI.map((num: number, index: number) => ({
            number: num,
            color: getRouletteColor(num),
            timestamp: now - (index * 60000) // Aproximação de timestamps
          }))
          
          rouletteHistoryRef.current.set(rouletteId, history)
          
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
                color: getRouletteColor(num),
                timestamp: now
              }
            }
            
            // Para os outros, manter timestamp existente se estiver na mesma posição
            const existingAtSamePosition = currentHistory[index]
            if (existingAtSamePosition && existingAtSamePosition.number === num) {
              // Mesmo número na mesma posição = manter timestamp
              return {
                number: num,
                color: getRouletteColor(num),
                timestamp: existingAtSamePosition.timestamp
              }
            }
            
            // Número diferente ou posição nova = timestamp estimado
            return {
              number: num,
              color: getRouletteColor(num),
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

  // Tentar reconectar
  const attemptReconnect = useCallback(() => {
    if (isIntentionalCloseRef.current) {
      console.log('⏹️ Reconexão cancelada (fechamento intencional)')
      return
    }

    if (reconnectAttempts >= WEBSOCKET_CONFIG.maxReconnectAttempts) {
      setError(`Falha ao conectar após ${WEBSOCKET_CONFIG.maxReconnectAttempts} tentativas`)
      console.error('❌ Máximo de tentativas de reconexão atingido')
      return
    }

    console.log(`🔄 Tentando reconectar... (Tentativa ${reconnectAttempts + 1}/${WEBSOCKET_CONFIG.maxReconnectAttempts})`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1)
      connect()
    }, WEBSOCKET_CONFIG.reconnectInterval)
  }, [reconnectAttempts])

  // Conectar ao WebSocket
  const connect = useCallback(() => {
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
        
        // Iniciar heartbeat
        startHeartbeat()
        
        // Solicitar lista de roletas e histórico completo
        console.log('📤 Solicitando lista de roletas e histórico completo...')
        ws.send(JSON.stringify({ type: 'get_roulettes' }))
        ws.send(JSON.stringify({ type: 'get_all_history' }))
      })

      ws.addEventListener('message', (event) => {
        console.log('\n📨 📨 📨 MENSAGEM RECEBIDA DO WEBSOCKET:')
        console.log('   📏 Tamanho:', event.data.length, 'caracteres')
        console.log('   📄 Preview:', typeof event.data === 'string' ? event.data.substring(0, 200) : event.data)
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
        setIsConnected(false)
        clearTimeouts()
        
        // Definir mensagem de erro apropriada
        if (!isIntentionalCloseRef.current) {
          setError('🔌 Conexão perdida. Tentando reconectar...')
          attemptReconnect()
        }
      })

    } catch (err) {
      console.error('❌ Erro ao criar WebSocket:', err)
      setError('Não foi possível conectar ao servidor')
    }
  }, [startHeartbeat, handleMessage, attemptReconnect, clearTimeouts])

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
    
    // Carregar histórico desta roleta
    const history = rouletteHistoryRef.current.get(rouletteId) || []
    
    // FORÇA atualização criando novo array
    setRecentNumbers([...history])
    
    if (history.length > 0) {
      setLastNumber({...history[0]})
      console.log(`   ✅ ${history.length} números carregados: [${history.slice(0, 5).map(n => n.number).join(', ')}...]`)
    } else {
      setLastNumber(null)
      console.log(`   ⏳ Aguardando dados...`)
    }
    
    setUpdateVersion(v => v + 1) // Incrementar versão para forçar re-render
  }, [])

  // Conectar automaticamente ao montar
  useEffect(() => {
    connect()

    // Cleanup ao desmontar
    return () => {
      disconnect()
    }
  }, []) // Executar apenas uma vez

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
    selectRoulette
  }
}
