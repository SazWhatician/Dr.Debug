import {
  type CausalErrorGraph,
  type ConsoleEntry,
  type DebugState,
  type DockerLogEntry,
  getHttpStatusExplainer,
  type NetworkRecord,
  type StackFrame
} from '@dr-debug/controller'

/**
 * A single conclusion derived from observed telemetry. Every field is built from
 * values actually present in the DebugState — nothing is templated in advance.
 */
export interface DiagnosticFinding {
  id: string
  layer: 'docker' | 'network' | 'console' | 'performance' | 'memory'
  severity: 'critical' | 'high' | 'notice'
  title: string
  detail: string
  evidence: string[]
  /** Real source locations pulled from parsed stack frames, if any. */
  files: string[]
  /** Suggested remediation, derived from the observed signal. */
  remediation: string
  confidence: number
  timestamp: number
}

export interface LocalDiagnosis {
  /** False when the buffers hold nothing worth diagnosing. */
  hasEvidence: boolean
  headline: string
  diagnosis: string
  rootCause: string
  confidence: number
  findings: DiagnosticFinding[]
  causalChain: string[]
  suggestedFix: string
  filesToModify: string[]
}

const SEVERITY_RANK: Record<DiagnosticFinding['severity'], number> = {
  critical: 0,
  high: 1,
  notice: 2
}

function isAppFrame(frame: StackFrame): boolean {
  const file = frame.filename || ''
  if (!file) return false
  return (
    !file.includes('node_modules') &&
    !file.startsWith('chrome-extension://') &&
    !file.includes('/.vite/') &&
    !/^https?:\/\/[^/]+\/?$/.test(file)
  )
}

function frameLabel(frame: StackFrame): string {
  const file = frame.filename || 'unknown'
  const line = frame.lineno ?? 0
  const col = frame.colno ?? 0
  const fn = frame.functionName || '<anonymous>'
  return `${fn} (${file}:${line}:${col})`
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url, 'http://localhost')
    return parsed.pathname + (parsed.search || '')
  } catch {
    return url
  }
}

/**
 * Reads the concrete shape of a runtime exception out of its own message so the
 * remediation can name the real property / variable that blew up.
 */
function classifyClientError(entry: ConsoleEntry): {
  kind: string
  subject?: string
  remediation: string
} {
  const msg = entry.message

  const undefRead = msg.match(/Cannot read propert(?:y|ies) of (undefined|null) \(reading ['"]([^'"]+)['"]\)/i)
  if (undefRead) {
    const [, nullish, prop] = undefRead
    return {
      kind: `nullish property access`,
      subject: prop,
      remediation: `The value being dereferenced was \`${nullish}\` when \`.${prop}\` was read. Guard the access (\`value?.${prop}\`) and handle the ${nullish} branch explicitly — then fix whatever upstream call is returning ${nullish} instead of data.`
    }
  }

  const notAFn = msg.match(/([\w$.]+) is not a function/i)
  if (notAFn) {
    return {
      kind: 'bad call target',
      subject: notAFn[1],
      remediation: `\`${notAFn[1]}\` was called but is not callable at runtime. Verify the import/export shape (default vs named), and that the value is initialised before this call site.`
    }
  }

  const notDefined = msg.match(/([\w$]+) is not defined/i)
  if (notDefined) {
    return {
      kind: 'unresolved identifier',
      subject: notDefined[1],
      remediation: `\`${notDefined[1]}\` is unresolved in this scope. Add the missing import or declaration, or gate the reference behind an environment check if it is host-specific.`
    }
  }

  const undefIter = msg.match(/(?:undefined|null) is not iterable|is not iterable/i)
  if (undefIter) {
    return {
      kind: 'non-iterable spread',
      remediation: `A spread/destructure ran against a non-iterable value. Default it (\`const [a] = list ?? []\`) and check the producer actually returns an array.`
    }
  }

  const jsonParse = msg.match(/(?:Unexpected token|Unexpected end of JSON input|is not valid JSON)/i)
  if (jsonParse) {
    return {
      kind: 'JSON parse failure',
      remediation: `A response body was parsed as JSON but was not JSON — commonly an HTML error page or empty body from a failed request. Check \`response.ok\` and the \`content-type\` header before calling \`.json()\`.`
    }
  }

  if (entry.type === 'unhandled_rejection') {
    return {
      kind: 'unhandled promise rejection',
      remediation: `This promise rejected with no \`.catch()\` / \`try-catch\` in its chain. Attach rejection handling at the call site so the failure surfaces as state instead of an unhandled rejection.`
    }
  }

  return {
    kind: entry.type.replace(/_/g, ' '),
    remediation: `Trace the call frames below to the originating call site and add handling for the failing condition.`
  }
}

