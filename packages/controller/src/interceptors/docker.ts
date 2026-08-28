import type { DockerContainerInfo, DockerLogEntry, LogLevel } from '../types.js'

export class DockerInterceptor {
  private logRingBuffer: DockerLogEntry[] = []
  private containers: Map<string, DockerContainerInfo> = new Map()
  private maxBufferSize: number
  private isAvailable: boolean = false
  private logCounter = 0

  constructor(maxBufferSize = 100) {
    this.maxBufferSize = maxBufferSize
  }

  public init(): void {
    this.isAvailable = true
  }

  public setContainers(containers: DockerContainerInfo[]): void {
    this.containers.clear()
    containers.forEach((c) => this.containers.set(c.name || c.id, c))
    this.isAvailable = true
  }

  public getContainers(): DockerContainerInfo[] {
    return Array.from(this.containers.values())
  }

  public pushLog(
    containerName: string,
    rawMessage: string,
    stream: 'stdout' | 'stderr' = 'stdout',
    customTimestamp?: number,
    customLevel?: LogLevel
  ): DockerLogEntry {
    this.logCounter++
    const cleanMessage = (rawMessage || '').trim()

    // 1. Infer Timestamp if not provided (check ISO regex)
    let timestamp = customTimestamp || Date.now()
    const isoMatch = cleanMessage.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/)
    if (!customTimestamp && isoMatch) {
      const parsed = Date.parse(isoMatch[0])
      if (!isNaN(parsed)) {
        timestamp = parsed
      }
    }

    // 2. Infer Log Level
    let level: LogLevel = customLevel || 'info'
    if (!customLevel) {
      const upper = cleanMessage.toUpperCase()
      if (
        stream === 'stderr' ||
        upper.includes('ERROR') ||
        upper.includes('FATAL') ||
        upper.includes('PANIC') ||
        upper.includes('EXCEPTION') ||
        upper.includes('FAIL') ||
        upper.includes('CRITICAL') ||
        upper.includes('ERR_') ||
        upper.includes('TRACEBACK')
      ) {
        level = 'error'
      } else if (upper.includes('WARN')) {
        level = 'warn'
      } else if (upper.includes('DEBUG')) {
        level = 'log'
      }
    }

    const entry: DockerLogEntry = {
      id: `doc_${this.logCounter}_${Date.now()}`,
      containerName: containerName || 'default',
      timestamp,
      stream,
      message: cleanMessage,
      level
    }

    // Ring buffer eviction
    if (this.logRingBuffer.length >= this.maxBufferSize) {
      this.logRingBuffer.shift()
    }
    this.logRingBuffer.push(entry)
    this.isAvailable = true

    return entry
  }

  public getLogs(options?: {
    container?: string
    level?: LogLevel | 'all'
    grep?: string
    tail?: number
    sinceSeconds?: number
  }): DockerLogEntry[] {
    let result = [...this.logRingBuffer]

    if (options?.container && options.container !== 'all') {
      const target = options.container.toLowerCase()
      result = result.filter(
        (entry) =>
          entry.containerName.toLowerCase() === target ||
          entry.containerName.toLowerCase().includes(target)
      )
    }

    if (options?.level && options.level !== 'all') {
      result = result.filter((entry) => entry.level === options.level)
    }

    if (options?.grep) {
      try {
        const regex = new RegExp(options.grep, 'i')
        result = result.filter((entry) => regex.test(entry.message))
      } catch {
        const query = options.grep.toLowerCase()
        result = result.filter((entry) => entry.message.toLowerCase().includes(query))
      }
    }

    if (options?.sinceSeconds && options.sinceSeconds > 0) {
      const cutoff = Date.now() - options.sinceSeconds * 1000
      result = result.filter((entry) => entry.timestamp >= cutoff)
    }

    if (options?.tail && options.tail > 0) {
      result = result.slice(-options.tail)
    }

    return result
  }

  public getStatus(): { isAvailable: boolean; containerCount: number; errorCount: number } {
    const errorCount = this.logRingBuffer.filter((l) => l.level === 'error').length
    return {
      isAvailable: this.isAvailable || this.logRingBuffer.length > 0,
      containerCount: this.containers.size,
      errorCount
    }
  }

  public clear(): void {
    this.logRingBuffer = []
    this.logCounter = 0
  }

  public destroy(): void {
    this.clear()
    this.containers.clear()
    this.isAvailable = false
  }
}
