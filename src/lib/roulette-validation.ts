/**
 * 🛡️ SISTEMA DE VALIDAÇÃO RIGOROSA DE NÚMEROS DA ROLETA
 * 
 * Valida todos os números recebidos do WebSocket para garantir:
 * - Range válido (0-37)
 * - Timestamps consistentes
 * - Cores corretas
 * - Ausência de duplicatas imediatas
 * - Integridade dos dados
 */

import { RouletteNumber } from './types'

// ============================================
// CONSTANTES
// ============================================
const MIN_NUMBER = 0
const MAX_NUMBER = 37
const TIMESTAMP_TOLERANCE_MS = 5000 // ±5 segundos de tolerância

// Mapeamento de números vermelhos na roleta europeia/francesa
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

// ============================================
// TIPOS
// ============================================
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface ValidationOptions {
  checkRange?: boolean
  checkTimestamp?: boolean
  checkColor?: boolean
  checkDuplicates?: boolean
  previousNumbers?: RouletteNumber[]
}

// ============================================
// FUNÇÕES DE VALIDAÇÃO INDIVIDUAL
// ============================================

/**
 * Calcula a cor esperada para um número
 */
export function getExpectedColor(number: number): 'red' | 'black' | 'green' {
  if (number === 0 || number === 37) {
    return 'green'
  }
  
  return RED_NUMBERS.includes(number) ? 'red' : 'black'
}

/**
 * Valida se o número está no range válido (0-37)
 */
export function validateRange(number: number): ValidationResult {
  if (typeof number !== 'number') {
    return {
      valid: false,
      errors: [`Número não é do tipo number: ${typeof number}`]
    }
  }

  if (isNaN(number)) {
    return {
      valid: false,
      errors: ['Número é NaN']
    }
  }

  if (!Number.isInteger(number)) {
    return {
      valid: false,
      errors: [`Número não é inteiro: ${number}`]
    }
  }

  if (number < MIN_NUMBER || number > MAX_NUMBER) {
    return {
      valid: false,
      errors: [`Número fora do range (${MIN_NUMBER}-${MAX_NUMBER}): ${number}`]
    }
  }

  return { valid: true, errors: [] }
}

/**
 * Valida se o timestamp está dentro do range aceitável
 */
export function validateTimestamp(timestamp: number): ValidationResult {
  if (typeof timestamp !== 'number') {
    return {
      valid: false,
      errors: [`Timestamp não é do tipo number: ${typeof timestamp}`]
    }
  }

  if (isNaN(timestamp)) {
    return {
      valid: false,
      errors: ['Timestamp é NaN']
    }
  }

  if (timestamp < 0) {
    return {
      valid: false,
      errors: [`Timestamp negativo: ${timestamp}`]
    }
  }

  const now = Date.now()
  const diff = Math.abs(now - timestamp)

  // Aceitar timestamps dentro de ±5 segundos
  if (diff > TIMESTAMP_TOLERANCE_MS) {
    // Se timestamp é muito antigo (mais de 1 hora), ainda aceitar
    // (pode ser histórico válido)
    const oneHourMs = 60 * 60 * 1000
    if (timestamp < now - oneHourMs) {
      return { valid: true, errors: [] } // Histórico antigo válido
    }

    // Timestamp no futuro é sempre inválido
    if (timestamp > now + TIMESTAMP_TOLERANCE_MS) {
      return {
        valid: false,
        errors: [`Timestamp no futuro: ${new Date(timestamp).toISOString()}`]
      }
    }
  }

  return { valid: true, errors: [] }
}

/**
 * Valida se a cor corresponde ao número
 */
export function validateColor(
  number: number,
  color: 'red' | 'black' | 'green'
): ValidationResult {
  if (!color || typeof color !== 'string') {
    return {
      valid: false,
      errors: [`Cor inválida: ${color}`]
    }
  }

  const expectedColor = getExpectedColor(number)

  if (color !== expectedColor) {
    return {
      valid: false,
      errors: [`Cor incompatível: esperado '${expectedColor}', recebido '${color}' para número ${number}`]
    }
  }

  return { valid: true, errors: [] }
}

/**
 * Detecta duplicata imediata (mesmo número consecutivo)
 * 🔧 FIX: Números duplicados consecutivos SÃO VÁLIDOS na roleta!
 * O mesmo número pode sair várias vezes seguidas
 */
export function validateDuplicate(
  number: number,
  previousNumbers: RouletteNumber[]
): ValidationResult {
  // 🔧 FIX: Sempre retornar válido - duplicatas consecutivas são permitidas
  // Na roleta real, o mesmo número pode sair múltiplas vezes seguidas
  return { valid: true, errors: [] }
}

