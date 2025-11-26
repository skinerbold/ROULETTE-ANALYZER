import logger from '../utils/logger.js'

export const errorHandler = (err, req, res, next) => {
  // Log do erro
  logger.error('❌ Erro não tratado', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    query: req.query,
    params: req.params
  })

  // Resposta de erro
  const statusCode = err.statusCode || 500
  const message = err.message || 'Internal Server Error'

  res.status(statusCode).json({
    error: true,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint não encontrado',
    path: req.path
  })
}

export default errorHandler
