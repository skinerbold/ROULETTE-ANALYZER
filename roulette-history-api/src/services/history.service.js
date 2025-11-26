import { supabase } from '../config/database.js'
import logger from '../utils/logger.js'
import cacheService from './cache.service.js'

class HistoryService {
  async getHistory(rouletteId, limit = 100) {
    try {
      // Verificar cache
      const cached = cacheService.get(rouletteId, limit)
      if (cached) {
        logger.debug('📦 Cache hit', { rouletteId, limit })
        return {
          data: cached,
          cached: true
        }
      }

      logger.debug('🔍 Consultando banco de dados', { rouletteId, limit })

      // Query otimizada com index
      const { data, error } = await supabase
        .from('roulette_history')
        .select('number, timestamp, position')
        .eq('roulette_id', rouletteId)
        .order('timestamp', { ascending: false })  // Mais recentes primeiro
        .limit(limit)

      if (error) {
        throw error
      }

      // Extrair apenas os números na ordem correta
      const numbers = data.map(row => row.number)

      // Salvar no cache
      cacheService.set(rouletteId, limit, numbers)

      return {
        data: numbers,
        cached: false
      }

    } catch (error) {
      logger.error('❌ Erro ao buscar histórico', {
        rouletteId,
        limit,
        error: error.message
      })
      throw error
    }
  }

  async getMetadata(rouletteId) {
    try {
      const { data, error } = await supabase
        .from('roulette_metadata')
        .select('*')
        .eq('roulette_id', rouletteId)
        .single()

      if (error) {
        // Se não encontrou, retornar null (não é erro)
        if (error.code === 'PGRST116') {
          return null
        }
        throw error
      }

      return data

    } catch (error) {
      logger.error('❌ Erro ao buscar metadata', {
        rouletteId,
        error: error.message
      })
      throw error
    }
  }

  async getAllMetadata() {
    try {
      const { data, error } = await supabase
        .from('roulette_metadata')
        .select('*')
        .order('last_update', { ascending: false })

      if (error) {
        throw error
      }

      // Para cada roleta, buscar a contagem REAL do histórico
      const metadatasWithRealCount = await Promise.all(
        (data || []).map(async (metadata) => {
          try {
            const { count, error: countError } = await supabase
              .from('roulette_history')
              .select('*', { count: 'exact', head: true })
              .eq('roulette_id', metadata.roulette_id)

            if (countError) {
              logger.warn('⚠️ Erro ao contar histórico', {
                rouletteId: metadata.roulette_id,
                error: countError.message
              })
              return metadata // Retornar metadata original se falhar
            }

            // Retornar metadata com contagem corrigida
            return {
              ...metadata,
              history_count: count || 0
            }
          } catch (err) {
            logger.warn('⚠️ Erro ao processar metadata', {
              rouletteId: metadata.roulette_id,
              error: err.message
            })
            return metadata
          }
        })
      )

      return metadatasWithRealCount

    } catch (error) {
      logger.error('❌ Erro ao buscar todos os metadatas', {
        error: error.message
      })
      throw error
    }
  }
}

export const historyService = new HistoryService()
export default historyService