/**
 * Turns an observed backend log line into a remediation by matching on keywords
 * that are present in the real message text.
 */
function classifyDockerError(log: DockerLogEntry): { kind: string; remediation: string } {
  const msg = log.message.toLowerCase()

  if (/max_connections|connection slots|connection pool|too many connections|pool timeout|p2024/.test(msg)) {
    return {
      kind: 'connection pool exhaustion',
      remediation: `\`${log.containerName}\` reports its connection pool is saturated. Audit that every acquired connection/session is released on both success and error paths, then size the pool against the real concurrency ceiling.`
    }
  }
  if (/oom|out of memory|killed process|memory limit|cannot allocate/.test(msg)) {
    return {
      kind: 'container memory exhaustion',
      remediation: `\`${log.containerName}\` hit its memory ceiling and was killed. Profile heap growth in that service and either fix the retention leak or raise the container limit deliberately.`
    }
  }
  if (/can't reach|cannot reach|connection refused|econnrefused|no such host|getaddrinfo|does not exist/.test(msg)) {
    return {
      kind: 'unreachable dependency',
      remediation: `\`${log.containerName}\` cannot reach a dependency it needs. Verify the service name/port in its connection string resolves on the compose network and that the dependency is healthy before this container starts.`
    }
  }
  if (/permission denied|eacces|unauthor|forbidden|authentication failed|password/.test(msg)) {
    return {
      kind: 'credential / permission failure',
      remediation: `\`${log.containerName}\` was denied access. Check the credentials and mounted-volume ownership this container runs with.`
    }
  }
  if (/timeout|timed out|deadline exceeded/.test(msg)) {
    return {
      kind: 'upstream timeout',
      remediation: `\`${log.containerName}\` timed out waiting on an upstream call. Establish whether the upstream is slow or unreachable, then set an explicit timeout plus fallback rather than inheriting the default.`
    }
  }
  if (/migration|schema|relation .* does not exist|column .* does not exist/.test(msg)) {
    return {
      kind: 'schema drift',
      remediation: `\`${log.containerName}\` is running against a schema that does not match its code. Apply the pending migration, or roll the image back to the revision matching the live schema.`
    }
  }

  return {
    kind: 'backend error',
    remediation: `Resolve the error reported by \`${log.containerName}\` shown in the evidence below; it precedes the client-visible failure in the timeline.`
  }
}

