type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  timestamp: number
}

interface LoggerConfig {
  level: LogLevel
  handler: (entry: LogEntry) => void
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

export class Logger {
  private config: LoggerConfig

  constructor(config: LoggerConfig) {
    this.config = config
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata)
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata)
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata)
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata)
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    if (LOG_LEVELS[level] >= LOG_LEVELS[this.config.level]) {
      this.config.handler({
        level,
        message,
        metadata,
        timestamp: Date.now()
      })
    }
  }
}