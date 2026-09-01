import type {
  CausalErrorGraph,
  DebugState,
  DiagnosticMatrixCell,
  DiagnosticMatrixSnapshot,
  ErrorGraphEdge,
  ErrorGraphNode,
  HttpStatusDetail,
  MatrixSeverity,
  MatrixSubstrate,
  NetworkRecord,
  SerializerOptions,
  TemporalCorrelation
} from './types.js'


export function computeCorrelations(state: DebugState): TemporalCorrelation[] {
  const correlations: TemporalCorrelation[] = []
  const failedRequests = state.network.records.filter((r) => r.isFailed)
  const errorEntries = state.console.entries.filter((e) => e.level === 'error')
  const dockerErrors = (state.docker?.logs || []).filter((l) => l.level === 'error')

  // 1. Docker Backend Error -> Network Failure Correlations
  for (const doc of dockerErrors) {
    for (const req of failedRequests) {
      const timeDelta = req.startTime - doc.timestamp
      // If docker error occurred within -1000ms to 3000ms of request
      if (timeDelta >= -1000 && timeDelta <= 3500) {
        const docSummary = `🐳 [${doc.containerName}] ${doc.message.slice(0, 70)}`
        const reqSummary = `🌐 ${req.method} ${req.url} [${req.status || 0}]`

        correlations.push({
          id: `corr_${doc.id}_${req.id}`,
          description: `Backend container [${doc.containerName}] panic at ${formatTime(doc.timestamp)} correlated with network failure [${req.method} ${req.url}] at ${formatTime(req.startTime)} (Δt: ${Math.abs(timeDelta)}ms)`,
          likelihood: Math.abs(timeDelta) <= 1500 ? 'high' : 'medium',
          sourceEvent: {
            type: 'docker',
            id: doc.id,
            summary: docSummary,
            timestamp: doc.timestamp
          },
          targetEvent: {
            type: 'network',
            id: req.id,
            summary: reqSummary,
            timestamp: req.startTime
          },
          timeDeltaMs: Math.abs(timeDelta)
        })
      }
    }
  }

  // 2. Network Failure -> Frontend Console Error Correlations
  for (const req of failedRequests) {
    for (const err of errorEntries) {
      const timeDelta = err.timestamp - req.startTime
      // If error occurred within 0ms to 4000ms after a network failure
      if (timeDelta >= 0 && timeDelta <= 4000) {
        const reqSummary = `${req.method} ${req.url} (Status: ${req.status || 0}${req.isCORS ? ' - CORS' : ''})`
        const errSummary = `${err.type}: ${err.message.slice(0, 80)}`

        correlations.push({
          id: `corr_${req.id}_${err.id}`,
          description: `Network failure [${req.method} ${req.url}] at ${formatTime(req.startTime)} preceded error [${err.message.slice(0, 60)}] at ${formatTime(err.timestamp)} (+${(timeDelta / 1000).toFixed(1)}s)`,
          likelihood: timeDelta <= 2000 ? 'high' : 'medium',
          sourceEvent: {
            type: 'network',
            id: req.id,
            summary: reqSummary,
            timestamp: req.startTime
          },
          targetEvent: {
            type: 'console',
            id: err.id,
            summary: errSummary,
            timestamp: err.timestamp
          },
          timeDeltaMs: timeDelta
        })
      }
    }
  }

  return correlations
}

