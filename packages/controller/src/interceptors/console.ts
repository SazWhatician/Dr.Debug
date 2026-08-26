import type { ConsoleEntry, ConsoleEntryType, LogLevel, StackFrame } from '../types.js'

export class ConsoleInterceptor {
  private ringBuffer: ConsoleEntry[] = []
  private maxEntries: number
  private isInstalled = false
  private originalConsole: Partial<Record<LogLevel, (...args: any[]) => void>> = {}
  private errorHandler?: (event: ErrorEvent) => void
  private rejectionHandler?: (event: PromiseRejectionEvent) => void

  constructor(maxEntries = 100) {
    this.maxEntries = maxEntries
  }

  public init(): void {
    if (this.isInstalled || typeof window === 'undefined') return

    // 1. Uncaught Runtime Errors
    this.errorHandler = (event: ErrorEvent) => {
      const parsed = this.parseStack(event.error?.stack || '')
      this.push({
        id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'uncaught_error',
        level: 'error',
        timestamp: Date.now(),
        message: event.message || 'Uncaught Error',
        stack: event.error?.stack,
        parsedStack: parsed.length ? parsed : [
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            raw: `${event.filename}:${event.lineno}:${event.colno}`
          }
        ],
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      })
    }
    window.addEventListener('error', this.errorHandler)

    // 2. Unhandled Promise Rejections
    this.rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = typeof reason === 'object' && reason !== null
        ? reason.message || reason.toString()
        : String(reason || 'Unhandled Promise Rejection')
      const stack = typeof reason === 'object' && reason !== null ? reason.stack : undefined
      const parsed = stack ? this.parseStack(stack) : []

      this.push({
        id: `rej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'unhandled_rejection',
        level: 'error',
        timestamp: Date.now(),
        message: `Unhandled Rejection: ${message}`,
        stack,
        parsedStack: parsed,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      })
    }
    window.addEventListener('unhandledrejection', this.rejectionHandler)

    // 3. Prototype Interception for console.error, warn, info, log
    const levels: LogLevel[] = ['error', 'warn', 'info', 'log']
    levels.forEach((level) => {
      if (typeof console !== 'undefined' && console[level]) {
        this.originalConsole[level] = console[level].bind(console)
        const typeMap: Record<LogLevel, ConsoleEntryType> = {
          error: 'console_error',
          warn: 'console_warn',
          info: 'console_info',
          log: 'console_log'
        }

        console[level] = (...args: any[]) => {
          this.captureConsoleLog(level, typeMap[level], args)
          this.originalConsole[level]?.(...args)
        }
      }
    })

    this.isInstalled = true
  }

  private captureConsoleLog(level: LogLevel, type: ConsoleEntryType, args: any[]): void {
    const message = args
      .map((arg) => {
        if (typeof arg === 'string') return arg
        if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack || ''}`
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      })
      .join(' ')

    let stack: string | undefined
    if (level === 'error' || level === 'warn') {
      const err = args.find((a) => a instanceof Error)
      stack = err ? err.stack : new Error().stack
    }

    const parsed = stack ? this.parseStack(stack) : []

    this.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      level,
      timestamp: Date.now(),
      message,
      args: args.length > 1 ? args : undefined,
      stack,
      parsedStack: parsed,
      count: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now()
    })
  }

  private push(entry: ConsoleEntry): void {
    // Check for deduplication against the most recent entry if identical within 5 seconds
    const last = this.ringBuffer[this.ringBuffer.length - 1]
    if (
      last &&
      last.message === entry.message &&
      last.level === entry.level &&
      entry.timestamp - last.lastSeen < 10000
    ) {
      last.count += 1
      last.lastSeen = entry.timestamp
      return
    }

    this.ringBuffer.push(entry)
    if (this.ringBuffer.length > this.maxEntries) {
      this.ringBuffer.shift()
    }
  }

  private parseStack(stack: string): StackFrame[] {
    if (!stack) return []
    const lines = stack.split('\n')
    const frames: StackFrame[] = []

    // Standard V8 stack line: "    at functionName (filename:lineno:colno)"
    // Or: "    at filename:lineno:colno"
    const v8Regex = /^\s*at\s+(?:([^\s(]+)\s+\((.+):(\d+):(\d+)\)|(.+):(\d+):(\d+))\s*$/
    // Safari / Firefox: "functionName@filename:lineno:colno"
    const ffRegex = /^\s*(?:([^@]+)@)?(.+):(\d+):(\d+)\s*$/

    for (const line of lines) {
      const v8Match = line.match(v8Regex)
      if (v8Match) {
        if (v8Match[1]) {
          frames.push({
            functionName: v8Match[1],
            filename: v8Match[2],
            lineno: parseInt(v8Match[3], 10),
            colno: parseInt(v8Match[4], 10),
            raw: line.trim()
          })
        } else {
          frames.push({
            filename: v8Match[5],
            lineno: parseInt(v8Match[6], 10),
            colno: parseInt(v8Match[7], 10),
            raw: line.trim()
          })
        }
        continue
      }

      const ffMatch = line.match(ffRegex)
      if (ffMatch) {
        frames.push({
          functionName: ffMatch[1] || '<anonymous>',
          filename: ffMatch[2],
          lineno: parseInt(ffMatch[3], 10),
          colno: parseInt(ffMatch[4], 10),
          raw: line.trim()
        })
      }
    }

    return frames
  }

  public getEntries(): ConsoleEntry[] {
    return [...this.ringBuffer]
  }

  public getErrors(): ConsoleEntry[] {
    return this.ringBuffer.filter((e) => e.level === 'error')
  }

  public getWarnings(): ConsoleEntry[] {
    return this.ringBuffer.filter((e) => e.level === 'warn')
  }

  public clear(): void {
    this.ringBuffer = []
  }

  public destroy(): void {
    if (!this.isInstalled) return

    if (this.errorHandler && typeof window !== 'undefined') {
      window.removeEventListener('error', this.errorHandler)
    }
    if (this.rejectionHandler && typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.rejectionHandler)
    }

    const levels: LogLevel[] = ['error', 'warn', 'info', 'log']
    levels.forEach((level) => {
      if (this.originalConsole[level] && typeof console !== 'undefined') {
        console[level] = this.originalConsole[level]!
      }
    })

    this.isInstalled = false
  }
}
