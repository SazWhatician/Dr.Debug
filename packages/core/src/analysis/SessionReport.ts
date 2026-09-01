import { type DebugState, generateCurlCommand } from '@dr-debug/controller'
import { type DiagnosticFinding, LocalDiagnosticEngine } from './LocalDiagnosticEngine.js'
import type { InvestigationResult } from '../types.js'

export interface SessionReportOptions {
  /** Findings from an agent run, folded into the report when present. */
  investigation?: InvestigationResult | null
  /** Cap on findings rendered in full. Remainder are listed by title. */
  maxFindings?: number
  /** Cap on timeline rows. */
  maxTimelineEvents?: number
}

interface TimelineRow {
  time: number
  layer: string
  text: string
}

function fence(body: string, lang = ''): string[] {
  return ['```' + lang, body, '```']
}

function prettyJson(raw: string): string[] {
  try {
    return fence(JSON.stringify(JSON.parse(raw), null, 2), 'json')
  } catch {
    return fence(raw)
  }
}

function buildTimeline(state: DebugState, limit: number): TimelineRow[] {
  const rows: TimelineRow[] = []

  state.network.records.forEach((r) => {
    const outcome = r.isFailed ? 'FAILED' : `${r.status ?? '?'}`
    const flags = [r.isCORS ? 'CORS' : r.isCrossOrigin ? 'CROSS-ORIGIN' : '', r.isSlow ? 'SLOW' : ''].filter(Boolean).join(',')
    rows.push({
      time: r.startTime,
      layer: 'network',
      text: `${r.method} ${r.url} → ${outcome}${r.duration !== undefined ? ` (${Math.round(r.duration)}ms)` : ''}${flags ? ` [${flags}]` : ''}`
    })
  })

  state.console.entries.forEach((c) => {
    rows.push({
      time: c.timestamp,
      layer: `console:${c.level}`,
      text: `${c.message.slice(0, 160)}${c.count > 1 ? ` (×${c.count})` : ''}`
    })
  })

  ;(state.docker?.logs || []).forEach((d) => {
    rows.push({
      time: d.timestamp,
      layer: `docker:${d.level}`,
      text: `[${d.containerName}] ${d.message.slice(0, 160)}`
    })
  })

  ;(state.interactions || []).forEach((i) => {
    rows.push({
      time: i.timestamp,
      layer: 'user',
      text: `${i.type}${i.target ? ` on ${i.target}` : ''}${i.detail ? ` — ${i.detail}` : ''}`
    })
  })

  rows.sort((a, b) => a.time - b.time)
  return rows.slice(-limit)
}

