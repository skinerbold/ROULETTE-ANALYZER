import http from 'http'
import config from '../config/websocket.js'
import logger from '../utils/logger.js'

class HealthCheckServer {
  constructor(websocketClient, historyUpdater) {
    this.websocketClient = websocketClient
    this.historyUpdater = historyUpdater
    this.server = null
    this.startTime = Date.now()
  }

  start() {
    this.server = http.createServer((req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }
      
      if (req.url === '/health' && req.method === 'GET') {
        this._handleHealthCheck(req, res)
      } else if (req.url === '/metrics' && req.method === 'GET') {
        this._handleMetrics(req, res)
      } else if (req.url === '/status' && req.method === 'GET') {
        this._handleStatus(req, res)
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Not Found' }))
      }
    })
    
    this.server.listen(config.healthCheckPort, () => {
      logger.success('✅ Health Check Server iniciado', {
        port: config.healthCheckPort,
        endpoints: ['/health', '/metrics', '/status']
      })
    })
    
    this.server.on('error', (error) => {
      logger.error('❌ Erro no Health Check Server', {
        error: error.message,
        code: error.code
      })
    })
  }

  _handleHealthCheck(req, res) {
    const wsStatus = this.websocketClient.getStatus()
    const updaterStatus = this.historyUpdater.getStatus()
    
    const isHealthy = wsStatus.connected && !updaterStatus.processing
    const statusCode = isHealthy ? 200 : 503
    
    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: this._formatUptime(Date.now() - this.startTime),
      services: {
        websocket: {
          connected: wsStatus.connected,
          reconnectAttempts: wsStatus.reconnectAttempts
        },
        updater: {
          queueSize: updaterStatus.queueSize,
          processing: updaterStatus.processing,
          activeRetries: updaterStatus.activeRetries
        }
      }
    }
    
    res.writeHead(statusCode, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response, null, 2))
    
    logger.debug('🏥 Health check request', {
      status: response.status,
      statusCode
    })
  }

  _handleMetrics(req, res) {
    const wsMetrics = this.websocketClient.getMetrics()
    const updaterMetrics = this.historyUpdater.getMetrics()
    
    const response = {
      timestamp: new Date().toISOString(),
      uptime: this._formatUptime(Date.now() - this.startTime),
      websocket: {
        messagesReceived: wsMetrics.messagesReceived,
        messagesProcessed: wsMetrics.messagesProcessed,
        errors: wsMetrics.errors,
        reconnections: wsMetrics.reconnections,
        isConnected: wsMetrics.isConnected
      },
      updater: {
        updatesReceived: updaterMetrics.updatesReceived,
        updatesSuccessful: updaterMetrics.updatesSuccessful,
        updatesFailed: updaterMetrics.updatesFailed,
        retries: updaterMetrics.retries,
        successRate: updaterMetrics.successRate,
        averageProcessingTime: updaterMetrics.averageProcessingTime,
        lastUpdateTime: updaterMetrics.lastUpdateTime,
        queueSize: updaterMetrics.queueSize,
        updatesPerRoulette: updaterMetrics.updatesPerRoulette
      }
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response, null, 2))
    
    logger.debug('📊 Metrics request')
  }

  _handleStatus(req, res) {
    const wsStatus = this.websocketClient.getStatus()
    const updaterStatus = this.historyUpdater.getStatus()
    const wsMetrics = this.websocketClient.getMetrics()
    const updaterMetrics = this.historyUpdater.getMetrics()
    
    const response = {
      timestamp: new Date().toISOString(),
      uptime: this._formatUptime(Date.now() - this.startTime),
      uptimeMs: Date.now() - this.startTime,
      environment: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      websocket: {
        url: config.websocketUrl,
        connected: wsStatus.connected,
        reconnectAttempts: wsStatus.reconnectAttempts,
        lastPingTime: wsStatus.lastPingTime,
        lastPongTime: wsStatus.lastPongTime,
        metrics: {
          messagesReceived: wsMetrics.messagesReceived,
          messagesProcessed: wsMetrics.messagesProcessed,
          errors: wsMetrics.errors,
          reconnections: wsMetrics.reconnections
        }
      },
      updater: {
        queueSize: updaterStatus.queueSize,
        processing: updaterStatus.processing,
        activeRetries: updaterStatus.activeRetries,
        metrics: {
          updatesReceived: updaterMetrics.updatesReceived,
          updatesSuccessful: updaterMetrics.updatesSuccessful,
          updatesFailed: updaterMetrics.updatesFailed,
          retries: updaterMetrics.retries,
          successRate: updaterMetrics.successRate,
          averageProcessingTime: updaterMetrics.averageProcessingTime,
          lastUpdateTime: updaterMetrics.lastUpdateTime,
          updatesPerRoulette: updaterMetrics.updatesPerRoulette
        }
      },
      config: {
        allowedRoulettes: config.allowedRoulettes,
        reconnectDelay: config.reconnectDelay,
        maxReconnectAttempts: config.maxReconnectAttempts,
        healthCheckPort: config.healthCheckPort
      }
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response, null, 2))
    
    logger.debug('📋 Status request')
  }

  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        logger.info('🛑 Parando Health Check Server...')
        this.server.close(() => {
          logger.info('✅ Health Check Server parado')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
}

export default HealthCheckServer
