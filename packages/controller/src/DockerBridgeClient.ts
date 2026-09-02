import type { DockerContainerInfo, DockerLogEntry } from './types.js'

export interface DockerBridgeClientOptions {
  port?: number
  host?: string
  autoReconnect?: boolean
  reconnectIntervalMs?: number
  onStatusChange?: (status: { connected: boolean; daemonRunning: boolean; error?: string }) => void
  onContainers?: (containers: DockerContainerInfo[]) => void
  onLog?: (entry: DockerLogEntry) => void
}

export class DockerBridgeClient {
  private port: number
  private host: string
  private autoReconnect: boolean
  private reconnectIntervalMs: number
  private eventSource: EventSource | null = null
  private isConnected = false
  private daemonRunning = false
  private lastError?: string
  private reconnectTimer?: any
  private options: DockerBridgeClientOptions

  constructor(options: DockerBridgeClientOptions = {}) {
    this.options = options
    this.port = options.port || 9229
    this.host = options.host || 'localhost'
    this.autoReconnect = options.autoReconnect !== false
    this.reconnectIntervalMs = options.reconnectIntervalMs || 5000
  }

  public connect(): void {
    if (typeof window === 'undefined' && typeof EventSource === 'undefined') {
      return
    }

    if (this.eventSource) {
      this.disconnect()
    }

    const streamUrl = `http://${this.host}:${this.port}/docker/stream`

    try {
      this.eventSource = new EventSource(streamUrl)

      this.eventSource.onopen = () => {
        this.isConnected = true
        this.lastError = undefined
        this.notifyStatus()
      }

      this.eventSource.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data)

          if (data.type === 'INIT') {
            this.isConnected = true
            this.daemonRunning = data.status?.daemonRunning ?? true
            if (data.containers && this.options.onContainers) {
              this.options.onContainers(data.containers)
            }
            if (data.recentLogs && Array.isArray(data.recentLogs) && this.options.onLog) {
              data.recentLogs.forEach((l: DockerLogEntry) => this.options.onLog?.(l))
            }
            this.notifyStatus()
          } else if (data.type === 'CONTAINERS') {
            if (this.options.onContainers) {
              this.options.onContainers(data.containers)
            }
          } else if (data.type === 'LOG') {
            if (data.entry && this.options.onLog) {
              this.options.onLog(data.entry)
            }
          }
        } catch {
          // Ignore json parse error on keepalive comments
        }
      }

      this.eventSource.onerror = () => {
        this.isConnected = false
        this.lastError = 'Disconnected from Docker Bridge daemon'
        this.notifyStatus()
        this.eventSource?.close()
        this.eventSource = null

        if (this.autoReconnect && !this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.connect()
          }, this.reconnectIntervalMs)
        }
      }
    } catch (err: any) {
      this.isConnected = false
      this.lastError = err.message
      this.notifyStatus()
    }
  }

  public async fetchStatus(): Promise<{ connected: boolean; daemonRunning: boolean; error?: string }> {
    try {
      const res = await fetch(`http://${this.host}:${this.port}/docker/status`)
      if (res.ok) {
        const status = await res.json()
        this.daemonRunning = status.daemonRunning
        return {
          connected: true,
          daemonRunning: status.daemonRunning,
          error: status.error
        }
      }
    } catch {
      // offline
    }
    return {
      connected: false,
      daemonRunning: false,
      error: 'Docker bridge service offline on port ' + this.port
    }
  }

  public async fetchContainers(): Promise<DockerContainerInfo[]> {
    try {
      const res = await fetch(`http://${this.host}:${this.port}/docker/containers`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // ignore
    }
    return []
  }

  public async fetchLogs(options?: {
    container?: string
    level?: string
    grep?: string
    tail?: number
  }): Promise<DockerLogEntry[]> {
    try {
      const params = new URLSearchParams()
      if (options?.container) params.set('container', options.container)
      if (options?.level) params.set('level', options.level)
      if (options?.grep) params.set('grep', options.grep)
      if (options?.tail) params.set('tail', String(options.tail))

      const res = await fetch(`http://${this.host}:${this.port}/docker/logs?${params.toString()}`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // ignore
    }
    return []
  }

  private notifyStatus(): void {
    if (this.options.onStatusChange) {
      this.options.onStatusChange({
        connected: this.isConnected,
        daemonRunning: this.daemonRunning,
        error: this.lastError
      })
    }
  }

  public getStatus(): { connected: boolean; daemonRunning: boolean; error?: string } {
    return {
      connected: this.isConnected,
      daemonRunning: this.daemonRunning,
      error: this.lastError
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.isConnected = false
    this.notifyStatus()
  }
}