function renderFinding(finding: DiagnosticFinding, index: number, lines: string[]): void {
  lines.push(`#### ${index}. ${finding.title}`)
  lines.push(
    `\`layer: ${finding.layer}\` · \`severity: ${finding.severity}\` · \`confidence: ${Math.round(finding.confidence * 100)}%\` · \`observed: ${new Date(finding.timestamp).toISOString()}\``
  )
  lines.push('')
  lines.push(finding.detail)
  lines.push('')
  lines.push('**Observed evidence:**')
  finding.evidence.forEach((item) => lines.push(`- ${item}`))
  if (finding.files.length > 0) {
    lines.push('')
    lines.push(`**Source locations from the stack:** ${finding.files.map((f) => `\`${f}\``).join(', ')}`)
  }
  lines.push('')
  lines.push(`**Suggested direction:** ${finding.remediation}`)
  lines.push('')
}

/**
 * Builds a complete, paste-ready incident brief for a coding agent (Claude Code,
 * Antigravity, Cursor, …). Everything in it is read out of the live session —
 * telemetry, the derived findings, and the agent's conclusion when one exists.
 */
export function generateSessionDebugPrompt(
  state: DebugState,
  options: SessionReportOptions = {}
): string {
  const maxFindings = options.maxFindings ?? 6
  const maxTimeline = options.maxTimelineEvents ?? 24
  const analysis = new LocalDiagnosticEngine().analyze(state)
  const lines: string[] = []

  // ── Header ────────────────────────────────────────────────────────────────
  lines.push('# Debug session brief')
  lines.push('')
  lines.push(
    'Captured live from a running browser session by Dr. Debug. Every value below was observed — none of it is inferred or synthetic.'
  )
  lines.push('')
  lines.push('| | |')
  lines.push('|---|---|')
  lines.push(`| Page | \`${state.pageContext.url || 'unknown'}\` |`)
  if (state.pageContext.title) lines.push(`| Title | ${state.pageContext.title} |`)
  lines.push(`| Captured at | ${new Date(state.pageContext.timestamp).toISOString()} |`)
  lines.push(`| Session uptime | ${state.pageContext.uptimeSeconds.toFixed(1)}s |`)
  if (state.framework?.detectedFramework) lines.push(`| Framework | ${state.framework.detectedFramework} |`)
  lines.push(
    `| Console | ${state.console.errorCount} error(s), ${state.console.warnCount} warning(s) of ${state.console.total} entries |`
  )
  lines.push(
    `| Network | ${state.network.failedCount} failed, ${state.network.slowCount} slow of ${state.network.total} requests |`
  )
  if (state.docker) {
    lines.push(
      `| Backend | ${state.docker.errorCount} container error(s) across ${state.docker.containers.length} container(s) |`
    )
  }
  if (state.memory?.heapUsagePercent !== undefined) {
    lines.push(
      `| Heap | ${Math.round((state.memory.usedJSHeapSize || 0) / 1048576)}MB (${Math.round(state.memory.heapUsagePercent)}% of limit) |`
    )
  }
  lines.push(`| User agent | \`${state.pageContext.userAgent || 'unknown'}\` |`)
  lines.push('')

  if (!analysis.hasEvidence && !options.investigation) {
    lines.push('## Result')
    lines.push('')
    lines.push(analysis.diagnosis)
    lines.push('')
    lines.push('There is nothing to act on. Reproduce the fault, then capture again.')
    return lines.join('\n')
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  lines.push('## Summary')
  lines.push('')
  lines.push(`**Most likely root cause:** ${analysis.headline}`)
  lines.push('')
  lines.push(analysis.diagnosis)
  lines.push('')
  lines.push(`Derived confidence: **${Math.round(analysis.confidence * 100)}%**`)
  lines.push('')

  // ── Causal chain ──────────────────────────────────────────────────────────
  if (analysis.causalChain.length > 0) {
    lines.push('## Causal chain')
    lines.push('')
    lines.push('Ordered by the correlation engine from timestamps across layers:')
    lines.push('')
    lines.push(...fence(analysis.causalChain.join('\n')))
    lines.push('')
  }

  if (state.causalGraph && state.causalGraph.edges.length > 0) {
    lines.push('<details><summary>Causal graph (Mermaid)</summary>')
    lines.push('')
    lines.push(...fence(state.causalGraph.mermaidDiagram, 'mermaid'))
    lines.push('')
    lines.push('</details>')
    lines.push('')
  }

  // ── Findings ──────────────────────────────────────────────────────────────
  lines.push(`## Findings (${analysis.findings.length}, ordered by severity then time)`)
  lines.push('')
  analysis.findings.slice(0, maxFindings).forEach((finding, i) => renderFinding(finding, i + 1, lines))

  if (analysis.findings.length > maxFindings) {
    lines.push(`**${analysis.findings.length - maxFindings} further finding(s), summarised:**`)
    analysis.findings.slice(maxFindings).forEach((f) => {
      lines.push(`- \`${f.severity}\` [${f.layer}] ${f.title}`)
    })
    lines.push('')
  }

  // ── Full HTTP detail for failing requests ────────────────────────────────
  const failing = state.network.records.filter((r) => r.isFailed || (r.status ?? 0) >= 400)
  if (failing.length > 0) {
    lines.push('## Failing HTTP transactions (full detail)')
    lines.push('')
    failing.slice(0, 3).forEach((req) => {
      lines.push(`### ${req.method} ${req.url}`)
      lines.push(
        `Status \`${req.status || 'no response'}${req.statusText ? ` ${req.statusText}` : ''}\`${req.duration !== undefined ? ` after ${Math.round(req.duration)}ms` : ''}${req.isCORS ? ' · CORS blocked' : req.isCrossOrigin ? ' · cross-origin, cause not exposed to JS' : ''}`
      )
      if (req.error) lines.push(`Transport error: \`${req.error}\``)
      if (req.initiator) lines.push(`Initiator: \`${req.initiator}\``)
      lines.push('')
      lines.push('Reproduce in a terminal:')
      lines.push(...fence(generateCurlCommand(req), 'bash'))
      lines.push('')
      if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
        lines.push('<details><summary>Request headers</summary>')
        lines.push('')
        lines.push(...fence(JSON.stringify(req.requestHeaders, null, 2), 'json'))
        lines.push('')
        lines.push('</details>')
      }
      if (req.requestBodyPreview) {
        lines.push('Request body:')
        lines.push(...prettyJson(req.requestBodyPreview))
      }
      if (req.responseHeaders && Object.keys(req.responseHeaders).length > 0) {
        lines.push('<details><summary>Response headers</summary>')
        lines.push('')
        lines.push(...fence(JSON.stringify(req.responseHeaders, null, 2), 'json'))
        lines.push('')
        lines.push('</details>')
      }
      if (req.responseBodyPreview) {
        lines.push('Response body:')
        lines.push(...prettyJson(req.responseBodyPreview))
      }
      lines.push('')
    })
  }

  // ── Stack traces ─────────────────────────────────────────────────────────
  const withStacks = state.console.entries.filter((e) => e.level === 'error' && (e.stack || e.parsedStack?.length))
  if (withStacks.length > 0) {
    lines.push('## Stack traces')
    lines.push('')
    withStacks.slice(0, 3).forEach((entry) => {
      lines.push(`### ${entry.message.slice(0, 160)}`)
      lines.push(`\`${entry.type}\`${entry.count > 1 ? ` · repeated ${entry.count}×` : ''}`)
      lines.push('')
      if (entry.parsedStack && entry.parsedStack.length > 0) {
        entry.parsedStack.slice(0, 8).forEach((frame, i) => {
          const file = frame.filename || 'unknown'
          const vendor = file.includes('node_modules') || file.startsWith('chrome-extension://')
          lines.push(
            `${i + 1}. ${vendor ? '[vendor]' : '[app]'} \`${frame.functionName || '<anonymous>'}\` — \`${file}:${frame.lineno ?? 0}:${frame.colno ?? 0}\``
          )
        })
      } else if (entry.stack) {
        lines.push(...fence(entry.stack));
      }
      lines.push('')
    })
  }

  // ── Backend logs ─────────────────────────────────────────────────────────
  const dockerLogs = state.docker?.logs || []
  if (dockerLogs.length > 0) {
    const containers = state.docker?.containers || []
    lines.push('## Backend container logs')
    lines.push('')
    if (containers.length > 0) {
      containers.forEach((c) => {
        lines.push(`- \`${c.name}\` — ${c.image} · ${c.state}${c.status ? ` (${c.status})` : ''}${c.ports?.length ? ` · ports ${c.ports.join(', ')}` : ''}`)
      })
      lines.push('')
    }
    const errorLogs = dockerLogs.filter((l) => l.level === 'error')
    const shown = (errorLogs.length > 0 ? errorLogs : dockerLogs).slice(-12)
    lines.push(...fence(shown.map((l) => `${new Date(l.timestamp).toISOString()} [${l.containerName}/${l.stream}] ${l.message}`).join('\n')))
    lines.push('')
  }

  // ── Timeline ─────────────────────────────────────────────────────────────
  const timeline = buildTimeline(state, maxTimeline)
  if (timeline.length > 0) {
    const origin = timeline[0].time
    lines.push('## Chronological timeline')
    lines.push('')
    lines.push(
      ...fence(
        timeline
          .map((row) => `+${String(row.time - origin).padStart(6, ' ')}ms  ${row.layer.padEnd(16, ' ')}  ${row.text}`)
          .join('\n')
      )
    )
    lines.push('')
  }

  // ── Framework state ──────────────────────────────────────────────────────
  if (state.framework?.detectedFramework) {
    lines.push('## Framework state')
    lines.push('')
    lines.push(`- Detected: \`${state.framework.detectedFramework}\``)
    if (state.framework.store) {
      lines.push(`- Store (\`${state.framework.store.type}\`) top-level keys: \`${state.framework.store.topLevelKeys.slice(0, 12).join(', ')}\``)
    }
    if (state.framework.components.length > 0) {
      lines.push(`- Components in tree: ${state.framework.components.length}`)
    }
    state.framework.recentEvents.slice(-5).forEach((ev) => {
      lines.push(`- [${ev.framework}] ${ev.detail}`)
    })
    lines.push('')
  }

  // ── Agent conclusion ─────────────────────────────────────────────────────
  const investigation = options.investigation
  if (investigation) {
    lines.push('## Prior agent investigation')
    lines.push('')
    lines.push(
      `An automated agent ran ${investigation.steps.length} step(s) over ${(investigation.durationMs / 1000).toFixed(1)}s and reported ${Math.round(investigation.confidence * 100)}% confidence. Treat this as a hypothesis to verify against the evidence above, not as ground truth.`
    )
    lines.push('')
    lines.push(`**Goal given:** ${investigation.goal}`)
    lines.push('')
    lines.push(`**Diagnosis:** ${investigation.diagnosis}`)
    lines.push('')
    lines.push('**Root cause as reported:**')
    lines.push('')
    lines.push(...fence(investigation.rootCause))
    lines.push('')
    if (investigation.steps.length > 0) {
      lines.push('<details><summary>Investigation steps</summary>')
      lines.push('')
      investigation.steps.forEach((step) => {
        lines.push(`**Step ${step.stepNumber} — \`${step.toolCall.name}\`**`)
        lines.push('')
        lines.push(`Hypothesis: ${step.reflection.working_hypothesis}`)
        lines.push('')
        lines.push(...fence(step.toolResult.slice(0, 1200)))
        lines.push('')
      })
      lines.push('</details>')
      lines.push('')
    }
    if (investigation.fix) {
      lines.push('**Remediation the agent proposed:**')
      lines.push('')
      lines.push(...fence(investigation.fix))
      lines.push('')
    }
  }

  // ── Remediation plan ─────────────────────────────────────────────────────
  if (analysis.suggestedFix) {
    lines.push('## Remediation plan derived from the evidence')
    lines.push('')
    lines.push(analysis.suggestedFix)
    lines.push('')
  }

  if (analysis.filesToModify.length > 0) {
    lines.push('## Source locations named by the stacks')
    lines.push('')
    analysis.filesToModify.forEach((file) => lines.push(`- \`${file}\``))
    lines.push('')
  }

  // ── Task ─────────────────────────────────────────────────────────────────
  lines.push('---')
  lines.push('')
  lines.push('## Your task')
  lines.push('')
  lines.push(`1. Open the source locations named above and find the code that produced ${analysis.headline}.`)
  lines.push('2. Confirm or refute the suggested root cause against the actual code. The evidence here is real; the attribution is a heuristic and may be wrong.')
  lines.push('3. Fix the root cause rather than the symptom — the causal chain shows which failures are downstream.')
  lines.push('4. Give me the minimal diff, and tell me how to verify it against the reproduction command above.')
  lines.push('')
  lines.push('If the evidence is insufficient to locate the cause, say what additional telemetry you need instead of guessing.')

  return lines.join('\n')
}
