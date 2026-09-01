import type { DebugController, DebugState } from '@dr-debug/controller'
import type { ChatMessage, ILLMClient, LLMResponse, ToolDefinition } from '@dr-debug/llms'
import { LocalDiagnosticEngine } from './LocalDiagnosticEngine.js'

interface PlannedStep {
  tool: string
  args: Record<string, any>
  /** Why this step is worth taking, phrased from the evidence that justifies it. */
  hypothesis: string
  goal: string
}

/**
 * An `ILLMClient` that needs no API key. Instead of replaying a script it reads
 * live telemetry on every turn, picks the next diagnostic tool that actually has
 * unexamined evidence behind it, and concludes with the analysis produced by
 * `LocalDiagnosticEngine`. Its reasoning text quotes real observed values.
 */
export class HeuristicLLMClient implements ILLMClient {
  private controller: DebugController
  private engine: LocalDiagnosticEngine

  constructor(controller: DebugController, engine = new LocalDiagnosticEngine()) {
    this.controller = controller
    this.engine = engine
  }

  public async chat(
    messages: ChatMessage[],
    _tools?: ToolDefinition[],
    _signal?: AbortSignal
  ): Promise<LLMResponse> {
    const executed = this.extractExecutedTools(messages)
    const state = this.controller.getSnapshot()
    const step = this.planNextStep(state, executed)

    const memory = this.summariseEvidence(state)

    const reflection = {
      evaluation_previous_goal:
        executed.length === 0
          ? 'Starting from the raw telemetry buffers; no prior step to evaluate.'
          : `Completed ${executed.length} step(s) so far (${executed.join(', ')}). Evidence gathered is reflected in the hypothesis below.`,
      working_hypothesis: step.hypothesis,
      memory,
      next_goal: step.goal,
      action: {
        name: step.tool,
        arguments: step.args
      }
    }

    return {
      content: JSON.stringify(reflection),
      finishReason: step.tool === 'done' ? 'stop' : 'tool_calls'
    }
  }

  /**
   * The core appends `Tool Result for [name]:` after each executed tool when the
   * model answers with reflection JSON, so the transcript is the source of truth
   * for what has already run.
   */
  private extractExecutedTools(messages: ChatMessage[]): string[] {
    const executed: string[] = []
    for (const message of messages) {
      if (message.role === 'tool' && message.name) {
        executed.push(message.name)
        continue
      }
      const match = /Tool Result for \[([a-z_]+)\]/i.exec(message.content || '')
      if (match) executed.push(match[1])
    }
    return executed
  }

  private summariseEvidence(state: DebugState): string {
    const parts: string[] = []
    const errors = state.console.entries.filter((e) => e.level === 'error')
    const failedNet = state.network.records.filter((r) => r.isFailed || (r.status ?? 0) >= 400)
    const slowNet = state.network.records.filter((r) => r.isSlow && !r.isFailed)
    const dockerErrors = (state.docker?.logs || []).filter((l) => l.level === 'error')

    if (errors.length > 0) parts.push(`${errors.length} console error(s), first: "${errors[0].message.slice(0, 90)}"`)
    if (failedNet.length > 0) {
      parts.push(`${failedNet.length} failing request(s), first: ${failedNet[0].method} ${failedNet[0].url} → ${failedNet[0].status || 'no response'}`)
    }
    if (slowNet.length > 0) parts.push(`${slowNet.length} slow request(s)`)
    if (dockerErrors.length > 0) {
      parts.push(`${dockerErrors.length} backend error(s), first from ${dockerErrors[0].containerName}`)
    }
    if (state.correlations.length > 0) parts.push(`${state.correlations.length} temporal correlation(s)`)
    if (state.causalGraph && state.causalGraph.edges.length > 0) {
      parts.push(`causal graph: ${state.causalGraph.nodes.length} nodes / ${state.causalGraph.edges.length} edges`)
    }

    return parts.length > 0 ? parts.join('; ') : 'No faults present in any buffer.'
  }

