import type { DebugState, SerializerOptions, TemporalCorrelation } from './types.js'

export function computeCorrelations(state: DebugState): TemporalCorrelation[] {
  const correlations: TemporalCorrelation[] = []
  const failedRequests = state.network.records.filter((r) => r.isFailed)
  const errorEntries = state.console.entries.filter((e) => e.level === 'error')

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
  const lines: string[] = []

  lines.push('<debug_state>')
  lines.push('')

  // 1. Page Context
  lines.push('<page_context>')
  lines.push(`  URL: ${state.pageContext.url || 'http://localhost'}`)
  lines.push(`  Title: "${state.pageContext.title || 'Web Application'}"`)
  lines.push(`  Uptime: ${state.pageContext.uptimeSeconds.toFixed(1)}s`)
  const statusEmoji = state.console.errorCount > 0 || state.network.failedCount > 0 ? '⚠️' : '✅'
  lines.push(
    `  Status: ${statusEmoji} ${state.console.errorCount} Errors | ${state.network.failedCount} Failed Requests | ${state.network.slowCount} Slow Calls`
  )
  lines.push('</page_context>')
  lines.push('')

  // 2. Console Stream (Priority sorted: errors first, then warnings, then logs)
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

  // 3. Network Stream (Priority sorted: failed first, then slow, then OK)
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
        statusTag = req.isCORS ? 'CORS_FAIL' : `FAIL(${req.status || 0})`
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

  // 4. Performance & Web Vitals
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

  // 5. Memory Health
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
    if (state.memory.detachedNodesCount !== undefined) {
      lines.push(`  DOM Node Count: ${state.memory.detachedNodesCount} nodes`)
    }
    lines.push('</memory_health>')
    lines.push('')
  }

  // 6. Automated Heuristic Correlations
  const correlations = computeCorrelations(state)
  if (correlations.length > 0) {
    lines.push('<heuristic_correlations>')
    lines.push('  💡 Automated Correlation Insights:')
    correlations.forEach((corr, idx) => {
      lines.push(`  ${idx + 1}. [${corr.likelihood.toUpperCase()} LIKELIHOOD] ${corr.description}`)
    })
    lines.push('</heuristic_correlations>')
    lines.push('')
  }

  lines.push('</debug_state>')

  return lines.join('\n')
}
