import type {
  ConsoleEntry,
  DebugController,
  DebugState,
  DiagnosticMatrixSnapshot,
  DockerLogEntry,
  ErrorHistogramBucket,
  MatrixSeverity,
  MatrixSubstrate,
  NetworkRecord
} from '@dr-debug/controller'
import {
  computeDiagnosticMatrix,
  generateCurlCommand,
  getHttpStatusExplainer
} from '@dr-debug/controller'
import { TestSynthesizer } from '@dr-debug/core'

export interface ErrorDashboardOptions {
  getController: () => DebugController
  onSelectError?: (id: string) => void
  onLaunchDiagnosis?: (goal: string) => void
}

interface ErrorItem {
  id: string
  type: '5xx' | '4xx' | 'console' | 'docker' | 'system'
  substrate: MatrixSubstrate
  severity: MatrixSeverity
  title: string
  subtitle: string
  timestamp: number
  badge: string
  raw: NetworkRecord | ConsoleEntry | DockerLogEntry | any
}

export class ErrorDashboardView {
  private element: HTMLElement
  private matrixContainer: HTMLElement
  private chartContainer: HTMLElement
  private toolbarContainer: HTMLElement
  private filterBar: HTMLElement
  private errorListContainer: HTMLElement
  private inspectorContainer: HTMLElement
  private viewMode: 'matrix' | 'stream' = 'matrix'
  private activeFilter: 'all' | '5xx' | '4xx' | 'console' | 'docker' | 'system' = 'all'
  private activeMatrixCellKey: string | null = null
  private searchQuery = ''
  private selectedErrorId: string | null = null
  private getController: () => DebugController

  constructor(options: ErrorDashboardOptions) {
    this.getController = options.getController

    this.element = document.createElement('div')
    this.element.className = 'dr-debug-error-dashboard'

    // 1. Header with Stats & Live Summary
    const header = document.createElement('div')
    header.className = 'dr-debug-err-header'
    header.innerHTML = `
      <div class="dr-debug-err-title">
        <span class="dr-debug-status-dot dot-critical"></span>
        <span style="font-weight:700; letter-spacing:-0.2px;">Diagnostics & Error Matrix</span>
      </div>
      <div id="dr-debug-err-stats" class="dr-debug-err-stats">
        <span class="dr-debug-stat-chip chip-5xx">0 5xx</span>
        <span class="dr-debug-stat-chip chip-4xx">0 4xx</span>
        <span class="dr-debug-stat-chip chip-js">0 JS</span>
        <span class="dr-debug-stat-chip chip-doc">0 Docker</span>
      </div>
    `

    // 2. Toolbar: View Mode Toggle, Live Search Bar & Action Buttons
    this.toolbarContainer = document.createElement('div')
    this.toolbarContainer.className = 'dr-debug-matrix-toolbar'
    this.renderToolbar()

    // 3. 2D Multi-Dimensional Matrix Grid
    this.matrixContainer = document.createElement('div')
    this.matrixContainer.className = 'dr-debug-2d-matrix'

    // 4. Interactive Histogram Graph
    this.chartContainer = document.createElement('div')
    this.chartContainer.className = 'dr-debug-chart-wrapper'
    this.chartContainer.style.display = 'none'

    // 5. Filter Bar
    this.filterBar = document.createElement('div')
    this.filterBar.className = 'dr-debug-err-filter-bar'
    this.renderFilterButtons()

    // 6. Split View / List + Inspector Container
    const mainView = document.createElement('div')
    mainView.className = 'dr-debug-err-main-view'

    this.errorListContainer = document.createElement('div')
    this.errorListContainer.className = 'dr-debug-err-list'

    this.inspectorContainer = document.createElement('div')
    this.inspectorContainer.className = 'dr-debug-err-inspector'
    this.inspectorContainer.style.display = 'none'

    mainView.appendChild(this.errorListContainer)
    mainView.appendChild(this.inspectorContainer)

    this.element.appendChild(header)
    this.element.appendChild(this.toolbarContainer)
    this.element.appendChild(this.matrixContainer)
    this.element.appendChild(this.chartContainer)
    this.element.appendChild(this.filterBar)
    this.element.appendChild(mainView)
  }

  public getElement(): HTMLElement {
    return this.element
  }

