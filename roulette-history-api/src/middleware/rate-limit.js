import rateLimit from 'express-rate-limit'
import config from '../config/index.js'

export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Too many requests',
    message: `Limite de ${config.rateLimitMaxRequests} requisições por ${config.rateLimitWindowMs / 1000} segundos excedido`,
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: `Limite de ${config.rateLimitMaxRequests} requisições por ${config.rateLimitWindowMs / 1000} segundos excedido`,
      retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
    })
  }
})

export default rateLimiter
