import { CockpitPanel, type PrescriptionData, type StepItem } from './components/CockpitPanel.js'
import { FloatingPill } from './components/FloatingPill.js'
import { shadowStyles } from './styles.js'

export interface DrDebugUIOptions {
  onInvestigate?: (query: string) => Promise<void> | void
  container?: HTMLElement
}

export class DrDebugUI {
  private host: HTMLElement
  private shadowRoot: ShadowRoot
  private pill: FloatingPill
  private cockpit: CockpitPanel

  constructor(options: DrDebugUIOptions = {}) {
    const parent = options.container || document.body || document.documentElement

    // Check if #dr-debug-root already exists
    let host = document.getElementById('dr-debug-root')
    if (!host) {
      host = document.createElement('div')
      host.id = 'dr-debug-root'
      parent.appendChild(host)
    }
    this.host = host

    if (typeof document !== 'undefined' && !document.body) {
      document.addEventListener('DOMContentLoaded', () => {
        if (document.body && this.host.parentElement !== document.body) {
          document.body.appendChild(this.host)
        }
      })
    }

    this.shadowRoot = host.shadowRoot || host.attachShadow({ mode: 'open' })
    this.shadowRoot.innerHTML = ''

    // Inject Isolated Styles
    const styleEl = document.createElement('style')
    styleEl.textContent = shadowStyles
    this.shadowRoot.appendChild(styleEl)

    // Cockpit Panel
    this.cockpit = new CockpitPanel(
      () => this.cockpit.hide(),
      async (query) => {
        if (options.onInvestigate) {
          try {
            await options.onInvestigate(query)
          } finally {
            this.cockpit.setBusy(false)
          }
        } else {
          this.runDemoInvestigation(query)
        }
      }
    )

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

  public clearTimeline(): void {
    this.cockpit.clearTimeline()
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

  private runDemoInvestigation(query: string): void {
    this.cockpit.clearTimeline()
    this.cockpit.switchTab('timeline')
    this.updatePillStatus(0, 0, 0, true)

    const steps: StepItem[] = [
      {
        stepNumber: 1,
        hypothesis: 'Scanning console ring buffer for unhandled exceptions and error patterns.',
        toolName: 'scan_console',
        toolOutput: '[ConsoleInterceptor] 3 errors in ring buffer\n→ TypeError: Cannot read properties of undefined (reading "data")\n→ NetworkError: Failed to fetch /api/agents/resource/run\n→ Unhandled rejection: Promise rejected without .catch()'
      },
      {
        stepNumber: 2,
        hypothesis: 'Cross-referencing network timeline for failed requests in the exception window.',
        toolName: 'scan_network',
        toolOutput: '[NetworkInterceptor] 2 anomalies detected\n→ POST /api/agents/resource/run → [503] 4821ms (upstream timeout)\n→ GET /api/config → [0] ERR_CONNECTION_REFUSED (possible CORS block)'
      },
      {
        stepNumber: 3,
        hypothesis: 'Analyzing temporal correlation — console error fired 312ms after the 503 response.',
        toolName: 'correlate',
        toolOutput: '[TemporalEngine] High-confidence causal link found\n→ NetworkRecord[POST /api/agents/resource/run] t=+1420ms status=503\n→ ConsoleError[TypeError: data undefined]      t=+1732ms\n→ Δt = 312ms → causal (threshold < 4000ms)'
      },
      {
        stepNumber: 4,
        hypothesis: 'Checking web vitals and long tasks for downstream performance degradation.',
        toolName: 'scan_vitals',
        toolOutput: '[PerformanceInterceptor] Snapshot\n→ LCP: 2840ms  (needs-improvement, threshold 2500ms)\n→ CLS: 0.04    (good)\n→ INP: 380ms   (needs-improvement, threshold 200ms)\n→ Long task: 210ms blocking main thread at t=+1680ms'
      }
    ]

    const delays = [0, 1400, 2900, 4200]
    steps.forEach((step, i) => {
      setTimeout(() => this.cockpit.addStep(step), delays[i])
    })

    setTimeout(() => {
      this.showPrescription({
        diagnosis: `POST /api/agents/resource/run is timing out with 503 Service Unavailable. The TypeError "Cannot read properties of undefined (reading 'data')" is a direct downstream effect — the response handler accesses .data on an undefined body when the request fails without a guard.`,
        rootCause: 'The upstream service is unavailable or overloaded. The client fetch call has no timeout, no retry logic, and no null-guard on the response body, causing a hard crash propagated as an unhandled rejection.',
        confidence: 0.94,
        filesToModify: ['src/api/agents.ts', 'src/hooks/useAgentRun.ts'],
        fix: `--- a/src/api/agents.ts\n+++ b/src/api/agents.ts\n@@ -12,7 +12,13 @@\n export async function runAgentResource(payload: AgentPayload) {\n-  const res = await fetch('/api/agents/resource/run', {\n-    method: 'POST', body: JSON.stringify(payload)\n-  })\n-  const { data } = await res.json()\n-  return data\n+  const res = await fetch('/api/agents/resource/run', {\n+    method: 'POST',\n+    body: JSON.stringify(payload),\n+    signal: AbortSignal.timeout(5000)\n+  })\n+  if (!res.ok) throw new Error(\`API \${res.status}: \${res.statusText}\`)\n+  const json = await res.json().catch(() => null)\n+  return json?.data ?? null\n }`
      })
      this.updatePillStatus(1, 1, 0, false)
    }, 5800)
  }

  public destroy(): void {
    if (this.host.parentNode) {
      this.host.parentNode.removeChild(this.host)
    }
  }
}