// ============================================
// VALIDAÇÃO COMPLETA
// ============================================

/**
 * Valida um número completo com todas as verificações
 */
export function validateNumber(
  number: number,
  color: 'red' | 'black' | 'green',
  timestamp: number,
  options: ValidationOptions = {}
): ValidationResult {
  const {
    checkRange = true,
    checkTimestamp = true,
    checkColor = true,
    checkDuplicates = true,
    previousNumbers = []
  } = options

  const errors: string[] = []

  // 1. Validar range
  if (checkRange) {
    const rangeResult = validateRange(number)
    if (!rangeResult.valid) {
      errors.push(...rangeResult.errors)
    }
  }

  // 2. Validar timestamp
  if (checkTimestamp) {
    const timestampResult = validateTimestamp(timestamp)
    if (!timestampResult.valid) {
      errors.push(...timestampResult.errors)
    }
  }

  // 3. Validar cor
  if (checkColor) {
    const colorResult = validateColor(number, color)
    if (!colorResult.valid) {
      errors.push(...colorResult.errors)
    }
  }

  // 4. Validar duplicata
  if (checkDuplicates && previousNumbers.length > 0) {
    const duplicateResult = validateDuplicate(number, previousNumbers)
    if (!duplicateResult.valid) {
      errors.push(...duplicateResult.errors)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Valida e corrige um número (aplicar fallbacks)
 */
export function validateAndCorrectNumber(
  number: number,
  color: 'red' | 'black' | 'green' | null | undefined,
  timestamp: number | null | undefined,
  previousNumbers: RouletteNumber[] = []
): { valid: boolean; corrected: RouletteNumber; errors: string[] } {
  const errors: string[] = []

  // Corrigir timestamp se ausente
  const correctedTimestamp = timestamp && timestamp > 0 ? timestamp : Date.now()
  if (!timestamp || timestamp <= 0) {
    errors.push('Timestamp ausente, usando timestamp atual')
  }

  // Corrigir cor se ausente ou inválida
  let correctedColor = color
  if (!color || !['red', 'black', 'green'].includes(color)) {
    correctedColor = getExpectedColor(number)
    errors.push(`Cor ausente/inválida, calculando cor: ${correctedColor}`)
  }

  // Validar número completo
  const validation = validateNumber(number, correctedColor, correctedTimestamp, {
    checkRange: true,
    checkTimestamp: true,
    checkColor: true,
    checkDuplicates: true,
    previousNumbers
  })

  // Adicionar erros de validação
  errors.push(...validation.errors)

  return {
    valid: validation.valid,
    corrected: {
      number,
      color: correctedColor,
      timestamp: correctedTimestamp
    },
    errors
  }
}

/**
 * Valida um array de números
 */
export function validateNumberArray(
  numbers: RouletteNumber[],
  options: ValidationOptions = {}
): {
  valid: number
  invalid: number
  errors: Array<{ index: number; number: RouletteNumber; errors: string[] }>
} {
  const invalidEntries: Array<{ index: number; number: RouletteNumber; errors: string[] }> = []
  let validCount = 0
  let invalidCount = 0

  numbers.forEach((entry, index) => {
    const previousNumbers = numbers.slice(0, index)
    
    const validation = validateNumber(
      entry.number,
      entry.color,
      entry.timestamp,
      { ...options, previousNumbers }
    )
  

    if (validation.valid) {
      validCount++
    } else {
      invalidCount++
      invalidEntries.push({
        index,
        number: entry,
        errors: validation.errors
      })
    }
  })

  return {
    valid: validCount,
    invalid: invalidCount,
    errors: invalidEntries
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Filtra apenas números válidos de um array
 */
export function filterValidNumbers(
  numbers: RouletteNumber[],
  options: ValidationOptions = {}
): RouletteNumber[] {
  return numbers.filter((entry, index) => {
    const previousNumbers = numbers.slice(0, index)
    
    const validation = validateNumber(
      entry.number,
      entry.color,
      entry.timestamp,
      { ...options, previousNumbers }
    )

    return validation.valid
  })
}

/**
 * Log de validação para debug
 */
export function logValidationError(
  rouletteId: string,
  number: number,
  color: string,
  timestamp: number,
  errors: string[]
): void {
  console.error(`❌ [${rouletteId}] Validação falhou:`, {
    number,
    color,
    timestamp: new Date(timestamp).toISOString(),
    errors
  })
}