  /**
   * Builds the candidate step list from evidence that exists right now, then
   * returns the first one not already executed.
   */
  private planNextStep(state: DebugState, executed: string[]): PlannedStep {
    const done = new Set(executed)
    const candidates: PlannedStep[] = []

    const dockerErrors = (state.docker?.logs || []).filter((l) => l.level === 'error')
    const failedNet = state.network.records.filter((r) => r.isFailed || (r.status ?? 0) >= 400)
    const slowNet = state.network.records.filter((r) => r.isSlow && !r.isFailed)
    const consoleErrors = state.console.entries.filter((e) => e.level === 'error')

    // Work the stack bottom-up: a backend fault explains the HTTP fault, which
    // explains the client fault, so read the deepest layer first.
    if (dockerErrors.length > 0) {
      const first = dockerErrors[0]
      candidates.push({
        tool: 'inspect_docker_logs',
        args: { level: 'error', tail: Math.min(20, dockerErrors.length + 5) },
        hypothesis: `${dockerErrors.length} backend error${dockerErrors.length === 1 ? '' : 's'} are in the Docker buffer, the earliest from \`${first.containerName}\` at ${new Date(first.timestamp).toLocaleTimeString()}. If the backend broke first, the browser-side failures are symptoms — so read the container logs before trusting the client stack trace.`,
        goal: `Read the error-level logs from ${dockerErrors.length} backend event(s) to find the deepest failure.`
      })
    }

    if (failedNet.length > 0) {
      const target = failedNet[0]
      const index = state.network.records.indexOf(target)
      candidates.push({
        tool: 'inspect_request',
        args: { requestIndex: Math.max(0, index) },
        hypothesis: `\`${target.method} ${target.url}\` returned ${target.status || 'no response at all'}${target.isCORS ? ' and was flagged as a CORS failure' : ''}. Pulling its headers, payload and response body will show whether the fault is the request we sent or the service we called.`,
        goal: `Inspect the full transaction for ${target.method} ${target.url}.`
      })
    }

    if (consoleErrors.length > 0) {
      const target = consoleErrors[0]
      const index = state.console.entries.filter((e) => e.level === 'error').indexOf(target)
      candidates.push({
        tool: 'inspect_error',
        args: { errorIndex: Math.max(0, index) },
        hypothesis: `The console holds ${consoleErrors.length} error${consoleErrors.length === 1 ? '' : 's'}; the first is "${target.message.slice(0, 110)}"${target.count > 1 ? ` and it repeated ${target.count} times` : ''}. Demangling its stack will name the app frame that actually threw, as opposed to the vendor frame that reported it.`,
        goal: `Resolve the stack trace for "${target.message.slice(0, 60)}" down to app source lines.`
      })
    }

    if (slowNet.length > 0 && failedNet.length === 0) {
      const target = slowNet[0]
      const index = state.network.records.indexOf(target)
      candidates.push({
        tool: 'inspect_request',
        args: { requestIndex: Math.max(0, index) },
        hypothesis: `Nothing outright failed, but \`${target.method} ${target.url}\` took ${Math.round(target.duration || 0)}ms. Latency this high is usually the complaint behind "the app feels broken", so it is worth inspecting.`,
        goal: `Inspect the slowest request (${Math.round(target.duration || 0)}ms) for a latency cause.`
      })
    }

    // Only graph once at least two layers have signal — a graph over one layer
    // has no edges to contribute.
    const layersWithSignal = [dockerErrors.length > 0, failedNet.length + slowNet.length > 0, consoleErrors.length > 0].filter(Boolean).length
    if (layersWithSignal >= 2) {
      candidates.push({
        tool: 'graphify_errors',
        args: { includeDocker: dockerErrors.length > 0, timeframeMs: 8000 },
        hypothesis: `Signals exist in ${layersWithSignal} separate layers. Correlating them by timestamp will establish whether one failure caused the others or whether these are unrelated bugs that happen to coincide.`,
        goal: 'Build the cross-layer causal graph and identify the root node.'
      })
    }

    if (state.correlations.length > 0) {
      candidates.push({
        tool: 'find_correlations',
        args: {},
        hypothesis: `The correlation engine already flagged ${state.correlations.length} temporal link${state.correlations.length === 1 ? '' : 's'}. Reading them out confirms the ordering behind the causal graph.`,
        goal: 'Confirm the temporal ordering of the correlated events.'
      })
    }

    if (state.framework?.detectedFramework && consoleErrors.length > 0) {
      candidates.push({
        tool: 'query_framework_state',
        args: {},
        hypothesis: `${state.framework.detectedFramework} is driving this page and a client error was thrown. Inspecting store/component state shows whether the thrown value came from application state rather than the network.`,
        goal: `Inspect ${state.framework.detectedFramework} state around the failure.`
      })
    }

    const next = candidates.find((candidate) => !done.has(candidate.tool))
    if (next) return next

    return this.buildConclusion(state)
  }

  private buildConclusion(state: DebugState): PlannedStep {
    const analysis = this.engine.analyze(state)

    return {
      tool: 'done',
      args: {
        diagnosis: analysis.diagnosis,
        rootCause: analysis.rootCause,
        fix: analysis.suggestedFix,
        confidence: analysis.confidence,
        filesToModify: analysis.filesToModify
      },
      hypothesis: analysis.hasEvidence
        ? `Every layer with evidence has been inspected. ${analysis.headline} is the earliest critical signal and the ${analysis.causalChain.length > 0 ? 'causal chain confirms' : 'evidence indicates'} it as the root cause. Writing up the conclusion.`
        : 'All buffers are empty — there is no fault to attribute. Reporting a clean session.',
      goal: 'Conclude the investigation with the derived diagnosis and remediation plan.'
    }
  }
}
