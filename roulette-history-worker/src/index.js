import { testDatabaseConnection } from './config/database.js'
import WebSocketClient from './services/websocket-client.js'
import HistoryUpdater from './services/history-updater.js'
import HealthCheckServer from './services/health-check.js'
import logger from './utils/logger.js'
import config from './config/websocket.js'

class RouletteHistoryWorker {
  constructor() {
    this.websocketClient = null
    this.historyUpdater = null
    this.healthCheckServer = null
    this.isShuttingDown = false
    this.metricsInterval = null
  }

  async start() {
    try {
      logger.info('🚀 Iniciando Roulette History Worker...', {
        environment: config.nodeEnv,
        logLevel: config.logLevel,
        websocketUrl: config.websocketUrl
      })

      // 1. Testar conexão com banco de dados
      logger.info('🔌 Testando conexão com banco de dados...')
      const dbConnected = await testDatabaseConnection()
      
      if (!dbConnected) {
        throw new Error('Falha ao conectar com banco de dados')
      }
      
      logger.success('✅ Conexão com banco de dados estabelecida')

      // 2. Inicializar serviços
      this.historyUpdater = new HistoryUpdater()
      this.websocketClient = new WebSocketClient()
      this.healthCheckServer = new HealthCheckServer(
        this.websocketClient,
        this.historyUpdater
      )

      // 3. Configurar event handlers
      this._setupEventHandlers()

      // 4. Iniciar Health Check Server
      this.healthCheckServer.start()

      // 5. Conectar ao WebSocket
      this.websocketClient.connect()

      // 6. Iniciar relatório de métricas (se habilitado)
      if (config.enableMetrics) {
        this._startMetricsReporting()
      }

      // 7. Configurar handlers de shutdown
      this._setupShutdownHandlers()

      logger.success('✅ Roulette History Worker iniciado com sucesso', {
        healthCheckPort: config.healthCheckPort,
        metricsEnabled: config.enableMetrics
      })

    } catch (error) {
      logger.error('❌ Erro ao iniciar Worker', {
        error: error.message,
        stack: error.stack
      })
      process.exit(1)
    }
  }

  _setupEventHandlers() {
    // WebSocket -> HistoryUpdater
    this.websocketClient.on('roulette-number', async (data) => {
      await this.historyUpdater.processUpdate(data)
    })

    // WebSocket events
    this.websocketClient.on('connected', () => {
      logger.websocketEvent('connected', {
        url: config.websocketUrl
      })
    })

    this.websocketClient.on('disconnected', ({ code, reason }) => {
      logger.websocketEvent('disconnected', {
        code,
        reason
      })
    })

    this.websocketClient.on('max-reconnect-attempts-reached', () => {
      logger.error('❌ Número máximo de tentativas de reconexão atingido')
      // Não fazer shutdown automático, deixar o processo rodando
      // O health check vai reportar status unhealthy
    })

    // HistoryUpdater events
    this.historyUpdater.on('update-success', (data) => {
      logger.debug('✅ Update success event', data)
    })

    this.historyUpdater.on('update-failed', (data) => {
      logger.error('❌ Update failed event', data)
    })
  }

  _startMetricsReporting() {
    logger.info('📊 Iniciando relatório de métricas', {
      interval: `${config.metricsInterval}ms`
    })

    this.metricsInterval = setInterval(() => {
      const wsMetrics = this.websocketClient.getMetrics()
      const updaterMetrics = this.historyUpdater.getMetrics()

      logger.metricsReport({
        websocket: {
          messagesReceived: wsMetrics.messagesReceived,
          messagesProcessed: wsMetrics.messagesProcessed,
          errors: wsMetrics.errors,
          reconnections: wsMetrics.reconnections,
          isConnected: wsMetrics.isConnected,
          uptime: this._formatUptime(wsMetrics.uptime)
        },
        updater: {
          updatesReceived: updaterMetrics.updatesReceived,
          updatesSuccessful: updaterMetrics.updatesSuccessful,
          updatesFailed: updaterMetrics.updatesFailed,
          retries: updaterMetrics.retries,
          successRate: updaterMetrics.successRate,
          queueSize: updaterMetrics.queueSize,
          averageProcessingTime: updaterMetrics.averageProcessingTime,
          lastUpdateTime: updaterMetrics.lastUpdateTime
        }
      })
    }, config.metricsInterval)
  }

  _setupShutdownHandlers() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) {
        logger.warn('⚠️ Shutdown já em andamento, aguarde...')
        return
      }

      this.isShuttingDown = true

      logger.info(`🛑 Sinal ${signal} recebido, iniciando shutdown gracioso...`)

      try {
        // 1. Parar de receber novas mensagens
        if (this.websocketClient) {
          logger.info('🔌 Desconectando WebSocket...')
          this.websocketClient.disconnect()
        }

        // 2. Aguardar fila de processamento esvaziar (timeout 30s)
        if (this.historyUpdater) {
          logger.info('⏳ Aguardando fila de processamento esvaziar...')
          const maxWait = 30000 // 30 segundos
          const startTime = Date.now()

          while (
            this.historyUpdater.getStatus().queueSize > 0 &&
            (Date.now() - startTime) < maxWait
          ) {
            await new Promise(resolve => setTimeout(resolve, 1000))
            logger.info(`⏳ Fila restante: ${this.historyUpdater.getStatus().queueSize}`)
          }

          const queueSize = this.historyUpdater.getStatus().queueSize
          if (queueSize > 0) {
            logger.warn(`⚠️ Timeout atingido, ${queueSize} atualizações na fila serão perdidas`)
          } else {
            logger.success('✅ Fila de processamento vazia')
          }
        }

        // 3. Parar métricas
        if (this.metricsInterval) {
          clearInterval(this.metricsInterval)
          logger.info('📊 Relatório de métricas parado')
        }

        // 4. Parar Health Check Server
        if (this.healthCheckServer) {
          await this.healthCheckServer.stop()
        }

        // 5. Métricas finais
        if (this.websocketClient && this.historyUpdater) {
          const wsMetrics = this.websocketClient.getMetrics()
          const updaterMetrics = this.historyUpdater.getMetrics()

          logger.info('📊 Métricas finais', {
            websocket: {
              messagesReceived: wsMetrics.messagesReceived,
              messagesProcessed: wsMetrics.messagesProcessed,
              errors: wsMetrics.errors,
              reconnections: wsMetrics.reconnections,
              uptime: this._formatUptime(wsMetrics.uptime)
            },
            updater: {
              updatesReceived: updaterMetrics.updatesReceived,
              updatesSuccessful: updaterMetrics.updatesSuccessful,
              updatesFailed: updaterMetrics.updatesFailed,
              successRate: updaterMetrics.successRate
            }
          })
        }

        logger.success('✅ Shutdown concluído com sucesso')
        process.exit(0)

      } catch (error) {
        logger.error('❌ Erro durante shutdown', {
          error: error.message,
          stack: error.stack
        })
        process.exit(1)
      }
    }

    // Capturar sinais de shutdown
    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))

    // Capturar erros não tratados
    process.on('uncaughtException', (error) => {
      logger.error('❌ Uncaught Exception', {
        error: error.message,
        stack: error.stack
      })
      shutdown('UNCAUGHT_EXCEPTION')
    })

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('❌ Unhandled Rejection', {
        reason,
        promise
      })
      shutdown('UNHANDLED_REJECTION')
    })
  }

  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }
}

// Iniciar worker
const worker = new RouletteHistoryWorker()
worker.start()

export default RouletteHistoryWorker
