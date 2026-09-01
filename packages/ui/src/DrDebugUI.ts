import type { DebugController } from '@dr-debug/controller'
import { generateSessionDebugPrompt, LocalDiagnosticEngine } from '@dr-debug/core'
import { CockpitPanel, type PrescriptionData, type StepItem } from './components/CockpitPanel.js'
import type { CausalErrorGraph } from './components/CausalGraphView.js'
import { FloatingPill } from './components/FloatingPill.js'
import { shadowStyles } from './styles.js'

export interface DrDebugUIOptions {
  onInvestigate?: (query: string) => Promise<void> | void
  container?: HTMLElement
  getController?: () => DebugController | undefined
  /** Supplies the paste-ready brief for the "Copy for AI" action. */
  getSessionPrompt?: () => string
  onSaveSettings?: (settings: any) => void
  onTestConnection?: (settings: any) => Promise<{ success: boolean; message: string }>
}

export class DrDebugUI {
  private host: HTMLElement
  private shadowRoot: ShadowRoot
  private pill: FloatingPill
  private cockpit: CockpitPanel
  private getController?: () => DebugController | undefined
  private engine = new LocalDiagnosticEngine()

  constructor(options: DrDebugUIOptions = {}) {
    this.getController = options.getController

    // Check if #dr-debug-root already exists
    let host = document.getElementById('dr-debug-root')
    if (!host) {
      host = document.createElement('div')
      host.id = 'dr-debug-root'
      host.style.position = 'fixed'
      host.style.zIndex = '2147483647'
      host.style.pointerEvents = 'none'
      host.style.top = '0'
      host.style.left = '0'
      host.style.width = '0'
      host.style.height = '0'
      host.style.border = 'none'
      host.style.margin = '0'
      host.style.padding = '0'

      if (options.container) {
        options.container.appendChild(host)
      } else if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(host)
      } else if (typeof document !== 'undefined') {
        const onReady = () => {
          if (document.body && !host!.isConnected) {
            document.body.appendChild(host!)
          }
        }
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', onReady, { once: true })
        } else {
          window.addEventListener('load', onReady, { once: true })
        }
      }
    }
    this.host = host

    this.shadowRoot = host.shadowRoot || host.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = ''

    // Inject Isolated Styles
    const styleEl = document.createElement('style')
    styleEl.textContent = shadowStyles
    this.shadowRoot.appendChild(styleEl)

    // Cockpit Panel
    this.cockpit = new CockpitPanel({
      onClose: () => this.cockpit.hide(),
      onInvestigate: async (query) => {
        if (options.onInvestigate) {
          try {
            await options.onInvestigate(query)
          } finally {
            this.cockpit.setBusy(false)
          }
        } else {
          await this.runLocalInvestigation()
        }
      },
      getController: options.getController,
      getSessionPrompt: options.getSessionPrompt || (() => this.buildSessionPrompt()),
      onSaveSettings: options.onSaveSettings,
      onTestConnection: options.onTestConnection
    })

    // Floating Pill
    this.pill = new FloatingPill(() => {
      this.cockpit.toggle()
    })

    this.shadowRoot.appendChild(this.pill.getElement())
    this.shadowRoot.appendChild(this.cockpit.getElement())
  }

  public getShadowRoot(): ShadowRoot {
    return this.shadowRoot
  }

  public getHost(): HTMLElement {
    return this.host
  }

  public updatePillStatus(
    errorCount: number,
    failedNetCount = 0,
    slowNetCount = 0,
    isRunning = false
  ): void {
    this.pill.updateStatus(errorCount, failedNetCount, slowNetCount, isRunning)
  }

  public addTimelineStep(step: StepItem): void {
    this.cockpit.addStep(step)
  }

  public showPrescription(prescription: PrescriptionData): void {
    this.cockpit.showPrescription(prescription)
    this.cockpit.setBusy(false)
  }

  public updateTriage(telemetry: {
    errors: string[]
    slowRequests: string[]
    vitals?: Record<string, any>
    memory?: { usedMB?: number; totalMB?: number }
  }): void {
    this.cockpit.updateTriage(telemetry)
  }

  public updateErrors(): void {
    this.cockpit.updateErrors()
  }

  public clearTimeline(): void {
    this.cockpit.clearTimeline()
  }

  public showThinking(message: string): void {
    this.cockpit.showThinking(message)
  }

  public updateCausalGraph(graph: CausalErrorGraph): void {
    this.cockpit.updateCausalGraph(graph)
  }

  public switchTab(tab: 'timeline' | 'errors' | 'triage' | 'graph' | 'prescription'): void {
    this.cockpit.switchTab(tab)
  }

  public toggleCockpit(): void {
    this.cockpit.toggle()
  }

  public openCockpit(): void {
    this.cockpit.show()
  }

  public closeCockpit(): void {
    this.cockpit.hide()
  }

  private buildSessionPrompt(): string {
    const controller = this.getController?.()
    if (!controller) {
      return 'No debug controller is attached to this UI, so there is no telemetry to export.'
    }
    return generateSessionDebugPrompt(controller.getSnapshot())
  }

  /**
   * Fallback path when no LLM-backed investigator is wired in: runs the local
   * deterministic engine over live telemetry and renders its real findings.
   * Nothing here is scripted — with empty buffers it reports an empty session.
   */
  private async runLocalInvestigation(): Promise<void> {
    const controller = this.getController?.()

    this.cockpit.clearTimeline()
    this.cockpit.switchTab('timeline')

    if (!controller) {
      this.cockpit.addStep({
        stepNumber: 1,
        hypothesis:
          'No DebugController is attached to this UI instance, so there is no telemetry to read. Attach one via the getController option.',
        toolName: 'triage',
        toolOutput: 'No telemetry source available.'
      })
      this.cockpit.setBusy(false)
      return
    }

    this.updatePillStatus(0, 0, 0, true)
    this.cockpit.showThinking('Reading the console, network, backend, memory and performance buffers…')

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    await wait(420)

    const state = controller.getSnapshot()
    const analysis = this.engine.analyze(state)

    // Step 1 — always real: what the buffers actually contain.
    this.cockpit.addStep({
      stepNumber: 1,
      hypothesis: `Triaging the raw buffers before forming a theory: ${state.console.errorCount} console error(s), ${state.network.failedCount} failed and ${state.network.slowCount} slow request(s), ${state.docker?.errorCount ?? 0} backend error(s).`,
      toolName: 'triage_telemetry',
      toolOutput: [
        `Page:      ${state.pageContext.url || 'unknown'}`,
        `Uptime:    ${state.pageContext.uptimeSeconds.toFixed(1)}s`,
        `Console:   ${state.console.errorCount} error(s), ${state.console.warnCount} warning(s) of ${state.console.total} entries`,
        `Network:   ${state.network.failedCount} failed, ${state.network.slowCount} slow of ${state.network.total} requests`,
        `Backend:   ${state.docker?.errorCount ?? 0} container error(s)`,
        state.memory?.heapUsagePercent !== undefined
          ? `Heap:      ${Math.round((state.memory.usedJSHeapSize || 0) / 1048576)}MB (${Math.round(state.memory.heapUsagePercent)}% of limit)`
          : 'Heap:      not exposed by this browser',
        `Findings:  ${analysis.findings.length} derived`
      ].join('\n')
    })

    if (!analysis.hasEvidence) {
      await wait(360)
      this.cockpit.showThinking('')
      this.showPrescription({
        diagnosis: analysis.diagnosis,
        rootCause: analysis.rootCause,
        fix: '',
        confidence: 0,
        filesToModify: []
      })
      this.updatePillStatus(0, 0, 0, false)
      return
    }

    // One step per real finding, highest severity first.
    const shown = analysis.findings.slice(0, 5)
    for (let i = 0; i < shown.length; i++) {
      const finding = shown[i]
      this.cockpit.showThinking(
        `Examining the ${finding.layer} layer — ${finding.title} (${finding.severity}, ${Math.round(finding.confidence * 100)}% confidence).`
      )
      await wait(560)
      this.cockpit.addStep({
        stepNumber: i + 2,
        hypothesis: `${finding.title}. ${finding.detail}`,
        toolName: `inspect_${finding.layer}`,
        toolOutput: [
          ...finding.evidence.map((line) => `• ${line}`),
          finding.files.length > 0 ? `\nSource: ${finding.files.join(', ')}` : '',
          `\nDirection: ${finding.remediation}`
        ]
          .filter(Boolean)
          .join('\n')
      })
    }

    // Correlation step only when the graph actually produced edges.
    if (analysis.causalChain.length > 0) {
      this.cockpit.showThinking(
        `Correlating ${state.causalGraph?.nodes.length ?? 0} error nodes across layers to separate causes from symptoms…`
      )
      await wait(560)
      this.cockpit.addStep({
        stepNumber: shown.length + 2,
        hypothesis: `The correlation engine linked these faults by timestamp. If the chain holds, only the root needs fixing — the rest are downstream effects.`,
        toolName: 'graphify_errors',
        toolOutput: analysis.causalChain.join('\n')
      })
    }

    this.cockpit.showThinking('Composing the remediation plan from the gathered evidence…')
    await wait(420)
    this.cockpit.showThinking('')

    this.showPrescription({
      diagnosis: analysis.diagnosis,
      rootCause: analysis.rootCause,
      fix: analysis.suggestedFix,
      confidence: analysis.confidence,
      filesToModify: analysis.filesToModify
    })

    this.updatePillStatus(
      state.console.errorCount,
      state.network.failedCount,
      state.network.slowCount,
      false
    )
  }

  public destroy(): void {
    if (this.host.parentNode) {
      this.host.parentNode.removeChild(this.host)
    }
  }
}