export function buildCausalErrorGraph(
  state: DebugState,
  options: { timeframeMs?: number; includeDocker?: boolean } = {}
): CausalErrorGraph {
  const nodes: ErrorGraphNode[] = []
  const edges: ErrorGraphEdge[] = []
  const timeframe = options.timeframeMs ?? 8000

  const dockerErrors = (options.includeDocker !== false ? state.docker?.logs || [] : []).filter(
    (l) => l.level === 'error'
  )
  const failedRequests = state.network.records.filter((r) => r.isFailed || r.isSlow)
  const consoleErrors = state.console.entries.filter((e) => e.level === 'error' || e.level === 'warn')

  // 1. Create Docker Nodes
  dockerErrors.forEach((doc) => {
    nodes.push({
      id: doc.id,
      label: `🐳 ${doc.containerName}`,
      layer: 'docker',
      summary: doc.message.slice(0, 120),
      timestamp: doc.timestamp,
      metadata: { container: doc.containerName, stream: doc.stream, raw: doc.message }
    })
  })

  // 2. Create Network Nodes
  failedRequests.forEach((req) => {
    nodes.push({
      id: req.id,
      label: `🌐 ${req.method} ${req.url}`,
      layer: 'network',
      summary: `Status: ${req.status || 'FAILED'}${req.isCORS ? ' (CORS)' : req.isCrossOrigin ? ' (cross-origin, cause unexposed)' : ''} (${Math.round(req.duration || 0)}ms)`,
      timestamp: req.startTime,
      metadata: { url: req.url, status: req.status, isCORS: req.isCORS, isCrossOrigin: req.isCrossOrigin, duration: req.duration }
    })
  })

  // 3. Create Console Nodes
  consoleErrors.forEach((err) => {
    nodes.push({
      id: err.id,
      label: `🔴 ${err.type}`,
      layer: 'console',
      summary: err.message.slice(0, 120),
      timestamp: err.timestamp,
      metadata: { message: err.message, stack: err.stack, count: err.count }
    })
  })

  // 4. Build Causal Edges
  // A. Docker -> Network
  dockerErrors.forEach((doc) => {
    failedRequests.forEach((req) => {
      const delta = req.startTime - doc.timestamp
      if (delta >= -1000 && delta <= timeframe) {
        edges.push({
          id: `edge_${doc.id}_${req.id}`,
          source: doc.id,
          target: req.id,
          label: `CAUSED_HTTP_FAILURE (+${Math.abs(delta)}ms)`,
          timeDeltaMs: delta,
          confidence: delta >= 0 && delta <= 1500 ? 0.95 : 0.8,
          relationship: 'CAUSED_BY'
        })
      }
    })
  })

  // B. Network -> Console
  failedRequests.forEach((req) => {
    consoleErrors.forEach((err) => {
      const delta = err.timestamp - req.startTime
      if (delta >= 0 && delta <= timeframe) {
        edges.push({
          id: `edge_${req.id}_${err.id}`,
          source: req.id,
          target: err.id,
          label: `TRIGGERED_CLIENT_ERROR (+${delta}ms)`,
          timeDeltaMs: delta,
          confidence: delta <= 2000 ? 0.92 : 0.75,
          relationship: 'TRIGGERED_BY'
        })
      }
    })
  })

  // C. Docker -> Console, for when the HTTP hop between them was never captured
  // (a request that succeeded with a degraded body, a WebSocket, a server-render).
  // Only drawn where no failed request already bridges the pair, so the two-hop
  // chain stays the preferred explanation when it exists.
  dockerErrors.forEach((doc) => {
    consoleErrors.forEach((err) => {
      const delta = err.timestamp - doc.timestamp
      if (delta < 0 || delta > timeframe) return

      const bridged = failedRequests.some(
        (req) => req.startTime >= doc.timestamp && req.startTime <= err.timestamp
      )
      if (bridged) return

      edges.push({
        id: `edge_${doc.id}_${err.id}`,
        source: doc.id,
        target: err.id,
        label: `PRECEDED_CLIENT_ERROR (+${delta}ms)`,
        timeDeltaMs: delta,
        // Weaker than the two-hop chain: the mechanism linking them is unobserved.
        confidence: delta <= 2000 ? 0.7 : 0.55,
        relationship: 'CORRELATED_WITH'
      })
    })
  })

  // 5. Determine Root Cause Node
  // The root cause is the earliest node in an active causal edge sequence (prioritizing Docker > Network > Console)
  let rootCauseNodeId: string | undefined = undefined
  if (edges.length > 0) {
    const targetSet = new Set(edges.map((e) => e.target))
    const sourceCandidates = nodes.filter((n) => edges.some((e) => e.source === n.id) && !targetSet.has(n.id))
    if (sourceCandidates.length > 0) {
      sourceCandidates.sort((a, b) => a.timestamp - b.timestamp)
      rootCauseNodeId = sourceCandidates[0].id
      sourceCandidates[0].isRootCause = true
    } else {
      rootCauseNodeId = edges[0].source
      const found = nodes.find((n) => n.id === rootCauseNodeId)
      if (found) found.isRootCause = true
    }
  } else if (nodes.length > 0) {
    // If no edges, fallback to oldest error node
    const sorted = [...nodes].sort((a, b) => a.timestamp - b.timestamp)
    rootCauseNodeId = sorted[0].id
    sorted[0].isRootCause = true
  }

  // 6. Generate Mermaid Diagram
  const mermaidLines: string[] = ['graph TD']
  nodes.forEach((n) => {
    const cleanLabel = n.label.replace(/"/g, "'")
    const cleanSummary = n.summary.replace(/"/g, "'").replace(/\n/g, ' ')
    const rootTag = n.isRootCause ? ' [ROOT CAUSE]' : ''
    mermaidLines.push(`  ${n.id}["${cleanLabel}<br/>${cleanSummary}${rootTag}"]`)
  })

  edges.forEach((e) => {
    mermaidLines.push(`  ${e.source} -->|"${e.label}"| ${e.target}`)
  })

  // Class styling for mermaid
  mermaidLines.push('  classDef dockerNode fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;')
  mermaidLines.push('  classDef netNode fill:#082f49,stroke:#00f0ff,stroke-width:2px,color:#e0f2fe;')
  mermaidLines.push('  classDef clientNode fill:#4c0519,stroke:#f43f5e,stroke-width:2px,color:#ffe4e6;')
  nodes.forEach((n) => {
    if (n.layer === 'docker') mermaidLines.push(`  class ${n.id} dockerNode;`)
    else if (n.layer === 'network') mermaidLines.push(`  class ${n.id} netNode;`)
    else if (n.layer === 'console') mermaidLines.push(`  class ${n.id} clientNode;`)
  })

  return {
    nodes,
    edges,
    rootCauseNodeId,
    mermaidDiagram: mermaidLines.join('\n')
  }
}

function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`
}

function formatMB(bytes?: number): string {
  if (!bytes) return '0MB'
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function debugStateToString(state: DebugState, options: SerializerOptions = {}): string {
  const maxConsole = options.maxConsoleEntries ?? 15
  const maxNetwork = options.maxNetworkEntries ?? 12
  const maxDocker = options.maxDockerEntries ?? 10
  const lines: string[] = []

  lines.push('<debug_state>')
  lines.push('')

  // 1. Page Context
  lines.push('<page_context>')
  lines.push(`  URL: ${state.pageContext.url || 'http://localhost'}`)
  lines.push(`  Title: "${state.pageContext.title || 'Web Application'}"`)
  lines.push(`  Uptime: ${state.pageContext.uptimeSeconds.toFixed(1)}s`)
  const statusEmoji = state.console.errorCount > 0 || state.network.failedCount > 0 ? '⚠️' : '✅'
  const dockerInfo = state.docker?.isAvailable
    ? ` | 🐳 Docker: ${state.docker.containers.length} active (${state.docker.errorCount} errors)`
    : ''
  lines.push(
    `  Status: ${statusEmoji} ${state.console.errorCount} Errors | ${state.network.failedCount} Failed Requests | ${state.network.slowCount} Slow Calls${dockerInfo}`
  )
  lines.push('</page_context>')
  lines.push('')

  // 2. Docker Telemetry Stream (if available or logs present)
  if (state.docker && (state.docker.logs.length > 0 || state.docker.containers.length > 0)) {
    lines.push(
      `<docker_stream containers="${state.docker.containers.length}" total_logs="${state.docker.logs.length}" errors="${state.docker.errorCount}">`
    )

    if (state.docker.containers.length > 0) {
      lines.push('  Active Containers:')
      state.docker.containers.forEach((c) => {
        lines.push(`    - [${c.name}] (${c.image}) State: ${c.state}`)
      })
    }

    const sortedDockerLogs = [...state.docker.logs].sort((a, b) => {
      const priority = (level: string) => (level === 'error' ? 3 : level === 'warn' ? 2 : 1)
      return priority(b.level) - priority(a.level) || b.timestamp - a.timestamp
    })

    const dockerToRender = sortedDockerLogs.slice(0, maxDocker)
    if (dockerToRender.length > 0) {
      lines.push('  Recent Container Logs:')
      dockerToRender.forEach((log, idx) => {
        const lvl = log.level.toUpperCase().padEnd(5, ' ')
        const time = formatTime(log.timestamp)
        lines.push(`    [${idx}] ${lvl} ${time} [${log.containerName}] (${log.stream}): ${log.message.slice(0, 160)}`)
      })
      if (state.docker.logs.length > maxDocker) {
        lines.push(`    ... (${state.docker.logs.length - maxDocker} older container logs omitted)`)
      }
    }
    lines.push('</docker_stream>')
    lines.push('')
  }

  // 3. Console Stream (Priority sorted: errors first, then warnings, then logs)
  const sortedConsole = [...state.console.entries].sort((a, b) => {
    const priority = (level: string) => (level === 'error' ? 3 : level === 'warn' ? 2 : 1)
    return priority(b.level) - priority(a.level) || b.timestamp - a.timestamp
  })

  const consoleToRender = sortedConsole.slice(0, maxConsole)
  lines.push(
    `<console_stream total="${state.console.total}" errors="${state.console.errorCount}" warnings="${state.console.warnCount}">`
  )

  if (consoleToRender.length === 0) {
    lines.push('  (No console entries recorded)')
  } else {
    consoleToRender.forEach((entry, idx) => {
      const levelTag = entry.level.toUpperCase().padEnd(5, ' ')
      const timeStr = formatTime(entry.timestamp)
      const countTag = entry.count > 1 ? ` (Occurred ${entry.count}x)` : ''
      lines.push(`  [${idx}] ${levelTag} ${timeStr} [${entry.type}] ${entry.message.slice(0, 180)}${countTag}`)

      if (entry.parsedStack && entry.parsedStack.length > 0) {
        const topFrames = entry.parsedStack.slice(0, 2)
        topFrames.forEach((frame) => {
          lines.push(`      at ${frame.functionName || '<anonymous>'} (${frame.filename}:${frame.lineno}:${frame.colno})`)
        })
      }
    })

    if (state.console.total > maxConsole) {
      lines.push(`  ... (${state.console.total - maxConsole} older console messages omitted)`)
    }
  }
  lines.push('</console_stream>')
  lines.push('')

  // 4. Network Stream (Priority sorted: failed first, then slow, then OK)
  const sortedNetwork = [...state.network.records].sort((a, b) => {
    const priority = (r: typeof a) => (r.isFailed ? 3 : r.isSlow ? 2 : 1)
    return priority(b) - priority(a) || b.startTime - a.startTime
  })

  const networkToRender = sortedNetwork.slice(0, maxNetwork)
  lines.push(
    `<network_stream total="${state.network.total}" failed="${state.network.failedCount}" slow="${state.network.slowCount}">`
  )

  if (networkToRender.length === 0) {
    lines.push('  (No network calls recorded)')
  } else {
    networkToRender.forEach((req, idx) => {
      let statusTag = 'OK'
      if (req.isFailed) {
        statusTag = req.isCORS ? 'CORS_FAIL' : req.isCrossOrigin ? 'CROSS_ORIGIN_FAIL' : `FAIL(${req.status || 0})`
      } else if (req.isSlow) {
        statusTag = `SLOW(${req.duration}ms)`
      }

      const durStr = req.duration !== undefined ? `${req.duration}ms` : 'pending'
      lines.push(`  [${idx}] ${statusTag} [${req.method}] ${req.url} (${durStr})`)

      if (req.isFailed && req.error) {
        lines.push(`      Error: ${req.error}`)
      }
      if (req.responseBodyPreview) {
        const snippet = req.responseBodyPreview.replace(/\s+/g, ' ').slice(0, 100)
        lines.push(`      Response Preview: ${snippet}`)
      }
    })

    if (state.network.total > maxNetwork) {
      lines.push(`  ... (${state.network.total - maxNetwork} successful requests omitted)`)
    }
  }
  lines.push('</network_stream>')
  lines.push('')

  // 5. Performance & Web Vitals
  lines.push('<performance_vitals>')
  const vitals = state.performance.vitals
  const lcp = vitals['LCP'] ? `${(vitals['LCP'].value / 1000).toFixed(2)}s (${vitals['LCP'].rating})` : 'N/A'
  const cls = vitals['CLS'] ? `${vitals['CLS'].value} (${vitals['CLS'].rating})` : 'N/A'
  const inp = vitals['INP'] ? `${vitals['INP'].value}ms (${vitals['INP'].rating})` : 'N/A'

  lines.push(`  LCP: ${lcp}`)
  lines.push(`  CLS: ${cls}`)
  lines.push(`  INP: ${inp}`)

  if (state.performance.longTasks.length > 0) {
    const topTask = state.performance.longTasks[state.performance.longTasks.length - 1]
    lines.push(`  Long Tasks: ${state.performance.longTasks.length} detected (Latest: ${topTask.duration}ms)`)
  } else {
    lines.push('  Long Tasks: 0 detected (<50ms)')
  }
  lines.push('</performance_vitals>')
  lines.push('')

  // 6. Memory Health
  if (state.memory) {
    lines.push('<memory_health>')
    const used = formatMB(state.memory.usedJSHeapSize)
    const total = formatMB(state.memory.totalJSHeapSize)
    const pct = state.memory.heapUsagePercent !== undefined ? `${state.memory.heapUsagePercent}%` : 'N/A'
    lines.push(`  Used Heap: ${used} / ${total} (${pct})`)

    if (state.memory.trendMBPerMin !== undefined) {
      const trendTag = state.memory.trendMBPerMin > 1.0 ? '⚠️ (Elevated Heap Growth)' : '✅ (Stable)'
      lines.push(`  Heap Trend: ${state.memory.trendMBPerMin > 0 ? '+' : ''}${state.memory.trendMBPerMin}MB/min ${trendTag}`)
    }
    if (state.memory.domNodeCount !== undefined) {
      lines.push(`  DOM Node Count: ${state.memory.domNodeCount} nodes`)
    }
    lines.push('</memory_health>')
    lines.push('')
  }

  // 7. Automated Heuristic Correlations (reuse pre-computed if available)
  const correlations = state.correlations.length > 0 ? state.correlations : computeCorrelations(state)
  if (correlations.length > 0) {
    lines.push('<heuristic_correlations>')
    lines.push('  💡 Automated Correlation Insights:')
    correlations.forEach((corr, idx) => {
      lines.push(`  ${idx + 1}. [${corr.likelihood.toUpperCase()} LIKELIHOOD] ${corr.description}`)
    })
    lines.push('</heuristic_correlations>')
    lines.push('')
  }

  // 8. Causal Error Graph (if requested)
  if (options.includeGraph && state.causalGraph && state.causalGraph.nodes.length > 0) {
    lines.push('<causal_error_graph>')
    lines.push(`  Nodes: ${state.causalGraph.nodes.length} | Edges: ${state.causalGraph.edges.length}`)
    if (state.causalGraph.rootCauseNodeId) {
      lines.push(`  Identified Root Cause Node: ${state.causalGraph.rootCauseNodeId}`)
    }
    lines.push('</causal_error_graph>')
    lines.push('')
  }

  lines.push('</debug_state>')

  return lines.join('\n')
}

export interface ErrorHistogramBucket {
  timestamp: number
  label: string
  http5xx: number
  http4xx: number
  consoleErrors: number
  dockerErrors: number
  total: number
}

export function getErrorHistogram(state: DebugState, bucketCount = 10): ErrorHistogramBucket[] {
  const allErrors: Array<{ timestamp: number; type: '5xx' | '4xx' | 'console' | 'docker' }> = []

  // Collect 5xx & 4xx network failures
  state.network.records.forEach((r) => {
    if (r.status && r.status >= 500) {
      allErrors.push({ timestamp: r.startTime, type: '5xx' })
    } else if (r.status && r.status >= 400) {
      allErrors.push({ timestamp: r.startTime, type: '4xx' })
    } else if (r.isFailed) {
      allErrors.push({ timestamp: r.startTime, type: '5xx' })
    }
  })

  // Collect console errors
  state.console.entries.forEach((e) => {
    if (e.level === 'error') {
      allErrors.push({ timestamp: e.timestamp, type: 'console' })
    }
  })

  // Collect docker errors
  ;(state.docker?.logs || []).forEach((d) => {
    if (d.level === 'error') {
      allErrors.push({ timestamp: d.timestamp, type: 'docker' })
    }
  })

  if (allErrors.length === 0) {
    const now = Date.now()
    return Array.from({ length: bucketCount }, (_, i) => {
      const ts = now - (bucketCount - 1 - i) * 10000
      const date = new Date(ts)
      const label = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
      return { timestamp: ts, label, http5xx: 0, http4xx: 0, consoleErrors: 0, dockerErrors: 0, total: 0 }
    })
  }

  allErrors.sort((a, b) => a.timestamp - b.timestamp)
  const minTime = allErrors[0].timestamp
  const maxTime = Math.max(allErrors[allErrors.length - 1].timestamp, minTime + 10000)
  const duration = maxTime - minTime
  const step = Math.max(1000, Math.ceil(duration / bucketCount))

  const buckets: ErrorHistogramBucket[] = []
  for (let i = 0; i < bucketCount; i++) {
    const bStart = minTime + i * step
    const bEnd = bStart + step
    const date = new Date(bStart)
    const label = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`

    const inBucket = allErrors.filter((e) => e.timestamp >= bStart && e.timestamp < bEnd)
    const http5xx = inBucket.filter((e) => e.type === '5xx').length
    const http4xx = inBucket.filter((e) => e.type === '4xx').length
    const consoleErrors = inBucket.filter((e) => e.type === 'console').length
    const dockerErrors = inBucket.filter((e) => e.type === 'docker').length

    buckets.push({
      timestamp: bStart,
      label,
      http5xx,
      http4xx,
      consoleErrors,
      dockerErrors,
      total: inBucket.length
    })
  }

  return buckets
}

