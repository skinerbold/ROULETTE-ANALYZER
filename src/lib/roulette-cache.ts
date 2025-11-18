/**
 * 🗄️ SISTEMA DE CACHE PERSISTENTE PARA HISTÓRICO DE ROLETAS
 * 
 * Salva histórico de números em localStorage para:
 * - Carregamento instantâneo ao abrir aplicação
 * - Redução de dependência da API
 * - Melhor experiência do usuário
 * 
 * Política de expiração: 24 horas
 */

import { RouletteNumber } from './types'

// ============================================
// CONSTANTES
// ============================================
const CACHE_VERSION = '1.0.0'
const CACHE_KEY_PREFIX = 'roulette_cache_'
const CACHE_METADATA_KEY = 'roulette_cache_metadata'
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000 // 24 horas
const MAX_CACHED_ROULETTES = 50 // Máximo de roletas em cache

// ============================================
// TIPOS
// ============================================
interface CacheEntry {
  rouletteId: string
  numbers: RouletteNumber[]
  timestamp: number
  version: string
}

interface CacheMetadata {
  version: string
  lastCleanup: number
  rouletteIds: string[]
}

// ============================================
// UTILITÁRIOS
// ============================================

/**
 * Verifica se localStorage está disponível
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    console.warn('localStorage não disponível:', e)
    return false
  }
}

/**
 * Gera chave de cache para uma roleta
 */
function getCacheKey(rouletteId: string): string {
  return `${CACHE_KEY_PREFIX}${rouletteId}`
}

/**
 * Carrega metadata do cache
 */
function getMetadata(): CacheMetadata {
  if (!isLocalStorageAvailable()) {
    return { version: CACHE_VERSION, lastCleanup: Date.now(), rouletteIds: [] }
  }

  try {
    const data = localStorage.getItem(CACHE_METADATA_KEY)
    if (!data) {
      return { version: CACHE_VERSION, lastCleanup: Date.now(), rouletteIds: [] }
    }

    const metadata = JSON.parse(data) as CacheMetadata

    // Verificar versão
    if (metadata.version !== CACHE_VERSION) {
      console.warn('Versão de cache incompatível, limpando cache...')
      clearAllCache()
      return { version: CACHE_VERSION, lastCleanup: Date.now(), rouletteIds: [] }
    }

    return metadata
  } catch (error) {
    console.error('Erro ao carregar metadata do cache:', error)
    return { version: CACHE_VERSION, lastCleanup: Date.now(), rouletteIds: [] }
  }
}

/**
 * Salva metadata do cache
 */
function saveMetadata(metadata: CacheMetadata): void {
  if (!isLocalStorageAvailable()) return

  try {
    localStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(metadata))
  } catch (error) {
    console.error('Erro ao salvar metadata do cache:', error)
  }
}

/**
 * Verifica se uma entrada de cache está expirada
 */
function isExpired(timestamp: number): boolean {
  return Date.now() - timestamp > CACHE_EXPIRATION_MS
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Salva histórico de uma roleta no cache
 */
export function saveToCache(rouletteId: string, numbers: RouletteNumber[]): void {
  if (!isLocalStorageAvailable()) {
    console.warn('Cache não disponível, pulando salvamento')
    return
  }

  try {
    const entry: CacheEntry = {
      rouletteId,
      numbers: numbers.slice(0, 500), // Limitar a 500 números
      timestamp: Date.now(),
      version: CACHE_VERSION
    }

    // Salvar entrada
    const cacheKey = getCacheKey(rouletteId)
    localStorage.setItem(cacheKey, JSON.stringify(entry))

    // Atualizar metadata
    const metadata = getMetadata()
    if (!metadata.rouletteIds.includes(rouletteId)) {
      metadata.rouletteIds.push(rouletteId)
    }
    saveMetadata(metadata)

    console.log(`✅ Cache salvo: ${rouletteId} (${numbers.length} números)`)
  } catch (error) {
    console.error('Erro ao salvar no cache:', error)
    
    // Se erro de quota excedida, limpar cache antigo
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('Quota de localStorage excedida, limpando cache antigo...')
      cleanupOldCache()
      
      // Tentar novamente
      try {
        const entry: CacheEntry = {
          rouletteId,
          numbers: numbers.slice(0, 500),
          timestamp: Date.now(),
          version: CACHE_VERSION
        }
        localStorage.setItem(getCacheKey(rouletteId), JSON.stringify(entry))
        console.log(`✅ Cache salvo após limpeza: ${rouletteId}`)
      } catch (retryError) {
        console.error('Falha ao salvar cache mesmo após limpeza:', retryError)
      }
    }
  }
}

