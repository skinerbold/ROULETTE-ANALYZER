import express from 'express'
import helmet from 'helmet'
import config, { validateConfig } from './config/index.js'
import { testDatabaseConnection } from './config/database.js'
import logger from './utils/logger.js'
import corsMiddleware from './middleware/cors.js'
import rateLimiter from './middleware/rate-limit.js'
import requestLogger from './middleware/request-logger.js'
import { errorHandler, notFoundHandler } from './middleware/error-handler.js'
import historyRoutes from './routes/history.routes.js'
import cacheService from './services/cache.service.js'

class RouletteHistoryAPI {
  constructor() {
    this.app = express()
    this.server = null
  }

  async start() {
    try {
      logger.info('🚀 Iniciando Roulette History API...', {
        environment: config.nodeEnv,
        port: config.port
      })

      // 1. Validar configurações
      validateConfig()
      logger.success('✅ Configurações validadas')

      // 2. Testar conexão com banco
      logger.info('🔌 Testando conexão com banco de dados...')
      const dbConnected = await testDatabaseConnection()
      
      if (!dbConnected) {
        throw new Error('Falha ao conectar com banco de dados')
      }
      
      logger.success('✅ Conexão com banco de dados estabelecida')

      // 3. Configurar middlewares
      this._setupMiddlewares()

      // 4. Configurar rotas
      this._setupRoutes()

      // 5. Configurar error handlers
      this._setupErrorHandlers()

      // 6. Iniciar servidor
      await this._startServer()

      // 7. Configurar shutdown handlers
      this._setupShutdownHandlers()

      logger.success('✅ Roulette History API iniciada com sucesso', {
        port: config.port,
        cache: config.enableCache ? 'enabled' : 'disabled',
        rateLimit: `${config.rateLimitMaxRequests} req/${config.rateLimitWindowMs / 1000}s`
      })

    } catch (error) {
      logger.error('❌ Erro ao iniciar API', {
        error: error.message,
        stack: error.stack
      })
      process.exit(1)
    }
  }

  _setupMiddlewares() {
    // Security
    this.app.use(helmet())

    // CORS
    this.app.use(corsMiddleware)

    // Body parser
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

    // Request logger
    this.app.use(requestLogger)

    // Rate limiting
    this.app.use('/api/', rateLimiter)

    logger.info('✅ Middlewares configurados')
  }

  _setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        cache: cacheService.getStats()
      })
    })

    // API routes
    this.app.use('/api/history', historyRoutes)

    // Documentação básica
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Roulette History API',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          history: 'GET /api/history/:roulette_id?limit=50|100|200|300|500',
          metadata: 'GET /api/history/metadata/:roulette_id',
          allMetadata: 'GET /api/history/metadata'
        },
        allowedRoulettes: config.allowedRoulettes,
        allowedLimits: config.allowedLimits,
        defaultLimit: config.defaultLimit
      })
    })

    logger.info('✅ Rotas configuradas')
  }

  _setupErrorHandlers() {
    // 404 handler
    this.app.use(notFoundHandler)

    // Error handler
    this.app.use(errorHandler)

    logger.info('✅ Error handlers configurados')
  }

  async _startServer() {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.port, '0.0.0.0', (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  _setupShutdownHandlers() {
    const shutdown = async (signal) => {
      logger.info(`🛑 Sinal ${signal} recebido, iniciando shutdown...`)

      try {
        // 1. Parar de aceitar novas conexões
        if (this.server) {
          await new Promise((resolve) => {
            this.server.close(() => {
              logger.info('✅ Servidor HTTP fechado')
              resolve()
            })
          })
        }

        // 2. Limpar cache
        cacheService.clear()
        logger.info('✅ Cache limpo')

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
}

// Iniciar API
const api = new RouletteHistoryAPI()
api.start()

export default RouletteHistoryAPI