export function generateCurlCommand(req: Partial<NetworkRecord> & { url: string; method?: string }): string {
  const parts: string[] = ['curl']
  const method = (req.method || 'GET').toUpperCase()
  if (method !== 'GET') {
    parts.push(`-X ${method}`)
  }
  parts.push(`'${req.url}'`)

  if (req.requestHeaders) {
    for (const [key, val] of Object.entries(req.requestHeaders)) {
      const lower = key.toLowerCase()
      if (lower === 'host') continue
      parts.push(`-H '${key}: ${String(val).replace(/'/g, "'\\''")}'`)
    }
  }

  if (req.requestBodyPreview && method !== 'GET' && method !== 'HEAD') {
    parts.push(`--data-raw '${req.requestBodyPreview.replace(/'/g, "'\\''")}'`)
  }

  return parts.join(' \\\n  ')
}

export function getHttpStatusExplainer(status: number): HttpStatusDetail {
  const statusMap: Record<number, HttpStatusDetail> = {
    0: {
      code: 0,
      title: 'Network Error / CORS Failure',
      explanation: 'The request failed before receiving an HTTP response (DNS failure, connection refused, or CORS preflight rejected by browser).',
      recommendation: 'Verify backend server is running and CORS headers (Access-Control-Allow-Origin) are enabled.'
    },
    400: {
      code: 400,
      title: '400 Bad Request',
      explanation: 'The server could not understand the request due to invalid syntax or malformed payload.',
      recommendation: 'Check request payload schema, query parameters, and required fields.'
    },
    401: {
      code: 401,
      title: '401 Unauthorized',
      explanation: 'Authentication is required and has either failed or not been provided (missing/expired token).',
      recommendation: 'Verify Authorization header, Bearer token validity, or API key configuration.'
    },
    403: {
      code: 403,
      title: '403 Forbidden',
      explanation: 'The server understood the request but refuses to authorize it (insufficient user permissions).',
      recommendation: 'Check user role/scopes and RBAC permissions for the target resource.'
    },
    404: {
      code: 404,
      title: '404 Not Found',
      explanation: 'The requested resource could not be found on the server endpoint.',
      recommendation: 'Verify URL path, API routing prefixes (/api/v1/...), and ID parameters.'
    },
    408: {
      code: 408,
      title: '408 Request Timeout',
      explanation: 'The client did not produce a request within the time that the server was prepared to wait.',
      recommendation: 'Check network latency, request payload size, or slow client upload speeds.'
    },
    409: {
      code: 409,
      title: '409 Conflict',
      explanation: 'The request conflicts with current server state (e.g. duplicate key, version mismatch).',
      recommendation: 'Check for unique constraint violations or concurrency locking.'
    },
    422: {
      code: 422,
      title: '422 Unprocessable Entity',
      explanation: 'The request was well-formed but contained semantic validation errors.',
      recommendation: 'Inspect server validation response for specific field error details.'
    },
    429: {
      code: 429,
      title: '429 Too Many Requests',
      explanation: 'Rate limit has been exceeded for this IP or API key.',
      recommendation: 'Implement exponential backoff or inspect Retry-After header.'
    },
    500: {
      code: 500,
      title: '500 Internal Server Error',
      explanation: 'The server encountered an unexpected condition that prevented it from fulfilling the request.',
      recommendation: 'Inspect backend container logs, unhandled backend exceptions, and database connections.'
    },
    502: {
      code: 502,
      title: '502 Bad Gateway',
      explanation: 'The gateway or proxy received an invalid response from the upstream backend server.',
      recommendation: 'Check if backend process crashed, restarted, or sent non-HTTP response.'
    },
    503: {
      code: 503,
      title: '503 Service Unavailable',
      explanation: 'The server is currently unable to handle the request due to maintenance or temporary overload.',
      recommendation: 'Check container health, CPU/memory saturation, and load balancer health checks.'
    },
    504: {
      code: 504,
      title: '504 Gateway Timeout',
      explanation: 'The gateway server did not receive a timely response from the upstream server or database.',
      recommendation: 'Check slow database queries, long synchronous operations, and upstream timeouts.'
    }
  }

  if (statusMap[status]) {
    return statusMap[status]
  }

  if (status >= 500) {
    return {
      code: status,
      title: `${status} Server Error`,
      explanation: 'The server encountered an error fulfilling the request.',
      recommendation: 'Inspect backend service logs for unhandled exceptions.'
    }
  }
  if (status >= 400) {
    return {
      code: status,
      title: `${status} Client Error`,
      explanation: 'The request could not be processed due to a client-side issue.',
      recommendation: 'Verify request parameters, headers, and client state.'
    }
  }

  return {
    code: status,
    title: `${status} Response`,
    explanation: 'Standard HTTP status.',
    recommendation: 'Inspect payload response.'
  }
}

