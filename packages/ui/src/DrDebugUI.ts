import { CockpitPanel, type PrescriptionData, type StepItem } from './components/CockpitPanel.js'
import type { CausalErrorGraph } from './components/CausalGraphView.js'
import { FloatingPill } from './components/FloatingPill.js'
import { shadowStyles } from './styles.js'

export interface DrDebugUIOptions {
  onInvestigate?: (query: string) => Promise<void> | void
  container?: HTMLElement
  getController?: () => any
  onSaveSettings?: (settings: any) => void
  onTestConnection?: (settings: any) => Promise<{ success: boolean; message: string }>
}

export class DrDebugUI {
  private host: HTMLElement
  private shadowRoot: ShadowRoot
  private pill: FloatingPill
  private cockpit: CockpitPanel

  constructor(options: DrDebugUIOptions = {}) {
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
          this.runDemoInvestigation(query)
        }
      },
      getController: options.getController,
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

  private runDemoInvestigation(_query: string): void {
    this.cockpit.clearTimeline()
    this.cockpit.switchTab('timeline')
    this.updatePillStatus(0, 0, 0, true)
    this.cockpit.showThinking('Reading console ring buffer, network timeline, and Docker backend logs...')

    const steps: StepItem[] = [
      {
        stepNumber: 1,
        hypothesis: 'Inspect the console ring buffer for unhandled exceptions. The TypeError is likely caused by a failed async operation returning undefined instead of an expected response body.',
        toolName: 'inspect_error',
        toolOutput: '[ConsoleInterceptor] 3 errors in ring buffer\n→ TypeError: Cannot read properties of undefined (reading "data")\n→ NetworkError: Failed to fetch /api/agents/resource/run (503)\n→ Unhandled rejection: Promise chain missing .catch() handler'
      },
      {
        stepNumber: 2,
        hypothesis: 'Cross-reference the network timeline. The TypeError appeared 312ms after a 503 response — strong causal candidate. Checking the failed request details.',
        toolName: 'inspect_request',
        toolOutput: '[NetworkInterceptor] 2 anomalies\n→ POST /api/agents/resource/run  [503] 4821ms  ⚠️ upstream timeout\n→ GET /api/config                 [0]   ERR_CONNECTION_REFUSED  ⚠️ CORS/unreachable'
      },
      {
        stepNumber: 3,
        hypothesis: 'The 503 suggests the backend is down, not just slow. Inspecting Docker container logs to find the root backend failure.',
        toolName: 'inspect_docker_logs',
        toolOutput: '[DockerInterceptor] 4 backend errors\n→ [postgres-db] FATAL: remaining connection slots reserved for superuser\n→ [postgres-db] ERROR: max_connections (100) reached — refusing connection\n→ [api-server]  PrismaClientKnownRequestError: P2024 DB connection timeout\n→ [api-server]  Error: POST /api/agents/resource/run → upstream DB unavailable'
      },
      {
        stepNumber: 4,
        hypothesis: 'Building the full-stack causal graph. The DB pool exhaustion is the root node — everything else is a downstream effect of that single failure.',
        toolName: 'graphify_errors',
        toolOutput: '[CausalGraph] 4 nodes, 3 causal links\n🎯 ROOT CAUSE: [docker] postgres-db — max_connections exhausted\n→ [docker] api-server DB timeout          (CAUSED_BY     98%)\n→ [network] POST /api/agents/resource 503  (PROPAGATED_TO 96%)\n→ [console] TypeError: data undefined      (TRIGGERED_BY  94%)\n\nSee Causal Map tab for the interactive dependency graph.'
      }
    ]

    const delays = [800, 2300, 3900, 5400]
    steps.forEach((step, i) => {
      setTimeout(() => {
        if (i + 1 < steps.length) {
          this.cockpit.showThinking(steps[i + 1].hypothesis)
        } else {
          this.cockpit.showThinking('Root cause identified. Generating verified code fix...')
        }
        this.cockpit.addStep(step)
      }, delays[i])
    })

    setTimeout(() => {
      this.showPrescription({
        diagnosis: 'The frontend TypeError is a direct downstream effect of the API returning 503. The API fails because PostgreSQL exhausted its connection pool — confirmed in Docker stderr. The missing null-guard in the fetch handler turns a silent API failure into an uncaught exception.',
        rootCause: 'PostgreSQL connection leak: backend ORM sessions are never explicitly closed, accumulating until max_connections (100) is hit. This cascades: DB refuses new connections → API returns 503 on all requests → frontend fetch handler crashes on undefined response body.',
        confidence: 0.97,
        filesToModify: ['backend/src/db/session.py', 'frontend/src/api/client.ts'],
        fix: `--- a/backend/src/db/session.py\n+++ b/backend/src/db/session.py\n@@ -24,5 +24,6 @@\n async def get_db():\n-    session = SessionFactory()\n-    yield session\n+    async with SessionFactory() as session:\n+        yield session\n+        await session.close()\n\n--- a/frontend/src/api/client.ts\n+++ b/frontend/src/api/client.ts\n@@ -8,3 +8,5 @@\n export async function callAPI(url: string) {\n   const res = await fetch(url)\n-  return res.json()\n+  if (!res.ok) throw new Error(\`HTTP \${res.status}: \${res.statusText}\`)\n+  return res.json().catch(() => null)\n }`
      })
      this.updatePillStatus(1, 1, 0, false)
    }, 7200)
  }

  public destroy(): void {
    if (this.host.parentNode) {
      this.host.parentNode.removeChild(this.host)
    }
  }
}
