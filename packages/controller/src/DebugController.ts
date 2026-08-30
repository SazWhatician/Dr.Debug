import { ConsoleInterceptor } from './interceptors/console.js'
import { DockerInterceptor } from './interceptors/docker.js'
import { FrameworkInterceptor } from './interceptors/framework.js'
import { InteractionInterceptor } from './interceptors/interaction.js'
import { LayoutInspector } from './interceptors/layoutInspector.js'
import { MemoryInterceptor } from './interceptors/memory.js'
import { NetworkInterceptor } from './interceptors/network.js'
import { NetworkMockInterceptor } from './interceptors/networkMock.js'
import { PerformanceInterceptor } from './interceptors/performance.js'
import { SQLQueryCorrelator } from './interceptors/sqlCorrelator.js'
import {
  buildCausalErrorGraph,
  computeCorrelations,
  computeDiagnosticMatrix,
  debugStateToString,
  generateUnifiedAIDebugPrompt,
  getErrorHistogram,
  type ErrorHistogramBucket
} from './serializer.js'
import type {
  CausalErrorGraph,
  ConsoleEntry,
  DebugState,
  DiagnosticMatrixSnapshot,
  DockerContainerInfo,
  DockerLogEntry,
  FrameworkState,
  InteractionEvent,
  LayoutAnomaly,
  LogLevel,
  MemorySnapshot,
  NetworkMockRule,
  NetworkRecord,
  PageContext,
  PerformanceMetrics,
  SQLQueryCorrelation,
  SerializerOptions,
  TemporalCorrelation
} from './types.js'

export class DebugController {
  private consoleInterceptor: ConsoleInterceptor
  private networkInterceptor: NetworkInterceptor
  private performanceInterceptor: PerformanceInterceptor
  private memoryInterceptor: MemoryInterceptor
  private dockerInterceptor: DockerInterceptor
  private frameworkInterceptor: FrameworkInterceptor
  private interactionInterceptor: InteractionInterceptor
  private networkMockInterceptor: NetworkMockInterceptor
  private layoutInspector: LayoutInspector
  private sqlQueryCorrelator: SQLQueryCorrelator
  private startTime: number = Date.now()
  private isRunning = false

  constructor(maxBufferSize = 100) {
    this.consoleInterceptor = new ConsoleInterceptor(maxBufferSize)
    this.networkInterceptor = new NetworkInterceptor(maxBufferSize)
    this.performanceInterceptor = new PerformanceInterceptor()
    this.memoryInterceptor = new MemoryInterceptor()
    this.dockerInterceptor = new DockerInterceptor(maxBufferSize)
    this.frameworkInterceptor = new FrameworkInterceptor(maxBufferSize)
    this.interactionInterceptor = new InteractionInterceptor()
    this.networkMockInterceptor = new NetworkMockInterceptor()
    this.layoutInspector = new LayoutInspector()
    this.sqlQueryCorrelator = new SQLQueryCorrelator()
  }

  public init(): void {
    if (this.isRunning) return
    this.startTime = Date.now()
    this.consoleInterceptor.init()
    this.networkInterceptor.init()
    this.performanceInterceptor.init()
    this.dockerInterceptor.init()
    this.frameworkInterceptor.init()
    this.interactionInterceptor.init()
    this.networkMockInterceptor.init()
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
      correlations: [],
      framework: this.frameworkInterceptor.getFrameworkState(),
      interactions: this.interactionInterceptor.getReplaySequence()
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

  public getUnifiedAIDebugPrompt(targetId?: string): string {
    const state = this.getSnapshot()
    return generateUnifiedAIDebugPrompt(targetId, state)
  }

  public getErrorHistogram(bucketCount = 10): ErrorHistogramBucket[] {
    const state = this.getSnapshot()
    return getErrorHistogram(state, bucketCount)
  }

  public getDiagnosticMatrix(): DiagnosticMatrixSnapshot {
    const state = this.getSnapshot()
    return computeDiagnosticMatrix(state)
  }

  public getFrameworkState(): FrameworkState {
    return this.frameworkInterceptor.getFrameworkState()
  }

  public getInteractionReplay(): InteractionEvent[] {
    return this.interactionInterceptor.getReplaySequence()
  }

  public getInteractionReplayHuman(): string {
    return this.interactionInterceptor.getHumanReadableReplay()
  }

  public mockNetworkResponse(
    urlPattern: string,
    mockStatus: number,
    mockBody: string,
    method?: string,
    mockHeaders?: Record<string, string>
  ): NetworkMockRule {
    return this.networkMockInterceptor.addRule({
      urlPattern,
      mockStatus,
      mockBody,
      method,
      mockHeaders,
      isActive: true
    })
  }

  public getMockRules(): NetworkMockRule[] {
    return this.networkMockInterceptor.getRules()
  }

  public removeMockRule(id: string): boolean {
    return this.networkMockInterceptor.removeRule(id)
  }

  public getLayoutAnomalies(targetSelector?: string): LayoutAnomaly[] {
    return this.layoutInspector.inspect(targetSelector)
  }

  public getSQLCorrelations(): SQLQueryCorrelation[] {
    return this.sqlQueryCorrelator.correlate(this.getNetworkRecords())
  }


  public clear(): void {
    this.consoleInterceptor.clear()
    this.networkInterceptor.clear()
    this.performanceInterceptor.clear()
    this.memoryInterceptor.clear()
    this.dockerInterceptor.clear()
    this.frameworkInterceptor.clear()
    this.interactionInterceptor.clear()
  }

  public destroy(): void {
    if (!this.isRunning) return
    this.consoleInterceptor.destroy()
    this.networkInterceptor.destroy()
    this.performanceInterceptor.destroy()
    this.dockerInterceptor.destroy()
    this.frameworkInterceptor.destroy()
    this.interactionInterceptor.destroy()
    this.networkMockInterceptor.destroy()
    this.isRunning = false
  }
}