/**
 * Carrega histórico de uma roleta do cache
 */
export function loadFromCache(rouletteId: string): RouletteNumber[] | null {
  if (!isLocalStorageAvailable()) {
    return null
  }

  try {
    const cacheKey = getCacheKey(rouletteId)
    const data = localStorage.getItem(cacheKey)

    if (!data) {
      return null
    }

    const entry = JSON.parse(data) as CacheEntry

    // Verificar expiração
    if (isExpired(entry.timestamp)) {
      console.log(`⏰ Cache expirado: ${rouletteId}`)
      removeFromCache(rouletteId)
      return null
    }

    // Verificar versão
    if (entry.version !== CACHE_VERSION) {
      console.warn(`❌ Versão incompatível: ${rouletteId}`)
      removeFromCache(rouletteId)
      return null
    }

    console.log(`✅ Cache carregado: ${rouletteId} (${entry.numbers.length} números)`)
    return entry.numbers
  } catch (error) {
    console.error('Erro ao carregar do cache:', error)
    return null
  }
}

/**
 * Remove uma roleta específica do cache
 */
export function removeFromCache(rouletteId: string): void {
  if (!isLocalStorageAvailable()) return

  try {
    const cacheKey = getCacheKey(rouletteId)
    localStorage.removeItem(cacheKey)

    // Atualizar metadata
    const metadata = getMetadata()
    metadata.rouletteIds = metadata.rouletteIds.filter(id => id !== rouletteId)
    saveMetadata(metadata)

    console.log(`🗑️ Cache removido: ${rouletteId}`)
  } catch (error) {
    console.error('Erro ao remover do cache:', error)
  }
}

/**
 * Limpa entradas antigas do cache (expiradas)
 */
export function cleanupOldCache(): void {
  if (!isLocalStorageAvailable()) return

  try {
    const metadata = getMetadata()
    const now = Date.now()
    let removedCount = 0

    // Limpar entradas expiradas
    for (const rouletteId of metadata.rouletteIds) {
      try {
        const cacheKey = getCacheKey(rouletteId)
        const data = localStorage.getItem(cacheKey)

        if (!data) {
          continue
        }

        const entry = JSON.parse(data) as CacheEntry

        if (isExpired(entry.timestamp)) {
          localStorage.removeItem(cacheKey)
          removedCount++
        }
      } catch (error) {
        console.error(`Erro ao verificar cache de ${rouletteId}:`, error)
      }
    }

    // Atualizar lista de IDs
    metadata.rouletteIds = metadata.rouletteIds.filter(id => {
      const cacheKey = getCacheKey(id)
      return localStorage.getItem(cacheKey) !== null
    })

    // Se ainda há muitas roletas, remover as mais antigas
    if (metadata.rouletteIds.length > MAX_CACHED_ROULETTES) {
      const toRemove = metadata.rouletteIds.length - MAX_CACHED_ROULETTES

      // Ordenar por timestamp (mais antigo primeiro)
      const entries: Array<{ id: string; timestamp: number }> = []
      for (const id of metadata.rouletteIds) {
        try {
          const data = localStorage.getItem(getCacheKey(id))
          if (data) {
            const entry = JSON.parse(data) as CacheEntry
            entries.push({ id, timestamp: entry.timestamp })
          }
        } catch (e) {
          // Ignorar erros
        }
      }

      entries.sort((a, b) => a.timestamp - b.timestamp)

      // Remover os mais antigos
      for (let i = 0; i < toRemove; i++) {
        const id = entries[i].id
        localStorage.removeItem(getCacheKey(id))
        removedCount++
      }

      metadata.rouletteIds = entries.slice(toRemove).map(e => e.id)
    }

    metadata.lastCleanup = now
    saveMetadata(metadata)

    console.log(`🧹 Cache limpo: ${removedCount} entradas removidas`)
  } catch (error) {
    console.error('Erro ao limpar cache:', error)
  }
}