function buildNetworkFinding(req: NetworkRecord): DiagnosticFinding {
  const status = req.status || 0
  const explainer = getHttpStatusExplainer(status)
  const path = shortUrl(req.url)
  const evidence: string[] = [
    `${req.method} ${req.url} → ${status || 'no response'}${req.statusText ? ` ${req.statusText}` : ''}`
  ]
  if (req.duration !== undefined) evidence.push(`Wall time: ${Math.round(req.duration)}ms`)
  if (req.error) evidence.push(`Transport error: ${req.error}`)
  if (req.initiator) evidence.push(`Initiator: ${req.initiator}`)
  if (req.responseBodyPreview) {
    evidence.push(`Response body: ${req.responseBodyPreview.slice(0, 300)}`)
  }

  let severity: DiagnosticFinding['severity'] = 'notice'
  let remediation = explainer.recommendation
  let title: string

  let origin = req.url
  try {
    origin = new URL(req.url).origin
  } catch {
    /* keep raw url */
  }

  if (req.isCORS) {
    severity = 'critical'
    title = `CORS policy blocked ${req.method} ${path}`
    remediation = `The browser named CORS when blocking this call to ${origin}. Serve \`Access-Control-Allow-Origin\` (and the matching \`-Methods\`/\`-Headers\` for the preflight) from that origin, or proxy the call through your own origin.`
  } else if (req.isCrossOrigin) {
    // The browser hands JS an opaque failure here; naming one cause would be a guess.
    severity = 'critical'
    title = `${req.method} ${path} failed opaquely (cross-origin)`
    remediation = `The browser refused to say why this cross-origin call to ${origin} failed — from JS, a missing CORS header, a refused connection, a DNS failure and a TLS error are indistinguishable. Read the browser's own console message, which does name the cause, and run the cURL command below: if cURL succeeds the problem is CORS, and if it fails the host is unreachable.`
  } else if (status === 0 || req.isFailed) {
    severity = 'critical'
    title = `${req.method} ${path} never completed${status ? ` (${status})` : ''}`
    remediation =
      status === 0
        ? `The request failed at the transport layer — the host did not answer. Confirm the service is listening on that host/port and that the URL is correct for this environment.`
        : explainer.recommendation
  } else if (status >= 500) {
    severity = 'critical'
    title = `${req.method} ${path} returned ${status}`
  } else if (status === 401 || status === 403) {
    severity = 'high'
    title = `${req.method} ${path} rejected the caller (${status})`
  } else if (status >= 400) {
    severity = 'high'
    title = `${req.method} ${path} returned ${status}`
  } else if (req.isSlow) {
    severity = 'notice'
    title = `${req.method} ${path} was slow (${Math.round(req.duration || 0)}ms)`
    remediation = `This call is the slowest thing on the timeline. Profile the server handler, and if the latency is inherent, move the call off the critical render path.`
  } else {
    title = `${req.method} ${path} flagged as anomalous`
  }

  return {
    id: req.id,
    layer: 'network',
    severity,
    title,
    detail: status ? `${explainer.title} — ${explainer.explanation}` : 'The request produced no HTTP response.',
    evidence,
    files: [],
    remediation,
    confidence: req.isFailed || status >= 500 ? 0.9 : 0.72,
    timestamp: req.startTime
  }
}

