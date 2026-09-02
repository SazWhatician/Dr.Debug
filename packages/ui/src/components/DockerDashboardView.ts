import type {
  DebugController,
  DockerContainerInfo,
  DockerLogEntry,
  LogLevel
} from '@dr-debug/controller'

export interface DockerDashboardOptions {
  getController: () => DebugController | undefined
  onLaunchDiagnosis?: (goal: string) => void
}

export class DockerDashboardView {
  private element: HTMLElement
  private getController: () => DebugController | undefined
  private onLaunchDiagnosis?: (goal: string) => void
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

  constructor(options: DockerDashboardOptions) {
    this.getController = options.getController
    this.onLaunchDiagnosis = options.onLaunchDiagnosis

    this.element = document.createElement('div')
    this.element.className = 'dr-debug-docker-dashboard'

    this.render()
  }

  public getElement(): HTMLElement {
    return this.element
  }

  private render(): void {
    this.element.innerHTML = ''

    // 1. Daemon Status Header
    this.statusBanner = document.createElement('div')
    this.statusBanner.className = 'dr-debug-docker-header'
    this.element.appendChild(this.statusBanner)

    // 1b. Instructions Guide Panel
    this.instructionsCard = document.createElement('div')
    this.instructionsCard.className = 'dr-debug-docker-instructions-wrapper'
    this.element.appendChild(this.instructionsCard)

    // 2. Container Cards Grid
    const containerSection = document.createElement('div')
    containerSection.className = 'dr-debug-docker-section'
    containerSection.innerHTML = `
      <div class="dr-debug-docker-section-title">
        <span>📦 Host Containers</span>
        <span class="dr-debug-docker-hint">Click a container to isolate logs</span>
      </div>
    `
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
        <button class="dr-debug-dock-btn ${this.activeLevelFilter === 'error' ? 'active' : ''}" data-level="error">🚨 Panics & Errors</button>
        <button class="dr-debug-dock-btn ${this.activeLevelFilter === 'warn' ? 'active' : ''}" data-level="warn">⚠️ Warnings</button>
      </div>
      <div class="dr-debug-docker-search-box">
        <input type="text" class="dr-debug-dock-search" placeholder="grep container logs (regex supported)..." value="${this.escapeHtml(this.searchQuery)}" />
        <label class="dr-debug-dock-autoscroll">
          <input type="checkbox" ${this.autoScroll ? 'checked' : ''} />
          <span>Auto-scroll</span>
        </label>
        <button class="dr-debug-dock-action-btn" id="dr-debug-dock-clear" title="Clear buffer">🧹 Clear</button>
        <button class="dr-debug-dock-action-btn primary" id="dr-debug-dock-copy-ai" title="Copy incident prompt">📋 Copy for AI</button>
      </div>
    `

    this.filterBar.querySelectorAll('.dr-debug-dock-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement
        const level = (target.dataset.level as any) || 'all'
        this.activeLevelFilter = level
        this.renderToolbar()
        this.renderTerminalLogs()
      })
    })

    this.searchInput = this.filterBar.querySelector('.dr-debug-dock-search')!
    this.searchInput.addEventListener('input', () => {
      this.searchQuery = this.searchInput.value
      this.renderTerminalLogs()
    })

    const autoscrollCb = this.filterBar.querySelector('.dr-debug-dock-autoscroll input') as HTMLInputElement
    autoscrollCb.addEventListener('change', () => {
      this.autoScroll = autoscrollCb.checked
    })

    this.filterBar.querySelector('#dr-debug-dock-clear')?.addEventListener('click', () => {
      const controller = this.getController()
      if (controller) {
        // Clear docker logs
        const entries = controller.getDockerLogs()
        while (entries.length > 0) entries.pop()
      }
      this.update()
    })

    this.filterBar.querySelector('#dr-debug-dock-copy-ai')?.addEventListener('click', (e) => {
      const btn = e.currentTarget as HTMLButtonElement
      this.copyDockerPrompt(btn)
    })
  }

  public update(): void {
    const controller = this.getController()
    const containers = controller?.getDockerContainers() || []
    const logs = controller?.getDockerLogs() || []
    const errorLogs = logs.filter((l) => l.level === 'error')
    const bridgeStatus = controller?.getDockerBridgeClient()?.getStatus()

    // 1. Status Banner
    const isBridgeConnected = bridgeStatus?.connected ?? false
    const isDaemonRunning = bridgeStatus?.daemonRunning ?? (containers.length > 0)

    this.statusBanner.innerHTML = `
      <div class="dr-debug-docker-status-left">
        <span class="dr-debug-docker-status-dot ${isBridgeConnected ? 'online' : 'offline'}"></span>
        <div>
          <div class="dr-debug-docker-title">
            <span>Docker Engine Bridge</span>
            <span class="dr-debug-docker-badge ${isDaemonRunning ? 'badge-running' : 'badge-stopped'}">
              ${isBridgeConnected ? (isDaemonRunning ? 'DAEMON ACTIVE' : 'DAEMON STOPPED') : 'BRIDGE OFFLINE'}
            </span>
          </div>
          <div class="dr-debug-docker-sub">
            ${isBridgeConnected
              ? `Connected to local daemon via port 9229 · ${containers.length} containers discovered`
              : `Bridge disconnected. Run \`npx @dr-debug/mcp\` to stream host containers.`}
          </div>
        </div>
      </div>
      <div class="dr-debug-docker-status-right">
        <div class="dr-debug-docker-stat-pill">
          <strong>${containers.length}</strong> <span>Containers</span>
        </div>
        <div class="dr-debug-docker-stat-pill ${errorLogs.length > 0 ? 'alert' : ''}">
          <strong>${errorLogs.length}</strong> <span>Panics / Errors</span>
        </div>
        <button class="dr-debug-dock-btn-refresh" id="dr-debug-dock-refresh" title="Refresh containers">🔄</button>
      </div>
    `

    this.statusBanner.querySelector('#dr-debug-dock-refresh')?.addEventListener('click', () => {
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

    // 2. Instructions Guide
    this.renderInstructions(isBridgeConnected, containers.length)

    // 3. Container Grid
    this.renderContainerGrid(containers, logs)

    // 4. Terminal
    this.renderTerminalLogs()
  }

  private renderInstructions(isBridgeConnected: boolean, containerCount: number): void {
    if (isBridgeConnected && containerCount > 0) {
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
              <span style="font-size:15px;">🐳</span>
              <span style="font-weight:700; color:#f8fafc; font-size:12px;">Connect Your Host Docker to Dr. Debug</span>
            </div>
            <span class="dr-debug-dock-guide-badge">⚡ 3-SECOND ZERO-CONFIG SETUP</span>
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
            <span class="dr-debug-dock-step-label">Terminal (Zero Installation)</span>
          </div>
          <div class="dr-debug-dock-step-text">Run in any terminal with Node &gt;= 18:</div>
          <div class="dr-debug-dock-cmd-line">
            <code>npx @dr-debug/mcp</code>
            <button class="dr-debug-copy-cmd-btn" id="btn-copy-dock-cmd">Copy</button>
          </div>
        </div>

        <div class="dr-debug-dock-step-box">
          <div class="dr-debug-dock-step-head">
            <span class="dr-debug-dock-step-badge">WAY 2</span>
            <span class="dr-debug-dock-step-label">Double-Click Launcher</span>
          </div>
          <div class="dr-debug-dock-step-text">Zero terminal typing. In downloaded package:</div>
          <div class="dr-debug-dock-launcher-box">
            <span>Windows: <code>start-docker-bridge.bat</code></span>
            <span>Mac/Linux: <code>./start-docker-bridge.sh</code></span>
          </div>
        </div>
      </div>
      <div class="dr-debug-dock-step-footer">
        <span>✨ The moment the bridge starts, this tab automatically turns green and streams your live containers!</span>
      </div>
    `
  }

