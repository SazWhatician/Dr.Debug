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
          this.cockpit.setBusy(false)
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

  public destroy(): void {
    if (this.host.parentNode) {
      this.host.parentNode.removeChild(this.host)
    }
  }
}
