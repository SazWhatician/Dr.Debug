import type {
  DebugController,
  DockerContainerInfo,
  DockerLogEntry,
  LogLevel
} from '@dr-debug/controller'
import { copyToClipboard, bindCopyButton } from './clipboard.js'

export interface DockerDashboardOptions {
  getController: () => DebugController | undefined
  onLaunchDiagnosis?: (goal: string) => void
  onShowGuide?: () => void
}

export class DockerDashboardView {
  private element: HTMLElement
  private getController: () => DebugController | undefined
  private onLaunchDiagnosis?: (goal: string) => void
  private onShowGuide?: () => void
  private activeContainerFilter: string = 'all'
  private activeLevelFilter: LogLevel | 'all' = 'all'
  private searchQuery: string = ''
  private autoScroll: boolean = true
  private statusBanner!: HTMLElement
  private instructionsCard!: HTMLElement
  private containerGrid!: HTMLElement
  private terminalEl!: HTMLElement
  private filterBar!: HTMLElement
  private searchInput!: HTMLInputElement

  // State caching to prevent aggressive DOM recreation and layout jitter
  private lastContainerSignature: string = ''
  private lastRenderedLogsCount: number = -1
  private lastFilterSignature: string = ''
  private lastInstructionsMode: 'connected' | 'guide' | null = null

  constructor(options: DockerDashboardOptions) {
    this.getController = options.getController
    this.onLaunchDiagnosis = options.onLaunchDiagnosis
    this.onShowGuide = options.onShowGuide

    this.element = document.createElement('div')
    this.element.className = 'dr-debug-docker-dashboard'

    this.render()
  }

  public getElement(): HTMLElement {
    return this.element
  }

  private render(): void {
    this.element.innerHTML = ''

    // 1. Daemon Status Header (skeleton created once, updated dynamically)
    this.statusBanner = document.createElement('div')
    this.statusBanner.className = 'dr-debug-docker-header'
    this.statusBanner.innerHTML = `
      <div class="dr-debug-docker-status-left">
        <span class="dr-debug-docker-status-dot offline"></span>
        <div class="dr-debug-docker-status-info">
          <div class="dr-debug-docker-title">
            <span>Docker Engine Bridge</span>
            <span class="dr-debug-docker-badge badge-stopped">BRIDGE OFFLINE</span>
          </div>
          <div class="dr-debug-docker-sub">
            Checking local daemon connection...
          </div>
        </div>
      </div>
      <div class="dr-debug-docker-status-right">
        <div class="dr-debug-docker-stat-pill pill-containers">
          <strong>0</strong> <span>Containers</span>
        </div>
        <div class="dr-debug-docker-stat-pill pill-errors">
          <strong>0</strong> <span>Panics / Errors</span>
        </div>
        <button class="dr-debug-dock-btn-refresh" id="dr-debug-dock-refresh" title="Refresh containers">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
        </button>
      </div>
    `
    this.statusBanner.querySelector('#dr-debug-dock-refresh')?.addEventListener('click', () => {
      const controller = this.getController()
      if (controller) {
        const client = controller.getDockerBridgeClient()
        if (client) {
          client.fetchContainers().then((c) => controller.setDockerContainers(c))
        } else {
          controller.connectDockerBridge()
        }
      }
      this.update()
    })
    this.element.appendChild(this.statusBanner)

    // 1b. Instructions Guide Panel
    this.instructionsCard = document.createElement('div')
    this.instructionsCard.className = 'dr-debug-docker-instructions-wrapper'
    this.element.appendChild(this.instructionsCard)

    // 2. Container Cards Grid
    const containerSection = document.createElement('div')
    containerSection.className = 'dr-debug-docker-section'
    containerSection.innerHTML = `
      <div class="dr-debug-docker-section-title" style="display:flex; justify-content:space-between; align-items:center;">
        <div>
          <span>Host Containers</span>
          <span class="dr-debug-docker-hint">Click a container to isolate logs</span>
        </div>
        <button class="dr-debug-tab-guide-trigger" id="dr-debug-guide-btn-docker" title="What is Docker Tab? Click for guide" aria-label="Docker Guide">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>Guide</span>
        </button>
      </div>
    `
    containerSection.querySelector('#dr-debug-guide-btn-docker')?.addEventListener('click', () => {
      this.onShowGuide?.()
    })
    this.containerGrid = document.createElement('div')
    this.containerGrid.className = 'dr-debug-docker-grid'
    containerSection.appendChild(this.containerGrid)
    this.element.appendChild(containerSection)

    // 3. Toolbar & Filters
    this.filterBar = document.createElement('div')
    this.filterBar.className = 'dr-debug-docker-toolbar'
    this.renderToolbar()
    this.element.appendChild(this.filterBar)

    // 4. Log Terminal
    const terminalContainer = document.createElement('div')
    terminalContainer.className = 'dr-debug-docker-terminal-wrapper'

    this.terminalEl = document.createElement('div')
    this.terminalEl.className = 'dr-debug-docker-terminal'
    terminalContainer.appendChild(this.terminalEl)
    this.element.appendChild(terminalContainer)

    this.update()
  }

