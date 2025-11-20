import config from '../config/websocket.js'

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m'
}

class Logger {
  constructor() {
    this.currentLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info
    this.serviceName = 'roulette-history-worker'
  }

  _format(level, message, meta = {}) {
    const timestamp = new Date().toISOString()
    const metaStr = Object.keys(meta).length > 0 
      ? `\n  ${JSON.stringify(meta, null, 2).split('\n').join('\n  ')}`
      : ''
    
    return `[${timestamp}] [${level.toUpperCase()}] [${this.serviceName}] ${message}${metaStr}`
  }

  _colorize(text, color) {
    if (config.nodeEnv === 'production') {
      return text
    }
    return `${color}${text}${COLORS.reset}`
  }

  _shouldLog(level) {
    return LOG_LEVELS[level] >= this.currentLevel
  }

  debug(message, meta = {}) {
    if (!this._shouldLog('debug')) return
    console.log(
      this._colorize(this._format('debug', message, meta), COLORS.dim)
    )
  }

  info(message, meta = {}) {
    if (!this._shouldLog('info')) return
    console.log(
      this._colorize(this._format('info', message, meta), COLORS.cyan)
    )
  }

  warn(message, meta = {}) {
    if (!this._shouldLog('warn')) return
    console.warn(
      this._colorize(this._format('warn', message, meta), COLORS.yellow)
    )
  }

  error(message, meta = {}) {
    if (!this._shouldLog('error')) return
    console.error(
      this._colorize(this._format('error', message, meta), COLORS.red)
    )
  }

  success(message, meta = {}) {
    if (!this._shouldLog('info')) return
    console.log(
      this._colorize(this._format('info', message, meta), COLORS.green)
    )
  }

  // Métodos específicos para roulette operations
  rouletteUpdate(rouletteId, number, meta = {}) {
    this.info(`📊 Nova atualização para roleta: ${rouletteId}`, {
      rouletteId,
      number,
      ...meta
    })
  }

  dbOperation(operation, success, meta = {}) {
    if (success) {
      this.success(`✅ Operação DB concluída: ${operation}`, meta)
    } else {
      this.error(`❌ Falha na operação DB: ${operation}`, meta)
    }
  }

  websocketEvent(event, meta = {}) {
    this.info(`🔌 WebSocket event: ${event}`, meta)
  }

  metricsReport(metrics) {
    this.info('📈 Métricas do Worker', metrics)
  }
}

export const logger = new Logger()
export default logger
