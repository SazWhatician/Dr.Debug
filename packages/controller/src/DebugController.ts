import { ConsoleInterceptor } from './interceptors/console.js'
import { MemoryInterceptor } from './interceptors/memory.js'
import { NetworkInterceptor } from './interceptors/network.js'
import { PerformanceInterceptor } from './interceptors/performance.js'
import { computeCorrelations, debugStateToString } from './serializer.js'
import type {
  ConsoleEntry,
  DebugState,
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
  private startTime: number = Date.now()
  private isRunning = false

  constructor(maxBufferSize = 100) {
    this.consoleInterceptor = new ConsoleInterceptor(maxBufferSize)
    this.networkInterceptor = new NetworkInterceptor(maxBufferSize)
    this.performanceInterceptor = new PerformanceInterceptor()
    this.memoryInterceptor = new MemoryInterceptor()
  }

  public init(): void {
    if (this.isRunning) return
    this.startTime = Date.now()
    this.consoleInterceptor.init()
    this.networkInterceptor.init()
    this.performanceInterceptor.init()
    this.isRunning = true
  }

  public getSnapshot(): DebugState {
    const consoleEntries = this.consoleInterceptor.getEntries()
    const networkRecords = this.networkInterceptor.getRecords()
    const performanceMetrics = this.performanceInterceptor.getMetrics()
    const memorySnapshot = this.memoryInterceptor.sample()

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
      correlations: []
    }

    state.correlations = computeCorrelations(state)
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

  public getCorrelations(): TemporalCorrelation[] {
    const state = this.getSnapshot()
    return computeCorrelations(state)
  }

  public clear(): void {
    this.consoleInterceptor.clear()
    this.networkInterceptor.clear()
    this.performanceInterceptor.clear()
    this.memoryInterceptor.clear()
  }

  public destroy(): void {
    if (!this.isRunning) return
    this.consoleInterceptor.destroy()
    this.networkInterceptor.destroy()
    this.performanceInterceptor.destroy()
    this.isRunning = false
  }
}
