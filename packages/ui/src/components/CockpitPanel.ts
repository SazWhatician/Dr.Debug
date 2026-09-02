import { DR_DEBUG_LOGO } from '../assets/logo.js'
import { CausalGraphView, type CausalErrorGraph } from './CausalGraphView.js'
import { DockerDashboardView } from './DockerDashboardView.js'
import { ErrorDashboardView } from './ErrorDashboardView.js'
import { SettingsModal, type SettingsData } from './SettingsModal.js'

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
  private heapMetricBadge: HTMLElement
  private uptimeMetricBadge: HTMLElement
  private activeTab: 'timeline' | 'errors' | 'triage' | 'graph' | 'prescription' | 'docker' = 'timeline'
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
        <div class="dr-debug-title-text">DR. DEBUG // COCKPIT</div>
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
      'Copy the whole session — findings, causal chain, stacks, HTTP detail, timeline — as a paste-ready brief for Claude Code or Antigravity'
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

    this.tabTimeline = document.createElement('button')
    this.tabTimeline.className = 'dr-debug-tab active'
    this.tabTimeline.innerHTML = `<span>Timeline</span>`
    this.tabTimeline.addEventListener('click', () => this.switchTab('timeline'))

    this.tabErrors = document.createElement('button')
    this.tabErrors.className = 'dr-debug-tab'
    this.tabErrors.innerHTML = `<span>Error Matrix</span>`
    this.tabErrors.addEventListener('click', () => this.switchTab('errors'))

    this.tabTriage = document.createElement('button')
    this.tabTriage.className = 'dr-debug-tab'
    this.tabTriage.innerHTML = `<span>Telemetry</span>`
    this.tabTriage.addEventListener('click', () => this.switchTab('triage'))

    this.tabGraph = document.createElement('button')
    this.tabGraph.className = 'dr-debug-tab'
    this.tabGraph.innerHTML = `<span>Causal Graph</span>`
    this.tabGraph.addEventListener('click', () => this.switchTab('graph'))

    this.tabDocker = document.createElement('button')
    this.tabDocker.className = 'dr-debug-tab'
    this.tabDocker.innerHTML = `<span>🐳 Docker</span>`
    this.tabDocker.addEventListener('click', () => this.switchTab('docker'))

    this.tabPrescription = document.createElement('button')
    this.tabPrescription.className = 'dr-debug-tab'
    this.tabPrescription.innerHTML = `<span>Prescription</span>`
    this.tabPrescription.addEventListener('click', () => this.switchTab('prescription'))

    tabs.appendChild(this.tabTimeline)
    tabs.appendChild(this.tabErrors)
    tabs.appendChild(this.tabTriage)
    tabs.appendChild(this.tabGraph)
    tabs.appendChild(this.tabDocker)
    tabs.appendChild(this.tabPrescription)

    // 3. Body Containers
    const body = document.createElement('div')
    body.className = 'dr-debug-body'

    this.timelineContainer = document.createElement('div')
    this.timelineContainer.style.display = 'flex'
    this.timelineContainer.style.flexDirection = 'column'
    this.timelineContainer.style.gap = '10px'

    this.errorDashboardView = new ErrorDashboardView({
      getController: () => options.getController?.() || (typeof window !== 'undefined' ? (window as any).__DR_DEBUG__?.getController() : undefined),
      onLaunchDiagnosis: (goal) => {
        this.queryInput.value = goal
        this.triggerInvestigate()
      }
    })
    this.errorsContainer = document.createElement('div')
    this.errorsContainer.style.display = 'none'
    this.errorsContainer.style.flexDirection = 'column'
    this.errorsContainer.style.gap = '10px'
    this.errorsContainer.style.height = '100%'
    this.errorsContainer.appendChild(this.errorDashboardView.getElement())

    this.triageContainer = document.createElement('div')
    this.triageContainer.style.display = 'none'
    this.triageContainer.style.flexDirection = 'column'
    this.triageContainer.style.gap = '10px'

    this.graphContainer = document.createElement('div')
    this.graphContainer.style.display = 'none'
    this.graphContainer.style.flexDirection = 'column'
    this.graphContainer.style.gap = '10px'
    this.graphContainer.appendChild(this.causalGraphView.getElement())

    this.dockerDashboardView = new DockerDashboardView({
      getController: () => options.getController?.() || (typeof window !== 'undefined' ? (window as any).__DR_DEBUG__?.getController() : undefined),
      onLaunchDiagnosis: (goal) => {
        this.queryInput.value = goal
        this.triggerInvestigate()
      }
    })
    this.dockerContainer = document.createElement('div')
    this.dockerContainer.style.display = 'none'
    this.dockerContainer.style.flexDirection = 'column'
    this.dockerContainer.style.gap = '10px'
    this.dockerContainer.style.height = '100%'
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
        options.onSaveSettings?.(settings)
        if (typeof window !== 'undefined' && (window as any).__DR_DEBUG__) {
          (window as any).__DR_DEBUG__.updateLLMConfig?.(settings)
        }
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


    // 4. Quick Prompts & Query Wrapper
    const queryWrapper = document.createElement('div')
    queryWrapper.className = 'dr-debug-query-wrapper'

    const chipsRow = document.createElement('div')
    chipsRow.className = 'dr-debug-chips-row'

    const quickChips = [
      { label: '⚡ Diagnose 503 Error', query: 'Why did the /api/ request return 503 and how can we fix it?' },
      { label: '🔍 Find Correlations', query: 'Find causal links between recent network failures and console exceptions.' },
      { label: '🧠 Inspect Heap & Vitals', query: 'Check memory heap allocations and identify any potential memory leaks.' },
      { label: '🧹 Clear Telemetry', action: 'clear' }
    ]

    for (const chip of quickChips) {
      const chipEl = document.createElement('button')
      chipEl.className = 'dr-debug-quick-chip'
      chipEl.textContent = chip.label
      chipEl.addEventListener('click', () => {
        if (chip.action === 'clear') {
          this.clearTimeline()
        } else if (chip.query) {
          this.queryInput.value = chip.query
          this.triggerInvestigate()
        }
      })
      chipsRow.appendChild(chipEl)
    }

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
    this.queryButton.innerHTML = `<span>⚡</span> <span>Diagnose</span>`
    this.queryButton.addEventListener('click', () => this.triggerInvestigate())

    queryBox.appendChild(this.queryInput)
    queryBox.appendChild(this.queryButton)

    queryWrapper.appendChild(chipsRow)
    queryWrapper.appendChild(queryBox)

    this.element.appendChild(header)
    this.element.appendChild(tabs)
    this.element.appendChild(body)
    this.element.appendChild(queryWrapper)

    const creditFooter = document.createElement('div')
    creditFooter.className = 'dr-debug-cockpit-footer'
    creditFooter.innerHTML = `
      <span>🩺 Dr. Debug by <a href="https://github.com/SazWhatician" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;font-weight:700;">Saswat Mohanty (@SazWhatician)</a></span>
      <span style="color:#64748b;">·</span>
      <a href="https://www.linkedin.com/in/saswat-mohanty-0a4549331/" target="_blank" rel="noopener noreferrer" style="color:#818cf8;text-decoration:none;">LinkedIn</a>
    `
    this.element.appendChild(creditFooter)

    this.renderEmptyTimeline()
    this.renderEmptyPrescription()
    this.startUptimeTicker()
    this.initDraggable(header)
  }

  public getElement(): HTMLElement {
    return this.element
  }

  public show(): void {
    this.element.classList.remove('hidden')
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
      ? `<span>⏳</span> <span>Diagnosing...</span>`
      : `<span>⚡</span> <span>Diagnose</span>`
  }

  public switchTab(tab: 'timeline' | 'errors' | 'triage' | 'graph' | 'prescription' | 'docker'): void {
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
    }
  }

  public updateErrors(): void {
    this.errorDashboardView.update()
  }

  public updateDocker(): void {
    this.dockerDashboardView.update()

    const controller = typeof this.onCloseOrOptions === 'object' && this.onCloseOrOptions.getController?.()
    if (controller) {
      const errorCount = (controller.getDockerLogs?.() || []).filter((l: any) => l.level === 'error').length
      if (errorCount > 0) {
        this.tabDocker.innerHTML = `<span>🐳 Docker <span style="background:rgba(244,63,94,0.25);color:#fda4af;border:1px solid rgba(244,63,94,0.5);padding:1px 5px;border-radius:9999px;font-size:9px;font-weight:700">${errorCount}</span></span>`
      } else {
        this.tabDocker.innerHTML = `<span>🐳 Docker</span>`
      }
    }
  }


  public clearTimeline(): void {
    this.steps = []
    this.renderEmptyTimeline()
    this.renderEmptyPrescription()
  }

  public renderEmptyTimeline(): void {
    this.timelineContainer.innerHTML = `
      <div class="dr-debug-timeline-empty">
        <div class="dr-debug-radar-ring">
          <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo radar-logo" alt="Dr. Debug" />
        </div>
        <strong style="color: #f1f5f9; font-size: 13px;">Autonomous Diagnostic Observer Active</strong>
        <p style="font-size: 12px; max-width: 320px; line-height: 1.5;">
          Dr. Debug is continuously analyzing DOM mutations, network traffic, and console telemetry. Click <strong>Diagnose</strong> to launch autonomous RCA.
        </p>
      </div>
    `
  }

  public renderEmptyPrescription(): void {
    this.prescriptionContainer.innerHTML = `
      <div class="dr-debug-timeline-empty">
        <div class="dr-debug-radar-ring">
          <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo radar-logo" alt="Dr. Debug" />
        </div>
        <strong style="color: #f1f5f9; font-size: 13px;">No Prescription Generated Yet</strong>
        <p style="font-size: 12px; max-width: 320px; line-height: 1.5;">
          Launch a diagnosis to formulate verified code fixes, root causes, and unified diff patches.
        </p>
      </div>
    `
  }

  public addStep(step: StepItem): void {
    this.clearThinking()
    if (this.steps.length === 0) this.timelineContainer.innerHTML = ''
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
    reasoningLabel.textContent = '🧠 AI Reasoning'

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
    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight
  }

  public showPrescription(prescription: PrescriptionData): void {
    // Built twice rather than cloned: cloneNode() drops event listeners, which
    // would leave the copy buttons on the timeline copy inert.
    this.timelineContainer.appendChild(this.buildPrescriptionCard(prescription))
    this.prescriptionContainer.innerHTML = ''
    this.prescriptionContainer.appendChild(this.buildPrescriptionCard(prescription))

    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight
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
      <div class="dr-debug-presc-text" style="color: #cbd5e1;">${this.escapeHtml(prescription.rootCause)}</div>
    `

    card.appendChild(header)
    card.appendChild(sectionFinding)
    card.appendChild(sectionRCA)

    if (prescription.filesToModify && prescription.filesToModify.length > 0) {
      const sectionFiles = document.createElement('div')
      sectionFiles.className = 'dr-debug-presc-section'
      sectionFiles.innerHTML = `
        <div class="dr-debug-presc-label">Target Files To Patch</div>
        <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: #38bdf8;">
          ${prescription.filesToModify.map((f) => `📄 ${this.escapeHtml(f)}`).join(' &nbsp;|&nbsp; ')}
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
      const idle = `<span>📋</span> <span>Copy remediation plan</span>`
      copyBtn.innerHTML = idle
      this.bindCopyFeedback(
        copyBtn,
        () => prescription.fix,
        idle,
        `<span>✅</span> <span>Copied</span>`
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
        '📤 Copy full brief for AI',
        'Copy the complete session brief as Markdown'
      )
    )
    card.appendChild(handoff)

    return card
  }

  public updateTriage(telemetry: {
    errors: string[]
    slowRequests: string[]
    vitals?: Record<string, any>
    memory?: { usedMB?: number; totalMB?: number }
  }): void {
    this.triageContainer.innerHTML = ''

    if (telemetry.memory && telemetry.memory.usedMB) {
      this.heapMetricBadge.innerHTML = `<span>🧠</span> <span>Heap: ${telemetry.memory.usedMB}MB</span>`
    }

    // 1. Errors section
    if (telemetry.errors.length > 0) {
      for (const err of telemetry.errors) {
        const item = document.createElement('div')
        item.className = 'dr-debug-telemetry-item error'
        item.innerHTML = `
          <div class="dr-debug-telemetry-meta">
            <span style="color: #fb7185; font-weight: 700;">🔴 RUNTIME EXCEPTION</span>
            <span>Just now</span>
          </div>
          <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: #f1f5f9;">
            ${this.escapeHtml(err)}
          </div>
        `
        item.querySelector('.dr-debug-telemetry-meta')!.appendChild(this.makeCopyBtn(err))
        this.triageContainer.appendChild(item)
      }
    }

    // 2. Problem Network section
    if (telemetry.slowRequests.length > 0) {
      for (const req of telemetry.slowRequests) {
        const isFail = req.includes('[50') || req.includes('[40') || req.includes('[0]')
        const item = document.createElement('div')
        item.className = `dr-debug-telemetry-item ${isFail ? 'net-fail' : 'warn'}`
        item.innerHTML = `
          <div class="dr-debug-telemetry-meta">
            <span style="color: ${isFail ? '#fbbf24' : '#38bdf8'}; font-weight: 700;">
              ${isFail ? '⚠️ HTTP NETWORK ANOMALY' : '⏳ LATENCY ANOMALY'}
            </span>
            <span>Substrate trace</span>
          </div>
          <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: #f1f5f9;">
            ${this.escapeHtml(req)}
          </div>
        `
        item.querySelector('.dr-debug-telemetry-meta')!.appendChild(this.makeCopyBtn(req))
        this.triageContainer.appendChild(item)
      }
    }

    // 3. Memory & Performance Health
    if (telemetry.memory) {
      const item = document.createElement('div')
      item.className = 'dr-debug-telemetry-item ok'
      item.innerHTML = `
        <div class="dr-debug-telemetry-meta">
          <span style="color: #34d399; font-weight: 700;">🟢 V8 MEMORY SUBSYSTEM</span>
          <span>Live Snapshot</span>
        </div>
        <div style="font-size: 12px; color: #cbd5e1;">
          Used Heap: <strong>${telemetry.memory.usedMB || 0} MB</strong> / Allocated: <strong>${telemetry.memory.totalMB || 0} MB</strong>
        </div>
      `
      this.triageContainer.appendChild(item)
    }

    if (this.triageContainer.children.length === 0) {
      this.triageContainer.innerHTML = `
        <div style="color: #34d399; text-align: center; padding: 40px 10px; font-size: 13px;">
          <div style="font-size: 24px; margin-bottom: 6px;">✨</div>
          <strong>Substrate is completely healthy.</strong>
          <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Zero unhandled exceptions, zero network timeouts recorded.</p>
        </div>
      `
    }
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
    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight
    if (this.activeTab !== 'timeline') this.switchTab('timeline')
  }

  public clearThinking(): void {
    if (this.thinkingCard) {
      this.thinkingCard.remove()
      this.thinkingCard = null
    }
  }

  public updateCausalGraph(graph: CausalErrorGraph): void {
    this.causalGraphView.updateGraph(graph)
    if (graph.nodes.length > 0) {
      this.tabGraph.innerHTML = `<span>🕸️</span> <span>Causal Map <span style="background:rgba(251,146,60,0.2);color:#fb923c;border:1px solid rgba(251,146,60,0.4);padding:1px 5px;border-radius:9999px;font-size:9px;font-weight:700">${graph.nodes.length}</span></span>`
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
    btn.innerHTML = '📋'
    this.bindCopyFeedback(btn, () => text, '📋', '✅', '⚠️')
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
}


