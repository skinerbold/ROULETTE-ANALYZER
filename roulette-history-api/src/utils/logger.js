import config from '../config/index.js'

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
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

class Logger {
  constructor() {
    this.currentLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info
    this.serviceName = 'roulette-history-api'
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

  // Método específico para requests HTTP
  request(method, path, statusCode, duration, meta = {}) {
    const level = statusCode >= 400 ? 'warn' : 'info'
    const color = statusCode >= 500 ? COLORS.red : statusCode >= 400 ? COLORS.yellow : COLORS.green
    
    const message = `${method} ${path} ${statusCode} ${duration}ms`
    
    if (this._shouldLog(level)) {
      console.log(
        this._colorize(this._format(level, message, meta), color)
      )
    }
  }
}

export const logger = new Logger()
export default logger
