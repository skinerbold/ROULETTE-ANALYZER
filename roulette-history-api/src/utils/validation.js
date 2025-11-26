import config from '../config/index.js'

export class ValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ValidationError'
    this.statusCode = 400
  }
}

export function validateRouletteId(rouletteId) {
  if (!rouletteId) {
    throw new ValidationError('roulette_id é obrigatório')
  }

  if (typeof rouletteId !== 'string') {
    throw new ValidationError('roulette_id deve ser uma string')
  }

  if (!config.allowedRoulettes.includes(rouletteId)) {
    throw new ValidationError(
      `roulette_id inválido. Valores permitidos: ${config.allowedRoulettes.join(', ')}`
    )
  }

  return rouletteId
}

export function validateLimit(limit) {
  // Se não fornecido, usar padrão
  if (limit === undefined || limit === null || limit === '') {
    return config.defaultLimit
  }

  // Converter para número
  const numLimit = parseInt(limit, 10)

  // Validar se é um número válido
  if (isNaN(numLimit)) {
    throw new ValidationError('limit deve ser um número')
  }

  // Validar se está na lista permitida
  if (!config.allowedLimits.includes(numLimit)) {
    throw new ValidationError(
      `limit inválido. Valores permitidos: ${config.allowedLimits.join(', ')}`
    )
  }

  return numLimit
}

export default {
  validateRouletteId,
  validateLimit,
  ValidationError
}