export function computeDiagnosticMatrix(state: DebugState): DiagnosticMatrixSnapshot {
  const substrates: MatrixSubstrate[] = ['network', 'console', 'docker', 'system']
  const severities: MatrixSeverity[] = ['critical', 'high', 'notice']

  const cells: Record<string, DiagnosticMatrixCell> = {}
  for (const sub of substrates) {
    for (const sev of severities) {
      const key = `${sub}:${sev}`
      cells[key] = {
        substrate: sub,
        severity: sev,
        count: 0,
        itemIds: [],
        primaryLabel: ''
      }
    }
  }

  const substrateCounts: Record<MatrixSubstrate, number> = {
    network: 0,
    console: 0,
    docker: 0,
    system: 0
  }

  let criticalCount = 0
  let highCount = 0
  let noticeCount = 0

  // 1. Network Records
  state.network.records.forEach((r) => {
    let sev: MatrixSeverity | null = null
    if (r.status && r.status >= 500) {
      sev = 'critical'
    } else if (r.isFailed && (!r.status || r.status === 0)) {
      sev = 'critical'
    } else if (r.status && r.status >= 400) {
      sev = 'high'
    } else if (r.isCORS) {
      sev = 'high'
    } else if (r.isSlow) {
      sev = 'notice'
    }

    if (sev) {
      const key = `network:${sev}`
      cells[key].count++
      cells[key].itemIds.push(r.id)
      cells[key].primaryLabel = cells[key].primaryLabel || `${r.method} ${r.url}`
      substrateCounts.network++
      if (sev === 'critical') criticalCount++
      else if (sev === 'high') highCount++
      else if (sev === 'notice') noticeCount++
    }
  })

  // 2. Console Entries
  state.console.entries.forEach((e) => {
    let sev: MatrixSeverity | null = null
    if (e.level === 'error') {
      sev = e.count > 3 || (e.stack && e.stack.includes('Uncaught')) ? 'critical' : 'high'
    } else if (e.level === 'warn') {
      sev = 'notice'
    }

    if (sev) {
      const key = `console:${sev}`
      cells[key].count++
      cells[key].itemIds.push(e.id)
      cells[key].primaryLabel = cells[key].primaryLabel || e.message
      substrateCounts.console++
      if (sev === 'critical') criticalCount++
      else if (sev === 'high') highCount++
      else if (sev === 'notice') noticeCount++
    }
  })

  // 3. Docker Logs
  ;(state.docker?.logs || []).forEach((d) => {
    let sev: MatrixSeverity | null = null
    if (d.level === 'error') {
      sev = 'critical'
    } else if (d.level === 'warn') {
      sev = 'high'
    }

    if (sev) {
      const key = `docker:${sev}`
      cells[key].count++
      cells[key].itemIds.push(d.id)
      cells[key].primaryLabel = cells[key].primaryLabel || `[${d.containerName}] ${d.message}`
      substrateCounts.docker++
      if (sev === 'critical') criticalCount++
      else if (sev === 'high') highCount++
      else if (sev === 'notice') noticeCount++
    }
  })

  // 4. System / Memory & Performance
  if (state.memory && state.memory.trendMBPerMin && state.memory.trendMBPerMin > 2.0) {
    const key = 'system:high'
    cells[key].count++
    cells[key].itemIds.push('mem_leak')
    cells[key].primaryLabel = `Heap Leak (+${state.memory.trendMBPerMin}MB/min)`
    substrateCounts.system++
    highCount++
  }

  if (state.performance.longTasks.length > 0) {
    const key = 'system:notice'
    cells[key].count += state.performance.longTasks.length
    cells[key].itemIds.push('long_tasks')
    cells[key].primaryLabel = `${state.performance.longTasks.length} Main Thread Long Tasks (>50ms)`
    substrateCounts.system += state.performance.longTasks.length
    noticeCount += state.performance.longTasks.length
  }

  const totalErrors = criticalCount + highCount + noticeCount

  return {
    cells,
    totalErrors,
    criticalCount,
    highCount,
    noticeCount,
    substrateCounts
  }
}

