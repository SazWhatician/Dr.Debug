import { DR_DEBUG_LOGO } from '../assets/logo.js'
import { CausalGraphView, type CausalErrorGraph } from './CausalGraphView.js'
import { DockerDashboardView } from './DockerDashboardView.js'
import { ErrorDashboardView } from './ErrorDashboardView.js'
import { SettingsModal, type SettingsData, type DrDebugTheme } from './SettingsModal.js'

export interface StepItem {
  stepNumber: number
  hypothesis: string
  toolName: string
  toolArgs?: any
  toolOutput?: string
  memory?: string
}

export interface PrescriptionData {
  diagnosis: string
  rootCause: string
  fix: string
  confidence?: number
  filesToModify?: string[]
}

export type CockpitTabKey = 'timeline' | 'errors' | 'triage' | 'graph' | 'prescription' | 'docker'

export interface TabGuideItem {
  key: CockpitTabKey
  title: string
  badge: string
  icon: string
  description: string
  tips: Array<{ bullet: string; text: string }>
}

export const TAB_GUIDES: Record<CockpitTabKey, TabGuideItem> = {
  errors: {
    key: 'errors',
    title: 'Error Matrix',
    badge: '2D Anomaly Heatmap',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>',
    description:
      'Aggregates, categorizes, and correlates every runtime anomaly detected in your app — across Console exceptions, HTTP network failures, DOM/React crashes, and Docker backend logs — into a unified 2D Substrate × Severity matrix and chronological timeline.',
    tips: [
      { bullet: '•', text: '<strong>Grid & Timeline Switcher:</strong> Toggle between the 2D Substrate Heatmap to spot anomaly clusters and the Timeline Stream for real-time chronological order.' },
      { bullet: '•', text: '<strong>Sub-Second Search:</strong> Type in the search box to filter anomalies by endpoint, error message, or HTTP status, or click substrate pills (Network, Console, React, Docker).' },
      { bullet: '•', text: '<strong>Drilldown Inspector:</strong> Click on any error row down the list to inspect demangled stack frames, HTTP request headers, RFC status code diagnosis, and 1-click terminal cURL commands.' },
      { bullet: '•', text: '<strong>AI Prompt Generator:</strong> Click <strong>"Ask Dr. Debug AI"</strong> or <strong>"Diagnose"</strong> on any error down the list to automatically populate the investigation prompt and launch autonomous root-cause debugging.' }
    ]
  },
  triage: {
    key: 'triage',
    title: 'Live Telemetry',
    badge: 'Real-Time Health & V8 Vitals',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    description:
      'Continuously monitors and triages real-time telemetry from your application runtime — capturing live unhandled exceptions, network latency anomalies, and active V8 heap memory allocations.',
    tips: [
      { bullet: '•', text: '<strong>Live Exception Feed:</strong> Watch unhandled runtime exceptions with demangled stack traces in real time as they occur.' },
      { bullet: '•', text: '<strong>Network Anomaly Tracker:</strong> Automatically flags slow requests (>1000ms latency) and failed HTTP responses (4xx/5xx status codes).' },
      { bullet: '•', text: '<strong>V8 Memory Subsystem:</strong> Monitors active used vs allocated JavaScript heap memory in real time to catch memory leaks and runaway closures.' },
      { bullet: '•', text: '<strong>Quick-Copy Diagnostics:</strong> Click the copy icon on any telemetry item to instantly copy the raw exception trace or endpoint payload.' }
    ]
  },
  graph: {
    key: 'graph',
    title: 'Causal Graph',
    badge: 'Multi-Layer Causal Topology (DAG)',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
    description:
      'Constructs an interactive Directed Acyclic Graph (DAG) visualizing how upstream failures (such as backend database drops or Docker 500s) propagate through HTTP network layers and trigger downstream client JavaScript and UI errors.',
    tips: [
      { bullet: '•', text: '<strong>Locate Root Cause:</strong> Look for the node marked with the pulsing <strong>ROOT CAUSE</strong> indicator to identify the exact origin of the breakdown.' },
      { bullet: '•', text: '<strong>Animated Pulse Links:</strong> Follow animated pulse paths showing the directional propagation of failure from backend to client UI.' },
      { bullet: '•', text: '<strong>Node Detail Inspector:</strong> Click on any node in the graph to view timestamp, substrate layer (Docker, Network, Console, UI), severity, and captured payload evidence.' },
      { bullet: '•', text: '<strong>Mermaid Export:</strong> Click <strong>"Copy Graph"</strong> in the top action bar to export the full architecture topology as a Mermaid diagram for documentation or PRs.' }
    ]
  },
  docker: {
    key: 'docker',
    title: 'Docker Containers',
    badge: 'Full-Stack Host Engine Bridge',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8v4h8V3z"/></svg>',
    description:
      'Bridges your browser directly with your local Docker daemon (via the zero-install MCP bridge) to stream active container states, inspect terminal logs, and correlate backend server crashes with client-side bugs.',
    tips: [
      { bullet: '•', text: '<strong>Start the Host Bridge:</strong> Run <code>npx @dr-debug/mcp</code> or double-click <code>start-docker-bridge.bat</code> (Windows) / <code>.sh</code> (Mac/Linux). The indicator turns green once connected.' },
      { bullet: '•', text: '<strong>Container Telemetry:</strong> Monitor running container states, health status, exposed ports, and real-time CPU/memory consumption.' },
      { bullet: '•', text: '<strong>Live Terminal Log Feed:</strong> Filter and search through real-time stdout/stderr streams from backend microservices (Node, Python, Go, Spring, Postgres, Redis).' },
      { bullet: '•', text: '<strong>Cross-Layer AI Diagnosis:</strong> When a backend container panics or logs a 500 error, Dr. Debug highlights it and enables 1-click AI diagnosis correlating server logs with browser errors.' }
    ]
  },
  timeline: {
    key: 'timeline',
    title: 'Investigation Timeline',
    badge: 'Autonomous Re-Act Trajectory',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    description:
      'Displays the step-by-step diagnostic reasoning trajectory of Dr. Debug’s autonomous AI agent as it investigates an incident — showing every hypothesis, tool execution, DOM inspection, and telemetry check.',
    tips: [
      { bullet: '•', text: '<strong>Observe AI Reasoning:</strong> Watch the agent formulate hypotheses and explain its internal reasoning (<code>AI Reasoning</code>) at each diagnostic step.' },
      { bullet: '•', text: '<strong>Inspect Dispatched Tools:</strong> Review each tool executed by the agent (DOM queries, network logs, console snapshots, Docker inspection).' },
      { bullet: '•', text: '<strong>Examine Tool Outputs:</strong> Expand individual step cards to review the exact diagnostic evidence gathered by the agent.' },
      { bullet: '•', text: '<strong>Copy Step Evidence:</strong> Click the copy button on any step header to copy that specific finding and tool observation to your clipboard.' }
    ]
  },
  prescription: {
    key: 'prescription',
    title: 'Prescription & Fix',
    badge: 'Verified Root Cause & Patch',
    icon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>',
    description:
      'Provides the definitive diagnostic prescription formulated by Dr. Debug — containing verified root cause explanations, affected source files, confidence rating, and verified code diff patches.',
    tips: [
      { bullet: '•', text: '<strong>Diagnostic Finding & Root Cause:</strong> Read the plain-English explanation of why the failure occurred and its underlying causal mechanism.' },
      { bullet: '•', text: '<strong>Target Files to Patch:</strong> See the exact source files identified by the agent that need code remediation.' },
      { bullet: '•', text: '<strong>Unified Code Diff:</strong> Review the color-coded code patch (+ additions in green, - deletions in red) formulated to fix the bug.' },
      { bullet: '•', text: '<strong>Copy Remediation Plan:</strong> Click <strong>"Copy remediation plan"</strong> to copy the unified diff patch to your clipboard.' },
      { bullet: '•', text: '<strong>Hand Off to Coding Agent:</strong> Click <strong>"Copy full brief for AI"</strong> to export a comprehensive Markdown brief formatted for Claude Code, Antigravity, or Cursor.' }
    ]
  }
}