function buildConsoleFinding(entry: ConsoleEntry): DiagnosticFinding {
  const classified = classifyClientError(entry)
  const frames = entry.parsedStack || []
  const appFrames = frames.filter(isAppFrame)
  const shown = (appFrames.length > 0 ? appFrames : frames).slice(0, 4)

  const evidence: string[] = [entry.message]
  if (entry.count > 1) {
    evidence.push(`Repeated ${entry.count}× between ${new Date(entry.firstSeen).toLocaleTimeString()} and ${new Date(entry.lastSeen).toLocaleTimeString()}`)
  }
  shown.forEach((frame, i) => {
    evidence.push(`Frame ${i + 1}: ${frameLabel(frame)}${isAppFrame(frame) ? ' [app]' : ' [vendor]'}`)
  })
  if (shown.length === 0 && entry.stack) {
    evidence.push(entry.stack.split('\n').slice(0, 4).join('\n'))
  }

  const files = appFrames
    .map((f) => (f.filename && f.lineno ? `${f.filename}:${f.lineno}` : f.filename || ''))
    .filter(Boolean)

  const origin = appFrames[0] ? ` at ${frameLabel(appFrames[0])}` : ''

  return {
    id: entry.id,
    layer: 'console',
    severity: entry.level === 'error' ? 'critical' : 'notice',
    title: `${classified.kind}${classified.subject ? ` on \`${classified.subject}\`` : ''}${origin}`,
    detail: entry.message,
    evidence,
    files: Array.from(new Set(files)),
    remediation: classified.remediation,
    confidence: appFrames.length > 0 ? 0.88 : 0.7,
    timestamp: entry.timestamp
  }
}

function buildDockerFinding(log: DockerLogEntry): DiagnosticFinding {
  const classified = classifyDockerError(log)
  return {
    id: log.id,
    layer: 'docker',
    severity: log.level === 'error' ? 'critical' : 'notice',
    title: `${log.containerName}: ${classified.kind}`,
    detail: log.message,
    evidence: [
      `[${log.containerName} · ${log.stream}] ${log.message}`,
      `Logged at ${new Date(log.timestamp).toLocaleTimeString()}`
    ],
    files: [],
    remediation: classified.remediation,
    confidence: 0.85,
    timestamp: log.timestamp
  }
}

function buildResourceFindings(state: DebugState): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = []
  const mem = state.memory

  if (mem && mem.heapUsagePercent !== undefined && mem.heapUsagePercent >= 85) {
    const evidence = [
      `Heap ${Math.round((mem.usedJSHeapSize || 0) / 1048576)}MB of ${Math.round((mem.jsHeapSizeLimit || 0) / 1048576)}MB limit (${Math.round(mem.heapUsagePercent)}%)`
    ]
    if (mem.trendMBPerMin !== undefined) evidence.push(`Growth trend: ${mem.trendMBPerMin.toFixed(1)}MB/min`)
    if (mem.domNodeCount) evidence.push(`DOM elements: ${mem.domNodeCount}`)
    findings.push({
      id: `mem_${mem.timestamp}`,
      layer: 'memory',
      severity: mem.heapUsagePercent >= 95 ? 'critical' : 'high',
      title: `JS heap at ${Math.round(mem.heapUsagePercent)}% of its limit`,
      detail: 'The tab is close to the heap ceiling; allocation failures and GC pauses become likely.',
      evidence,
      files: [],
      remediation: `Take two heap snapshots a minute apart and diff retained objects. Detached nodes and un-removed listeners are the usual retainers.`,
      confidence: 0.8,
      timestamp: mem.timestamp
    })
  }

  const longTasks = state.performance?.longTasks || []
  if (longTasks.length > 0) {
    const worst = longTasks.reduce((a, b) => (b.duration > a.duration ? b : a))
    if (worst.duration >= 200) {
      findings.push({
        id: `longtask_${Math.round(worst.startTime)}`,
        layer: 'performance',
        severity: worst.duration >= 500 ? 'high' : 'notice',
        title: `Main thread blocked for ${Math.round(worst.duration)}ms`,
        detail: `${longTasks.length} long task(s) recorded; the worst blocked the main thread for ${Math.round(worst.duration)}ms.`,
        evidence: longTasks
          .slice(-4)
          .map((t) => `${Math.round(t.duration)}ms task at t+${Math.round(t.startTime)}ms${t.name ? ` (${t.name})` : ''}`),
        files: [],
        remediation: `Break this work into chunks yielded across frames, or move it to a Web Worker. Anything over 50ms is input-blocking.`,
        confidence: 0.75,
        timestamp: Date.now() - Math.round(worst.duration)
      })
    }
  }

  const poorVitals = Object.values(state.performance?.vitals || {}).filter((v) => v.rating === 'poor')
  poorVitals.forEach((vital) => {
    findings.push({
      id: `vital_${vital.name}`,
      layer: 'performance',
      severity: 'notice',
      title: `${vital.name} is poor (${Math.round(vital.value)}${vital.name === 'CLS' ? '' : 'ms'})`,
      detail: `Core Web Vital ${vital.name} measured ${vital.value} which falls in the "poor" band.`,
      evidence: [`${vital.name} = ${vital.value}${vital.attribution ? ` (attributed to ${vital.attribution})` : ''}`],
      files: [],
      remediation:
        vital.name === 'CLS'
          ? `Reserve space for late-loading media and injected banners so they stop shifting laid-out content.`
          : `Reduce the work on the critical path feeding ${vital.name} — defer non-essential scripts and shrink the largest blocking resource.`,
      confidence: 0.7,
      timestamp: Date.now()
    })
  })

  return findings
}

/** Renders the causal graph as a human-readable ordered chain. */
function describeCausalChain(graph: CausalErrorGraph | undefined): string[] {
  // With no edges there is no chain to describe — a lone node rendered as a
  // "chain" reads as a proven root cause when nothing was actually linked.
  if (!graph || graph.nodes.length === 0 || graph.edges.length === 0) return []

  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const chain: string[] = []
  const visited = new Set<string>()

  let cursor = graph.rootCauseNodeId || graph.nodes.slice().sort((a, b) => a.timestamp - b.timestamp)[0]?.id
  while (cursor && !visited.has(cursor)) {
    visited.add(cursor)
    const node = byId.get(cursor)
    if (!node) break
    const marker = node.isRootCause ? ' ← root cause' : ''
    chain.push(`[${node.layer}] ${node.label} — ${node.summary}${marker}`)

    const outgoing = graph.edges
      .filter((e) => e.source === cursor && !visited.has(e.target))
      .sort((a, b) => b.confidence - a.confidence)[0]
    if (!outgoing) break
    chain.push(`   ↓ ${outgoing.relationship} (${Math.round(outgoing.confidence * 100)}% confidence${outgoing.timeDeltaMs !== undefined ? `, +${Math.abs(outgoing.timeDeltaMs)}ms` : ''})`)
    cursor = outgoing.target
  }

  return chain
}

/**
 * Deterministic root-cause analysis over live telemetry. Used both to drive the
 * offline agent and to give the UI a real answer when no LLM is configured.
 * Every string it emits is composed from values read out of `state`.
 */
export class LocalDiagnosticEngine {
  public analyze(state: DebugState): LocalDiagnosis {
    const findings: DiagnosticFinding[] = []

    const dockerErrors = (state.docker?.logs || []).filter((l) => l.level === 'error')
    dockerErrors.forEach((log) => findings.push(buildDockerFinding(log)))

    state.network.records
      .filter((r) => r.isFailed || r.isSlow || (r.status !== undefined && r.status >= 400))
      .forEach((req) => findings.push(buildNetworkFinding(req)))

    state.console.entries
      .filter((e) => e.level === 'error' || e.level === 'warn')
      .forEach((entry) => findings.push(buildConsoleFinding(entry)))

    findings.push(...buildResourceFindings(state))

    findings.sort((a, b) => {
      const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
      if (bySeverity !== 0) return bySeverity
      return a.timestamp - b.timestamp
    })

    if (findings.length === 0) {
      return {
        hasEvidence: false,
        headline: 'No faults in the telemetry buffers',
        diagnosis:
          'The console, network, Docker, memory and performance buffers hold no errors, failed requests or threshold breaches for this session. There is nothing to diagnose yet.',
        rootCause: 'No fault observed.',
        confidence: 0,
        findings: [],
        causalChain: [],
        suggestedFix: '',
        filesToModify: []
      }
    }

    const graph = state.causalGraph
    const causalChain = describeCausalChain(graph)

    // Anchor the root cause on the graph's root node when the graph found one,
    // otherwise on the highest-severity earliest finding.
    const rootNode = graph?.rootCauseNodeId ? graph.nodes.find((n) => n.id === graph.rootCauseNodeId) : undefined
    const primary = (rootNode && findings.find((f) => f.id === rootNode.id)) || findings[0]
    const downstream = findings.filter((f) => f.id !== primary.id)

    const layersHit = Array.from(new Set(findings.map((f) => f.layer)))
    const criticalCount = findings.filter((f) => f.severity === 'critical').length

    const headline = primary.title

    const diagnosisParts: string[] = []
    diagnosisParts.push(
      `${findings.length} fault${findings.length === 1 ? '' : 's'} across ${layersHit.length} layer${layersHit.length === 1 ? '' : 's'} (${layersHit.join(', ')}); ${criticalCount} critical.`
    )
    diagnosisParts.push(`The earliest critical signal is in the ${primary.layer} layer: ${primary.title}.`)
    if (graph && graph.edges.length > 0) {
      const weakOnly = graph.edges.every((e) => e.relationship === 'CORRELATED_WITH')
      diagnosisParts.push(
        weakOnly
          ? `The correlation engine linked ${graph.nodes.length} error nodes with ${graph.edges.length} temporal edge${graph.edges.length === 1 ? '' : 's'}, but the mechanism connecting them was not observed — treat the ordering as suggestive, not proven.`
          : `The correlation engine linked ${graph.nodes.length} error nodes with ${graph.edges.length} causal edge${graph.edges.length === 1 ? '' : 's'}, so the later failures are downstream effects rather than independent bugs.`
      )
    } else if (downstream.length > 0) {
      // No edges at all: the faults are genuinely unlinked, and the "root cause"
      // above is only the earliest critical one — say so rather than implying a chain.
      const layerNote =
        layersHit.length > 1
          ? ` They span ${layersHit.join(', ')}, so more than one subsystem is involved.`
          : ''
      diagnosisParts.push(
        `No temporal link was found between these faults, so this is ${findings.length} separate problems rather than one cascade; the signal named above is simply the earliest critical one.${layerNote}`
      )
    }

    const rootCauseParts: string[] = []
    rootCauseParts.push(`${primary.title}`)
    rootCauseParts.push(primary.detail)
    rootCauseParts.push(`Evidence: ${primary.evidence.slice(0, 3).join(' | ')}`)
    if (causalChain.length > 0) {
      rootCauseParts.push(`Causal chain:\n${causalChain.join('\n')}`)
    }
    rootCauseParts.push(`Remediation: ${primary.remediation}`)

    // Confidence reflects how much corroborating evidence actually exists.
    let confidence = primary.confidence
    if (graph && graph.edges.length > 0) {
      const best = Math.max(...graph.edges.map((e) => e.confidence))
      confidence = Math.min(0.95, (confidence + best) / 2 + 0.08)
    }
    if (layersHit.length >= 2) confidence = Math.min(0.95, confidence + 0.04)
    if (findings.length === 1 && primary.files.length === 0) confidence = Math.min(confidence, 0.7)

    const fixSections: string[] = []
    fixSections.push(`# Ordered remediation plan (${findings.length} finding${findings.length === 1 ? '' : 's'})`)
    fixSections.push('')
    fixSections.push(`## 1. Fix first — ${primary.title}`)
    fixSections.push(`Layer: ${primary.layer} · severity: ${primary.severity}`)
    fixSections.push(primary.remediation)
    if (primary.files.length > 0) {
      fixSections.push(`Source locations: ${primary.files.join(', ')}`)
    }

    downstream.slice(0, 4).forEach((finding, i) => {
      fixSections.push('')
      fixSections.push(`## ${i + 2}. ${finding.title}`)
      fixSections.push(`Layer: ${finding.layer} · severity: ${finding.severity}`)
      fixSections.push(finding.remediation)
      if (finding.files.length > 0) {
        fixSections.push(`Source locations: ${finding.files.join(', ')}`)
      }
    })

    if (graph && graph.edges.length > 0) {
      fixSections.push('')
      fixSections.push(
        `Fixing item 1 should clear the ${graph.edges.length} downstream effect${graph.edges.length === 1 ? '' : 's'} above — re-run after that change before working the rest.`
      )
    }

    const filesToModify = Array.from(new Set(findings.flatMap((f) => f.files)))

    return {
      hasEvidence: true,
      headline,
      diagnosis: diagnosisParts.join(' '),
      rootCause: rootCauseParts.join('\n\n'),
      confidence: Number(confidence.toFixed(2)),
      findings,
      causalChain,
      suggestedFix: fixSections.join('\n'),
      filesToModify
    }
  }
}

export const localDiagnosticEngine = new LocalDiagnosticEngine()