/**
 * Limpa TODO o cache (todas as roletas)
 */
export function clearAllCache(): void {
  if (!isLocalStorageAvailable()) return

  try {
    const metadata = getMetadata()

    // Remover todas as entradas
    for (const rouletteId of metadata.rouletteIds) {
      const cacheKey = getCacheKey(rouletteId)
      localStorage.removeItem(cacheKey)
    }

    // Limpar metadata
    localStorage.removeItem(CACHE_METADATA_KEY)

    console.log('🗑️ Todo o cache foi limpo')
  } catch (error) {
    console.error('Erro ao limpar todo o cache:', error)
  }
}

/**
 * Obtém estatísticas do cache
 */
export function getCacheStats(): {
  totalRoulettes: number
  totalNumbers: number
  oldestEntry: number | null
  newestEntry: number | null
  storageUsed: number
} {
  if (!isLocalStorageAvailable()) {
    return {
      totalRoulettes: 0,
      totalNumbers: 0,
      oldestEntry: null,
      newestEntry: null,
      storageUsed: 0
    }
  }

  try {
    const metadata = getMetadata()
    let totalNumbers = 0
    let oldestEntry: number | null = null
    let newestEntry: number | null = null
    let storageUsed = 0

    for (const rouletteId of metadata.rouletteIds) {
      try {
        const cacheKey = getCacheKey(rouletteId)
        const data = localStorage.getItem(cacheKey)

        if (!data) continue

        storageUsed += data.length * 2 // Aproximação (UTF-16)

        const entry = JSON.parse(data) as CacheEntry
        totalNumbers += entry.numbers.length

        if (!oldestEntry || entry.timestamp < oldestEntry) {
          oldestEntry = entry.timestamp
        }

        if (!newestEntry || entry.timestamp > newestEntry) {
          newestEntry = entry.timestamp
        }
      } catch (error) {
        console.error(`Erro ao processar estatísticas de ${rouletteId}:`, error)
      }
    }

    return {
      totalRoulettes: metadata.rouletteIds.length,
      totalNumbers,
      oldestEntry,
      newestEntry,
      storageUsed
    }
  } catch (error) {
    console.error('Erro ao obter estatísticas do cache:', error)
    return {
      totalRoulettes: 0,
      totalNumbers: 0,
      oldestEntry: null,
      newestEntry: null,
      storageUsed: 0
    }
  }
}

/**
 * Inicializa o sistema de cache (limpa cache antigo se necessário)
 */
export function initializeCache(): void {
  if (!isLocalStorageAvailable()) {
    console.warn('Cache não disponível neste ambiente')
    return
  }

  const metadata = getMetadata()
  const now = Date.now()

  // Limpar se última limpeza foi há mais de 24h
  if (now - metadata.lastCleanup > CACHE_EXPIRATION_MS) {
    console.log('🧹 Iniciando limpeza automática de cache...')
    cleanupOldCache()
  }

  const stats = getCacheStats()
  console.log('📊 Cache inicializado:', {
    roletas: stats.totalRoulettes,
    números: stats.totalNumbers,
    armazenamento: `${(stats.storageUsed / 1024).toFixed(2)} KB`
  })
}
