import historyService from '../services/history.service.js'
import { validateRouletteId, validateLimit, ValidationError } from '../utils/validation.js'
import logger from '../utils/logger.js'

export async function getHistory(req, res, next) {
  try {
    const { roulette_id } = req.params
    const { limit } = req.query

    // Validar parâmetros
    const validatedRouletteId = validateRouletteId(roulette_id)
    const validatedLimit = validateLimit(limit)

    // Buscar histórico
    const result = await historyService.getHistory(validatedRouletteId, validatedLimit)

    // Buscar metadata (opcional, não falhar se não existir)
    let metadata = null
    try {
      metadata = await historyService.getMetadata(validatedRouletteId)
    } catch (error) {
      logger.warn('⚠️ Não foi possível buscar metadata', {
        rouletteId: validatedRouletteId,
        error: error.message
      })
    }

    // Resposta
    res.json({
      success: true,
      rouletteId: validatedRouletteId,
      limit: validatedLimit,
      count: result.data.length,
      cached: result.cached,
      numbers: result.data,
      metadata: metadata ? {
        lastNumber: metadata.last_number,
        lastUpdate: metadata.last_update,
        totalSpins: metadata.total_spins,
        historyCount: metadata.history_count
      } : null
    })

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }
    next(error)
  }
}

export async function getMetadata(req, res, next) {
  try {
    const { roulette_id } = req.params

    // Validar parâmetro
    const validatedRouletteId = validateRouletteId(roulette_id)

    // Buscar metadata
    const metadata = await historyService.getMetadata(validatedRouletteId)

    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'Metadata não encontrado para esta roleta'
      })
    }

    // Resposta
    res.json({
      success: true,
      rouletteId: validatedRouletteId,
      metadata: {
        lastNumber: metadata.last_number,
        lastUpdate: metadata.last_update,
        totalSpins: metadata.total_spins,
        historyCount: metadata.history_count,
        createdAt: metadata.created_at,
        updatedAt: metadata.updated_at
      }
    })

  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: error.message
      })
    }
    next(error)
  }
}

export async function getAllMetadata(req, res, next) {
  try {
    // Buscar todos os metadatas
    const metadatas = await historyService.getAllMetadata()

    // Resposta
    res.json({
      success: true,
      count: metadatas.length,
      roulettes: metadatas.map(m => ({
        rouletteId: m.roulette_id,
        lastNumber: m.last_number,
        lastUpdate: m.last_update,
        totalSpins: m.total_spins,
        historyCount: m.history_count
      }))
    })

  } catch (error) {
    next(error)
  }
}

export default {
  getHistory,
  getMetadata,
  getAllMetadata
}
