import { ConsoleInterceptor } from './interceptors/console.js'
import { DockerInterceptor } from './interceptors/docker.js'
import { MemoryInterceptor } from './interceptors/memory.js'
import { NetworkInterceptor } from './interceptors/network.js'
import { PerformanceInterceptor } from './interceptors/performance.js'
import { buildCausalErrorGraph, computeCorrelations, debugStateToString } from './serializer.js'
import type {
  CausalErrorGraph,
  ConsoleEntry,
  DebugState,
  DockerContainerInfo,
  DockerLogEntry,
  LogLevel,
  MemorySnapshot,
  NetworkRecord,
  PageContext,
  PerformanceMetrics,
  SerializerOptions,
  TemporalCorrelation
} from './types.js'

export class DebugController {
  private consoleInterceptor: ConsoleInterceptor
  private networkInterceptor: NetworkInterceptor
  private performanceInterceptor: PerformanceInterceptor
  private memoryInterceptor: MemoryInterceptor
  private dockerInterceptor: DockerInterceptor
  private startTime: number = Date.now()
  private isRunning = false

  constructor(maxBufferSize = 100) {
    this.consoleInterceptor = new ConsoleInterceptor(maxBufferSize)
    this.networkInterceptor = new NetworkInterceptor(maxBufferSize)
    this.performanceInterceptor = new PerformanceInterceptor()
    this.memoryInterceptor = new MemoryInterceptor()
    this.dockerInterceptor = new DockerInterceptor(maxBufferSize)
  }

  public init(): void {
    if (this.isRunning) return
    this.startTime = Date.now()
    this.consoleInterceptor.init()
    this.networkInterceptor.init()
    this.performanceInterceptor.init()
    this.dockerInterceptor.init()
    this.isRunning = true
  }

  public getSnapshot(): DebugState {
    const consoleEntries = this.consoleInterceptor.getEntries()
    const networkRecords = this.networkInterceptor.getRecords()
    const performanceMetrics = this.performanceInterceptor.getMetrics()
    const memorySnapshot = this.memoryInterceptor.sample()
    const dockerContainers = this.dockerInterceptor.getContainers()
    const dockerLogs = this.dockerInterceptor.getLogs()
    const dockerStatus = this.dockerInterceptor.getStatus()

    const errors = consoleEntries.filter((e) => e.level === 'error')
    const warns = consoleEntries.filter((e) => e.level === 'warn')
    const failedNet = networkRecords.filter((r) => r.isFailed)
    const slowNet = networkRecords.filter((r) => r.isSlow)

    const pageContext: PageContext = {
      url: typeof window !== 'undefined' ? window.location?.href || '' : '',
      title: typeof document !== 'undefined' ? document.title || '' : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
      uptimeSeconds: (Date.now() - this.startTime) / 1000,
      timestamp: Date.now()
    }

    const state: DebugState = {
      pageContext,
      console: {
        total: consoleEntries.length,
        errorCount: errors.length,
        warnCount: warns.length,
        entries: consoleEntries
      },
      network: {
        total: networkRecords.length,
        failedCount: failedNet.length,
        slowCount: slowNet.length,
        records: networkRecords
      },
      performance: performanceMetrics,
      memory: memorySnapshot,
      docker: {
        isAvailable: dockerStatus.isAvailable,
        containers: dockerContainers,
        logs: dockerLogs,
        errorCount: dockerStatus.errorCount
      },
      correlations: []
    }

    state.correlations = computeCorrelations(state)
    state.causalGraph = buildCausalErrorGraph(state)
    return state
  }

  public serialize(options?: SerializerOptions): string {
    const state = this.getSnapshot()
    return debugStateToString(state, options)
  }

  public getConsoleEntries(): ConsoleEntry[] {
    return this.consoleInterceptor.getEntries()
  }

  public getNetworkRecords(): NetworkRecord[] {
    return this.networkInterceptor.getRecords()
  }

  public getPerformanceMetrics(): PerformanceMetrics {
    return this.performanceInterceptor.getMetrics()
  }

  public getMemorySnapshot(): MemorySnapshot | null {
    return this.memoryInterceptor.sample()
  }

  public getDockerLogs(options?: {
    container?: string
    level?: LogLevel | 'all'
    grep?: string
    tail?: number
    sinceSeconds?: number
  }): DockerLogEntry[] {
    return this.dockerInterceptor.getLogs(options)
  }

  public getDockerContainers(): DockerContainerInfo[] {
    return this.dockerInterceptor.getContainers()
  }

  public pushDockerLog(
    containerName: string,
    message: string,
    stream: 'stdout' | 'stderr' = 'stdout',
    timestamp?: number,
    level?: LogLevel
  ): DockerLogEntry {
    return this.dockerInterceptor.pushLog(containerName, message, stream, timestamp, level)
  }

  public setDockerContainers(containers: DockerContainerInfo[]): void {
    this.dockerInterceptor.setContainers(containers)
  }

  public getCorrelations(): TemporalCorrelation[] {
    return this.getSnapshot().correlations
  }

  public getCausalGraph(options?: { timeframeMs?: number; includeDocker?: boolean }): CausalErrorGraph {
    const state = this.getSnapshot()
    return buildCausalErrorGraph(state, options)
  }

  public clear(): void {
    this.consoleInterceptor.clear()
    this.networkInterceptor.clear()
    this.performanceInterceptor.clear()
    this.memoryInterceptor.clear()
    this.dockerInterceptor.clear()
  }

  public destroy(): void {
    if (!this.isRunning) return
    this.consoleInterceptor.destroy()
    this.networkInterceptor.destroy()
    this.performanceInterceptor.destroy()
    this.dockerInterceptor.destroy()
    this.isRunning = false
  }
}