  private renderToolbar(): void {
    this.filterBar.innerHTML = `
      <div class="dr-debug-docker-filters">
        <button class="dr-debug-dock-btn ${this.activeLevelFilter === 'all' ? 'active' : ''}" data-level="all">All Logs</button>
        <button class="dr-debug-dock-btn ${this.activeLevelFilter === 'error' ? 'active' : ''}" data-level="error">Panics & Errors</button>
        <button class="dr-debug-dock-btn ${this.activeLevelFilter === 'warn' ? 'active' : ''}" data-level="warn">Warnings</button>
      </div>
      <div class="dr-debug-docker-search-box">
        <input type="text" class="dr-debug-dock-search" placeholder="grep container logs (regex supported)..." value="${this.escapeHtml(this.searchQuery)}" />
        <label class="dr-debug-dock-autoscroll">
          <input type="checkbox" ${this.autoScroll ? 'checked' : ''} />
          <span>Auto-scroll</span>
        </label>
        <button class="dr-debug-dock-action-btn" id="dr-debug-dock-clear" title="Clear buffer">Clear</button>
        <button class="dr-debug-dock-action-btn primary" id="dr-debug-dock-copy-ai" title="Copy incident prompt">Copy for AI</button>
      </div>
    `

    this.filterBar.querySelectorAll('.dr-debug-dock-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const level = (target.dataset.level as any) || 'all'
        this.activeLevelFilter = level
        this.lastFilterSignature = ''
        this.lastRenderedLogsCount = -1
        this.renderToolbar()
        this.renderTerminalLogs()
      })
    })

    this.searchInput = this.filterBar.querySelector('.dr-debug-dock-search')!
    this.searchInput.addEventListener('input', () => {
      this.searchQuery = this.searchInput.value
      this.lastFilterSignature = ''
      this.lastRenderedLogsCount = -1
      this.renderTerminalLogs()
    })

    const autoscrollCb = this.filterBar.querySelector('.dr-debug-dock-autoscroll input') as HTMLInputElement
    autoscrollCb.addEventListener('change', () => {
      this.autoScroll = autoscrollCb.checked
    })

    this.filterBar.querySelector('#dr-debug-dock-clear')?.addEventListener('click', () => {
      const controller = this.getController()
      if (controller) {
        const entries = controller.getDockerLogs()
        while (entries.length > 0) entries.pop()
      }
      this.lastRenderedLogsCount = -1
      this.lastFilterSignature = ''
      this.update()
    })

    const copyAIBtn = this.filterBar.querySelector('#dr-debug-dock-copy-ai') as HTMLButtonElement
    if (copyAIBtn) {
      copyAIBtn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        this.copyDockerPrompt(copyAIBtn)
      })
    }
  }

  public update(): void {
    const controller = this.getController()
    const containers = controller?.getDockerContainers() || []
    const logs = controller?.getDockerLogs() || []
    const errorLogs = logs.filter((l) => l.level === 'error')
    const bridgeStatus = controller?.getDockerBridgeClient()?.getStatus()

    // Consider connected if client is actively connected OR if containers are present in substrate
    const isBridgeConnected = Boolean(bridgeStatus?.connected || containers.length > 0)
    const isDaemonRunning = Boolean(bridgeStatus?.daemonRunning ?? (containers.length > 0))

    this.renderStatusBanner(isBridgeConnected, isDaemonRunning, containers.length, errorLogs.length)
    this.renderInstructions(isBridgeConnected, containers.length)
    this.renderContainerGrid(containers, logs)
    this.renderTerminalLogs()
  }

  private renderStatusBanner(
    isBridgeConnected: boolean,
    isDaemonRunning: boolean,
    containerCount: number,
    errorCount: number
  ): void {
    const isHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:'
    const subText = isBridgeConnected
      ? `Connected to local daemon via port 9229 · ${containerCount} containers discovered`
      : isHttps
        ? `Bridge offline. Run \`start-docker-bridge\` or reload the extension to stream.`
        : `Bridge disconnected. Run \`start-docker-bridge\` or \`npx @dr-debug/mcp\` to stream host containers.`

    const dot = this.statusBanner.querySelector('.dr-debug-docker-status-dot')
    if (dot) {
      dot.className = `dr-debug-docker-status-dot ${isBridgeConnected ? 'online' : 'offline'}`
    }

    const badge = this.statusBanner.querySelector('.dr-debug-docker-badge')
    if (badge) {
      badge.className = `dr-debug-docker-badge ${isDaemonRunning ? 'badge-running' : 'badge-stopped'}`
      badge.textContent = isBridgeConnected
        ? (isDaemonRunning ? 'DAEMON ACTIVE' : 'DAEMON STOPPED')
        : 'BRIDGE OFFLINE'
    }

    const sub = this.statusBanner.querySelector('.dr-debug-docker-sub')
    if (sub && sub.textContent?.trim() !== subText) {
      sub.textContent = subText
    }

    const containerStrong = this.statusBanner.querySelector('.pill-containers strong')
    if (containerStrong && containerStrong.textContent !== String(containerCount)) {
      containerStrong.textContent = String(containerCount)
    }

    const errPill = this.statusBanner.querySelector('.pill-errors')
    if (errPill) {
      errPill.classList.toggle('alert', errorCount > 0)
      const errStrong = errPill.querySelector('strong')
      if (errStrong && errStrong.textContent !== String(errorCount)) {
        errStrong.textContent = String(errorCount)
      }
    }
  }

  private renderInstructions(isBridgeConnected: boolean, containerCount: number): void {
    const mode = isBridgeConnected && containerCount > 0 ? 'connected' : 'guide'
    if (this.lastInstructionsMode === mode && this.instructionsCard.innerHTML) {
      return
    }
    this.lastInstructionsMode = mode

    if (mode === 'connected') {
      this.instructionsCard.innerHTML = `
        <div class="dr-debug-dock-connected-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="dr-debug-dock-dot-live"></span>
            <span style="font-size:11px; color:#cbd5e1; font-weight:600;">Streaming host containers via port 9229</span>
          </div>
          <button class="dr-debug-dock-toggle-help" id="dr-debug-toggle-dock-help">Connection Guide ▾</button>
        </div>
        <div class="dr-debug-dock-help-content" id="dr-debug-dock-help-content" style="display:none;">
          ${this.getInstructionsHtml()}
        </div>
      `
      this.instructionsCard.querySelector('#dr-debug-toggle-dock-help')?.addEventListener('click', () => {
        const content = this.instructionsCard.querySelector('#dr-debug-dock-help-content') as HTMLElement
        if (content) {
          const isHidden = content.style.display === 'none'
          content.style.display = isHidden ? 'flex' : 'none'
          const btn = this.instructionsCard.querySelector('#dr-debug-toggle-dock-help')
          if (btn) btn.textContent = isHidden ? 'Hide Guide ▴' : 'Connection Guide ▾'
        }
      })
    } else {
      this.instructionsCard.innerHTML = `
        <div class="dr-debug-dock-instructions-card">
          <div class="dr-debug-dock-guide-top">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="dr-debug-status-dot dot-sys"></span>
              <span style="font-weight:700; color:#f8fafc; font-size:12px;">Connect Your Host Docker to Dr. Debug</span>
            </div>
            <span class="dr-debug-dock-guide-badge">ZERO-CONFIG SETUP</span>
          </div>
          <div class="dr-debug-dock-guide-desc">
            Browser sandboxes cannot access host Docker sockets directly. Run the zero-install host daemon to stream active containers and correlate backend database panics / 5xx errors directly with client crashes:
          </div>
          ${this.getInstructionsHtml()}
        </div>
      `
    }

    this.bindCopyCmd()
  }

  private getInstructionsHtml(): string {
    return `
      <div class="dr-debug-dock-steps-grid">
        <div class="dr-debug-dock-step-box">
          <div class="dr-debug-dock-step-head">
            <span class="dr-debug-dock-step-badge">WAY 1</span>
            <span class="dr-debug-dock-step-label">Double-Click Launcher</span>
          </div>
          <div class="dr-debug-dock-step-text">Zero terminal typing. In downloaded package:</div>
          <div class="dr-debug-dock-launcher-box">
            <span>Windows: <code>start-docker-bridge.bat</code></span>
            <span>Mac/Linux: <code>./start-docker-bridge.sh</code></span>
          </div>
        </div>

        <div class="dr-debug-dock-step-box">
          <div class="dr-debug-dock-step-head">
            <span class="dr-debug-dock-step-badge">WAY 2</span>
            <span class="dr-debug-dock-step-label">Terminal (Zero Installation)</span>
          </div>
          <div class="dr-debug-dock-step-text">Run in any terminal with Node &gt;= 18:</div>
          <div class="dr-debug-dock-cmd-line">
            <code>npx @dr-debug/mcp</code>
            <button class="dr-debug-copy-cmd-btn" id="btn-copy-dock-cmd">Copy</button>
          </div>
        </div>
      </div>
      <div class="dr-debug-dock-step-footer">
        <span>The moment the bridge starts, this tab automatically turns green and streams your live containers.</span>
      </div>
    `
  }

  private bindCopyCmd(): void {
    const btn = this.instructionsCard.querySelector('#btn-copy-dock-cmd') as HTMLButtonElement
    if (btn) {
      bindCopyButton(btn, () => 'npx @dr-debug/mcp')
    }
  }

  private renderContainerGrid(containers: DockerContainerInfo[], logs: DockerLogEntry[]): void {
    const errCounts = logs.filter((l) => l.level === 'error')
    const sig = `${this.activeContainerFilter}:${containers.length}:${containers.map((c) => `${c.name}:${c.state}:${c.ports?.join(',')}`).join('|')}:${errCounts.length}`
    if (this.lastContainerSignature === sig && this.containerGrid.innerHTML) {
      return
    }
    this.lastContainerSignature = sig

    this.containerGrid.innerHTML = ''

    // "All Containers" Card
    const allErrors = errCounts.length
    const allCard = document.createElement('div')
    allCard.className = `dr-debug-docker-card ${this.activeContainerFilter === 'all' ? 'selected' : ''}`
    allCard.innerHTML = `
      <div class="dr-debug-card-top">
        <span class="dr-debug-card-name">All Containers</span>
        ${allErrors > 0 ? `<span class="dr-debug-err-badge">${allErrors}</span>` : ''}
      </div>
      <div class="dr-debug-card-desc">Combined host log stream (${logs.length} logs)</div>
    `
    allCard.addEventListener('click', () => {
      this.activeContainerFilter = 'all'
      this.lastContainerSignature = ''
      this.lastFilterSignature = ''
      this.lastRenderedLogsCount = -1
      this.renderContainerGrid(containers, logs)
      this.renderTerminalLogs()
    })
    this.containerGrid.appendChild(allCard)

    if (containers.length === 0) {
      const emptyNote = document.createElement('div')
      emptyNote.className = 'dr-debug-dock-empty-containers'
      emptyNote.innerHTML = `
        <span>No active containers detected in local Docker buffer.</span>
        <button class="dr-debug-btn-inline" id="dr-debug-dock-connect-btn">Connect Daemon</button>
      `
      emptyNote.querySelector('#dr-debug-dock-connect-btn')?.addEventListener('click', () => {
        this.getController()?.connectDockerBridge()
        this.update()
      })
      this.containerGrid.appendChild(emptyNote)
      return
    }

    for (const container of containers) {
      const containerErrors = logs.filter(
        (l) => l.containerName === container.name && l.level === 'error'
      ).length

      const card = document.createElement('div')
      card.className = `dr-debug-docker-card ${this.activeContainerFilter === container.name ? 'selected' : ''}`
      card.innerHTML = `
        <div class="dr-debug-card-top">
          <span class="dr-debug-card-name">${this.escapeHtml(container.name)}</span>
          <span class="dr-debug-card-state state-${container.state || 'running'}">${container.state || 'running'}</span>
        </div>
        <div class="dr-debug-card-image">${this.escapeHtml(container.image || 'image')}</div>
        <div class="dr-debug-card-ports">${container.ports?.join(', ') || 'no ports exposed'}</div>
        ${containerErrors > 0 ? `<div class="dr-debug-card-errors"><span class="dr-debug-status-dot dot-critical"></span> ${containerErrors} panic/error events</div>` : ''}
      `
      card.addEventListener('click', () => {
        this.activeContainerFilter = container.name
        this.lastContainerSignature = ''
        this.lastFilterSignature = ''
        this.lastRenderedLogsCount = -1
        this.renderContainerGrid(containers, logs)
        this.renderTerminalLogs()
      })
      this.containerGrid.appendChild(card)
    }
  }

  private renderTerminalLogs(): void {
    const controller = this.getController()
    if (!controller) return

    const filterSig = `${this.activeContainerFilter}:${this.activeLevelFilter}:${this.searchQuery}`
    const filterChanged = this.lastFilterSignature !== filterSig
    this.lastFilterSignature = filterSig

    const logs = controller.getDockerLogs({
      container: this.activeContainerFilter !== 'all' ? this.activeContainerFilter : undefined,
      level: this.activeLevelFilter !== 'all' ? this.activeLevelFilter : undefined,
      grep: this.searchQuery || undefined
    })

    if (!filterChanged && logs.length === this.lastRenderedLogsCount && this.terminalEl.innerHTML) {
      return
    }

    if (filterChanged || logs.length < this.lastRenderedLogsCount || this.lastRenderedLogsCount < 0) {
      this.terminalEl.innerHTML = ''

      if (logs.length === 0) {
        this.terminalEl.innerHTML = `
          <div class="dr-debug-dock-term-empty">
            <span>No log output recorded for current filter criteria.</span>
          </div>
        `
        this.lastRenderedLogsCount = 0
        return
      }

      for (const log of logs) {
        this.appendLogRow(log)
      }
    } else {
      const newLogs = logs.slice(this.lastRenderedLogsCount)
      for (const log of newLogs) {
        this.appendLogRow(log)
      }
    }

    this.lastRenderedLogsCount = logs.length

    if (this.autoScroll) {
      this.terminalEl.scrollTop = this.terminalEl.scrollHeight
    }
  }

  private appendLogRow(log: DockerLogEntry): void {
    const row = document.createElement('div')
    row.className = `dr-debug-dock-log-row log-${log.level} stream-${log.stream}`

    const timeStr = new Date(log.timestamp).toLocaleTimeString()

    row.innerHTML = `
      <span class="dr-debug-dock-time">${timeStr}</span>
      <span class="dr-debug-dock-container-tag">${this.escapeHtml(log.containerName)}</span>
      <span class="dr-debug-dock-stream-tag">[${log.stream}]</span>
      <span class="dr-debug-dock-msg">${this.highlightErrors(this.escapeHtml(log.message))}</span>
    `

    if (log.level === 'error') {
      const diagBtn = document.createElement('button')
      diagBtn.className = 'dr-debug-dock-inline-diag'
      diagBtn.innerHTML = `<span>Diagnose</span>`
      diagBtn.title = 'Launch AI investigation for this container panic'
      diagBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        const goal = `Diagnose container ${log.containerName} error and trace downstream frontend effects: "${log.message.slice(0, 140)}"`
        this.onLaunchDiagnosis?.(goal)
      })
      row.appendChild(diagBtn)
    }

    this.terminalEl.appendChild(row)
  }

  private renderOfflineState(): void {
    this.element.innerHTML = `
      <div class="dr-debug-dock-offline-box">
        <div class="dr-debug-dock-offline-icon" style="margin-bottom: 8px;">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8v4h8V3z"/></svg>
        </div>
        <h3 style="color: #f8fafc; font-size: 15px; margin-bottom: 6px;">Docker Substrate Daemon Offline</h3>
        <p style="color: #94a3b8; font-size: 12px; max-width: 440px; margin-bottom: 14px; line-height: 1.5;">
          Connect your local Docker engine to stream backend container panics, database connection exhausts, and correlate them with frontend network timeouts.
        </p>
        <div class="dr-debug-dock-cmd-box">
          <code>npx -y @dr-debug/mcp</code>
          <button id="dr-debug-dock-copy-cmd">Copy</button>
        </div>
      </div>
    `
    const btn = this.element.querySelector('#dr-debug-dock-copy-cmd') as HTMLButtonElement
    if (btn) {
      bindCopyButton(btn, () => 'npx -y @dr-debug/mcp')
    }
  }

  private async copyDockerPrompt(btn: HTMLButtonElement): Promise<void> {
    const controller = this.getController()
    if (!controller) return

    const containers = controller.getDockerContainers()
    const logs = controller.getDockerLogs({ tail: 40 })
    const errors = logs.filter((l) => l.level === 'error')

    const prompt = [
      '# Docker Container Substrate Telemetry Brief',
      `Timestamp: ${new Date().toISOString()}`,
      `Total Containers: ${containers.length} | Errors Recorded: ${errors.length}`,
      '',
      '## Active Containers:',
      containers.length > 0
        ? containers.map((c) => `- [${c.state || 'running'}] **${c.name}** (${c.image}) → ports: ${c.ports?.join(', ') || 'none'}`).join('\n')
        : 'No containers listed.',
      '',
      '## Recent Container Errors & Panics:',
      errors.length > 0
        ? errors.map((e) => `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.containerName}] (${e.stream}) ${e.message}`).join('\n')
        : 'Zero container panics recorded in current buffer.',
      '',
      '## Recent Host Container Log Excerpt:',
      '```',
      logs.map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.containerName}] ${l.message}`).join('\n'),
      '```'
    ].join('\n')

    const ok = await copyToClipboard(prompt)
    if (ok) {
      const orig = btn.innerHTML
      btn.innerHTML = '<span>Copied!</span>'
      btn.classList.add('copied')
      setTimeout(() => {
        btn.innerHTML = orig
        btn.classList.remove('copied')
      }, 2000)
    }
  }

  private highlightErrors(text: string): string {
    return text
      .replace(/(FATAL|PANIC|CRITICAL)/gi, '<strong style="color:#f43f5e;">$1</strong>')
      .replace(/(ERROR|FAIL|EXCEPTION)/gi, '<span style="color:#fb7185;">$1</span>')
      .replace(/(WARN(?:ING)?)/gi, '<span style="color:#fbbf24;">$1</span>')
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
