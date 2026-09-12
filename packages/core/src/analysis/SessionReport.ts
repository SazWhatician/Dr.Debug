import { type DebugState, generateCurlCommand } from '@dr-debug/controller'
import { type DiagnosticFinding, LocalDiagnosticEngine, normalizeSourceFile } from './LocalDiagnosticEngine.js'
export { normalizeSourceFile } from './LocalDiagnosticEngine.js'
import type { InvestigationResult } from '../types.js'

export interface SessionReportOptions {
  /** Findings from an agent run, folded into the report when present. */
  investigation?: InvestigationResult | null
  /** Cap on findings rendered in full. Remainder are listed by title. */
  maxFindings?: number
  /** Cap on timeline rows. */
  maxTimelineEvents?: number
  /** Prompt generation mode: 'ponytail' (default token-saver) or 'standard' (verbose telemetry brief). */
  mode?: 'ponytail' | 'standard'
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
/**
 * Builds a minimalist, surgical incident brief adhering to the Ponytail philosophy.
 * Eliminates telemetry bloat, demangles and isolates application stack frames,
 * burst-compresses repeated errors, and injects the Ponytail Minimality Ladder
 * to enforce a minimal diff (<= 5 lines) from the downstream AI coding assistant.
 */
export function generatePonytailDebugPrompt(
  state: DebugState,
  options: SessionReportOptions = {}
): string {
  const analysis = new LocalDiagnosticEngine().analyze(state)
  const lines: string[] = []

  // 1. Header
  lines.push('# 🚨 Dr. Debug Incident Brief (Ponytail Protocol)')
  lines.push('')
  lines.push(`- **Target:** \`${state.pageContext.url || 'unknown'}\`${state.framework?.detectedFramework ? ` (${state.framework.detectedFramework})` : ''}`)
  lines.push(`- **Issue:** ${analysis.headline}`)
  lines.push(`- **Derived Confidence:** ${Math.round(analysis.confidence * 100)}%`)
  lines.push('')

  if (!analysis.hasEvidence && !options.investigation) {
    lines.push('### Status')
    lines.push('No active runtime errors or failing network requests observed. Nothing to act on.')
    return lines.join('\n')
  }

  // 2. Diagnosis & Root Cause
  lines.push('### Diagnosis')
  lines.push(analysis.diagnosis)
  lines.push('')

  // 3. Compact Causal Chain
  if (analysis.causalChain.length > 0) {
    lines.push('### Causal Chain')
    analysis.causalChain.slice(0, 3).forEach((item) => lines.push(`- ${item}`))
    lines.push('')
  }

  // 4. Culprit Stack Trace (App frames ONLY, burst compressed)
  const errorEntries = state.console.entries.filter((e) => e.level === 'error')
  if (errorEntries.length > 0) {
    const primary = errorEntries[0]
    lines.push('### Culprit Runtime Error')
    lines.push(`- **Message:** \`${primary.message.slice(0, 200)}\`${primary.count > 1 ? ` (repeated ${primary.count}×)` : ''}`)

    if (primary.parsedStack && primary.parsedStack.length > 0) {
      const appFrames = primary.parsedStack.filter((frame) => {
        const fn = frame.filename || ''
        return !fn.includes('node_modules') && !fn.includes('chrome-extension://') && !fn.includes('webpack/runtime')
      })
      const framesToShow = appFrames.length > 0 ? appFrames.slice(0, 3) : primary.parsedStack.slice(0, 2)
      lines.push('**Application Call Frame(s):**')
      framesToShow.forEach((frame, i) => {
        const file = normalizeSourceFile(frame.filename || 'unknown')
        lines.push(`${i + 1}. \`${frame.functionName || '<anonymous>'}\` at \`${file}:${frame.lineno ?? 0}:${frame.colno ?? 0}\``)
      })
    } else if (primary.stack) {
      const cleanStack = primary.stack
        .split('\n')
        .filter((l) => !l.includes('node_modules') && !l.includes('chrome-extension'))
        .slice(0, 4)
        .join('\n')
      lines.push(...fence(cleanStack || primary.stack.slice(0, 300)))
    }
    lines.push('')
  }

  // 5. Failing Network Request (Pruned headers, safe cURL)
  const failing = state.network.records.filter((r) => r.isFailed || (r.status ?? 0) >= 400)
  if (failing.length > 0) {
    const req = failing[0]
    lines.push('### Failing Network Transaction')
    lines.push(`- **Endpoint:** \`${req.method} ${req.url}\` → \`${req.status || 'FAILED'}${req.statusText ? ` ${req.statusText}` : ''}\``)
    if (req.isCORS) lines.push('- **CORS:** ⚠️ Blocked by browser CORS policy')
    if (req.error) lines.push(`- **Error:** \`${req.error}\``)
    lines.push('')
    lines.push('**Reproduction cURL:**')
    lines.push(...fence(generateCurlCommand(req), 'bash'))
    lines.push('')
    if (req.responseBodyPreview) {
      lines.push(`- **Response Payload:** \`${req.responseBodyPreview.slice(0, 250)}\``)
      lines.push('')
    }
  }

  // 6. Backend Container Log (if any)
  const dockerLogs = state.docker?.logs || []
  const dockerErrors = dockerLogs.filter((l) => l.level === 'error')
  if (dockerErrors.length > 0) {
    const log = dockerErrors[0]
    lines.push('### Backend Container Context')
    lines.push(`- **Container:** \`[${log.containerName}]\` ${log.message.slice(0, 200)}`)
    lines.push('')
  }

  // 7. Prior Agent Investigation (if present)
  if (options.investigation) {
    lines.push('### Prior Agent Investigation')
    lines.push(`- **Diagnosis:** ${options.investigation.diagnosis}`)
    lines.push(`- **Root Cause:** ${options.investigation.rootCause.slice(0, 300)}`)
    if (options.investigation.fix) {
      lines.push(`- **Proposed Direction:** ${options.investigation.fix.slice(0, 250)}`)
    }
    lines.push('')
  }

  // 8. The Ponytail Minimality Ladder & Directive
  lines.push('---')
  lines.push('')
  lines.push('### ✂️ Instructions for AI Coding Assistant (Ponytail Protocol)')
  lines.push('The best code is the code you never wrote. Eliminate code bloat, minimize token consumption, and avoid maintenance burden.')
  lines.push('Before proposing or applying any code changes, climb the **Minimality Ladder**:')
  lines.push('1. **YAGNI (You Ain\'t Gonna Need It)**: Fix ONLY the immediate root cause identified above. Do not refactor surrounding code or add speculative features.')
  lines.push('2. **Reuse Existing Code**: Check if existing utilities, helpers, or patterns in this codebase already solve the problem before creating new ones.')
  lines.push('3. **Standard Library First**: Prefer native JavaScript/TypeScript and Web Platform features (e.g. `?.`, `??`, `Array` methods, `fetch`) over custom helper functions.')
  lines.push('4. **Native Platform Features**: Prefer browser/runtime capabilities over new abstractions.')
  lines.push('5. **Existing Dependencies**: NEVER introduce new npm dependencies. Use only existing packages in `package.json`.')
  lines.push('6. **One-Liner / Concise Construct**: If the fix can be written cleanly in 1–3 lines, do that. Avoid multi-layer abstractions.')
  lines.push('7. **Target Diff Size**: Target a unified git diff of ≤ 5 lines whenever possible.')
  lines.push('8. **Non-Negotiables**: Never compromise on input validation, security, or error handling.')
  lines.push('')
  lines.push('### 📋 Response & Action Requirements')
  lines.push('Structure your response to give the developer immediate clarity, context, and a surgical solution:')
  lines.push('1. **Context & Root Cause Explanation**: In 1–2 clear, concise sentences, explain what broke, why it occurred, and the exact culprit file and line so the developer fully understands the issue.')
  lines.push('2. **Apply Surgical Code Edit**: If running in an agentic IDE with file editing tools (Google Antigravity, Cursor, Claude Code), inspect the target file and directly apply the minimal fix (≤ 5 lines) using `replace_file_content` / `write_to_file`.')
  lines.push('3. **Unified Diff**: Include the concise unified git diff showing the exact before/after lines changed.')
  lines.push('4. **Verification Step**: Provide a clear 1-sentence command or instruction to verify the fix in the running application.')

  return lines.join('\n')
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
  if (options.mode === 'ponytail') {
    return generatePonytailDebugPrompt(state, options)
  }
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
          const file = normalizeSourceFile(frame.filename || 'unknown')
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
    analysis.filesToModify.forEach((file) => lines.push(`- \`${normalizeSourceFile(file)}\``))
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
  lines.push('4. Response & Action Requirements:')
  lines.push('   a. Explain the diagnosis and rationale in 1–2 clear sentences so the developer fully understands what failed and why.')
  lines.push('   b. If you have file editing tools (in Google Antigravity, Cursor, or Claude Code), directly apply the minimal surgical fix (≤ 5 lines) to the target file using your tools.')
  lines.push('   c. Show the minimal unified diff and provide a 1-sentence verification command.')
  lines.push('')
  lines.push('If the evidence is insufficient to locate the cause, say what additional telemetry you need instead of guessing.')

  return lines.join('\n')
}