  private bindCopyCmd(): void {
    const btn = this.instructionsCard.querySelector('#btn-copy-dock-cmd') as HTMLButtonElement
    if (btn) {
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText('npx @dr-debug/mcp').then(() => {
          const oldText = btn.textContent
          btn.textContent = 'Copied!'
          btn.classList.add('copied')
          setTimeout(() => {
            btn.textContent = oldText
            btn.classList.remove('copied')
          }, 2000)
        })
      })
    }
  }

  private renderContainerGrid(containers: DockerContainerInfo[], logs: DockerLogEntry[]): void {
    this.containerGrid.innerHTML = ''

    // "All Containers" Card
    const allErrors = logs.filter((l) => l.level === 'error').length
    const allCard = document.createElement('div')
    allCard.className = `dr-debug-docker-card ${this.activeContainerFilter === 'all' ? 'selected' : ''}`
    allCard.innerHTML = `
      <div class="dr-debug-card-top">
        <span class="dr-debug-card-name">🌐 All Containers</span>
        ${allErrors > 0 ? `<span class="dr-debug-err-badge">${allErrors}</span>` : ''}
      </div>
      <div class="dr-debug-card-desc">Combined host log stream (${logs.length} logs)</div>
    `
    allCard.addEventListener('click', () => {
      this.activeContainerFilter = 'all'
      this.renderContainerGrid(containers, logs)
      this.renderTerminalLogs()
    })
    this.containerGrid.appendChild(allCard)

    if (containers.length === 0) {
      const emptyNote = document.createElement('div')
      emptyNote.className = 'dr-debug-dock-empty-containers'
      emptyNote.innerHTML = `
        <span>🐳 No active containers detected in local Docker buffer.</span>
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
        ${containerErrors > 0 ? `<div class="dr-debug-card-errors">🚨 ${containerErrors} panic/error events</div>` : ''}
      `
      card.addEventListener('click', () => {
        this.activeContainerFilter = container.name
        this.renderContainerGrid(containers, logs)
        this.renderTerminalLogs()
      })
      this.containerGrid.appendChild(card)
    }
  }

  private renderTerminalLogs(): void {
    const controller = this.getController()
    if (!controller) return

    const logs = controller.getDockerLogs({
      container: this.activeContainerFilter !== 'all' ? this.activeContainerFilter : undefined,
      level: this.activeLevelFilter !== 'all' ? this.activeLevelFilter : undefined,
      grep: this.searchQuery || undefined
    })

    this.terminalEl.innerHTML = ''

    if (logs.length === 0) {
      this.terminalEl.innerHTML = `
        <div class="dr-debug-dock-term-empty">
          <span>💤 No log output recorded for current filter criteria.</span>
        </div>
      `
      return
    }

    for (const log of logs) {
      const row = document.createElement('div')
      row.className = `dr-debug-dock-log-row log-${log.level} stream-${log.stream}`

      const timeStr = new Date(log.timestamp).toLocaleTimeString()

      row.innerHTML = `
        <span class="dr-debug-dock-time">${timeStr}</span>
        <span class="dr-debug-dock-container-tag">${this.escapeHtml(log.containerName)}</span>
        <span class="dr-debug-dock-stream-tag">[${log.stream}]</span>
        <span class="dr-debug-dock-msg">${this.highlightErrors(this.escapeHtml(log.message))}</span>
      `

      // If it's an error/panic line, attach an inline "Diagnose" action
      if (log.level === 'error') {
        const diagBtn = document.createElement('button')
        diagBtn.className = 'dr-debug-dock-inline-diag'
        diagBtn.innerHTML = `<span>⚡</span> <span>Diagnose</span>`
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

    if (this.autoScroll) {
      this.terminalEl.scrollTop = this.terminalEl.scrollHeight
    }
  }

  private renderOfflineState(): void {
    this.element.innerHTML = `
      <div class="dr-debug-dock-offline-box">
        <div style="font-size: 36px; margin-bottom: 8px;">🐳</div>
        <h3 style="color: #f8fafc; font-size: 15px; margin-bottom: 6px;">Docker Substrate Daemon Offline</h3>
        <p style="color: #94a3b8; font-size: 12px; max-width: 440px; margin-bottom: 14px; line-height: 1.5;">
          Connect your local Docker engine to stream backend container panics, database connection exhausts, and correlate them with frontend network timeouts.
        </p>
        <div class="dr-debug-dock-cmd-box">
          <code>npx -y @dr-debug/mcp</code>
          <button id="dr-debug-dock-copy-cmd">📋 Copy</button>
        </div>
      </div>
    `
  }

  private async copyDockerPrompt(btn: HTMLButtonElement): Promise<void> {
    const controller = this.getController()
    if (!controller) return

    const containers = controller.getDockerContainers()
    const logs = controller.getDockerLogs({ tail: 40 })
    const errors = logs.filter((l) => l.level === 'error')

    const prompt = [
      '# 🐳 Docker Container Substrate Telemetry Brief',
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

    try {
      await navigator.clipboard.writeText(prompt)
      const orig = btn.innerHTML
      btn.innerHTML = '✅ Copied'
      setTimeout(() => {
        btn.innerHTML = orig
      }, 2000)
    } catch {
      console.log(prompt)
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
