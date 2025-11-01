'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  RouletteNumber, 
  RouletteMessage, 
  WEBSOCKET_CONFIG,
  getRouletteColor 
} from '@/lib/roulette-websocket'

export interface UseRouletteWebSocketReturn {
  isConnected: boolean
  lastNumber: RouletteNumber | null
  recentNumbers: RouletteNumber[]
  error: string | null
  reconnectAttempts: number
  availableRoulettes: string[]
  connect: () => void
  disconnect: () => void
  sendMessage: (message: string) => void
}

export function useRouletteWebSocket(): UseRouletteWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastNumber, setLastNumber] = useState<RouletteNumber | null>(null)
  const [recentNumbers, setRecentNumbers] = useState<RouletteNumber[]>([])
  const [error, setError] = useState<string | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [availableRoulettes, setAvailableRoulettes] = useState<string[]>([])
  
  const wsRef = useRef<WebSocket | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isIntentionalCloseRef = useRef(false)
  const updateBatchRef = useRef<RouletteNumber[]>([]) // NOVO: Batch de atualizações
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null) // NOVO: Timer para batch

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
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current)
      batchTimerRef.current = null
    }
  }, [])

  // NOVO: Processar batch de números acumulados
  const processBatch = useCallback(() => {
    if (updateBatchRef.current.length > 0) {
      const batch = [...updateBatchRef.current]
      updateBatchRef.current = []
      
      console.log(`📦 Processando batch de ${batch.length} números`)
      
      setRecentNumbers(prev => {
        const newNumbers = [...batch, ...prev].slice(0, WEBSOCKET_CONFIG.maxHistorySize)
        return newNumbers
      })
      
      // Atualizar último número
      if (batch.length > 0) {
        setLastNumber(batch[0])
      }
    }
  }, [])

  // NOVO: Adicionar número ao batch
  const addToBatch = useCallback((newNumber: RouletteNumber) => {
    updateBatchRef.current.push(newNumber)
    
    // Limpar timer anterior
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current)
    }
    
    // Processar batch após 50ms (ou imediatamente se batch estiver grande)
    if (updateBatchRef.current.length >= 10) {
      processBatch() // Processar imediatamente se batch >= 10
    } else {
      batchTimerRef.current = setTimeout(() => {
        processBatch()
      }, 50) // Aguardar 50ms
    }
  }, [processBatch])

  // Iniciar heartbeat (manter conexão viva)
  const startHeartbeat = useCallback(() => {
    clearTimeouts()
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }))
        console.log('💓 Heartbeat enviado')
      }
    }, WEBSOCKET_CONFIG.heartbeatInterval)
  }, [clearTimeouts])

  // Processar mensagens recebidas
  const handleMessage = useCallback((data: string) => {
    try {
      // Tentar parsear como JSON
      const message: RouletteMessage = JSON.parse(data)
      
      console.log('📨 Mensagem recebida:', message)
      
      switch (message.type) {
        case 'result':
        case 'spin':
          if (typeof message.number === 'number') {
            const newNumber: RouletteNumber = {
              number: message.number,
              color: getRouletteColor(message.number),
              timestamp: message.timestamp || Date.now()
            }
            
            console.log('🎰 Novo número:', newNumber)
            
            // OTIMIZAÇÃO: Adicionar ao batch ao invés de atualizar imediatamente
            addToBatch(newNumber)
          }
          break
          
        case 'history':
          if (Array.isArray(message.data)) {
            const history: RouletteNumber[] = message.data
              .slice(0, WEBSOCKET_CONFIG.maxHistorySize) // Limitar a 500 números
              .map((item: any) => ({
                number: typeof item === 'number' ? item : item.number,
                color: getRouletteColor(typeof item === 'number' ? item : item.number),
                timestamp: item.timestamp || Date.now()
              }))
            setRecentNumbers(history)
            console.log('📜 Histórico recebido:', history.length, 'números')
          }
          break
          
        case 'connected':
          console.log('✅ Confirmação de conexão recebida')
          // Solicitar lista de roletas disponíveis
          sendMessage(JSON.stringify({ type: 'get_roulettes' }))
          // Solicitar últimos 500 números ao conectar
          sendMessage(JSON.stringify({ 
            type: 'request_history', 
            limit: WEBSOCKET_CONFIG.maxHistorySize 
          }))
          break
        
        case 'roulettes':
          // Lista de roletas disponíveis
          if (Array.isArray(message.data)) {
            setAvailableRoulettes(message.data)
            console.log('🎰 Roletas disponíveis:', message.data)
          }
          break
          
        case 'error':
          setError(message.error || 'Erro desconhecido')
          console.error('❌ Erro do servidor:', message.error)
          break
      }
    } catch (err) {
      // Se não for JSON, pode ser um número simples
      const num = parseInt(data.trim())
      if (!isNaN(num) && num >= 0 && num <= 37) {
        const newNumber: RouletteNumber = {
          number: num,
          color: getRouletteColor(num),
          timestamp: Date.now()
        }
        
        setLastNumber(newNumber)
        setRecentNumbers(prev => [newNumber, ...prev].slice(0, 100))
        console.log('🎰 Número recebido (texto):', newNumber)
      } else {
        console.log('📝 Mensagem de texto:', data)
      }
    }
  }, [])

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

  // Conectar automaticamente ao montar
  useEffect(() => {
    connect()

    // Cleanup ao desmontar
    return () => {
      disconnect()
    }
  }, []) // Executar apenas uma vez

  return {
    isConnected,
    lastNumber,
    recentNumbers,
    error,
    reconnectAttempts,
    availableRoulettes,
    connect,
    disconnect,
    sendMessage
  }
}
