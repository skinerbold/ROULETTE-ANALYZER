import WebSocket from 'ws'
import { EventEmitter } from 'events'
import config from '../config/websocket.js'
import logger from '../utils/logger.js'

class WebSocketClient extends EventEmitter {
  constructor() {
    super()
    this.ws = null
    this.isConnected = false
    this.reconnectAttempts = 0
    this.reconnectTimer = null
    this.pingInterval = null
    this.lastPingTime = null
    this.lastPongTime = null
    
    // Metrics
    this.metrics = {
      messagesReceived: 0,
      messagesProcessed: 0,
      errors: 0,
      reconnections: 0,
      uptime: Date.now()
    }
  }

  connect() {
    try {
      logger.info('🔌 Conectando ao WebSocket...', {
        url: config.websocketUrl
      })

      this.ws = new WebSocket(config.websocketUrl)
      
      this.ws.on('open', this._handleOpen.bind(this))
      this.ws.on('message', this._handleMessage.bind(this))
      this.ws.on('error', this._handleError.bind(this))
      this.ws.on('close', this._handleClose.bind(this))
      this.ws.on('pong', this._handlePong.bind(this))
      
    } catch (error) {
      logger.error('❌ Erro ao criar conexão WebSocket', {
        error: error.message,
        stack: error.stack
      })
      this._scheduleReconnect()
    }
  }

  _handleOpen() {
    this.isConnected = true
    this.reconnectAttempts = 0
    
    logger.success('✅ Conectado ao WebSocket', {
      url: config.websocketUrl,
      uptime: Date.now() - this.metrics.uptime
    })
    
    this.emit('connected')
    
    // Start ping interval to keep connection alive
    this._startPingInterval()
  }

  _handleMessage(data) {
    try {
      this.metrics.messagesReceived++
      
      const message = JSON.parse(data.toString())
      
      logger.debug('📨 Mensagem recebida', {
        type: message.type,
        hasData: !!message.data
      })
      
      // Processar apenas mensagens de tipo 'roulette-update'
      if (message.type === 'roulette-update') {
        this._processRouletteUpdate(message.data)
      } else if (message.type === 'pong') {
        // Resposta ao ping (se o servidor enviar)
        logger.debug('🏓 Pong recebido do servidor')
      } else {
        logger.debug('ℹ️ Tipo de mensagem ignorado', {
          type: message.type
        })
      }
      
    } catch (error) {
      this.metrics.errors++
      logger.error('❌ Erro ao processar mensagem', {
        error: error.message,
        data: data.toString().substring(0, 200)
      })
    }
  }

  _processRouletteUpdate(data) {
    try {
      const { rouletteId, number, timestamp } = data
      
      // Validação básica
      if (!rouletteId || number === undefined || number === null) {
        logger.warn('⚠️ Mensagem de roleta com dados incompletos', {
          rouletteId,
          number,
          timestamp
        })
        return
      }
      
      // Validar se é uma roleta permitida
      if (!config.allowedRoulettes.includes(rouletteId)) {
        logger.debug('🚫 Roleta não está na lista permitida', {
          rouletteId,
          allowedRoulettes: config.allowedRoulettes
        })
        return
      }
      
      // Validar número (0-36)
      if (number < 0 || number > 36 || !Number.isInteger(number)) {
        logger.warn('⚠️ Número de roleta inválido', {
          rouletteId,
          number
        })
        return
      }
      
      logger.rouletteUpdate(rouletteId, number, {
        timestamp: timestamp || new Date().toISOString()
      })
      
      // Emitir evento para o HistoryUpdater
      this.emit('roulette-number', {
        rouletteId,
        number,
        timestamp: timestamp || new Date().toISOString()
      })
      
      this.metrics.messagesProcessed++
      
    } catch (error) {
      this.metrics.errors++
      logger.error('❌ Erro ao processar atualização de roleta', {
        error: error.message,
        data
      })
    }
  }

  _handleError(error) {
    this.metrics.errors++
    logger.error('❌ Erro no WebSocket', {
      error: error.message,
      code: error.code
    })
  }

  _handleClose(code, reason) {
    this.isConnected = false
    this._stopPingInterval()
    
    logger.warn('⚠️ Conexão WebSocket fechada', {
      code,
      reason: reason.toString(),
      reconnectAttempts: this.reconnectAttempts
    })
    
    this.emit('disconnected', { code, reason: reason.toString() })
    
    // Tentar reconectar
    this._scheduleReconnect()
  }

  _handlePong() {
    this.lastPongTime = Date.now()
    const latency = this.lastPongTime - this.lastPingTime
    
    logger.debug('🏓 Pong recebido', {
      latency: `${latency}ms`
    })
  }

  _startPingInterval() {
    // Enviar ping a cada 30 segundos para manter conexão viva
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now()
        this.ws.ping()
        logger.debug('🏓 Ping enviado')
      }
    }, 30000)
  }

  _stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    
    this.reconnectAttempts++
    
    if (this.reconnectAttempts > config.maxReconnectAttempts) {
      logger.error('❌ Número máximo de tentativas de reconexão atingido', {
        maxAttempts: config.maxReconnectAttempts
      })
      this.emit('max-reconnect-attempts-reached')
      return
    }
    
    // Exponential backoff: 5s, 10s, 20s, 40s, ... até max 5 minutos
    const delay = Math.min(
      config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      300000 // Max 5 minutos
    )
    
    logger.info('🔄 Agendando reconexão...', {
      attempt: this.reconnectAttempts,
      delay: `${delay}ms`,
      maxAttempts: config.maxReconnectAttempts
    })
    
    this.reconnectTimer = setTimeout(() => {
      this.metrics.reconnections++
      this.connect()
    }, delay)
  }

  disconnect() {
    logger.info('🔌 Desconectando WebSocket...')
    
    this._stopPingInterval()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    
    if (this.ws) {
      this.ws.removeAllListeners()
      this.ws.close()
      this.ws = null
    }
    
    this.isConnected = false
    
    logger.info('✅ WebSocket desconectado')
  }

  getMetrics() {
    return {
      ...this.metrics,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      uptime: Date.now() - this.metrics.uptime
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      lastPingTime: this.lastPingTime,
      lastPongTime: this.lastPongTime,
      metrics: this.getMetrics()
    }
  }
}

export default WebSocketClient
