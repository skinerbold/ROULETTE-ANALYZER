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
      
      // Verificar se é o formato da API real (game, key, game_type, results)
      if (message.game && message.game_type === 'roleta' && Array.isArray(message.results)) {
        const rouletteId = message.game
        
        // LOG: Mostrar qual roleta está enviando dados
        const isSelected = rouletteId === selectedRouletteRef.current // USAR REF!
        if (isSelected) {
          console.log(`📨 [${new Date().toLocaleTimeString()}] Mensagem da roleta SELECIONADA: ${rouletteId}`)
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
              console.log(`✨ Nova roleta descoberta: ${rouletteId} (${newRouletteInfo.provider || 'sem provedor'})`)
              return updated
            }
            return prev
          })
        }
        
        // Converter results (strings) para números
        const numbersFromAPI = message.results
          .map((r: any) => parseInt(r))
          .filter((n: number) => !isNaN(n) && n >= 0 && n <= 36)
          .slice(0, WEBSOCKET_CONFIG.maxHistorySize)
        
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
            
            // Para os outros, manter timestamp existente se possível
            const existingEntry = currentHistory.find(h => h.number === num && currentHistory.indexOf(h) === index)
            return {
              number: num,
              color: getRouletteColor(num),
              timestamp: existingEntry?.timestamp || (now - (index * 60000))
            }
          })
          
          // Salvar no histórico
          rouletteHistoryRef.current.set(rouletteId, updatedHistory)
          
          // Se esta roleta estiver selecionada, atualizar estado SEMPRE
          if (rouletteId === selectedRouletteRef.current) { // USAR REF!
            console.log(`   🔄 Atualizando estado React...`)
            console.log(`   ANTES - recentNumbers.length: ${recentNumbers.length}`)
            
            // FORÇA atualização criando novo array com spread
            setRecentNumbers([...updatedHistory])
            
            if (updatedHistory.length > 0) {
              setLastNumber({...updatedHistory[0]}) // Clone do objeto para forçar update
            }
            
            console.log(`   DEPOIS - updatedHistory.length: ${updatedHistory.length}`)
            console.log(`   Incrementando updateVersion...`)
            setUpdateVersion(v => {
              console.log(`   updateVersion: ${v} → ${v + 1}`)
              return v + 1
            })
            
            if (isNewSpin) {
              console.log(`🎯 [SELECIONADA] NOVO SPIN em ${rouletteId}: ${currentNumbers[0]} → ${numbersFromAPI[0]}`)
            } else {
              console.log(`🔄 [SELECIONADA] Sincronizando ${rouletteId}: histórico atualizado (${numbersFromAPI.length} números)`)
            }
            console.log(`   ✅ Estado atualizado: [${updatedHistory.slice(0, 5).map(n => n.number).join(', ')}...]\n`)
          }
        }
        
        return
      }
      
      // Se não for formato da API real, ignorar
      console.log('ℹ️ Mensagem ignorada (formato desconhecido)')
    } catch (err) {
      // Ignorar mensagens que não são JSON válido
      console.log('ℹ️ Mensagem não-JSON ignorada')
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
        console.log('✅ Conectado ao servidor de roleta')
        setIsConnected(true)
        setError(null)
        setReconnectAttempts(0)
        isIntentionalCloseRef.current = false
        
        // Iniciar heartbeat
        startHeartbeat()
        
        // Opcional: solicitar histórico
        ws.send(JSON.stringify({ type: 'get_history' }))
      })

      ws.addEventListener('message', (event) => {
        handleMessage(event.data)
      })

      ws.addEventListener('error', (event) => {
        console.error('❌ Erro de WebSocket:', event)
        setError('⚠️ Não foi possível conectar. Verifique se o servidor está rodando em localhost:3000')
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