export function generateUnifiedAIDebugPrompt(
  targetId: string | undefined,
  state: DebugState
): string {
  // 1. Locate target record or pick latest error
  let targetNetwork = state.network.records.find((r) => r.id === targetId)
  let targetConsole = state.console.entries.find((e) => e.id === targetId)
  let targetDocker = (state.docker?.logs || []).find((d) => d.id === targetId)

  if (!targetNetwork && !targetConsole && !targetDocker) {
    // Pick the most critical recent failure
    targetNetwork = state.network.records.slice().reverse().find((r) => r.isFailed)
    targetConsole = state.console.entries.slice().reverse().find((e) => e.level === 'error')
    targetDocker = (state.docker?.logs || []).slice().reverse().find((d) => d.level === 'error')
  }

  const promptLines: string[] = []
  promptLines.push('### 🚨 Dr. Debug Incident Report for AI Assistants (Claude Code / Antigravity)')
  promptLines.push('')

  let title = 'Uncaught Runtime / Network Failure'
  let incidentTime = Date.now()

  if (targetNetwork) {
    title = `HTTP ${targetNetwork.status || 'ERR'} on ${targetNetwork.method} ${targetNetwork.url}`
    incidentTime = targetNetwork.startTime
  } else if (targetConsole) {
    title = `${targetConsole.type.toUpperCase()}: ${targetConsole.message.slice(0, 100)}`
    incidentTime = targetConsole.timestamp
  } else if (targetDocker) {
    title = `Docker [${targetDocker.containerName}] ${targetDocker.level.toUpperCase()}: ${targetDocker.message.slice(0, 100)}`
    incidentTime = targetDocker.timestamp
  }

  promptLines.push(`**Issue Title:** \`${title}\``)
  promptLines.push(`**Timestamp:** ${new Date(incidentTime).toISOString()}`)
  promptLines.push(`**Page Context:** ${state.pageContext.url || 'http://localhost'} (${state.pageContext.framework || 'Web Application'})`)
  promptLines.push('')

  // HTTP Transaction Details with cURL reproduction & RFC intelligence
  if (targetNetwork) {
    const explainer = getHttpStatusExplainer(targetNetwork.status || 0)
    promptLines.push('#### 🌐 HTTP Network Transaction:')
    promptLines.push(`- **Request:** \`${targetNetwork.method} ${targetNetwork.url}\``)
    promptLines.push(`- **Status:** \`${targetNetwork.status || '0 (Failed / Network Error)'} ${targetNetwork.statusText || ''}\` — *${explainer.title}*`)
    promptLines.push(`- **Explanation:** ${explainer.explanation}`)
    promptLines.push(`- **Action Recommended:** ${explainer.recommendation}`)
    promptLines.push(`- **Duration:** ${targetNetwork.duration !== undefined ? `${targetNetwork.duration}ms` : 'N/A'}`)
    if (targetNetwork.isCORS) {
      promptLines.push('- **CORS Flag:** ⚠️ The browser explicitly named CORS for this failure')
    } else if (targetNetwork.isCrossOrigin) {
      promptLines.push(
        '- **Cross-origin:** ⚠️ Failed opaquely. From JS a missing CORS header, a refused connection, a DNS failure and a TLS error are indistinguishable — check the browser console and whether the cURL below succeeds.'
      )
    }
    if (targetNetwork.initiator) promptLines.push(`- **Initiator:** \`${targetNetwork.initiator}\``)
    promptLines.push('')

    // cURL reproduction block
    promptLines.push('**Terminal Reproduction Command (cURL):**')
    promptLines.push('```bash')
    promptLines.push(generateCurlCommand(targetNetwork))
    promptLines.push('```')
    promptLines.push('')

    promptLines.push('**Request Headers:**')
    if (targetNetwork.requestHeaders && Object.keys(targetNetwork.requestHeaders).length > 0) {
      promptLines.push('```json')
      promptLines.push(JSON.stringify(targetNetwork.requestHeaders, null, 2))
      promptLines.push('```')
    } else {
      promptLines.push('_None recorded or default browser headers._')
    }
    promptLines.push('')

    promptLines.push('**Request Payload / Body:**')
    if (targetNetwork.requestBodyPreview) {
      try {
        const parsed = JSON.parse(targetNetwork.requestBodyPreview)
        promptLines.push('```json')
        promptLines.push(JSON.stringify(parsed, null, 2))
        promptLines.push('```')
      } catch {
        promptLines.push('```')
        promptLines.push(targetNetwork.requestBodyPreview)
        promptLines.push('```')
      }
    } else {
      promptLines.push('_No request body sent._')
    }
    promptLines.push('')

    promptLines.push('**Response Headers:**')
    if (targetNetwork.responseHeaders && Object.keys(targetNetwork.responseHeaders).length > 0) {
      promptLines.push('```json')
      promptLines.push(JSON.stringify(targetNetwork.responseHeaders, null, 2))
      promptLines.push('```')
    } else {
      promptLines.push('_None recorded or opaque response._')
    }
    promptLines.push('')

    promptLines.push('**Response Body / Server Error Message:**')
    if (targetNetwork.responseBodyPreview) {
      try {
        const parsed = JSON.parse(targetNetwork.responseBodyPreview)
        promptLines.push('```json')
        promptLines.push(JSON.stringify(parsed, null, 2))
        promptLines.push('```')
      } catch {
        promptLines.push('```')
        promptLines.push(targetNetwork.responseBodyPreview)
        promptLines.push('```')
      }
    } else if (targetNetwork.error) {
      promptLines.push(`\`\`\`\n${targetNetwork.error}\n\`\`\``)
    } else {
      promptLines.push('_Empty response body._')
    }
    promptLines.push('')
  }

  // Console & Runtime Diagnostics with Demangled Frames
  if (targetConsole || (!targetNetwork && state.console.entries.length > 0)) {
    const entry = targetConsole || state.console.entries.filter((e) => e.level === 'error')[0]
    if (entry) {
      promptLines.push('#### 🔴 Console & Runtime Diagnostics:')
      promptLines.push(`- **Event Type:** \`${entry.type}\``)
      promptLines.push(`- **Error Message:** \`${entry.message}\``)
      promptLines.push(`- **Occurrences:** ${entry.count}`)
      
      if (entry.parsedStack && entry.parsedStack.length > 0) {
        promptLines.push('')
        promptLines.push('**Demangled Call Frames:**')
        entry.parsedStack.slice(0, 5).forEach((frame, i) => {
          const fn = frame.filename || 'unknown'
          const isUserCode = !fn.includes('node_modules') && !fn.includes('chrome-extension')
          const tag = isUserCode ? '📌 [App Code]' : '⚙️ [Vendor]'
          promptLines.push(`${i + 1}. ${tag} \`${frame.functionName || '<anonymous>'}\` at \`${fn}:${frame.lineno || 0}:${frame.colno || 0}\``)
        })
      } else if (entry.stack) {
        promptLines.push('')
        promptLines.push('**Stack Trace:**')
        promptLines.push('```')
        promptLines.push(entry.stack)
        promptLines.push('```')
      }
      promptLines.push('')
    }
  }

  // Docker Backend Context (if present)
  if (targetDocker || (state.docker && state.docker.logs.length > 0)) {
    const dockerLog = targetDocker || state.docker?.logs.filter((l) => l.level === 'error')[0]
    if (dockerLog) {
      promptLines.push('#### 🐳 Backend Container Context:')
      promptLines.push(`- **Container:** \`${dockerLog.containerName}\` (${dockerLog.stream})`)
      promptLines.push(`- **Level:** \`${dockerLog.level.toUpperCase()}\``)
      promptLines.push('```')
      promptLines.push(dockerLog.message)
      promptLines.push('```')
      promptLines.push('')
    }
  }

  // Heuristic Correlations / Cross-layer causality
  const correlations = state.correlations.length > 0 ? state.correlations : computeCorrelations(state)
  if (correlations.length > 0) {
    promptLines.push('#### 💡 Cross-Layer Causality & Correlations:')
    correlations.slice(0, 3).forEach((corr, idx) => {
      promptLines.push(`${idx + 1}. [${corr.likelihood.toUpperCase()}] ${corr.description}`)
    })
    promptLines.push('')
  }

  // Timeline of surrounding events
  promptLines.push('#### ⏱️ Surrounding Telemetry Timeline (Chronological Context):')
  const timelineEvents: Array<{ time: number; text: string }> = []

  state.network.records.slice(-10).forEach((r) => {
    const status = r.status ? `[${r.status}]` : 'FAILED'
    const dur = r.duration !== undefined ? `${r.duration}ms` : ''
    timelineEvents.push({
      time: r.startTime,
      text: `[Network] ${r.method} ${r.url} -> ${status} ${dur}`
    })
  })

  state.console.entries.slice(-10).forEach((c) => {
    timelineEvents.push({
      time: c.timestamp,
      text: `[Console ${c.level.toUpperCase()}] ${c.message.slice(0, 100)}`
    })
  })

  ;(state.docker?.logs || []).slice(-10).forEach((d) => {
    timelineEvents.push({
      time: d.timestamp,
      text: `[Docker ${d.containerName}] ${d.message.slice(0, 100)}`
    })
  })

  timelineEvents.sort((a, b) => a.time - b.time)
  const recentEvents = timelineEvents.slice(-8)

  if (recentEvents.length > 0) {
    recentEvents.forEach((ev, idx) => {
      const tStr = new Date(ev.time).toLocaleTimeString()
      promptLines.push(`${idx + 1}. \`[${tStr}]\` ${ev.text}`)
    })
  } else {
    promptLines.push('_No previous telemetry events._')
  }
  promptLines.push('')

  // Framework State Context
  if (state.framework && state.framework.detectedFramework) {
    promptLines.push('#### ⚛️ Framework State Context:')
    promptLines.push(`- **Detected Framework:** \`${state.framework.detectedFramework}\``)
    if (state.framework.hasReactHook) promptLines.push('- **React DevTools Hook:** Active')
    if (state.framework.hasReduxHook) promptLines.push('- **Redux Store:** Connected')
    if (state.framework.hasVueHook) promptLines.push('- **Vue DevTools:** Active')
    if (state.framework.store) {
      promptLines.push(`- **Store Keys:** \`[${state.framework.store.topLevelKeys.slice(0, 10).join(', ')}]\``)
    }
    if (state.framework.recentEvents.length > 0) {
      promptLines.push('**Recent Framework Events:**')
      state.framework.recentEvents.slice(-5).forEach((ev, i) => {
        promptLines.push(`${i + 1}. [${ev.framework}] ${ev.detail}`)
      })
    }
    promptLines.push('')
  }

  // Interaction Replay (Last 30s)
  if (state.interactions && state.interactions.length > 0) {
    promptLines.push('#### 🖱️ User Interaction Replay (Last 30 Seconds):')
    state.interactions.slice(-10).forEach((ev, i) => {
      const ago = ((Date.now() - ev.timestamp) / 1000).toFixed(1)
      const target = ev.target ? ` on \`${ev.target}\`` : ''
      promptLines.push(`${i + 1}. [${ago}s ago] \`${ev.type}\`${target} ${ev.detail || ''}`)
    })
    promptLines.push('')
  }

  // Action instructions for LLM assistant
  promptLines.push('#### 🎯 Task for AI Coding Assistant (Claude Code / Antigravity):')
  promptLines.push('1. Analyze the exact failure mechanism across the request payload, headers, response, and runtime stack trace provided above.')
  promptLines.push('2. Identify the root cause file, function, and line number in the codebase.')
  promptLines.push('3. Provide the minimal, elegant, and verified code fix as a unified diff patch to resolve this issue.')

  return promptLines.join('\n')
}


