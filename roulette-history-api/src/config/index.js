import dotenv from 'dotenv'

dotenv.config()

export const config = {
  // Server
  port: parseInt(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  
  // CORS
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000'],
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Cache
  enableCache: process.env.ENABLE_CACHE === 'true',
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS) || 30,
  
  // Allowed Roulettes
  allowedRoulettes: [
    // Evolution Gaming
    'first-person-roulette',
    'instant-roulette',
    'lightning-roulette',
    'speed-roulette',
    
    // Pragmatic Play
    'pragmatic-auto-roulette',
    'pragmatic-roulette',
    'pragmatic-speed-auto-roulette',
    'pragmatic-mega-roulette',
    'pragmatic-powerup-roulette'
  ],
  
  // Allowed Limits
  allowedLimits: [50, 100, 200, 300, 500],
  defaultLimit: 100
}

// Validar configurações obrigatórias
export function validateConfig() {
  const required = ['supabaseUrl', 'supabaseAnonKey']
  const missing = required.filter(key => !config[key])
  
  if (missing.length > 0) {
    throw new Error(`Configurações obrigatórias faltando: ${missing.join(', ')}`)
  }
}

export default config
