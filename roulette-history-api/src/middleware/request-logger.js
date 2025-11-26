import logger from '../utils/logger.js'

export const requestLogger = (req, res, next) => {
  const startTime = Date.now()
  
  // Aguardar resposta finalizar
  res.on('finish', () => {
    const duration = Date.now() - startTime
    
    logger.request(
      req.method,
      req.path,
      res.statusCode,
      duration,
      {
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('user-agent')
      }
    )
  })
  
  next()
}

export default requestLogger
