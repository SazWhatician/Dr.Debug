import { spawn, type ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import type { DockerContainerInfo, DockerLogEntry, LogLevel } from '@dr-debug/controller'

export interface DockerBridgeStatus {
  isAvailable: boolean
  daemonRunning: boolean
  containerCount: number
  activeStreams: number
  error?: string
}

export class DockerBridge extends EventEmitter {
  private isAvailable = false
  private daemonRunning = false
  private containers: Map<string, DockerContainerInfo> = new Map()
  private activeStreams: Map<string, ChildProcess> = new Map()
  private pollInterval?: NodeJS.Timeout
  private logsBuffer: DockerLogEntry[] = []
  private maxLogsBuffer = 500
  private lastCheckError?: string

  constructor() {
    super()
  }

  public async start(): Promise<void> {
    await this.checkDockerAvailability()

    if (this.daemonRunning) {
      await this.refreshContainers()
      this.startContainerPolling(5000)
    } else {
      // Recheck availability periodically in case Docker Desktop is booted up
      this.pollInterval = setInterval(async () => {
        await this.checkDockerAvailability()
        if (this.daemonRunning) {
          if (this.pollInterval) clearInterval(this.pollInterval)
          await this.refreshContainers()
          this.startContainerPolling(5000)
        }
      }, 8000)
    }
  }

  public async checkDockerAvailability(): Promise<DockerBridgeStatus> {
    return new Promise((resolve) => {
      try {
        const proc = spawn('docker', ['version', '--format', '{{.Server.Version}}'])

        let stdout = ''
        let stderr = ''

        proc.stdout?.on('data', (d) => {
          stdout += d.toString()
        })
        proc.stderr?.on('data', (d) => {
          stderr += d.toString()
        })

        proc.on('error', (err) => {
          this.isAvailable = false
          this.daemonRunning = false
          this.lastCheckError = `Docker CLI not found or failed: ${err.message}`
          resolve(this.getStatus())
        })

        proc.on('close', (code) => {
          if (code === 0 && stdout.trim().length > 0) {
            this.isAvailable = true
            this.daemonRunning = true
            this.lastCheckError = undefined
          } else {
            this.isAvailable = true // CLI exists
            this.daemonRunning = false // Daemon is stopped
            this.lastCheckError = stderr.trim() || 'Docker daemon is not running'
          }
          resolve(this.getStatus())
        })
      } catch (err: any) {
        this.isAvailable = false
        this.daemonRunning = false
        this.lastCheckError = err.message
        resolve(this.getStatus())
      }
    })
  }

  public async refreshContainers(): Promise<DockerContainerInfo[]> {
    if (!this.daemonRunning) return []

    return new Promise((resolve) => {
      try {
        const proc = spawn('docker', ['ps', '--format', '{{json .}}'])
        let output = ''

        proc.stdout?.on('data', (d) => {
          output += d.toString()
        })

        proc.on('close', (code) => {
          if (code === 0) {
            const lines = output.split('\n').filter((l) => l.trim().length > 0)
            const currentNames = new Set<string>()

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line)
                const name = parsed.Names || parsed.ID || 'unknown'
                currentNames.add(name)

                const info: DockerContainerInfo = {
                  id: parsed.ID,
                  name,
                  image: parsed.Image,
                  status: parsed.Status,
                  state: (parsed.State || 'running').toLowerCase() as any,
                  ports: parsed.Ports ? parsed.Ports.split(',').map((p: string) => p.trim()) : []
                }

                this.containers.set(name, info)

                // Start streaming logs for this container if not already streaming
                if (!this.activeStreams.has(name)) {
                  this.attachLogStream(name)
                }
              } catch {
                // Ignore parse errors on individual lines
              }
            }

            // Cleanup streams for removed containers
            for (const [name, stream] of this.activeStreams.entries()) {
              if (!currentNames.has(name)) {
                stream.kill()
                this.activeStreams.delete(name)
                this.containers.delete(name)
              }
            }

            this.emit('containers', this.getContainers())
            resolve(this.getContainers())
          } else {
            resolve(this.getContainers())
          }
        })

        proc.on('error', () => {
          resolve(this.getContainers())
        })
      } catch {
        resolve(this.getContainers())
      }
    })
  }

  private attachLogStream(containerName: string): void {
    if (this.activeStreams.has(containerName)) return

    try {
      // Follow logs with 50 lines of initial history and timestamps
      const proc = spawn('docker', ['logs', '--follow', '--tail', '50', '--timestamps', containerName])

      this.activeStreams.set(containerName, proc)

      const handleLogLine = (line: string, stream: 'stdout' | 'stderr') => {
        if (!line.trim()) return

        let timestamp = Date.now()
        let message = line.trim()

        // Extract ISO timestamp if present
        const isoMatch = message.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s+(.*)$/)
        if (isoMatch) {
          const parsed = Date.parse(isoMatch[1])
          if (!isNaN(parsed)) {
            timestamp = parsed
            message = isoMatch[2]
          }
        }

        const level = this.classifyLogLevel(message, stream)

        const entry: DockerLogEntry = {
          id: `docker_${containerName}_${timestamp}_${Math.random().toString(36).slice(2, 7)}`,
          containerName,
          timestamp,
          stream,
          message,
          level
        }

        if (this.logsBuffer.length >= this.maxLogsBuffer) {
          this.logsBuffer.shift()
        }
        this.logsBuffer.push(entry)

        this.emit('log', entry)
      }

      proc.stdout?.on('data', (d) => {
        const lines = d.toString().split('\n')
        lines.forEach((l: string) => handleLogLine(l, 'stdout'))
      })

      proc.stderr?.on('data', (d) => {
        const lines = d.toString().split('\n')
        lines.forEach((l: string) => handleLogLine(l, 'stderr'))
      })

      proc.on('close', () => {
        this.activeStreams.delete(containerName)
      })

      proc.on('error', () => {
        this.activeStreams.delete(containerName)
      })
    } catch {
      // Ignore spawn errors
    }
  }

  public classifyLogLevel(msg: string, stream: 'stdout' | 'stderr'): LogLevel {
    const upper = msg.toUpperCase()
    if (
      stream === 'stderr' ||
      upper.includes('FATAL') ||
      upper.includes('PANIC') ||
      upper.includes('ERROR') ||
      upper.includes('EXCEPTION') ||
      upper.includes('FAIL') ||
      upper.includes('ERR_') ||
      upper.includes('TRACEBACK') ||
      upper.includes('CRITICAL')
    ) {
      return 'error'
    }
    if (upper.includes('WARN')) {
      return 'warn'
    }
    if (upper.includes('DEBUG')) {
      return 'log'
    }
    return 'info'
  }

  private startContainerPolling(intervalMs = 5000): void {
    if (this.pollInterval) clearInterval(this.pollInterval)
    this.pollInterval = setInterval(() => {
      this.refreshContainers()
    }, intervalMs)
  }

  public getContainers(): DockerContainerInfo[] {
    return Array.from(this.containers.values())
  }

  public getLogs(options?: {
    container?: string
    level?: LogLevel | 'all'
    grep?: string
    tail?: number
  }): DockerLogEntry[] {
    let result = [...this.logsBuffer]

    if (options?.container && options.container !== 'all') {
      const target = options.container.toLowerCase()
      result = result.filter((l) => l.containerName.toLowerCase().includes(target))
    }

    if (options?.level && options.level !== 'all') {
      result = result.filter((l) => l.level === options.level)
    }

    if (options?.grep) {
      const q = options.grep.toLowerCase()
      result = result.filter((l) => l.message.toLowerCase().includes(q))
    }

    if (options?.tail && options.tail > 0) {
      result = result.slice(-options.tail)
    }

    return result
  }

  public getStatus(): DockerBridgeStatus {
    return {
      isAvailable: this.isAvailable,
      daemonRunning: this.daemonRunning,
      containerCount: this.containers.size,
      activeStreams: this.activeStreams.size,
      error: this.lastCheckError
    }
  }

  public stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = undefined
    }

    for (const [name, stream] of this.activeStreams.entries()) {
      try {
        stream.kill()
      } catch {
        // ignore
      }
    }
    this.activeStreams.clear()
    this.containers.clear()
    this.logsBuffer = []
  }
}
