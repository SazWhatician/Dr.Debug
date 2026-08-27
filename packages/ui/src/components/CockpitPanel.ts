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
  private queryInput: HTMLInputElement
  private queryButton: HTMLButtonElement
  private tabTimeline: HTMLButtonElement
  private tabTriage: HTMLButtonElement
  private activeTab: 'timeline' | 'triage' = 'timeline'
  private steps: StepItem[] = []

  constructor(
    private onClose: () => void,
    private onInvestigate: (query: string) => void
  ) {
    this.element = document.createElement('div')
    this.element.className = 'dr-debug-modal hidden'

    // Header
    const header = document.createElement('div')
    header.className = 'dr-debug-header'

    const title = document.createElement('div')
    title.className = 'dr-debug-title'
    title.innerHTML = '<span>🩺</span> <span>Dr. Debug Cockpit</span>'

    const closeBtn = document.createElement('button')
    closeBtn.className = 'dr-debug-close-btn'
    closeBtn.innerHTML = '✕'
    closeBtn.title = 'Close Cockpit'
    closeBtn.addEventListener('click', () => this.onClose())

    header.appendChild(title)
    header.appendChild(closeBtn)

    // Navigation Tabs
    const tabs = document.createElement('div')
    tabs.className = 'dr-debug-tabs'

    this.tabTimeline = document.createElement('button')
    this.tabTimeline.className = 'dr-debug-tab active'
    this.tabTimeline.textContent = 'Diagnostic Timeline'
    this.tabTimeline.addEventListener('click', () => this.switchTab('timeline'))

    this.tabTriage = document.createElement('button')
    this.tabTriage.className = 'dr-debug-tab'
    this.tabTriage.textContent = 'Triage Stream'
    this.tabTriage.addEventListener('click', () => this.switchTab('triage'))

    tabs.appendChild(this.tabTimeline)
    tabs.appendChild(this.tabTriage)

    // Body
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

    body.appendChild(this.timelineContainer)
    body.appendChild(this.triageContainer)

    // Query Box
    const queryBox = document.createElement('div')
    queryBox.className = 'dr-debug-query-box'

    this.queryInput = document.createElement('input')
    this.queryInput.className = 'dr-debug-input'
    this.queryInput.placeholder = 'Ask Dr. Debug to investigate (e.g. Why did checkout fail?)...'
    this.queryInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.triggerInvestigate()
    })

    this.queryButton = document.createElement('button')
    this.queryButton.className = 'dr-debug-btn'
    this.queryButton.textContent = 'Diagnose'
    this.queryButton.addEventListener('click', () => this.triggerInvestigate())

    queryBox.appendChild(this.queryInput)
    queryBox.appendChild(this.queryButton)

    this.element.appendChild(header)
    this.element.appendChild(tabs)
    this.element.appendChild(body)
    this.element.appendChild(queryBox)

    this.renderEmptyTimeline()
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
    this.queryButton.textContent = busy ? 'Diagnosing...' : 'Diagnose'
  }

  public switchTab(tab: 'timeline' | 'triage'): void {
    this.activeTab = tab
    if (tab === 'timeline') {
      this.tabTimeline.classList.add('active')
      this.tabTriage.classList.remove('active')
      this.timelineContainer.style.display = 'flex'
      this.triageContainer.style.display = 'none'
    } else {
      this.tabTriage.classList.add('active')
      this.tabTimeline.classList.remove('active')
      this.triageContainer.style.display = 'flex'
      this.timelineContainer.style.display = 'none'
    }
  }

  public clearTimeline(): void {
    this.steps = []
    this.timelineContainer.innerHTML = ''
  }

  public renderEmptyTimeline(): void {
    this.timelineContainer.innerHTML = `
      <div style="color: #8b949e; text-align: center; padding: 40px 10px; font-size: 12px;">
        <div style="font-size: 28px; margin-bottom: 8px;">🩺</div>
        <strong>Dr. Debug is observing runtime telemetry.</strong>
        <p style="margin-top: 4px; color: #6e7681;">Click "Diagnose" or trigger an anomaly to begin autonomous Re-Act investigation.</p>
      </div>
    `
  }

  public addStep(step: StepItem): void {
    if (this.steps.length === 0) {
      this.timelineContainer.innerHTML = ''
    }
    this.steps.push(step)

    const stepCard = document.createElement('div')
    stepCard.className = 'dr-debug-step-card'

    const header = document.createElement('div')
    header.className = 'dr-debug-step-header'

    const numSpan = document.createElement('span')
    numSpan.className = 'dr-debug-step-num'
    numSpan.textContent = `Step ${step.stepNumber}`

    const toolBadge = document.createElement('span')
    toolBadge.className = 'dr-debug-step-tool'
    toolBadge.textContent = step.toolName

    header.appendChild(numSpan)
    header.appendChild(toolBadge)

    const thought = document.createElement('div')
    thought.className = 'dr-debug-step-thought'
    thought.textContent = `💡 Hypothesis: ${step.hypothesis}`

    stepCard.appendChild(header)
    stepCard.appendChild(thought)

    if (step.toolOutput) {
      const output = document.createElement('div')
      output.className = 'dr-debug-step-output'
      output.textContent = step.toolOutput
      stepCard.appendChild(output)
    }

    this.timelineContainer.appendChild(stepCard)
    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight
  }

  public showPrescription(prescription: PrescriptionData): void {
    const card = document.createElement('div')
    card.className = 'dr-debug-prescription-card'

    const title = document.createElement('div')
    title.className = 'dr-debug-prescription-title'
    title.innerHTML = `<span>✅ Root Cause Diagnosis</span> <span style="font-size: 11px; color: #8b949e;">(${Math.round((prescription.confidence ?? 0.95) * 100)}% Confidence)</span>`

    const diagnosisText = document.createElement('div')
    diagnosisText.style.color = '#f0f6fc'
    diagnosisText.style.fontSize = '12px'
    diagnosisText.innerHTML = `<strong>Finding:</strong> ${this.escapeHtml(prescription.diagnosis)}`

    const rootCauseText = document.createElement('div')
    rootCauseText.style.color = '#8b949e'
    rootCauseText.style.fontSize = '12px'
    rootCauseText.innerHTML = `<strong>Root Cause:</strong> ${this.escapeHtml(prescription.rootCause)}`

    card.appendChild(title)
    card.appendChild(diagnosisText)
    card.appendChild(rootCauseText)

    if (prescription.filesToModify && prescription.filesToModify.length > 0) {
      const filesDiv = document.createElement('div')
      filesDiv.style.fontSize = '11px'
      filesDiv.style.color = '#58a6ff'
      filesDiv.textContent = `Target Files: ${prescription.filesToModify.join(', ')}`
      card.appendChild(filesDiv)
    }

    if (prescription.fix) {
      const diffContainer = document.createElement('div')
      diffContainer.className = 'dr-debug-prescription-diff'
      diffContainer.innerHTML = this.formatDiffHtml(prescription.fix)

      const copyBtn = document.createElement('button')
      copyBtn.className = 'dr-debug-copy-btn'
      copyBtn.textContent = '📋 Copy Patch'
      copyBtn.addEventListener('click', () => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(prescription.fix)
          copyBtn.textContent = '✅ Copied!'
          setTimeout(() => {
            copyBtn.textContent = '📋 Copy Patch'
          }, 2000)
        }
      })

      card.appendChild(diffContainer)
      card.appendChild(copyBtn)
    }

    this.timelineContainer.appendChild(card)
    this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight
  }

  public updateTriage(telemetry: {
    errors: string[]
    slowRequests: string[]
    vitals?: Record<string, any>
    memory?: { usedMB?: number; totalMB?: number }
  }): void {
    this.triageContainer.innerHTML = ''

    // 1. Errors section
    if (telemetry.errors.length > 0) {
      for (const err of telemetry.errors) {
        const item = document.createElement('div')
        item.className = 'dr-debug-telemetry-item error'
        item.innerHTML = `<strong>Console / Runtime Error:</strong><span>${this.escapeHtml(err)}</span>`
        this.triageContainer.appendChild(item)
      }
    }

    // 2. Slow Network section
    if (telemetry.slowRequests.length > 0) {
      for (const req of telemetry.slowRequests) {
        const item = document.createElement('div')
        item.className = 'dr-debug-telemetry-item warn'
        item.innerHTML = `<strong>Slow Network Call:</strong><span>${this.escapeHtml(req)}</span>`
        this.triageContainer.appendChild(item)
      }
    }

    // 3. Memory & Vitals
    if (telemetry.memory) {
      const item = document.createElement('div')
      item.className = 'dr-debug-telemetry-item ok'
      item.innerHTML = `<strong>Memory Health:</strong><span>Heap: ${telemetry.memory.usedMB || 0}MB / ${telemetry.memory.totalMB || 0}MB</span>`
      this.triageContainer.appendChild(item)
    }

    if (this.triageContainer.children.length === 0) {
      this.triageContainer.innerHTML = `
        <div style="color: #3fb950; text-align: center; padding: 30px; font-size: 12px;">
          ✅ No active errors, network delays, or heap leaks detected.
        </div>
      `
    }
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
        if (line.startsWith('+++') || line.startsWith('---')) {
          return `<div style="color: #8b949e;">${this.escapeHtml(line)}</div>`
        }
        if (line.startsWith('+')) return `<div class="dr-debug-diff-add">${this.escapeHtml(line)}</div>`
        if (line.startsWith('-')) return `<div class="dr-debug-diff-del">${this.escapeHtml(line)}</div>`
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
}
