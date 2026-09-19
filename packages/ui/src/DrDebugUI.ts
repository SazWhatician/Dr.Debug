import type { DebugController } from '@dr-debug/controller'
import { generatePonytailDebugPrompt, generateSessionDebugPrompt, LocalDiagnosticEngine } from '@dr-debug/core'
import { AudioChimes } from './components/AudioChimes.js'
import { CockpitPanel, type CockpitTabKey, type PrescriptionData, type StepItem } from './components/CockpitPanel.js'
import { IncidentExporter } from './components/IncidentExporter.js'
import { StethoscopeInspector } from './components/StethoscopeInspector.js'
import type { DrDebugTheme } from './components/SettingsModal.js'
import type { CausalErrorGraph } from './components/CausalGraphView.js'
import { FloatingPill } from './components/FloatingPill.js'
import { shadowStyles } from './styles.js'

export interface DrDebugUIOptions {
  onInvestigate?: (query: string) => Promise<void> | void
  container?: HTMLElement
  getController?: () => DebugController | undefined
  /** Supplies the paste-ready brief for the "Copy for AI" action. */
  getSessionPrompt?: () => string
  onSaveSettings?: (settings: any) => void
  onTestConnection?: (settings: any) => Promise<{ success: boolean; message: string }>
}

export class DrDebugUI {
  private host: HTMLElement
  private shadowRoot: ShadowRoot
  private pill: FloatingPill
  private cockpit: CockpitPanel
  private audioChimes: AudioChimes
  private incidentExporter: IncidentExporter
  private stethoscope: StethoscopeInspector
  private getController?: () => DebugController | undefined
  private engine = new LocalDiagnosticEngine()
  private container?: HTMLElement
  private observer?: MutationObserver
  private rootObserver?: MutationObserver
  private observedTarget?: Node
  private observedBody?: HTMLElement | null
  private navigationListeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = []
  private watchdogTimer?: any
  private originalPushState?: typeof history.pushState
  private originalReplaceState?: typeof history.replaceState
  private isDestroyed = false

