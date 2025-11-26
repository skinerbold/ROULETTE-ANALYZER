import { EventEmitter } from 'events'
import { supabase } from '../config/database.js'
import logger from '../utils/logger.js'

class HistoryUpdater extends EventEmitter {
  constructor() {
    super()
    this.queue = []
    this.processing = false
    this.retryAttempts = new Map() // rouletteId -> attempt count
    this.maxRetries = 3
    
    // Metrics
    this.metrics = {
      updatesReceived: 0,
      updatesSuccessful: 0,
      updatesFailed: 0,
      retries: 0,
      averageProcessingTime: 0,
      lastUpdateTime: null,
      updatesPerRoulette: {}
    }
  }

  async processUpdate(data) {
    const { rouletteId, number, timestamp } = data
    
    this.metrics.updatesReceived++
    
    // Adicionar à fila
    this.queue.push({
      rouletteId,
      number,
      timestamp,
      receivedAt: Date.now()
    })
    
    logger.debug('📥 Atualização adicionada à fila', {
      rouletteId,
      number,
      queueSize: this.queue.length
    })
    
    // Processar fila se não estiver processando
    if (!this.processing) {
      await this._processQueue()
    }
  }

  async _processQueue() {
    if (this.processing || this.queue.length === 0) {
      return
    }
    
    this.processing = true
    
    while (this.queue.length > 0) {
      const update = this.queue.shift()
      await this._processUpdateWithRetry(update)
    }
    
    this.processing = false
  }

  async _processUpdateWithRetry(update) {
    const { rouletteId, number, timestamp, receivedAt } = update
    const startTime = Date.now()
    
    try {
      logger.info('🔄 Processando atualização...', {
        rouletteId,
        number,
        queueSize: this.queue.length
      })
      
      // Chamar a função PL/pgSQL update_roulette_history
      // Timestamp já vem em milissegundos do WebSocket
      const { data, error } = await supabase.rpc('update_roulette_history', {
        p_roulette_id: rouletteId,
        p_number: number,
        p_timestamp: timestamp
      })
      
      if (error) {
        throw new Error(`Erro no RPC: ${error.message}`)
      }
      
      // Verificar resposta da função
      if (!data || data.length === 0) {
        throw new Error('Função não retornou dados')
      }
      
      const result = data[0]
      
      if (!result.success) {
        throw new Error(result.message || 'Atualização falhou')
      }
      
      // Sucesso!
      const processingTime = Date.now() - startTime
      const totalDelay = Date.now() - receivedAt
      
      this.metrics.updatesSuccessful++
      this.metrics.lastUpdateTime = new Date().toISOString()
      
      // Atualizar média de tempo de processamento
      if (this.metrics.averageProcessingTime === 0) {
        this.metrics.averageProcessingTime = processingTime
      } else {
        this.metrics.averageProcessingTime = 
          (this.metrics.averageProcessingTime * 0.9) + (processingTime * 0.1)
      }
      
      // Atualizar contador por roleta
      if (!this.metrics.updatesPerRoulette[rouletteId]) {
        this.metrics.updatesPerRoulette[rouletteId] = 0
      }
      this.metrics.updatesPerRoulette[rouletteId]++
      
      logger.success('✅ Atualização processada com sucesso', {
        rouletteId,
        number,
        historyCount: result.history_count,
        processingTime: `${processingTime}ms`,
        totalDelay: `${totalDelay}ms`
      })
      
      // Limpar tentativas de retry
      this.retryAttempts.delete(rouletteId)
      
      // Emitir evento de sucesso
      this.emit('update-success', {
        rouletteId,
        number,
        historyCount: result.history_count,
        processingTime,
        totalDelay
      })
      
    } catch (error) {
      this.metrics.updatesFailed++
      
      logger.error('❌ Erro ao processar atualização', {
        rouletteId,
        number,
        error: error.message,
        stack: error.stack
      })
      
      // Verificar se deve tentar novamente
      const attempts = (this.retryAttempts.get(rouletteId) || 0) + 1
      this.retryAttempts.set(rouletteId, attempts)
      
      if (attempts < this.maxRetries) {
        this.metrics.retries++
        
        logger.warn('🔄 Agendando retry...', {
          rouletteId,
          number,
          attempt: attempts,
          maxRetries: this.maxRetries
        })
        
        // Aguardar antes de retry (exponential backoff)
        const delay = Math.pow(2, attempts) * 1000 // 2s, 4s, 8s
        
        setTimeout(() => {
          this.queue.push({
            rouletteId,
            number,
            timestamp,
            receivedAt
          })
          
          if (!this.processing) {
            this._processQueue()
          }
        }, delay)
        
      } else {
        logger.error('❌ Número máximo de retries atingido', {
          rouletteId,
          number,
          attempts
        })
        
        // Limpar tentativas
        this.retryAttempts.delete(rouletteId)
        
        // Emitir evento de falha
        this.emit('update-failed', {
          rouletteId,
          number,
          error: error.message,
          attempts
        })
      }
    }
  }

  getMetrics() {
    const successRate = this.metrics.updatesReceived > 0
      ? ((this.metrics.updatesSuccessful / this.metrics.updatesReceived) * 100).toFixed(2)
      : 0
    
    return {
      ...this.metrics,
      queueSize: this.queue.length,
      processing: this.processing,
      successRate: `${successRate}%`,
      averageProcessingTime: `${Math.round(this.metrics.averageProcessingTime)}ms`
    }
  }

  getStatus() {
    return {
      queueSize: this.queue.length,
      processing: this.processing,
      activeRetries: this.retryAttempts.size,
      metrics: this.getMetrics()
    }
  }

  reset() {
    this.queue = []
    this.retryAttempts.clear()
    logger.info('🔄 Fila de atualizações resetada')
  }
}

export default HistoryUpdater