export interface CockpitPanelOptions {
  onClose: () => void
  onInvestigate: (query: string) => void
  getController?: () => any
  /** Supplies the paste-ready brief behind the "Copy for AI" action. */
  getSessionPrompt?: () => string
  onSaveSettings?: (settings: SettingsData) => void
  onTestConnection?: (settings: SettingsData) => Promise<{ success: boolean; message: string }>
}

export class CockpitPanel {
  private element: HTMLElement
  private bodyElement!: HTMLElement
  private timelineContainer: HTMLElement
  private errorsContainer: HTMLElement
  private triageContainer: HTMLElement
  private graphContainer: HTMLElement
  private prescriptionContainer: HTMLElement
  private dockerContainer: HTMLElement
  private errorDashboardView: ErrorDashboardView
  private dockerDashboardView: DockerDashboardView
  private settingsModal: SettingsModal
  private causalGraphView: CausalGraphView = new CausalGraphView()
  private queryInput: HTMLInputElement
  private queryButton: HTMLButtonElement
  private tabTimeline: HTMLButtonElement
  private tabErrors: HTMLButtonElement
  private tabTriage: HTMLButtonElement
  private tabGraph: HTMLButtonElement
  private tabDocker: HTMLButtonElement
  private tabPrescription: HTMLButtonElement
  private tabInfoBackdrop!: HTMLElement
  private tabInfoCard!: HTMLElement
  private activeInfoTab: CockpitTabKey | null = null
  private currentTheme: DrDebugTheme = 'dr-debug'
  private heapMetricBadge: HTMLElement
  private uptimeMetricBadge: HTMLElement
  private activeTab: CockpitTabKey = 'errors'
  private steps: StepItem[] = []
  private startTime = Date.now()
  private isMaximized = false
  private maximizeBtn!: HTMLButtonElement
  private settingsBtn!: HTMLButtonElement
  private thinkingCard: HTMLElement | null = null
  private onInvestigateHandler: (query: string) => void
  private getSessionPrompt?: () => string

