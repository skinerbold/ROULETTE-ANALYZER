import cors from 'cors'
import config from '../config/index.js'
import logger from '../utils/logger.js'

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Permitir requests sem origin (ex: Postman, curl)
    if (!origin) {
      return callback(null, true)
    }
    
    // Verificar se origin está na lista permitida
    if (config.allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      logger.warn('⚠️ CORS bloqueado', {
        origin,
        allowedOrigins: config.allowedOrigins
      })
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
})

export default corsMiddleware