  private renderToolbar(): void {
    this.toolbarContainer.innerHTML = `
      <div class="dr-debug-mode-toggle">
        <button id="btn-mode-matrix" class="dr-debug-mode-btn ${this.viewMode === 'matrix' ? 'active' : ''}">
          <span>Grid View</span>
        </button>
        <button id="btn-mode-stream" class="dr-debug-mode-btn ${this.viewMode === 'stream' ? 'active' : ''}">
          <span>Timeline View</span>
        </button>
      </div>
      <div class="dr-debug-search-box">
        <input type="text" class="dr-debug-search-input" placeholder="Filter errors, URLs, stack traces..." value="${this.escapeHtml(this.searchQuery)}" />
      </div>
      <button id="btn-clear-matrix" class="dr-debug-copy-inline-btn" title="Clear all recorded errors and metrics" style="margin-left:auto;">
        <span>Clear</span>
      </button>
    `

    const btnMatrix = this.toolbarContainer.querySelector('#btn-mode-matrix')
    const btnStream = this.toolbarContainer.querySelector('#btn-mode-stream')
    const btnClear = this.toolbarContainer.querySelector('#btn-clear-matrix')
    const searchInput = this.toolbarContainer.querySelector('.dr-debug-search-input') as HTMLInputElement

    btnMatrix?.addEventListener('click', () => {
      this.viewMode = 'matrix'
      this.matrixContainer.style.display = 'flex'
      this.chartContainer.style.display = 'none'
      this.renderToolbar()
      this.update()
    })

    btnStream?.addEventListener('click', () => {
      this.viewMode = 'stream'
      this.matrixContainer.style.display = 'none'
      this.chartContainer.style.display = 'flex'
      this.renderToolbar()
      this.update()
    })

    btnClear?.addEventListener('click', () => {
      const controller = this.getController()
      if (controller) {
        controller.clear()
        this.selectedErrorId = null
        this.inspectorContainer.style.display = 'none'
        this.update()
      }
    })

    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value
      this.update()
    })
  }

  private renderFilterButtons(): void {
    const filters: Array<{ id: 'all' | '5xx' | '4xx' | 'console' | 'docker' | 'system'; label: string; dotClass: string }> = [
      { id: 'all', label: 'All Anomalies', dotClass: 'dot-critical' },
      { id: '5xx', label: 'HTTP 5xx', dotClass: 'dot-5xx' },
      { id: '4xx', label: 'HTTP 4xx', dotClass: 'dot-4xx' },
      { id: 'console', label: 'Runtime JS', dotClass: 'dot-js' },
      { id: 'docker', label: 'Docker Logs', dotClass: 'dot-docker' },
      { id: 'system', label: 'System / Heap', dotClass: 'dot-sys' }
    ]

    this.filterBar.innerHTML = ''
    filters.forEach((f) => {
      const btn = document.createElement('button')
      btn.className = `dr-debug-filter-btn ${this.activeFilter === f.id && !this.activeMatrixCellKey ? 'active' : ''}`
      btn.innerHTML = `<span class="dr-debug-status-dot ${f.dotClass}"></span> <span>${f.label}</span>`
      btn.addEventListener('click', () => {
        this.activeFilter = f.id
        this.activeMatrixCellKey = null
        this.renderFilterButtons()
        this.update()
      })
      this.filterBar.appendChild(btn)
    })
  }

  public update(): void {
    const controller = this.getController()
    if (!controller) return
    const state = controller.getSnapshot()

    // 1. Calculate & Render 2D Matrix Snapshot
    const matrix = computeDiagnosticMatrix(state)
    this.renderMatrixGrid(matrix)

    // 2. Update Header Stats
    const http5xxCount = state.network.records.filter((r) => (r.status && r.status >= 500) || (r.isFailed && (!r.status || r.status === 0))).length
    const http4xxCount = state.network.records.filter((r) => r.status && r.status >= 400 && r.status < 500).length
    const consoleCount = state.console.entries.filter((e) => e.level === 'error').length
    const dockerCount = (state.docker?.logs || []).filter((l) => l.level === 'error').length

    const statsEl = this.element.querySelector('#dr-debug-err-stats')
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="dr-debug-stat-chip chip-5xx" title="Filter HTTP 5xx">${http5xxCount} 5xx</span>
        <span class="dr-debug-stat-chip chip-4xx" title="Filter HTTP 4xx">${http4xxCount} 4xx</span>
        <span class="dr-debug-stat-chip chip-js" title="Filter JS Exceptions">${consoleCount} JS</span>
        <span class="dr-debug-stat-chip chip-doc" title="Filter Docker Panics">${dockerCount} Docker</span>
      `

      statsEl.querySelector('.chip-5xx')?.addEventListener('click', () => { this.activeFilter = '5xx'; this.activeMatrixCellKey = null; this.renderFilterButtons(); this.update() })
      statsEl.querySelector('.chip-4xx')?.addEventListener('click', () => { this.activeFilter = '4xx'; this.activeMatrixCellKey = null; this.renderFilterButtons(); this.update() })
      statsEl.querySelector('.chip-js')?.addEventListener('click', () => { this.activeFilter = 'console'; this.activeMatrixCellKey = null; this.renderFilterButtons(); this.update() })
      statsEl.querySelector('.chip-doc')?.addEventListener('click', () => { this.activeFilter = 'docker'; this.activeMatrixCellKey = null; this.renderFilterButtons(); this.update() })
    }

    // 3. Render Histogram (if stream mode)
    const histogram = controller.getErrorHistogram(12)
    this.renderHistogram(histogram)

    // 4. Render Error List
    this.renderErrorList(state)

    // 5. Update Inspector if item selected
    if (this.selectedErrorId) {
      this.renderInspector(this.selectedErrorId, state)
    }
  }

  private renderMatrixGrid(matrix: DiagnosticMatrixSnapshot): void {
    const substrates: Array<{ id: MatrixSubstrate; label: string }> = [
      { id: 'network', label: 'NETWORK' },
      { id: 'console', label: 'RUNTIME JS' },
      { id: 'docker', label: 'DOCKER' },
      { id: 'system', label: 'SYSTEM' }
    ]

    const severities: Array<{ id: MatrixSeverity; label: string; dotClass: string }> = [
      { id: 'critical', label: 'Critical', dotClass: 'dot-critical' },
      { id: 'high', label: 'High', dotClass: 'dot-high' },
      { id: 'notice', label: 'Notice', dotClass: 'dot-notice' }
    ]

    let html = `
      <table class="dr-debug-matrix-table">
        <thead>
          <tr>
            <th class="dr-debug-matrix-th" style="text-align:left; width:90px;">SEVERITY</th>
    `

    substrates.forEach((sub) => {
      html += `<th class="dr-debug-matrix-th">${sub.label}</th>`
    })

    html += `</tr></thead><tbody>`

    severities.forEach((sev) => {
      html += `<tr><td class="dr-debug-matrix-row-label"><span class="dr-debug-status-dot ${sev.dotClass}"></span> <span>${sev.label}</span></td>`

      substrates.forEach((sub) => {
        const key = `${sub.id}:${sev.id}`
        const cell = matrix.cells[key] || { count: 0 }
        const hasErrors = cell.count > 0
        const isActive = this.activeMatrixCellKey === key
        const countClass = cell.count > 0 ? sev.id : 'zero'

        html += `
          <td class="dr-debug-matrix-cell sev-${sev.id} ${hasErrors ? 'has-errors' : ''} ${isActive ? 'active-filter' : ''}" data-cell-key="${key}" title="Click to filter by ${sev.label} ${sub.label}">
            <div class="dr-debug-cell-count ${countClass}">${cell.count > 0 ? cell.count : '—'}</div>
            <div class="dr-debug-cell-sub">${sub.id}</div>
          </td>
        `
      })

      html += `</tr>`
    })

    html += `</tbody></table>`
    this.matrixContainer.innerHTML = html

    // Attach click handlers to matrix cells
    this.matrixContainer.querySelectorAll('.dr-debug-matrix-cell').forEach((el) => {
      el.addEventListener('click', () => {
        const key = el.getAttribute('data-cell-key')
        if (!key) return
        if (this.activeMatrixCellKey === key) {
          this.activeMatrixCellKey = null
        } else {
          this.activeMatrixCellKey = key
        }
        this.renderFilterButtons()
        this.update()
      })
    })
  }

  private renderHistogram(buckets: ErrorHistogramBucket[]): void {
    const maxVal = Math.max(...buckets.map((b) => b.total), 3)

    let html = `
      <div class="dr-debug-hist-title">
        <span>Timeline Frequency</span>
        <span style="font-size:10px; color:#94a3b8;">${buckets.length} Windows</span>
      </div>
      <div class="dr-debug-histogram">
    `

    buckets.forEach((b) => {
      const heightPct = Math.max(8, Math.round((b.total / maxVal) * 100))
      const hasErrors = b.total > 0
      const activeClass = hasErrors ? 'has-errors' : ''

      let barSegments = ''
      if (b.total > 0) {
        const p5xx = Math.round((b.http5xx / b.total) * 100)
        const p4xx = Math.round((b.http4xx / b.total) * 100)
        const pJs = Math.round((b.consoleErrors / b.total) * 100)
        const pDoc = Math.round((b.dockerErrors / b.total) * 100)

        barSegments = `
          ${p5xx > 0 ? `<div style="height:${p5xx}%; background:#f43f5e;" title="${b.http5xx} 5xx"></div>` : ''}
          ${p4xx > 0 ? `<div style="height:${p4xx}%; background:#f59e0b;" title="${b.http4xx} 4xx"></div>` : ''}
          ${pJs > 0 ? `<div style="height:${pJs}%; background:#ec4899;" title="${b.consoleErrors} JS Errors"></div>` : ''}
          ${pDoc > 0 ? `<div style="height:${pDoc}%; background:#818cf8;" title="${b.dockerErrors} Docker Panics"></div>` : ''}
        `
      } else {
        barSegments = `<div style="height:100%; background:rgba(56,189,248,0.15);"></div>`
      }

      html += `
        <div class="dr-debug-hist-col" title="${b.label} — Total: ${b.total} errors">
          <div class="dr-debug-hist-bar ${activeClass}" style="height:${heightPct}%;">
            ${barSegments}
          </div>
          <span class="dr-debug-hist-label">${b.label.slice(3)}</span>
        </div>
      `
    })

    html += `</div>`
    this.chartContainer.innerHTML = html
  }

  private renderErrorList(state: DebugState): void {
    const items: ErrorItem[] = []

    // 1. Network Records
    state.network.records.forEach((r) => {
      if (r.status && r.status >= 500) {
        items.push({
          id: r.id,
          type: '5xx',
          substrate: 'network',
          severity: 'critical',
          title: `${r.method} ${r.url}`,
          subtitle: `Status ${r.status} ${r.statusText || 'Server Error'} · ${Math.round(r.duration || 0)}ms`,
          timestamp: r.startTime,
          badge: `500 Server Error`,
          raw: r
        })
      } else if (r.status && r.status >= 400) {
        items.push({
          id: r.id,
          type: '4xx',
          substrate: 'network',
          severity: 'high',
          title: `${r.method} ${r.url}`,
          subtitle: `Status ${r.status} ${r.statusText || 'Client Error'} · ${Math.round(r.duration || 0)}ms`,
          timestamp: r.startTime,
          badge: `${r.status} Client Error`,
          raw: r
        })
      } else if (r.isFailed) {
        items.push({
          id: r.id,
          type: '5xx',
          substrate: 'network',
          severity: 'critical',
          title: `${r.method} ${r.url}`,
          subtitle: `Network Error / Connection Refused · ${Math.round(r.duration || 0)}ms`,
          timestamp: r.startTime,
          badge: `Network Error`,
          raw: r
        })
      } else if (r.isSlow) {
        items.push({
          id: r.id,
          type: '4xx',
          substrate: 'network',
          severity: 'notice',
          title: `${r.method} ${r.url}`,
          subtitle: `Slow Latency Bottleneck · ${Math.round(r.duration || 0)}ms`,
          timestamp: r.startTime,
          badge: `Slow Network`,
          raw: r
        })
      }
    })

    // 2. Console Entries
    state.console.entries.forEach((e) => {
      if (e.level === 'error') {
        const isCritical = e.count > 3 || (e.stack && e.stack.includes('Uncaught'))
        items.push({
          id: e.id,
          type: 'console',
          substrate: 'console',
          severity: isCritical ? 'critical' : 'high',
          title: e.message,
          subtitle: `${e.type} (Count: ${e.count}) · ${e.stack ? e.stack.split('\n')[1] || '' : ''}`,
          timestamp: e.timestamp,
          badge: `JS Exception`,
          raw: e
        })
      } else if (e.level === 'warn') {
        items.push({
          id: e.id,
          type: 'console',
          substrate: 'console',
          severity: 'notice',
          title: e.message,
          subtitle: `Warning · Count: ${e.count}`,
          timestamp: e.timestamp,
          badge: `JS Warning`,
          raw: e
        })
      }
    })

    // 3. Docker Logs
    ;(state.docker?.logs || []).forEach((d) => {
      if (d.level === 'error') {
        items.push({
          id: d.id,
          type: 'docker',
          substrate: 'docker',
          severity: 'critical',
          title: `[${d.containerName}] ${d.message}`,
          subtitle: `Stream: ${d.stream} · Level: ERROR`,
          timestamp: d.timestamp,
          badge: `Docker Panic`,
          raw: d
        })
      } else if (d.level === 'warn') {
        items.push({
          id: d.id,
          type: 'docker',
          substrate: 'docker',
          severity: 'high',
          title: `[${d.containerName}] ${d.message}`,
          subtitle: `Stream: ${d.stream} · Level: WARN`,
          timestamp: d.timestamp,
          badge: `Docker Warning`,
          raw: d
        })
      }
    })

    // 4. Memory Heap Anomaly
    if (state.memory && state.memory.heapUsagePercent && state.memory.heapUsagePercent > 80) {
      items.push({
        id: 'mem_leak_anomaly',
        type: 'system',
        substrate: 'system',
        severity: state.memory.heapUsagePercent > 90 ? 'critical' : 'high',
        title: `High Heap Memory Saturation (${state.memory.heapUsagePercent}%)`,
        subtitle: `Used: ${Math.round((state.memory.usedJSHeapSize || 0) / (1024 * 1024))}MB · Total: ${Math.round((state.memory.totalJSHeapSize || 0) / (1024 * 1024))}MB`,
        timestamp: state.memory.timestamp,
        badge: `Memory Anomaly`,
        raw: state.memory
      })
    }

    // Sort by timestamp descending (newest first)
    items.sort((a, b) => b.timestamp - a.timestamp)

    // Apply Filter & Search Query
    const filtered = items.filter((item) => {
      // 1. Matrix Cell filter (if active)
      if (this.activeMatrixCellKey) {
        const [sub, sev] = this.activeMatrixCellKey.split(':')
        if (item.substrate !== sub || item.severity !== sev) return false
      }

      // 2. Tab Filter
      if (this.activeFilter !== 'all') {
        if (this.activeFilter === '5xx' && item.type !== '5xx') return false
        if (this.activeFilter === '4xx' && item.type !== '4xx') return false
        if (this.activeFilter === 'console' && item.type !== 'console') return false
        if (this.activeFilter === 'docker' && item.type !== 'docker') return false
        if (this.activeFilter === 'system' && item.type !== 'system') return false
      }

      // 3. Search query
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase()
        const matchTitle = item.title.toLowerCase().includes(q)
        const matchSub = item.subtitle.toLowerCase().includes(q)
        if (!matchTitle && !matchSub) return false
      }

      return true
    })

    // Render items
    this.errorListContainer.innerHTML = ''
    if (filtered.length === 0) {
      this.errorListContainer.innerHTML = `
        <div class="dr-debug-err-empty">
          <div>No errors matching current matrix filter.</div>
          <div style="font-size:10.5px; margin-top:4px; color:#64748b;">Substrates healthy and within normal operating parameters.</div>
        </div>
      `
      return
    }

    filtered.forEach((item) => {
      const card = document.createElement('div')
      const isSelected = this.selectedErrorId === item.id
      card.className = `dr-debug-err-card type-${item.type} ${isSelected ? 'selected' : ''}`
      card.setAttribute('data-id', item.id)

      const timeAgo = this.formatTimeAgo(item.timestamp)
      const dotColorClass = item.severity === 'critical' ? 'dot-critical' : item.severity === 'high' ? 'dot-high' : 'dot-notice'

      card.innerHTML = `
        <div class="dr-debug-err-card-header">
          <div style="display:flex; align-items:center; gap:5px;">
            <span class="dr-debug-status-dot ${dotColorClass}"></span>
            <span class="dr-debug-err-badge badge-${item.type}">${item.badge}</span>
          </div>
          <span class="dr-debug-err-time">${timeAgo}</span>
        </div>
        <div class="dr-debug-err-card-title">${this.escapeHtml(item.title)}</div>
        <div class="dr-debug-err-card-subtitle">${this.escapeHtml(item.subtitle)}</div>
      `

      card.addEventListener('click', () => {
        this.selectedErrorId = item.id
        this.renderErrorList(state)
        this.renderInspector(item.id, state)
      })

      this.errorListContainer.appendChild(card)
    })
  }

  private renderInspector(targetId: string, state: DebugState): void {
    const controller = this.getController()
    if (!controller) return

    const networkReq = state.network.records.find((r) => r.id === targetId)
    const consoleErr = state.console.entries.find((e) => e.id === targetId)
    const dockerLog = (state.docker?.logs || []).find((d) => d.id === targetId)
    const isMem = targetId === 'mem_leak_anomaly'

    this.inspectorContainer.style.display = 'flex'
    this.inspectorContainer.innerHTML = ''

    // 1. Inspector Header
    const inspHeader = document.createElement('div')
    inspHeader.className = 'dr-debug-insp-header'

    let titleText = 'Incident Inspection'
    let statusBadge = 'ERROR'
    if (networkReq) {
      titleText = `${networkReq.method} ${networkReq.url}`
      statusBadge = `HTTP ${networkReq.status || 'FAILED'}`
    } else if (consoleErr) {
      titleText = consoleErr.message
      statusBadge = consoleErr.type.toUpperCase()
    } else if (dockerLog) {
      titleText = `[${dockerLog.containerName}] ${dockerLog.message}`
      statusBadge = 'DOCKER'
    } else if (isMem) {
      titleText = 'Heap Memory Saturation'
      statusBadge = 'MEMORY'
    }

    inspHeader.innerHTML = `
      <div style="flex:1; min-width:0;">
        <div class="dr-debug-insp-badge">${statusBadge}</div>
        <div class="dr-debug-insp-title">${this.escapeHtml(titleText)}</div>
      </div>
    `

    // Close button
    const closeInspBtn = document.createElement('button')
    closeInspBtn.className = 'dr-debug-close-btn'
    closeInspBtn.innerHTML = '✕'
    closeInspBtn.title = 'Close Inspector'
    closeInspBtn.addEventListener('click', () => {
      this.selectedErrorId = null
      this.inspectorContainer.style.display = 'none'
      this.update()
    })
    inspHeader.appendChild(closeInspBtn)

    // 2. Action Toolbar with Interactive Buttons
    const actionToolbar = document.createElement('div')
    actionToolbar.className = 'dr-debug-insp-actions'

    // AI Prompt Copy Button
    const copyAIBtn = document.createElement('button')
    copyAIBtn.className = 'dr-debug-btn-primary-glow'
    copyAIBtn.innerHTML = `<span>Copy AI Report</span>`
    copyAIBtn.title = 'Copy structured debug prompt ready to paste into Claude Code or Antigravity'
    copyAIBtn.addEventListener('click', () => {
      const prompt = controller.getUnifiedAIDebugPrompt(targetId)
      if (navigator.clipboard) {
        navigator.clipboard.writeText(prompt)
        copyAIBtn.innerHTML = `<span>Copied AI Prompt!</span>`
        setTimeout(() => {
          copyAIBtn.innerHTML = `<span>Copy AI Report</span>`
        }, 2500)
      }
    })
    actionToolbar.appendChild(copyAIBtn)

    // If Network Request -> Add Replay, Mock 200, and cURL Buttons
    if (networkReq) {
      // Replay Request Button
      const replayBtn = document.createElement('button')
      replayBtn.className = 'dr-debug-btn-replay'
      replayBtn.innerHTML = `<span>Replay Request</span>`
      replayBtn.title = 'Re-fetch this exact endpoint in real-time to check current server state'
      replayBtn.addEventListener('click', async () => {
        replayBtn.innerHTML = `<span>Replaying...</span>`
        try {
          const res = await fetch(networkReq.url, {
            method: networkReq.method,
            headers: networkReq.requestHeaders
          })
          replayBtn.innerHTML = `<span>Status: ${res.status}</span>`
        } catch (err: any) {
          replayBtn.innerHTML = `<span>Failed: ${err.message?.slice(0, 15)}</span>`
        }
        setTimeout(() => {
          replayBtn.innerHTML = `<span>Replay Request</span>`
        }, 3000)
      })
      actionToolbar.appendChild(replayBtn)

      // Mock 200 OK Button
      const mockBtn = document.createElement('button')
      mockBtn.className = 'dr-debug-btn-mock'
      mockBtn.innerHTML = `<span>Mock 200 OK</span>`
      mockBtn.title = 'Inject a mock 200 response rule to test frontend resilience'
      mockBtn.addEventListener('click', () => {
        controller.mockNetworkResponse(networkReq.url, 200, JSON.stringify({ status: 'ok', mocked: true }))
        mockBtn.innerHTML = `<span>Mocked Active!</span>`
        setTimeout(() => {
          mockBtn.innerHTML = `<span>Mock 200 OK</span>`
        }, 2500)
      })
      actionToolbar.appendChild(mockBtn)

      // cURL Button
      const curlBtn = document.createElement('button')
      curlBtn.className = 'dr-debug-btn-curl'
      curlBtn.innerHTML = `<span>Copy cURL</span>`
      curlBtn.title = 'Copy exact executable curl command for terminal reproduction'
      curlBtn.addEventListener('click', () => {
        const curlCmd = generateCurlCommand(networkReq)
        if (navigator.clipboard) {
          navigator.clipboard.writeText(curlCmd)
          curlBtn.innerHTML = `<span>Copied cURL!</span>`
          setTimeout(() => {
            curlBtn.innerHTML = `<span>Copy cURL</span>`
          }, 2000)
        }
      })
      actionToolbar.appendChild(curlBtn)
    }

    // Synthesize Playwright Test Button
    const synthBtn = document.createElement('button')
    synthBtn.className = 'dr-debug-btn-synth'
    synthBtn.innerHTML = `<span>Synthesize Test</span>`
    synthBtn.title = 'Generate Playwright reproduction test script'
    synthBtn.addEventListener('click', () => {
      const mockResult = {
        goal: 'Incident Reproduction',
        status: 'resolved' as const,
        diagnosis: titleText,
        rootCause: 'Incident under diagnosis',
        confidence: 0.95,
        steps: [],
        durationMs: 0,
        finalMemory: ''
      }
      const testCode = TestSynthesizer.synthesizePlaywright(
        mockResult,
        controller.getInteractionReplay?.() || [],
        networkReq
      )
      if (navigator.clipboard) {
        navigator.clipboard.writeText(testCode)
        synthBtn.innerHTML = `<span>Copied Playwright Test!</span>`
        setTimeout(() => {
          synthBtn.innerHTML = `<span>Synthesize Test</span>`
        }, 2500)
      }
    })
    actionToolbar.appendChild(synthBtn)

    // JSON Export Button
    const copyJsonBtn = document.createElement('button')
    copyJsonBtn.className = 'dr-debug-copy-inline-btn'
    copyJsonBtn.innerHTML = `<span>JSON</span>`
    copyJsonBtn.addEventListener('click', () => {
      const payload = networkReq || consoleErr || dockerLog || state.memory
      if (navigator.clipboard && payload) {
        navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
        copyJsonBtn.innerHTML = `<span>Copied!</span>`
        setTimeout(() => {
          copyJsonBtn.innerHTML = `<span>JSON</span>`
        }, 2000)
      }
    })
    actionToolbar.appendChild(copyJsonBtn)

    // 3. Body Details (RFC explainer, cURL box, demangled stack frames, headers, payloads)
    const body = document.createElement('div')
    body.className = 'dr-debug-insp-body'

    if (networkReq) {
      // RFC Explainer Callout
      const explainer = getHttpStatusExplainer(networkReq.status || 0)
      const rfcClass = networkReq.status && networkReq.status >= 500 ? '' : 'type-4xx'
      body.innerHTML += `
        <div class="dr-debug-rfc-box ${rfcClass}">
          <div class="dr-debug-rfc-title"><span class="dr-debug-status-dot dot-high"></span> <span>${this.escapeHtml(explainer.title)}</span></div>
          <div class="dr-debug-rfc-desc">${this.escapeHtml(explainer.explanation)}</div>
          <div class="dr-debug-rfc-rec">Recommended Fix: ${this.escapeHtml(explainer.recommendation)}</div>
        </div>
      `

      // Terminal cURL Preview
      const curlCmd = generateCurlCommand(networkReq)
      body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Terminal Reproduction Command (cURL)</div>
          <pre class="dr-debug-curl-preview">${this.escapeHtml(curlCmd)}</pre>
        </div>
      `

      // Request Headers
      const reqHeaders = networkReq.requestHeaders || {}
      const hasReqHeaders = Object.keys(reqHeaders).length > 0
      body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Request Headers</div>
          <pre class="dr-debug-code-box">${hasReqHeaders ? this.escapeHtml(JSON.stringify(reqHeaders, null, 2)) : 'None recorded'}</pre>
        </div>
      `

      // Request Body / Payload
      body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Request Body / Payload</div>
          <pre class="dr-debug-code-box">${networkReq.requestBodyPreview ? this.escapeHtml(this.prettyJsonOrRaw(networkReq.requestBodyPreview)) : 'No request body sent'}</pre>
        </div>
      `

      // Response Headers
      const resHeaders = networkReq.responseHeaders || {}
      const hasResHeaders = Object.keys(resHeaders).length > 0
      body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Response Headers</div>
          <pre class="dr-debug-code-box">${hasResHeaders ? this.escapeHtml(JSON.stringify(resHeaders, null, 2)) : 'None recorded'}</pre>
        </div>
      `

      // Response Body / Server Error
      body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Response Body / Error Payload</div>
          <pre class="dr-debug-code-box error-highlight">${networkReq.responseBodyPreview ? this.escapeHtml(this.prettyJsonOrRaw(networkReq.responseBodyPreview)) : (networkReq.error ? this.escapeHtml(networkReq.error) : 'Empty response body')}</pre>
        </div>
      `
    } else if (consoleErr) {
      body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Error Message</div>
          <pre class="dr-debug-code-box error-highlight">${this.escapeHtml(consoleErr.message)}</pre>
        </div>
      `

      // Demangled Call Frames visualizer
      if (consoleErr.parsedStack && consoleErr.parsedStack.length > 0) {
        let framesHtml = '<div class="dr-debug-frame-list">'
        consoleErr.parsedStack.forEach((frame) => {
          const fn = frame.filename || 'unknown'
          const isUserCode = !fn.includes('node_modules') && !fn.includes('chrome-extension')
          const tagClass = isUserCode ? 'tag-user' : 'tag-vendor'
          const tagLabel = isUserCode ? 'App Code' : 'Vendor'
          framesHtml += `
            <div class="dr-debug-frame-item ${isUserCode ? 'user-code' : ''}">
              <div>
                <span class="dr-debug-frame-fn">${this.escapeHtml(frame.functionName || '<anonymous>')}</span>
                <div class="dr-debug-frame-loc">${this.escapeHtml(fn)}:${frame.lineno || 0}:${frame.colno || 0}</div>
              </div>
              <span class="dr-debug-frame-tag ${tagClass}">${tagLabel}</span>
            </div>
          `
        })
        framesHtml += '</div>'

        body.innerHTML += `
          <div class="dr-debug-insp-section">
            <div class="dr-debug-insp-sec-title">Demangled Call Frames</div>
            ${framesHtml}
          </div>
        `
      } else if (consoleErr.stack) {
        body.innerHTML += `
          <div class="dr-debug-insp-section">
            <div class="dr-debug-insp-sec-title">Call Stack Trace</div>
            <pre class="dr-debug-code-box">${this.escapeHtml(consoleErr.stack)}</pre>
          </div>
        `
      }
    } else if (dockerLog) {
      body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Container Log Entry</div>
          <pre class="dr-debug-code-box error-highlight">${this.escapeHtml(dockerLog.message)}</pre>
        </div>
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Container Metadata</div>
          <pre class="dr-debug-code-box">Container: ${this.escapeHtml(dockerLog.containerName)}\nStream: ${dockerLog.stream}\nLevel: ${dockerLog.level}\nTimestamp: ${new Date(dockerLog.timestamp).toISOString()}</pre>
        </div>
      `
    } else if (isMem) {
      body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Heap Memory Telemetry</div>
          <pre class="dr-debug-code-box">${this.escapeHtml(JSON.stringify(state.memory, null, 2))}</pre>
        </div>
      `
    }

    this.inspectorContainer.appendChild(inspHeader)
    this.inspectorContainer.appendChild(actionToolbar)
    this.inspectorContainer.appendChild(body)
  }

  private prettyJsonOrRaw(content: string): string {
    try {
      const parsed = JSON.parse(content)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return content
    }
  }

  private formatTimeAgo(timestamp: number): string {
    const deltaMs = Date.now() - timestamp
    if (deltaMs < 1000) return 'Just now'
    if (deltaMs < 60_000) return `${Math.round(deltaMs / 1000)}s ago`
    if (deltaMs < 3600_000) return `${Math.round(deltaMs / 60_000)}m ago`
    return new Date(timestamp).toLocaleTimeString()
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }
}