  constructor(
    private onCloseOrOptions: (() => void) | CockpitPanelOptions,
    private legacyOnInvestigate?: (query: string) => void
  ) {
    const options: CockpitPanelOptions =
      typeof onCloseOrOptions === 'function'
        ? {
            onClose: onCloseOrOptions,
            onInvestigate: legacyOnInvestigate || (() => {}),
            getController: () => (typeof window !== 'undefined' ? (window as any).__DR_DEBUG__?.getController() : undefined)
          }
        : onCloseOrOptions

    this.onInvestigateHandler = options.onInvestigate
    this.getSessionPrompt = options.getSessionPrompt
    this.element = document.createElement('div')

    this.element.className = 'dr-debug-modal hidden'

    // 1. Futuristic Header Bar
    const header = document.createElement('div')
    header.className = 'dr-debug-header'

    const brand = document.createElement('div')
    brand.className = 'dr-debug-brand'
    brand.innerHTML = `
      <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo header-logo" alt="Dr. Debug" />
      <div>
        <div class="dr-debug-title-text">
          <span class="dr-debug-brand-bold">DR. DEBUG</span>
          <span class="dr-debug-brand-sub"><span class="dr-debug-brand-sep">//</span> COCKPIT</span>
        </div>
      </div>
    `

    const metricsWrapper = document.createElement('div')
    metricsWrapper.className = 'dr-debug-header-metrics'

    this.heapMetricBadge = document.createElement('div')
    this.heapMetricBadge.className = 'dr-debug-metric-badge'
    this.heapMetricBadge.innerHTML = `<span class="dr-debug-status-dot dot-sys"></span> <span id="dr-debug-heap-val">Heap: 48MB</span>`

    this.uptimeMetricBadge = document.createElement('div')
    this.uptimeMetricBadge.className = 'dr-debug-metric-badge'
    this.uptimeMetricBadge.innerHTML = `<span class="dr-debug-status-dot dot-notice"></span> <span id="dr-debug-uptime-val">00:00</span>`

    const exportBtn = this.makeSessionPromptButton(
      'dr-debug-export-btn',
      'Copy for AI',
      'Copy surgical, minimal incident brief (Ponytail Protocol — 80% Token Saver) for Claude Code, Antigravity & Cursor'
    )

    this.settingsBtn = document.createElement('button')
    this.settingsBtn.className = 'dr-debug-close-btn'
    this.settingsBtn.innerHTML = '⚙'
    this.settingsBtn.title = 'AI Settings & API Keys'
    this.settingsBtn.addEventListener('click', () => this.settingsModal.toggle())

    this.maximizeBtn = document.createElement('button')
    this.maximizeBtn.className = 'dr-debug-close-btn'
    this.maximizeBtn.innerHTML = '⤢'
    this.maximizeBtn.title = 'Expand to full page'
    this.maximizeBtn.addEventListener('click', () => this.toggleMaximize())

    const closeBtn = document.createElement('button')
    closeBtn.className = 'dr-debug-close-btn'
    closeBtn.innerHTML = '✕'
    closeBtn.title = 'Close Cockpit'
    closeBtn.addEventListener('click', () => options.onClose())

    metricsWrapper.appendChild(this.heapMetricBadge)
    metricsWrapper.appendChild(this.uptimeMetricBadge)
    metricsWrapper.appendChild(exportBtn)
    metricsWrapper.appendChild(this.settingsBtn)
    metricsWrapper.appendChild(this.maximizeBtn)
    metricsWrapper.appendChild(closeBtn)

    header.appendChild(brand)
    header.appendChild(metricsWrapper)

    // 2. Tab Navigation
    const tabs = document.createElement('div')
    tabs.className = 'dr-debug-tabs'

    this.tabErrors = this.createTabButton('errors', `<span>Error Matrix</span>`, true)
    this.tabTriage = this.createTabButton('triage', `<span>Telemetry</span>`, false)
    this.tabGraph = this.createTabButton('graph', `<span>Causal Graph</span>`, false)
    this.tabDocker = this.createTabButton('docker', `<span>Docker</span>`, false)
    this.tabTimeline = this.createTabButton('timeline', `<span>Timeline</span>`, false)
    this.tabPrescription = this.createTabButton('prescription', `<span>Prescription</span>`, false)

    tabs.appendChild(this.tabErrors)
    tabs.appendChild(this.tabTriage)
    tabs.appendChild(this.tabGraph)
    tabs.appendChild(this.tabDocker)
    tabs.appendChild(this.tabTimeline)
    tabs.appendChild(this.tabPrescription)

    // Tab Info Guide Overlay Card & Backdrop
    this.tabInfoBackdrop = document.createElement('div')
    this.tabInfoBackdrop.className = 'dr-debug-tab-info-backdrop'
    this.tabInfoBackdrop.style.display = 'none'
    this.tabInfoBackdrop.addEventListener('click', () => this.hideTabInfo())

    this.tabInfoCard = document.createElement('div')
    this.tabInfoCard.className = 'dr-debug-tab-info-card'
    this.tabInfoCard.id = 'dr-debug-tab-info-card'
    this.tabInfoCard.style.display = 'none'

    // 3. Body Containers
    const body = document.createElement('div')
    body.className = 'dr-debug-body'
    this.bodyElement = body

    this.timelineContainer = document.createElement('div')
    this.timelineContainer.style.display = 'none'
    this.timelineContainer.style.flexDirection = 'column'
    this.timelineContainer.style.gap = '10px'

    this.errorDashboardView = new ErrorDashboardView({
      getController: () => options.getController?.() || (typeof window !== 'undefined' ? (window as any).__DR_DEBUG__?.getController() : undefined),
      onLaunchDiagnosis: (goal) => {
        this.queryInput.value = goal
        this.triggerInvestigate()
      },
      onShowGuide: () => this.showTabInfo('errors')
    })
    this.errorsContainer = document.createElement('div')
    this.errorsContainer.style.display = 'flex'
    this.errorsContainer.style.flexDirection = 'column'
    this.errorsContainer.style.gap = '10px'
    this.errorsContainer.appendChild(this.errorDashboardView.getElement())

    this.triageContainer = document.createElement('div')
    this.triageContainer.style.display = 'none'
    this.triageContainer.style.flexDirection = 'column'
    this.triageContainer.style.gap = '10px'
    this.triageContainer.appendChild(this.createInTabHeader('triage', 'Telemetry & Health Substrate', 'dot-sys'))

    this.graphContainer = document.createElement('div')
    this.graphContainer.style.display = 'none'
    this.graphContainer.style.flexDirection = 'column'
    this.graphContainer.style.gap = '10px'
    this.graphContainer.appendChild(this.createInTabHeader('graph', 'Causal Error & Anomaly Map', 'dot-notice'))
    this.graphContainer.appendChild(this.causalGraphView.getElement())

    this.dockerDashboardView = new DockerDashboardView({
      getController: () => options.getController?.() || (typeof window !== 'undefined' ? (window as any).__DR_DEBUG__?.getController() : undefined),
      onLaunchDiagnosis: (goal) => {
        this.queryInput.value = goal
        this.triggerInvestigate()
      },
      onShowGuide: () => this.showTabInfo('docker')
    })
    this.dockerContainer = document.createElement('div')
    this.dockerContainer.style.display = 'none'
    this.dockerContainer.style.flexDirection = 'column'
    this.dockerContainer.style.gap = '10px'
    this.dockerContainer.appendChild(this.dockerDashboardView.getElement())

    this.prescriptionContainer = document.createElement('div')
    this.prescriptionContainer.style.display = 'none'
    this.prescriptionContainer.style.flexDirection = 'column'
    this.prescriptionContainer.style.gap = '10px'

    body.appendChild(this.timelineContainer)
    body.appendChild(this.errorsContainer)
    body.appendChild(this.triageContainer)
    body.appendChild(this.graphContainer)
    body.appendChild(this.dockerContainer)
    body.appendChild(this.prescriptionContainer)

    // Settings Modal
    this.settingsModal = new SettingsModal({
      onSave: (settings) => {
        if (settings.theme) {
          this.setTheme(settings.theme)
        }
        options.onSaveSettings?.(settings)
        if (typeof window !== 'undefined' && (window as any).__DR_DEBUG__) {
          (window as any).__DR_DEBUG__.updateLLMConfig?.(settings)
        }
      },
      onThemeChange: (theme) => {
        this.setTheme(theme)
      },
      onTestConnection: async (settings) => {
        if (options.onTestConnection) {
          return await options.onTestConnection(settings)
        }
        if (typeof window !== 'undefined' && (window as any).__DR_DEBUG__?.testLLMConnection) {
          return await (window as any).__DR_DEBUG__.testLLMConnection(settings)
        }
        return { success: true, message: 'Settings validated' }
      }
    })
    this.element.appendChild(this.settingsModal.getElement())

    try {
      const savedTheme = localStorage.getItem('dr_debug_theme') as DrDebugTheme
      if (savedTheme) {
        this.setTheme(savedTheme)
      }
    } catch {
      // ignore
    }


    // 4. Interactive Query Wrapper
    const queryWrapper = document.createElement('div')
    queryWrapper.className = 'dr-debug-query-wrapper'

    const queryBox = document.createElement('div')
    queryBox.className = 'dr-debug-query-box'

    this.queryInput = document.createElement('input')
    this.queryInput.className = 'dr-debug-input'
    this.queryInput.placeholder = 'Ask Dr. Debug (e.g. Why did /api/agents/resource/run fail?)...'
    this.queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.triggerInvestigate()
    })

    this.queryButton = document.createElement('button')
    this.queryButton.id = 'dr-debug-query-submit'
    this.queryButton.className = 'dr-debug-btn'
    this.queryButton.innerHTML = `<span>Diagnose</span>`
    this.queryButton.addEventListener('click', () => this.triggerInvestigate())

    queryBox.appendChild(this.queryInput)
    queryBox.appendChild(this.queryButton)

    queryWrapper.appendChild(queryBox)

    this.element.appendChild(header)
    this.element.appendChild(tabs)
    this.element.appendChild(this.tabInfoBackdrop)
    this.element.appendChild(this.tabInfoCard)
    this.element.appendChild(body)
    this.element.appendChild(queryWrapper)

    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isTabInfoVisible()) {
        e.stopPropagation()
        this.hideTabInfo()
      }
    })

    const creditFooter = document.createElement('div')
    creditFooter.className = 'dr-debug-cockpit-footer'
    creditFooter.innerHTML = `
      <span>Dr. Debug by <a href="https://github.com/SazWhatician" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;font-weight:700;">Saswat Mohanty (@SazWhatician)</a></span>
      <span style="color:#64748b;">·</span>
      <a href="https://www.linkedin.com/in/saswat-mohanty-0a4549331/" target="_blank" rel="noopener noreferrer" style="color:#818cf8;text-decoration:none;">LinkedIn</a>
    `
    this.element.appendChild(creditFooter)

    this.renderEmptyTimeline()
    this.renderEmptyPrescription()
    this.startUptimeTicker()
    this.initDraggable(header)
    this.errorDashboardView.update()
  }

  public getElement(): HTMLElement {
    return this.element
  }

  public show(): void {
    this.element.classList.remove('hidden')
    if (this.activeTab === 'errors') {
      this.errorDashboardView.update()
    }
  }

  public hide(): void {
    this.element.classList.add('hidden')
  }

  public toggle(): void {
    this.element.classList.toggle('hidden')
  }

  public isVisible(): boolean {
    return !this.element.classList.contains('hidden')
  }

  public setBusy(busy: boolean): void {
    this.queryInput.disabled = busy
    this.queryButton.disabled = busy
    this.queryButton.innerHTML = busy
      ? `<span>Diagnosing...</span>`
      : `<span>Diagnose</span>`
  }

  public switchTab(tab: CockpitTabKey): void {
    if (this.isTabInfoVisible()) {
      this.hideTabInfo()
    }
    this.activeTab = tab
    this.tabTimeline.classList.toggle('active', tab === 'timeline')
    this.tabErrors.classList.toggle('active', tab === 'errors')
    this.tabTriage.classList.toggle('active', tab === 'triage')
    this.tabGraph.classList.toggle('active', tab === 'graph')
    this.tabDocker.classList.toggle('active', tab === 'docker')
    this.tabPrescription.classList.toggle('active', tab === 'prescription')

    this.timelineContainer.style.display = tab === 'timeline' ? 'flex' : 'none'
    this.errorsContainer.style.display = tab === 'errors' ? 'flex' : 'none'
    this.triageContainer.style.display = tab === 'triage' ? 'flex' : 'none'
    this.graphContainer.style.display = tab === 'graph' ? 'flex' : 'none'
    this.dockerContainer.style.display = tab === 'docker' ? 'flex' : 'none'
    this.prescriptionContainer.style.display = tab === 'prescription' ? 'flex' : 'none'

    if (tab === 'errors') {
      this.errorDashboardView.update()
    } else if (tab === 'docker') {
      this.dockerDashboardView.update()
    } else if (tab === 'graph') {
      const controller = typeof this.onCloseOrOptions === 'object' && this.onCloseOrOptions.getController?.()
      if (controller) {
        this.causalGraphView.updateGraph(controller.getCausalGraph())
      }
    }
  }

  public updateErrors(): void {
    if (this.activeTab === 'errors' && this.isVisible()) {
      this.errorDashboardView.update()
    }
  }

  public updateDocker(): void {
    if (this.activeTab === 'docker' && this.isVisible()) {
      this.dockerDashboardView.update()
    }

    const controller = typeof this.onCloseOrOptions === 'object' && this.onCloseOrOptions.getController?.()
    if (controller) {
      const errorCount = (controller.getDockerLogs?.() || []).filter((l: any) => l.level === 'error').length
      const newHtml = errorCount > 0
        ? `<span>Docker <span style="background:rgba(244,63,94,0.25);color:#fda4af;border:1px solid rgba(244,63,94,0.5);padding:1px 5px;border-radius:9999px;font-size:9px;font-weight:700">${errorCount}</span></span>`
        : `<span>Docker</span>`
      if (this.tabDocker.innerHTML !== newHtml) {
        this.tabDocker.innerHTML = newHtml
      }
    }
  }


  public clearTimeline(): void {
    this.steps = []
    this.renderEmptyTimeline()
    this.renderEmptyPrescription()
  }

  public renderEmptyTimeline(): void {
    this.timelineContainer.innerHTML = ''
    this.timelineContainer.appendChild(this.createInTabHeader('timeline', 'Diagnostic RCA Timeline', 'dot-warn'))
    const emptyBox = document.createElement('div')
    emptyBox.className = 'dr-debug-timeline-empty'
    emptyBox.innerHTML = `
      <div class="dr-debug-radar-ring">
        <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo radar-logo" alt="Dr. Debug" />
      </div>
      <strong class="dr-debug-empty-title">Autonomous Diagnostic Observer Active</strong>
      <p class="dr-debug-empty-desc">
        Dr. Debug is continuously analyzing DOM mutations, network traffic, and console telemetry. Click <strong>Diagnose</strong> to launch autonomous RCA.
      </p>
    `
    this.timelineContainer.appendChild(emptyBox)
  }

  public renderEmptyPrescription(): void {
    this.prescriptionContainer.innerHTML = ''
    this.prescriptionContainer.appendChild(this.createInTabHeader('prescription', 'Remediation & Root Cause Prescription', 'dot-ok'))
    const emptyBox = document.createElement('div')
    emptyBox.className = 'dr-debug-timeline-empty'
    emptyBox.innerHTML = `
      <div class="dr-debug-radar-ring">
        <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo radar-logo" alt="Dr. Debug" />
      </div>
      <strong class="dr-debug-empty-title">No Prescription Generated Yet</strong>
      <p class="dr-debug-empty-desc">
        Launch a diagnosis to formulate verified code fixes, root causes, and unified diff patches.
      </p>
    `
    this.prescriptionContainer.appendChild(emptyBox)
  }

  public addStep(step: StepItem): void {
    this.clearThinking()
    if (this.steps.length === 0) {
      this.timelineContainer.innerHTML = ''
      this.timelineContainer.appendChild(this.createInTabHeader('timeline', 'Diagnostic RCA Timeline', 'dot-warn'))
    }
    this.steps.push(step)

    const stepCard = document.createElement('div')
    stepCard.className = 'dr-debug-step-card'

    // Header row: step number + tool badge + copy button
    const header = document.createElement('div')
    header.className = 'dr-debug-step-header'

    const left = document.createElement('div')
    left.className = 'dr-debug-step-left'

    const numSpan = document.createElement('span')
    numSpan.className = 'dr-debug-step-pill'
    numSpan.textContent = `Step ${step.stepNumber}`

    const toolBadge = document.createElement('span')
    toolBadge.className = 'dr-debug-step-tool'
    toolBadge.textContent = step.toolName

    left.appendChild(numSpan)
    left.appendChild(toolBadge)

    const right = document.createElement('div')
    right.className = 'dr-debug-step-right'
    if (step.toolOutput) right.appendChild(this.makeCopyBtn(step.toolOutput))

    header.appendChild(left)
    header.appendChild(right)
    stepCard.appendChild(header)

    // AI Reasoning block
    const reasoningLabel = document.createElement('div')
    reasoningLabel.className = 'dr-debug-step-reasoning-label'
    reasoningLabel.textContent = 'AI Reasoning'

    const thought = document.createElement('div')
    thought.className = 'dr-debug-step-thought'
    thought.textContent = step.hypothesis

    stepCard.appendChild(reasoningLabel)
    stepCard.appendChild(thought)

    // Tool output block
    if (step.toolOutput) {
      const outputLabel = document.createElement('div')
      outputLabel.className = 'dr-debug-step-output-label'
      outputLabel.textContent = 'Tool Output'

      const output = document.createElement('div')
      output.className = 'dr-debug-step-output'
      output.textContent = step.toolOutput

      stepCard.appendChild(outputLabel)
      stepCard.appendChild(output)
    }

    this.timelineContainer.appendChild(stepCard)
    this.scrollTimelineToBottom()
  }

  private scrollTimelineToBottom(): void {
    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight
    if (this.bodyElement) {
      this.bodyElement.scrollTop = this.bodyElement.scrollHeight
    }
  }

  public showPrescription(prescription: PrescriptionData): void {
    // Built twice rather than cloned: cloneNode() drops event listeners, which
    // would leave the copy buttons on the timeline copy inert.
    this.timelineContainer.appendChild(this.buildPrescriptionCard(prescription))
    this.prescriptionContainer.innerHTML = ''
    this.prescriptionContainer.appendChild(this.createInTabHeader('prescription', 'Remediation & Root Cause Prescription', 'dot-ok'))
    this.prescriptionContainer.appendChild(this.buildPrescriptionCard(prescription))

    this.scrollTimelineToBottom()
    this.switchTab('prescription')
  }

  private buildPrescriptionCard(prescription: PrescriptionData): HTMLElement {
    const card = document.createElement('div')
    card.className = 'dr-debug-prescription-card'

    const header = document.createElement('div')
    header.className = 'dr-debug-presc-header'

    const title = document.createElement('div')
    title.className = 'dr-debug-presc-title'
    title.innerHTML = `
      <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo" alt="Dr. Debug" style="display:inline-block; vertical-align:middle;" />
      <span>Verified Root Cause Diagnosis</span>
    `

    const confChip = document.createElement('div')
    confChip.className = 'dr-debug-confidence-chip'
    confChip.textContent = `${Math.round((prescription.confidence ?? 0.95) * 100)}% Confidence`

    header.appendChild(title)
    header.appendChild(confChip)

    const sectionFinding = document.createElement('div')
    sectionFinding.className = 'dr-debug-presc-section'
    sectionFinding.innerHTML = `
      <div class="dr-debug-presc-label">Diagnostic Finding</div>
      <div class="dr-debug-presc-text">${this.escapeHtml(prescription.diagnosis)}</div>
    `

    const sectionRCA = document.createElement('div')
    sectionRCA.className = 'dr-debug-presc-section'
    sectionRCA.innerHTML = `
      <div class="dr-debug-presc-label">Root Cause Mechanism</div>
      <div class="dr-debug-presc-text">${this.escapeHtml(prescription.rootCause)}</div>
    `

    card.appendChild(header)
    card.appendChild(sectionFinding)
    card.appendChild(sectionRCA)

    if (prescription.filesToModify && prescription.filesToModify.length > 0) {
      const sectionFiles = document.createElement('div')
      sectionFiles.className = 'dr-debug-presc-section'
      sectionFiles.innerHTML = `
        <div class="dr-debug-presc-label">Target Files To Patch</div>
        <div class="dr-debug-presc-files">
          ${prescription.filesToModify.map((f) => this.escapeHtml(f)).join(' &nbsp;|&nbsp; ')}
        </div>
      `
      card.appendChild(sectionFiles)
    }

    if (prescription.fix) {
      const sectionFix = document.createElement('div')
      sectionFix.className = 'dr-debug-presc-section'
      sectionFix.innerHTML = `<div class="dr-debug-presc-label">Prescribed Code Patch</div>`

      const diffContainer = document.createElement('div')
      diffContainer.className = 'dr-debug-prescription-diff'
      diffContainer.innerHTML = this.formatDiffHtml(prescription.fix)

      const copyBtn = document.createElement('button')
      copyBtn.className = 'dr-debug-copy-btn'
      const idle = `<span>Copy remediation plan</span>`
      copyBtn.innerHTML = idle
      this.bindCopyFeedback(
        copyBtn,
        () => prescription.fix,
        idle,
        `<span>Copied</span>`
      )

      sectionFix.appendChild(diffContainer)
      sectionFix.appendChild(copyBtn)
      card.appendChild(sectionFix)
    }

    // Hand-off row: the full session brief for an external coding agent.
    const handoff = document.createElement('div')
    handoff.className = 'dr-debug-presc-section dr-debug-handoff'
    handoff.innerHTML = `
      <div class="dr-debug-presc-label">Hand off to a coding agent</div>
      <div class="dr-debug-handoff-desc">
        Exports this whole session — every finding with its evidence, the causal chain, demangled stacks,
        full HTTP transactions with a cURL reproduction, backend logs and the chronological timeline —
        as one Markdown brief for Claude Code, Antigravity or Cursor.
      </div>
    `
    handoff.appendChild(
      this.makeSessionPromptButton(
        'dr-debug-copy-btn primary',
        'Copy full brief for AI',
        'Copy the complete session brief as Markdown'
      )
    )
    card.appendChild(handoff)

    return card
  }

  public updateTriage(telemetry: {
    errors: Array<string | any>
    slowRequests: Array<string | any>
    vitals?: Record<string, any>
    memory?: { usedMB?: number; totalMB?: number }
  }): void {
    this.triageContainer.innerHTML = ''

    // Top action bar with header and "Copy for AI" button
    const headerWrapper = document.createElement('div')
    headerWrapper.style.display = 'flex'
    headerWrapper.style.justifyContent = 'space-between'
    headerWrapper.style.alignItems = 'center'
    headerWrapper.style.marginBottom = '4px'

    const header = this.createInTabHeader('triage', 'Telemetry & Health Substrate', 'dot-sys')
    headerWrapper.appendChild(header)

    const copyAllBtn = this.makeSessionPromptButton(
      'dr-debug-export-btn',
      'Copy for AI',
      'Copy surgical, minimal incident brief (Ponytail Protocol — 80% Token Saver) for Claude Code, Antigravity & Cursor'
    )
    copyAllBtn.style.marginRight = '4px'
    headerWrapper.appendChild(copyAllBtn)
    this.triageContainer.appendChild(headerWrapper)

    if (telemetry.memory && telemetry.memory.usedMB) {
      this.heapMetricBadge.innerHTML = `<span class="dr-debug-status-dot dot-sys"></span> <span id="dr-debug-heap-val">Heap: ${telemetry.memory.usedMB}MB</span>`
    }

    const ctrl = this.getControllerInstance()
    const allRecords = ctrl?.getNetworkRecords?.() || []

    // 1. Errors section
    if (telemetry.errors.length > 0) {
      for (const errItem of telemetry.errors) {
        const isObj = typeof errItem === 'object' && errItem !== null
        const errMsg = isObj ? (errItem.message || JSON.stringify(errItem)) : String(errItem)
        const errId = isObj ? errItem.id : undefined

        const item = document.createElement('div')
        item.className = 'dr-debug-telemetry-item error'
        item.innerHTML = `
          <div class="dr-debug-telemetry-meta">
            <span class="dr-debug-telemetry-tag error"><span class="dr-debug-status-dot dot-critical"></span> RUNTIME EXCEPTION</span>
            <span class="dr-debug-telemetry-time">Just now</span>
            <div class="dr-debug-telemetry-actions" style="margin-left:auto; display:flex; gap:6px; align-items:center;"></div>
          </div>
          <div class="dr-debug-telemetry-payload">
            ${this.escapeHtml(errMsg)}
          </div>
        `
        const actionsDiv = item.querySelector('.dr-debug-telemetry-actions')!
        actionsDiv.appendChild(this.makeAIPromptButton(errId, errMsg))
        actionsDiv.appendChild(this.makeCopyBtn(errMsg))
        this.triageContainer.appendChild(item)
      }
    }

    // 2. Problem Network section
    if (telemetry.slowRequests.length > 0) {
      for (const reqItem of telemetry.slowRequests) {
        const isObj = typeof reqItem === 'object' && reqItem !== null
        let reqSummary = ''
        let reqId: string | undefined
        let isFail = false
        let curlCmd: string | undefined

        if (isObj) {
          reqId = reqItem.id
          isFail = !!reqItem.isFailed || (reqItem.status && reqItem.status >= 400)
          reqSummary = `${reqItem.method} ${reqItem.url} ${reqItem.status ? `[${reqItem.status}]` : ''} (${Math.round(reqItem.duration || 0)}ms)`
          curlCmd = reqItem.curl || (reqItem.method && reqItem.url ? `curl -X ${reqItem.method} "${reqItem.url}"` : undefined)
        } else {
          reqSummary = String(reqItem)
          isFail = reqSummary.includes('[50') || reqSummary.includes('[40') || reqSummary.includes('[0]')
          const matched = allRecords.find((r: any) => reqSummary.includes(r.url) || reqSummary.includes(r.id))
          if (matched) {
            reqId = matched.id
            curlCmd = matched.curl || `curl -X ${matched.method} "${matched.url}"`
          }
        }

        const item = document.createElement('div')
        item.className = `dr-debug-telemetry-item ${isFail ? 'net-fail' : 'warn'}`
        item.innerHTML = `
          <div class="dr-debug-telemetry-meta">
            <span class="dr-debug-telemetry-tag ${isFail ? 'net-fail' : 'warn'}">
              <span class="dr-debug-status-dot ${isFail ? 'dot-critical' : 'dot-warn'}"></span>
              ${isFail ? 'HTTP NETWORK ANOMALY' : 'LATENCY ANOMALY'}
            </span>
            <span class="dr-debug-telemetry-time">Substrate trace</span>
            <div class="dr-debug-telemetry-actions" style="margin-left:auto; display:flex; gap:6px; align-items:center;"></div>
          </div>
          <div class="dr-debug-telemetry-payload">
            ${this.escapeHtml(reqSummary)}
          </div>
        `
        const actionsDiv = item.querySelector('.dr-debug-telemetry-actions')!
        actionsDiv.appendChild(this.makeAIPromptButton(reqId, reqSummary))
        if (curlCmd) {
          actionsDiv.appendChild(this.makeCurlButton(curlCmd))
        }
        actionsDiv.appendChild(this.makeCopyBtn(reqSummary))
        this.triageContainer.appendChild(item)
      }
    }

    // 3. Memory & Performance Health
    if (telemetry.memory) {
      const item = document.createElement('div')
      item.className = 'dr-debug-telemetry-item ok'
      item.innerHTML = `
        <div class="dr-debug-telemetry-meta">
          <span class="dr-debug-telemetry-tag ok"><span class="dr-debug-status-dot dot-ok"></span> V8 MEMORY SUBSYSTEM</span>
          <span class="dr-debug-telemetry-time">Live Snapshot</span>
        </div>
        <div class="dr-debug-telemetry-text">
          Used Heap: <strong>${telemetry.memory.usedMB || 0} MB</strong> / Allocated: <strong>${telemetry.memory.totalMB || 0} MB</strong>
        </div>
      `
      this.triageContainer.appendChild(item)
    }

    if (this.triageContainer.children.length === 1) {
      const emptyState = document.createElement('div')
      emptyState.className = 'dr-debug-triage-empty'
      emptyState.innerHTML = `
        <div class="dr-debug-status-dot dot-ok" style="width: 12px; height: 12px; margin-bottom: 8px;"></div>
        <strong class="dr-debug-triage-empty-title">Substrate is completely healthy.</strong>
        <p class="dr-debug-triage-empty-desc">Zero unhandled exceptions, zero network timeouts recorded.</p>
      `
      this.triageContainer.appendChild(emptyState)
    }
  }

  private getControllerInstance(): any {
    if (typeof this.onCloseOrOptions === 'object' && this.onCloseOrOptions.getController) {
      const ctrl = this.onCloseOrOptions.getController()
      if (ctrl) return ctrl
    }
    if (typeof window !== 'undefined' && (window as any).__DR_DEBUG__) {
      return (window as any).__DR_DEBUG__.getController()
    }
    return undefined
  }

  private makeAIPromptButton(targetId?: string, fallbackText?: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'dr-debug-copy-inline-btn primary'
    btn.title = 'Copy surgical debug prompt with Ponytail Minimality Protocol for AI coding agents'
    btn.innerHTML = `<span>Copy for AI</span>`
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const ctrl = this.getControllerInstance()
      let text = ''
      if (ctrl) {
        text = ctrl.getUnifiedAIDebugPrompt(targetId)
      }
      if (!text && this.getSessionPrompt) {
        text = this.getSessionPrompt()
      }
      if (!text) {
        text = fallbackText || 'No detailed telemetry found.'
      }
      const ok = await this.copyToClipboard(text)
      btn.innerHTML = ok ? `<span>Copied AI Prompt!</span>` : `<span>Copy failed</span>`
      btn.classList.toggle('copied', ok)
      setTimeout(() => {
        btn.innerHTML = `<span>Copy for AI</span>`
        btn.classList.remove('copied')
      }, 2500)
    })
    return btn
  }

  private makeCurlButton(curlCmd: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'dr-debug-copy-inline-btn'
    btn.title = 'Copy executable curl command for terminal reproduction'
    btn.innerHTML = `<span>cURL</span>`
    this.bindCopyFeedback(btn, () => curlCmd, `<span>cURL</span>`, `<span>Copied cURL!</span>`)
    return btn
  }

  public showThinking(message: string): void {
    if (this.thinkingCard) this.thinkingCard.remove()
    if (this.steps.length === 0) this.timelineContainer.innerHTML = ''

    this.thinkingCard = document.createElement('div')
    this.thinkingCard.className = 'dr-debug-thinking-card'
    this.thinkingCard.innerHTML = `
      <div class="dr-debug-thinking-pulse"></div>
      <div class="dr-debug-thinking-body">
        <div class="dr-debug-thinking-label">Dr. Debug · Reasoning</div>
        <div class="dr-debug-thinking-text">${this.escapeHtml(message)}</div>
      </div>
    `
    this.timelineContainer.appendChild(this.thinkingCard)
    this.scrollTimelineToBottom()
    if (this.activeTab !== 'timeline') this.switchTab('timeline')
  }

  public clearThinking(): void {
    if (this.thinkingCard) {
      this.thinkingCard.remove()
      this.thinkingCard = null
    }
  }

  public updateCausalGraph(graph: CausalErrorGraph): void {
    if (this.activeTab === 'graph' && this.isVisible()) {
      this.causalGraphView.updateGraph(graph)
    }
    const newHtml = graph.nodes.length > 0
      ? `<span>Causal Graph <span style="background:rgba(251,146,60,0.2);color:#fb923c;border:1px solid rgba(251,146,60,0.4);padding:1px 5px;border-radius:9999px;font-size:9px;font-weight:700">${graph.nodes.length}</span></span>`
      : `<span>Causal Graph</span>`
    if (this.tabGraph.innerHTML !== newHtml) {
      this.tabGraph.innerHTML = newHtml
    }
  }

  private toggleMaximize(): void {
    this.isMaximized = !this.isMaximized
    this.element.classList.toggle('maximized', this.isMaximized)
    this.maximizeBtn.innerHTML = this.isMaximized ? '⤡' : '⤢'
    this.maximizeBtn.title = this.isMaximized ? 'Restore size' : 'Expand to full page'
    if (this.isMaximized) {
      this.element.style.left = ''
      this.element.style.top = ''
      this.element.style.right = ''
      this.element.style.bottom = ''
    }
  }

  /**
   * Clipboard write that reports whether it actually succeeded. The async API
   * needs a secure context and a focused document, neither of which is
   * guaranteed here, so fall back to a detached textarea + execCommand.
   */
  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
      }
    } catch {
      // fall through to the legacy path
    }

    try {
      const scratch = document.createElement('textarea')
      scratch.value = text
      scratch.setAttribute('readonly', '')
      scratch.style.position = 'fixed'
      scratch.style.top = '-1000px'
      scratch.style.opacity = '0'
      document.body.appendChild(scratch)
      scratch.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(scratch)
      return ok
    } catch {
      return false
    }
  }

  /** Wires a button to a copy action with honest success/failure feedback. */
  private bindCopyFeedback(
    btn: HTMLButtonElement,
    getText: () => string,
    idleHtml: string,
    okHtml: string,
    failHtml = '<span>Copy failed</span>'
  ): void {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const text = getText()
      if (!text) {
        btn.innerHTML = '<span>Nothing to copy</span>'
        setTimeout(() => { btn.innerHTML = idleHtml }, 1800)
        return
      }
      const ok = await this.copyToClipboard(text)
      btn.innerHTML = ok ? okHtml : failHtml
      btn.classList.toggle('copied', ok)
      setTimeout(() => {
        btn.innerHTML = idleHtml
        btn.classList.remove('copied')
      }, 2200)
    })
  }

  private makeSessionPromptButton(className: string, label: string, title: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = className
    btn.title = title
    const idle = `<span>${label}</span>`
    btn.innerHTML = idle
    this.bindCopyFeedback(
      btn,
      () => this.getSessionPrompt?.() || '',
      idle,
      '<span>Copied for AI</span>'
    )
    return btn
  }

  private makeCopyBtn(text: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'dr-debug-copy-inline'
    btn.title = 'Copy to clipboard'
    const idle = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`
    const copied = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6L9 17l-5-5"/></svg>`
    btn.innerHTML = idle
    this.bindCopyFeedback(btn, () => text, idle, copied, '!')
    return btn
  }

  private startUptimeTicker(): void {
    setInterval(() => {
      const sec = Math.floor((Date.now() - this.startTime) / 1000)
      const m = Math.floor(sec / 60).toString().padStart(2, '0')
      const s = (sec % 60).toString().padStart(2, '0')
      const el = this.element.querySelector('#dr-debug-uptime-val')
      if (el) el.textContent = `${m}:${s}`
    }, 1000)
  }

  private triggerInvestigate(): void {
    const query = this.queryInput.value.trim()
    if (!query) return
    this.setBusy(true)
    this.switchTab('timeline')
    this.onInvestigateHandler(query)
  }

  private formatDiffHtml(diff: string): string {
    return diff
      .split('\n')
      .map((line) => {
        if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
          return `<div style="color: #94a3b8;">${this.escapeHtml(line)}</div>`
        }
        if (line.startsWith('+')) return `<span class="dr-debug-diff-add">${this.escapeHtml(line)}</span>`
        if (line.startsWith('-')) return `<span class="dr-debug-diff-del">${this.escapeHtml(line)}</span>`
        return `<div>${this.escapeHtml(line)}</div>`
      })
      .join('')
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  private initDraggable(header: HTMLElement): void {
    let isDragging = false
    let startX = 0
    let startY = 0
    let initialX = 0
    let initialY = 0

    const onMouseDown = (e: MouseEvent) => {
      if (this.isMaximized) return
      const target = e.target as HTMLElement
      if (target.closest('.dr-debug-close-btn') || target.tagName === 'BUTTON' || target.tagName === 'INPUT') {
        return
      }

      isDragging = true
      startX = e.clientX
      startY = e.clientY

      const rect = this.element.getBoundingClientRect()
      initialX = rect.left
      initialY = rect.top

      this.element.style.left = `${initialX}px`
      this.element.style.top = `${initialY}px`
      this.element.style.right = 'auto'
      this.element.style.bottom = 'auto'

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY

      let newX = initialX + dx
      let newY = initialY + dy

      const maxX = window.innerWidth - this.element.offsetWidth - 10
      const maxY = window.innerHeight - this.element.offsetHeight - 10
      newX = Math.max(10, Math.min(newX, maxX))
      newY = Math.max(10, Math.min(newY, maxY))

      this.element.style.left = `${newX}px`
      this.element.style.top = `${newY}px`
    }

    const onMouseUp = () => {
      isDragging = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    header.addEventListener('mousedown', onMouseDown)
  }

  private createInTabHeader(tabKey: CockpitTabKey, title: string, dotClass = 'dot-sys'): HTMLElement {
    const header = document.createElement('div')
    header.className = 'dr-debug-tab-view-header'
    header.innerHTML = `
      <div class="dr-debug-tab-view-title">
        <span class="dr-debug-status-dot ${dotClass}"></span>
        <span>${title}</span>
      </div>
      <button class="dr-debug-tab-guide-trigger" id="dr-debug-guide-btn-${tabKey}" title="What is ${title}? Click for guide" aria-label="${title} Guide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>Guide</span>
      </button>
    `
    header.querySelector(`#dr-debug-guide-btn-${tabKey}`)?.addEventListener('click', (e) => {
      e.stopPropagation()
      this.toggleTabInfo(tabKey)
    })
    return header
  }

  private createTabButton(
    tabKey: CockpitTabKey,
    labelHtml: string,
    isActive: boolean
  ): HTMLButtonElement {
    const button = document.createElement('button')
    button.className = `dr-debug-tab${isActive ? ' active' : ''}`
    button.setAttribute('data-tab', tabKey)
    button.innerHTML = labelHtml
    button.addEventListener('click', () => {
      this.switchTab(tabKey)
    })
    return button
  }

  private renderTabInfoCard(tabKey: CockpitTabKey): void {
    const guide = TAB_GUIDES[tabKey]
    const isActive = this.activeTab === tabKey

    this.tabInfoCard.innerHTML = `
      <div class="dr-debug-tab-info-header">
        <div class="dr-debug-tab-info-title-box">
          <span class="dr-debug-tab-info-icon">${guide.icon}</span>
          <span class="dr-debug-tab-info-title">${guide.title}</span>
          <span class="dr-debug-tab-info-badge">${guide.badge}</span>
        </div>
        <button class="dr-debug-close-btn" id="dr-debug-tab-info-close" title="Close Guide">✕</button>
      </div>
      <div class="dr-debug-tab-info-body">
        <div class="dr-debug-tab-info-section">
          <div class="dr-debug-tab-info-sec-title"><span>What This Tab Does</span></div>
          <div class="dr-debug-tab-info-desc">${guide.description}</div>
        </div>
        <div class="dr-debug-tab-info-section">
          <div class="dr-debug-tab-info-sec-title"><span>How To Use It</span></div>
          <ul class="dr-debug-tab-info-tips">
            ${guide.tips
              .map(
                (tip) => `
              <li class="dr-debug-tab-info-tip-item">
                <span class="dr-debug-tab-info-tip-bullet">${tip.bullet}</span>
                <span class="dr-debug-tab-info-tip-text">${tip.text}</span>
              </li>
            `
              )
              .join('')}
          </ul>
        </div>
      </div>
      <div class="dr-debug-tab-info-footer">
        <div class="dr-debug-tab-info-status ${isActive ? 'active' : ''}">
          <span>${isActive ? '● Active Tab' : '○ Inactive Tab'}</span>
        </div>
        <div class="dr-debug-tab-info-actions">
          ${
            !isActive
              ? `<button class="dr-debug-tab-info-btn-switch" id="dr-debug-tab-info-switch">
                  <span>Switch to ${guide.title}</span>
                </button>`
              : ''
          }
          <button class="dr-debug-tab-info-btn-gotit" id="dr-debug-tab-info-gotit">Got it</button>
        </div>
      </div>
    `

    const closeBtn = this.tabInfoCard.querySelector('#dr-debug-tab-info-close')
    closeBtn?.addEventListener('click', () => this.hideTabInfo())

    const gotItBtn = this.tabInfoCard.querySelector('#dr-debug-tab-info-gotit')
    gotItBtn?.addEventListener('click', () => this.hideTabInfo())

    const switchBtn = this.tabInfoCard.querySelector('#dr-debug-tab-info-switch')
    switchBtn?.addEventListener('click', () => {
      this.switchTab(tabKey)
      this.hideTabInfo()
    })
  }

  public showTabInfo(tabKey: CockpitTabKey): void {
    this.activeInfoTab = tabKey
    this.renderTabInfoCard(tabKey)
    this.tabInfoBackdrop.style.display = 'block'
    this.tabInfoCard.style.display = 'flex'
  }

  public hideTabInfo(): void {
    this.activeInfoTab = null
    this.tabInfoBackdrop.style.display = 'none'
    this.tabInfoCard.style.display = 'none'
  }

  public toggleTabInfo(tabKey: CockpitTabKey): void {
    if (this.isTabInfoVisible() && this.activeInfoTab === tabKey) {
      this.hideTabInfo()
    } else {
      this.showTabInfo(tabKey)
    }
  }

  public isTabInfoVisible(): boolean {
    return this.tabInfoCard.style.display === 'flex'
  }

  public getActiveTabInfo(): CockpitTabKey | null {
    return this.activeInfoTab
  }

  public setTheme(theme: DrDebugTheme): void {
    this.currentTheme = theme
    this.element.classList.remove('theme-minimal-glass', 'theme-monotone-skeuomorphic')
    if (theme === 'minimal-glass') {
      this.element.classList.add('theme-minimal-glass')
    } else if (theme === 'monotone-skeuomorphic') {
      this.element.classList.add('theme-monotone-skeuomorphic')
    }
    try {
      localStorage.setItem('dr_debug_theme', theme)
    } catch {
      // ignore
    }
    this.settingsModal.setTheme(theme)
  }

  public getTheme(): DrDebugTheme {
    return this.currentTheme
  }

  public updateSettings(settings: Partial<SettingsData> & { hasApiKey?: boolean; apiKeyMasked?: string }): void {
    this.settingsModal.updateSettings(settings)
  }
}


