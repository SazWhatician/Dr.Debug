export type LogLevel = 'error' | 'warn' | 'info' | 'log'

export type ConsoleEntryType =
  | 'uncaught_error'
  | 'unhandled_rejection'
  | 'console_error'
  | 'console_warn'
  | 'console_info'
  | 'console_log'

export interface StackFrame {
  functionName?: string
  filename?: string
  lineno?: number
  colno?: number
  raw?: string
}

export interface ConsoleEntry {
  id: string
  type: ConsoleEntryType
  level: LogLevel
  timestamp: number
  message: string
  args?: any[]
  stack?: string
  parsedStack?: StackFrame[]
  count: number
  firstSeen: number
  lastSeen: number
}

export interface NetworkRecord {
  id: string
  method: string
  url: string
  startTime: number
  endTime?: number
  duration?: number
  status?: number
  statusText?: string
  isCORS?: boolean
  isFailed?: boolean
  isSlow?: boolean
  requestHeaders?: Record<string, string>
  responseHeaders?: Record<string, string>
  requestBodyPreview?: string
  responseBodyPreview?: string
  error?: string
  initiator?: string
}

export interface LongTaskEntry {
  startTime: number
  duration: number
  name?: string
  attribution?: any
}

export interface WebVitalMetric {
  name: 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta?: number
  attribution?: string
}

export interface PerformanceMetrics {
  longTasks: LongTaskEntry[]
  vitals: Record<string, WebVitalMetric>
  slowResources: Array<{
    name: string
    duration: number
    size?: number
    initiatorType?: string
  }>
}

export interface MemorySnapshot {
  timestamp: number
  usedJSHeapSize?: number
  totalJSHeapSize?: number
  jsHeapSizeLimit?: number
  heapUsagePercent?: number
  detachedNodesCount?: number
  trendMBPerMin?: number
}

export interface DockerContainerInfo {
  id: string
  name: string
  image: string
  state: 'running' | 'exited' | 'restarting' | 'paused' | string
  status: string
  ports?: string[]
}

export interface DockerLogEntry {
  id: string
  containerName: string
  timestamp: number
  stream: 'stdout' | 'stderr'
  message: string
  level: LogLevel
}

export interface ErrorGraphNode {
  id: string
  label: string
  layer: 'docker' | 'network' | 'console' | 'dom'
  summary: string
  timestamp: number
  metadata?: Record<string, any>
  isRootCause?: boolean
}

export interface ErrorGraphEdge {
  id: string
  source: string
  target: string
  label: string
  timeDeltaMs?: number
  confidence: number
  relationship: 'CAUSED_BY' | 'TRIGGERED_BY' | 'CORRELATED_WITH' | 'PROPAGATED_TO'
}

export interface CausalErrorGraph {
  nodes: ErrorGraphNode[]
  edges: ErrorGraphEdge[]
  rootCauseNodeId?: string
  mermaidDiagram: string
}

export interface TemporalCorrelation {
  id: string
  description: string
  likelihood: 'high' | 'medium' | 'low'
  sourceEvent: {
    type: 'network' | 'console' | 'performance' | 'docker'
    id: string
    summary: string
    timestamp: number
  }
  targetEvent: {
    type: 'network' | 'console' | 'performance' | 'docker'
    id: string
    summary: string
    timestamp: number
  }
  timeDeltaMs: number
}

export interface PageContext {
  url: string
  title: string
  userAgent: string
  framework?: string
  uptimeSeconds: number
  timestamp: number
}

export interface DebugState {
  pageContext: PageContext
  console: {
    total: number
    errorCount: number
    warnCount: number
    entries: ConsoleEntry[]
  }
  network: {
    total: number
    failedCount: number
    slowCount: number
    records: NetworkRecord[]
  }
  performance: PerformanceMetrics
  memory: MemorySnapshot | null
  docker?: {
    isAvailable: boolean
    containers: DockerContainerInfo[]
    logs: DockerLogEntry[]
    errorCount: number
  }
  correlations: TemporalCorrelation[]
  causalGraph?: CausalErrorGraph
}

export interface SerializerOptions {
  maxConsoleEntries?: number
  maxNetworkEntries?: number
  maxDockerEntries?: number
  tokenBudget?: number
  includeMemory?: boolean
  includePerformance?: boolean
  includeDocker?: boolean
  includeGraph?: boolean
}

