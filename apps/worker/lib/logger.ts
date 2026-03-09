export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  error?: Error
}

class Logger {
  private context?: Record<string, any>

  constructor(context?: Record<string, any>) {
    this.context = context
  }

  private formatLog(entry: LogEntry): string {
    const data: Record<string, any> = {
      timestamp: entry.timestamp,
      level: entry.level,
      message: entry.message,
      ...(this.context && { context: this.context }),
      ...(entry.context && { data: entry.context }),
      ...(entry.error && {
        error: {
          name: entry.error.name,
          message: entry.error.message,
          stack: entry.error.stack,
        },
      }),
    }

    return JSON.stringify(data)
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
    }

    const formatted = this.formatLog(entry)

    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      case LogLevel.DEBUG:
        console.debug(formatted)
        break
      default:
        console.log(formatted)
    }

    return entry
  }

  debug(message: string, context?: Record<string, any>) {
    return this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, any>) {
    return this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    return this.log(LogLevel.WARN, message, context)
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    return this.log(LogLevel.ERROR, message, context, error)
  }

  withContext(context: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...context })
  }
}

export const logger = new Logger()

export function createLogger(context?: Record<string, any>): Logger {
  return new Logger(context)
}
