import config from '../config/index.js'

class CacheService {
  constructor() {
    this.cache = new Map()
    this.ttl = config.cacheTtlSeconds * 1000 // converter para ms
    this.enabled = config.enableCache
  }

  _generateKey(rouletteId, limit) {
    return `${rouletteId}:${limit}`
  }

  get(rouletteId, limit) {
    if (!this.enabled) {
      return null
    }

    const key = this._generateKey(rouletteId, limit)
    const cached = this.cache.get(key)

    if (!cached) {
      return null
    }

    // Verificar se expirou
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  set(rouletteId, limit, data) {
    if (!this.enabled) {
      return
    }

    const key = this._generateKey(rouletteId, limit)
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttl
    })
  }

  invalidate(rouletteId) {
    if (!this.enabled) {
      return
    }

    // Invalidar todas as entradas para esta roleta
    const keysToDelete = []
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${rouletteId}:`)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  clear() {
    this.cache.clear()
  }

  getStats() {
    return {
      size: this.cache.size,
      enabled: this.enabled,
      ttl: this.ttl
    }
  }
}

export const cacheService = new CacheService()
export default cacheService