  constructor(options: DrDebugUIOptions = {}) {
    this.getController = options.getController
    this.audioChimes = new AudioChimes()
    this.incidentExporter = new IncidentExporter()
    this.stethoscope = new StethoscopeInspector({
      onElementInspected: (info) => {
        this.cockpit.openCustomQuery(`Inspect component: <${info.tagName}${info.id ? '#' + info.id : ''}>`)
        this.openCockpit()
      }
    })

    // Check if #dr-debug-root already exists
    let host = document.getElementById('dr-debug-root') as HTMLElement | null
    if (!host) {
      host = document.createElement('div')
      host.id = 'dr-debug-root'
    }
    this.host = host
    this.applyHostStyles()

    this.attachHostToDOM(options.container)

    this.shadowRoot = host.shadowRoot || host.attachShadow({ mode: 'open' })
    while (this.shadowRoot.firstChild) {
      this.shadowRoot.removeChild(this.shadowRoot.firstChild)
    }

    // Inject Isolated Styles using Constructable Stylesheets (CSP-compliant) or fallback
    let stylesInjected = false
    if (typeof CSSStyleSheet !== 'undefined' && 'adoptedStyleSheets' in Document.prototype) {
      try {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(shadowStyles)
        this.shadowRoot.adoptedStyleSheets = [sheet]
        stylesInjected = true
      } catch {
        // Fallback to style element
      }
    }
    if (!stylesInjected) {
      const styleEl = document.createElement('style')
      styleEl.textContent = shadowStyles
      this.shadowRoot.appendChild(styleEl)
    }

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
          await this.runLocalInvestigation()
        }
      },
      getController: options.getController,
      getSessionPrompt: options.getSessionPrompt || (() => this.buildSessionPrompt()),
      onSaveSettings: options.onSaveSettings,
      onTestConnection: options.onTestConnection,
      onThemeChange: (theme) => this.pill?.setTheme(theme),
      audioChimes: this.audioChimes,
      stethoscopeInspector: this.stethoscope,
      incidentExporter: this.incidentExporter,
      onRecenterPill: () => this.pill?.recenter()
    })

    // Floating Pill
    this.pill = new FloatingPill(() => {
      this.cockpit.toggle()
    }, this.audioChimes)
    this.pill.setTheme(this.cockpit.getTheme())

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
    errors: Array<string | any>
    slowRequests: Array<string | any>
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

  public updateDocker(): void {
    this.cockpit.updateDocker()
  }

  public switchTab(tab: CockpitTabKey): void {
    this.cockpit.switchTab(tab)
  }

  public showTabInfo(tab: CockpitTabKey): void {
    this.cockpit.showTabInfo(tab)
  }

  public hideTabInfo(): void {
    this.cockpit.hideTabInfo()
  }

  public toggleTabInfo(tab: CockpitTabKey): void {
    this.cockpit.toggleTabInfo(tab)
  }

  public isTabInfoVisible(): boolean {
    return this.cockpit.isTabInfoVisible()
  }

  public getActiveTabInfo(): CockpitTabKey | null {
    return this.cockpit.getActiveTabInfo()
  }

  public setTheme(theme: DrDebugTheme): void {
    this.cockpit.setTheme(theme)
    this.pill.setTheme(theme)
  }

  public getTheme(): DrDebugTheme {
    return this.cockpit.getTheme()
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

  public updateSettings(settings: any): void {
    this.cockpit.updateSettings(settings)
    if (settings?.errorChime) {
      this.audioChimes.setErrorChimeProfile(settings.errorChime)
    }
  }

  public toggleStethoscope(): boolean {
    return this.stethoscope.toggle()
  }

  public exportIncidentBundle(): void {
    this.cockpit.exportIncidentBundle()
  }

  public async copyGitHubIssue(): Promise<boolean> {
    return this.cockpit.copyGitHubIssue()
  }

  public toggleSound(): boolean {
    return this.audioChimes.toggleSound()
  }

  public getAudioChimes(): AudioChimes {
    return this.audioChimes
  }

  public getStethoscopeInspector(): StethoscopeInspector {
    return this.stethoscope
  }

  public getIncidentExporter(): IncidentExporter {
    return this.incidentExporter
  }

  public getPill(): FloatingPill {
    return this.pill
  }

  public getCockpit(): CockpitPanel {
    return this.cockpit
  }

  /**
   * Smoothly recenters the floating pill to the default bottom-right position,
   * uncollapses it, and clears saved coordinate overrides.
   */
  public recenterPill(): void {
    this.pill.recenter()
  }

  /**
   * Resets the Cockpit panel dimensions to defaults and clears saved dimensions.
   */
  public resetCockpitSize(): void {
    this.cockpit.resetSize()
  }

  private buildSessionPrompt(): string {
    const controller = this.getController?.()
    if (!controller) {
      return 'No debug controller is attached to this UI, so there is no telemetry to export.'
    }
    return generatePonytailDebugPrompt(controller.getSnapshot())
  }

  /**
   * Fallback path when no LLM-backed investigator is wired in: runs the local
   * deterministic engine over live telemetry and renders its real findings.
   * Nothing here is scripted — with empty buffers it reports an empty session.
   */
  private async runLocalInvestigation(): Promise<void> {
    const controller = this.getController?.()

    this.cockpit.clearTimeline()
    this.cockpit.switchTab('timeline')

    if (!controller) {
      this.cockpit.addStep({
        stepNumber: 1,
        hypothesis:
          'No DebugController is attached to this UI instance, so there is no telemetry to read. Attach one via the getController option.',
        toolName: 'triage',
        toolOutput: 'No telemetry source available.'
      })
      this.cockpit.setBusy(false)
      return
    }

    this.updatePillStatus(0, 0, 0, true)
    this.cockpit.showThinking('Reading the console, network, backend, memory and performance buffers…')

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
    await wait(420)

    const state = controller.getSnapshot()
    const analysis = this.engine.analyze(state)

    // Step 1 — always real: what the buffers actually contain.
    this.cockpit.addStep({
      stepNumber: 1,
      hypothesis: `Triaging the raw buffers before forming a theory: ${state.console.errorCount} console error(s), ${state.network.failedCount} failed and ${state.network.slowCount} slow request(s), ${state.docker?.errorCount ?? 0} backend error(s).`,
      toolName: 'triage_telemetry',
      toolOutput: [
        `Page:      ${state.pageContext.url || 'unknown'}`,
        `Uptime:    ${state.pageContext.uptimeSeconds.toFixed(1)}s`,
        `Console:   ${state.console.errorCount} error(s), ${state.console.warnCount} warning(s) of ${state.console.total} entries`,
        `Network:   ${state.network.failedCount} failed, ${state.network.slowCount} slow of ${state.network.total} requests`,
        `Backend:   ${state.docker?.errorCount ?? 0} container error(s)`,
        state.memory?.heapUsagePercent !== undefined
          ? `Heap:      ${Math.round((state.memory.usedJSHeapSize || 0) / 1048576)}MB (${Math.round(state.memory.heapUsagePercent)}% of limit)`
          : 'Heap:      not exposed by this browser',
        `Findings:  ${analysis.findings.length} derived`
      ].join('\n')
    })

    if (!analysis.hasEvidence) {
      await wait(360)
      this.cockpit.showThinking('')
      this.showPrescription({
        diagnosis: analysis.diagnosis,
        rootCause: analysis.rootCause,
        fix: '',
        confidence: 0,
        filesToModify: []
      })
      this.updatePillStatus(0, 0, 0, false)
      return
    }

    // One step per real finding, highest severity first.
    const shown = analysis.findings.slice(0, 5)
    for (let i = 0; i < shown.length; i++) {
      const finding = shown[i]
      this.cockpit.showThinking(
        `Examining the ${finding.layer} layer — ${finding.title} (${finding.severity}, ${Math.round(finding.confidence * 100)}% confidence).`
      )
      await wait(560)
      this.cockpit.addStep({
        stepNumber: i + 2,
        hypothesis: `${finding.title}. ${finding.detail}`,
        toolName: `inspect_${finding.layer}`,
        toolOutput: [
          ...finding.evidence.map((line) => `• ${line}`),
          finding.files.length > 0 ? `\nSource: ${finding.files.join(', ')}` : '',
          `\nDirection: ${finding.remediation}`
        ]
          .filter(Boolean)
          .join('\n')
      })
    }

    // Correlation step only when the graph actually produced edges.
    if (analysis.causalChain.length > 0) {
      this.cockpit.showThinking(
        `Correlating ${state.causalGraph?.nodes.length ?? 0} error nodes across layers to separate causes from symptoms…`
      )
      await wait(560)
      this.cockpit.addStep({
        stepNumber: shown.length + 2,
        hypothesis: `The correlation engine linked these faults by timestamp. If the chain holds, only the root needs fixing — the rest are downstream effects.`,
        toolName: 'graphify_errors',
        toolOutput: analysis.causalChain.join('\n')
      })
    }

    this.cockpit.showThinking('Composing the remediation plan from the gathered evidence…')
    await wait(420)
    this.cockpit.showThinking('')

    this.showPrescription({
      diagnosis: analysis.diagnosis,
      rootCause: analysis.rootCause,
      fix: analysis.suggestedFix,
      confidence: analysis.confidence,
      filesToModify: analysis.filesToModify
    })

    this.updatePillStatus(
      state.console.errorCount,
      state.network.failedCount,
      state.network.slowCount,
      false
    )
  }

  private applyHostStyles(): void {
    if (!this.host) return
    this.host.style.setProperty('position', 'fixed', 'important')
    this.host.style.setProperty('inset', 'auto', 'important')
    this.host.style.setProperty('height', '0', 'important')
    this.host.style.setProperty('width', '0', 'important')
    this.host.style.setProperty('z-index', '2147483647', 'important')
    this.host.style.setProperty('pointer-events', 'none', 'important')
    this.host.style.setProperty('display', 'block', 'important')
    this.host.style.setProperty('visibility', 'visible', 'important')
    this.host.style.setProperty('opacity', '1', 'important')
    this.host.style.setProperty('border', 'none', 'important')
    this.host.style.setProperty('margin', '0', 'important')
    this.host.style.setProperty('padding', '0', 'important')
    this.host.style.setProperty('transform', 'none', 'important')
    this.host.style.setProperty('filter', 'none', 'important')
    this.host.style.setProperty('clip', 'auto', 'important')
  }

  private attachHostToDOM(customContainer?: HTMLElement): void {
    if (typeof document === 'undefined') return
    this.container = customContainer
    this.ensureHostAttached()
    this.setupMountListeners()
    this.setupObserver()
  }

  public ensureHostAttached(): void {
    if (typeof document === 'undefined' || this.isDestroyed) return

    // If a custom container was passed but has unmounted/detached, gracefully fallback to document.body
    let target: HTMLElement | null = null
    if (this.container && document.contains(this.container)) {
      target = this.container
    } else if (document.body) {
      target = document.body
    } else if (document.documentElement) {
      target = document.documentElement
    }

    if (!target) return

    this.applyHostStyles()

    if (!document.contains(this.host)) {
      try {
        target.appendChild(this.host)
      } catch {
        // Target might be transitioning or busy
      }
    } else if (document.body && this.host.parentElement === document.documentElement && (!this.container || !document.contains(this.container))) {
      // Once document.body is parsed or replaced, relocate from <html> to <body>
      try {
        document.body.appendChild(this.host)
      } catch {
        // Fallback
      }
    }

    // Refresh observers if document.body changed (e.g. Turbo/PJAX body replacement)
    if (document.body !== this.observedBody) {
      this.setupObserver()
    }
  }

  private setupMountListeners(): void {
    if (typeof document === 'undefined') return
    const onReady = () => {
      this.ensureHostAttached()
      this.setupObserver()
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady, { once: true })
      document.addEventListener('readystatechange', () => {
        if (document.readyState === 'interactive' || document.readyState === 'complete') {
          onReady()
        }
      })
      if (typeof window !== 'undefined') {
        window.addEventListener('load', onReady, { once: true })
      }
    }

    // SPA Navigation & Route Lifecycle Events
    if (typeof window !== 'undefined') {
      const scheduleAttach = () => {
        this.ensureHostAttached()
        if (typeof requestAnimationFrame !== 'undefined') {
          requestAnimationFrame(() => this.ensureHostAttached())
        }
        setTimeout(() => this.ensureHostAttached(), 50)
      }

      const addNavListener = (target: EventTarget, type: string) => {
        const handler = () => scheduleAttach()
        try {
          target.addEventListener(type, handler, { passive: true } as any)
          this.navigationListeners.push({ target, type, handler })
        } catch {
          // EventTarget might not support options
        }
      }

      addNavListener(window, 'popstate')
      addNavListener(window, 'hashchange')
      addNavListener(window, 'pageshow')

      // Framework-specific SPA route and layout transition events
      const spaEvents = [
        'turbo:load',
        'turbo:render',
        'turbo:frame-load',
        'astro:page-load',
        'next:route-change-complete',
        'page:load'
      ]
      spaEvents.forEach(evt => {
        if (typeof document !== 'undefined') addNavListener(document, evt)
        addNavListener(window, evt)
      })

      // Monkey-patch history.pushState & history.replaceState for seamless SPA client navigation
      this.patchHistoryMethods(scheduleAttach)

      // Watchdog heartbeat: verifies host DOM presence periodically (every 800ms)
      this.watchdogTimer = setInterval(() => {
        if (this.isDestroyed) return
        if (!document.contains(this.host) || (document.body && this.host.parentElement === document.documentElement && (!this.container || !document.contains(this.container)))) {
          this.ensureHostAttached()
        }
      }, 800)
    }
  }

  private patchHistoryMethods(onNavigate: () => void): void {
    if (typeof window === 'undefined' || typeof history === 'undefined') return

    try {
      const origPush = history.pushState
      const origReplace = history.replaceState

      this.originalPushState = origPush
      this.originalReplaceState = origReplace

      const self = this
      history.pushState = function (this: History, data: any, unused: string, url?: string | URL | null) {
        const res = origPush.call(this, data, unused, url)
        try {
          onNavigate()
        } catch {}
        return res
      }

      history.replaceState = function (this: History, data: any, unused: string, url?: string | URL | null) {
        const res = origReplace.call(this, data, unused, url)
        try {
          onNavigate()
        } catch {}
        return res
      }
    } catch {
      // History object may be frozen or restricted
    }
  }

  private setupObserver(): void {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return

    const target = (this.container && document.contains(this.container))
      ? this.container
      : (document.body || document.documentElement)

    if (!target) return

    this.observedBody = document.body || null

    if (this.observer) {
      this.observer.disconnect()
      this.observer = undefined
    }
    if (this.rootObserver) {
      this.rootObserver.disconnect()
      this.rootObserver = undefined
    }

    const onMutation = () => {
      if (this.isDestroyed) return
      if (!document.contains(this.host) || (document.body && this.host.parentElement === document.documentElement && (!this.container || !document.contains(this.container)))) {
        this.ensureHostAttached()
      }
    }

    try {
      // 1. Observe target with subtree to catch any container wipe or re-render
      this.observer = new MutationObserver(onMutation)
      this.observer.observe(target, { childList: true, subtree: true })
      this.observedTarget = target

      // 2. Observe document.documentElement for root-level changes (e.g. body replacements)
      if (document.documentElement && target !== document.documentElement) {
        this.rootObserver = new MutationObserver(() => {
          if (document.body !== this.observedBody) {
            this.ensureHostAttached()
            this.setupObserver()
          } else {
            onMutation()
          }
        })
        this.rootObserver.observe(document.documentElement, { childList: true })
      }
    } catch {
      // MutationObserver fallback
    }
  }

  public destroy(): void {
    this.isDestroyed = true
    this.stethoscope.destroy()
    this.audioChimes.destroy()

    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer)
      this.watchdogTimer = undefined
    }

    if (this.observer) {
      this.observer.disconnect()
      this.observer = undefined
    }
    if (this.rootObserver) {
      this.rootObserver.disconnect()
      this.rootObserver = undefined
    }
    this.observedTarget = undefined
    this.observedBody = undefined

    // Remove navigation listeners
    for (const { target, type, handler } of this.navigationListeners) {
      try {
        target.removeEventListener(type, handler)
      } catch {}
    }
    this.navigationListeners = []

    // Restore original history methods
    if (typeof history !== 'undefined') {
      if (this.originalPushState) {
        try { history.pushState = this.originalPushState } catch {}
      }
      if (this.originalReplaceState) {
        try { history.replaceState = this.originalReplaceState } catch {}
      }
    }

    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host)
    }
  }
}
