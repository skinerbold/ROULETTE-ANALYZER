import dotenv from 'dotenv'

dotenv.config()

export const config = {
  // WebSocket
  websocketUrl: process.env.WEBSOCKET_URL || 'wss://roulette-websocket-server-production.up.railway.app',
  
  // Reconnect
  reconnectDelay: parseInt(process.env.RECONNECT_DELAY_MS) || 5000,
  maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS) || 999999,
  
  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Health Check
  healthCheckPort: parseInt(process.env.HEALTH_CHECK_PORT) || 3000,
  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL_MS) || 60000,
  
  // Metrics
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  metricsInterval: parseInt(process.env.METRICS_INTERVAL_MS) || 300000,
  
  // Allowed Roulettes (mesmo filtro do front-end)
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
  
  // Mapeamento de nomes do servidor para IDs internos
  rouletteNameToId: {
    // Evolution Gaming
    'First Person Roulette': 'first-person-roulette',
    'Instant Roulette': 'instant-roulette',
    'Lightning Roulette': 'lightning-roulette',
    'Speed Roulette': 'speed-roulette',
    
    // Pragmatic Play
    'Auto Roulette': 'pragmatic-auto-roulette',
    'Auto-Roulette': 'pragmatic-auto-roulette',
    'Roulette': 'pragmatic-roulette',
    'Speed Auto Roulette': 'pragmatic-speed-auto-roulette',
    'pragmatic-speed-auto-roulette': 'pragmatic-speed-auto-roulette', // Já vem como ID
    'Mega Roulette': 'pragmatic-mega-roulette',
    'Auto Mega Roulette': 'pragmatic-mega-roulette',
    'Power Up Roulette': 'pragmatic-powerup-roulette'
  }
}

export default config
