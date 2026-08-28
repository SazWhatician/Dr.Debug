import { DR_DEBUG_LOGO } from '../assets/logo.js'
import { CausalGraphView, type CausalErrorGraph } from './CausalGraphView.js'

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

export class CockpitPanel {
  private element: HTMLElement
  private timelineContainer: HTMLElement
  private triageContainer: HTMLElement
  private graphContainer: HTMLElement
  private prescriptionContainer: HTMLElement
  private causalGraphView: CausalGraphView = new CausalGraphView()
  private queryInput: HTMLInputElement
  private queryButton: HTMLButtonElement
  private tabTimeline: HTMLButtonElement
  private tabTriage: HTMLButtonElement
  private tabGraph: HTMLButtonElement
  private tabPrescription: HTMLButtonElement
  private heapMetricBadge: HTMLElement
  private uptimeMetricBadge: HTMLElement
  private activeTab: 'timeline' | 'triage' | 'graph' | 'prescription' = 'timeline'
  private steps: StepItem[] = []
  private startTime = Date.now()
  private isMaximized = false
  private maximizeBtn!: HTMLButtonElement
  private thinkingCard: HTMLElement | null = null

  constructor(
    private onClose: () => void,
    private onInvestigate: (query: string) => void
  ) {
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
    this.heapMetricBadge.innerHTML = `<span>🧠</span> <span id="dr-debug-heap-val">Heap: 48MB</span>`

    this.uptimeMetricBadge = document.createElement('div')
    this.uptimeMetricBadge.className = 'dr-debug-metric-badge'
    this.uptimeMetricBadge.innerHTML = `<span>⏱️</span> <span id="dr-debug-uptime-val">00:00</span>`

    this.maximizeBtn = document.createElement('button')
    this.maximizeBtn.className = 'dr-debug-close-btn'
    this.maximizeBtn.innerHTML = '⤢'
    this.maximizeBtn.title = 'Expand to full page'
    this.maximizeBtn.addEventListener('click', () => this.toggleMaximize())

    const closeBtn = document.createElement('button')
    closeBtn.className = 'dr-debug-close-btn'
    closeBtn.innerHTML = '✕'
    closeBtn.title = 'Close Cockpit'
    closeBtn.addEventListener('click', () => this.onClose())

    metricsWrapper.appendChild(this.heapMetricBadge)
    metricsWrapper.appendChild(this.uptimeMetricBadge)
    metricsWrapper.appendChild(this.maximizeBtn)
    metricsWrapper.appendChild(closeBtn)

    header.appendChild(brand)
    header.appendChild(metricsWrapper)

    // 2. Tab Navigation
    const tabs = document.createElement('div')
    tabs.className = 'dr-debug-tabs'

    this.tabTimeline = document.createElement('button')
    this.tabTimeline.className = 'dr-debug-tab active'
    this.tabTimeline.innerHTML = `<span>⚡</span> <span>Timeline</span>`
    this.tabTimeline.addEventListener('click', () => this.switchTab('timeline'))

    this.tabTriage = document.createElement('button')
    this.tabTriage.className = 'dr-debug-tab'
    this.tabTriage.innerHTML = `<span>📡</span> <span>Telemetry</span>`
    this.tabTriage.addEventListener('click', () => this.switchTab('triage'))

    this.tabGraph = document.createElement('button')
    this.tabGraph.className = 'dr-debug-tab'
    this.tabGraph.innerHTML = `<span>🕸️</span> <span>Causal Graph</span>`
    this.tabGraph.addEventListener('click', () => this.switchTab('graph'))

    this.tabPrescription = document.createElement('button')
    this.tabPrescription.className = 'dr-debug-tab'
    this.tabPrescription.innerHTML = `<span>💊</span> <span>Prescription</span>`
    this.tabPrescription.addEventListener('click', () => this.switchTab('prescription'))

    tabs.appendChild(this.tabTimeline)
    tabs.appendChild(this.tabTriage)
    tabs.appendChild(this.tabGraph)
    tabs.appendChild(this.tabPrescription)

    // 3. Body Containers
    const body = document.createElement('div')
    body.className = 'dr-debug-body'

    this.timelineContainer = document.createElement('div')
    this.timelineContainer.style.display = 'flex'
    this.timelineContainer.style.flexDirection = 'column'
    this.timelineContainer.style.gap = '10px'

    this.triageContainer = document.createElement('div')
    this.triageContainer.style.display = 'none'
    this.triageContainer.style.flexDirection = 'column'
    this.triageContainer.style.gap = '10px'

    this.graphContainer = document.createElement('div')
    this.graphContainer.style.display = 'none'
    this.graphContainer.style.flexDirection = 'column'
    this.graphContainer.style.gap = '10px'
    this.graphContainer.appendChild(this.causalGraphView.getElement())

    this.prescriptionContainer = document.createElement('div')
    this.prescriptionContainer.style.display = 'none'
    this.prescriptionContainer.style.flexDirection = 'column'
    this.prescriptionContainer.style.gap = '10px'

    body.appendChild(this.timelineContainer)
    body.appendChild(this.triageContainer)
    body.appendChild(this.graphContainer)
    body.appendChild(this.prescriptionContainer)

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

  public switchTab(tab: 'timeline' | 'triage' | 'graph' | 'prescription'): void {
    this.activeTab = tab
    this.tabTimeline.classList.toggle('active', tab === 'timeline')
    this.tabTriage.classList.toggle('active', tab === 'triage')
    this.tabGraph.classList.toggle('active', tab === 'graph')
    this.tabPrescription.classList.toggle('active', tab === 'prescription')

    this.timelineContainer.style.display = tab === 'timeline' ? 'flex' : 'none'
    this.triageContainer.style.display = tab === 'triage' ? 'flex' : 'none'
    this.graphContainer.style.display = tab === 'graph' ? 'flex' : 'none'
    this.prescriptionContainer.style.display = tab === 'prescription' ? 'flex' : 'none'
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
      copyBtn.innerHTML = `<span>📋</span> <span>Copy Unified Patch</span>`
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(prescription.fix)
          copyBtn.innerHTML = `<span>✅</span> <span>Patch Copied!</span>`
          setTimeout(() => {
            copyBtn.innerHTML = `<span>📋</span> <span>Copy Unified Patch</span>`
          }, 2000)
        }
      })

      sectionFix.appendChild(diffContainer)
      sectionFix.appendChild(copyBtn)
      card.appendChild(sectionFix)
    }

    // Append to timeline & to prescription tab
    this.timelineContainer.appendChild(card.cloneNode(true))
    this.prescriptionContainer.innerHTML = ''
    this.prescriptionContainer.appendChild(card)

    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight
    this.switchTab('prescription')
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

  private makeCopyBtn(text: string): HTMLButtonElement {
    const btn = document.createElement('button')
    btn.className = 'dr-debug-copy-inline'
    btn.innerHTML = '📋'
    btn.title = 'Copy to clipboard'
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
        btn.innerHTML = '✅'
        setTimeout(() => { btn.innerHTML = '📋' }, 2000)
      }
    })
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
    this.onInvestigate(query)
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


