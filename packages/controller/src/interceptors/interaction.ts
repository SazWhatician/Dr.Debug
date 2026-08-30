import type { InteractionEvent } from '../types.js'

export class InteractionInterceptor {
  private events: InteractionEvent[] = []
  private maxAgeMs: number
  private isInitialized = false
  private listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = []
  private mutationObserver?: MutationObserver

  private static readonly PII_PATTERNS = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{3}-\d{2}-\d{4}\b/g // SSN
  ]

  constructor(maxAgeMs = 30_000) {
    this.maxAgeMs = maxAgeMs
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined' || typeof document === 'undefined') return
    this.isInitialized = true

    this.listen(document, 'click', this.handleClick.bind(this), true)
    this.listen(document, 'input', this.handleInput.bind(this), true)
    this.listen(document, 'scroll', this.handleScroll.bind(this), true)
    this.listen(window, 'popstate', this.handleNavigation.bind(this))
    this.listen(window, 'hashchange', this.handleNavigation.bind(this))

    // Observe major DOM mutations
    if (typeof MutationObserver !== 'undefined') {
      this.mutationObserver = new MutationObserver((mutations) => {
        const added = mutations.reduce((sum, m) => sum + m.addedNodes.length, 0)
        const removed = mutations.reduce((sum, m) => sum + m.removedNodes.length, 0)
        if (added + removed > 3) {
          this.push({ type: 'dom_mutation', timestamp: Date.now(), detail: `+${added} -${removed} nodes` })
        }
      })
      this.mutationObserver.observe(document.body || document.documentElement, { childList: true, subtree: true })
    }
  }

  private listen(target: EventTarget, type: string, handler: EventListener, capture = false): void {
    target.addEventListener(type, handler, capture)
    this.listeners.push({ target, type, handler })
  }

  private handleClick(e: Event): void {
    const el = e.target as HTMLElement
    if (!el) return
    const selector = this.getSelector(el)
    const text = el.textContent?.trim().slice(0, 40) || ''
    this.push({ type: 'click', timestamp: Date.now(), target: selector, detail: text ? `"${text}"` : '' })
  }

  private handleInput(e: Event): void {
    const el = e.target as HTMLInputElement
    if (!el) return
    const selector = this.getSelector(el)
    const isSensitive = el.type === 'password' || el.hasAttribute('data-private') || el.autocomplete === 'cc-number'
    const value = isSensitive ? '[REDACTED]' : this.maskPII(el.value?.slice(0, 30) || '')
    this.push({ type: 'input', timestamp: Date.now(), target: selector, detail: `value="${value}"` })
  }

  private handleScroll(_e: Event): void {
    const now = Date.now()
    const lastScroll = this.events.filter(e => e.type === 'scroll').pop()
    if (lastScroll && now - lastScroll.timestamp < 500) return // Debounce
    const y = typeof window !== 'undefined' ? Math.round(window.scrollY) : 0
    this.push({ type: 'scroll', timestamp: now, detail: `scrollY=${y}` })
  }

  private handleNavigation(): void {
    this.push({ type: 'navigation', timestamp: Date.now(), detail: typeof window !== 'undefined' ? window.location.href : '' })
  }

  private getSelector(el: HTMLElement): string {
    if (el.id) return `#${el.id}`
    const tag = el.tagName?.toLowerCase() || 'element'
    const cls = el.className && typeof el.className === 'string' ? `.${el.className.split(/\s+/).slice(0, 2).join('.')}` : ''
    return `${tag}${cls}`
  }

  private maskPII(value: string): string {
    let masked = value
    for (const pattern of InteractionInterceptor.PII_PATTERNS) {
      masked = masked.replace(pattern, '[PII_REDACTED]')
    }
    return masked
  }

  private push(event: InteractionEvent): void {
    this.events.push(event)
    this.evictOld()
  }

  private evictOld(): void {
    const cutoff = Date.now() - this.maxAgeMs
    while (this.events.length > 0 && this.events[0].timestamp < cutoff) {
      this.events.shift()
    }
  }

  public getReplaySequence(): InteractionEvent[] {
    this.evictOld()
    return [...this.events]
  }

  public getHumanReadableReplay(): string {
    const events = this.getReplaySequence()
    if (events.length === 0) return 'No user interactions recorded in the last 30 seconds.'
    return events.map((e, i) => {
      const ago = ((Date.now() - e.timestamp) / 1000).toFixed(1)
      const target = e.target ? ` on ${e.target}` : ''
      return `${i + 1}. [${ago}s ago] ${e.type}${target} ${e.detail || ''}`
    }).join('\n')
  }

  public clear(): void {
    this.events = []
  }

  public destroy(): void {
    for (const { target, type, handler } of this.listeners) {
      target.removeEventListener(type, handler, true)
    }
    this.listeners = []
    this.mutationObserver?.disconnect()
    this.events = []
    this.isInitialized = false
  }
}
