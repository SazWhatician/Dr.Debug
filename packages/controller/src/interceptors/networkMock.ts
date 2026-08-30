import type { NetworkMockRule } from '../types.js'

export class NetworkMockInterceptor {
  private rules: Map<string, NetworkMockRule> = new Map()
  private originalFetch: typeof fetch | null = null
  private isInitialized = false

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined' || !window.fetch) return
    this.isInitialized = true
    this.originalFetch = window.fetch.bind(window)

    const self = this
    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const method = (init?.method || 'GET').toUpperCase()

      const matchedRule = self.matchRule(url, method)
      if (matchedRule && matchedRule.isActive) {
        const headers = new Headers(matchedRule.mockHeaders || { 'Content-Type': 'application/json' })
        return new Response(matchedRule.mockBody, {
          status: matchedRule.mockStatus,
          statusText: matchedRule.mockStatus === 200 ? 'OK (Dr. Debug Mocked)' : 'Mocked Response',
          headers
        })
      }

      if (self.originalFetch) {
        return self.originalFetch(input, init)
      }
      return new Response('Fetch unavailable', { status: 500 })
    }
  }

  public addRule(
    rule: Omit<NetworkMockRule, 'id' | 'isActive'> & { id?: string; isActive?: boolean }
  ): NetworkMockRule {
    const id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const fullRule: NetworkMockRule = {
      id,
      urlPattern: rule.urlPattern,
      method: rule.method ? rule.method.toUpperCase() : undefined,
      mockStatus: rule.mockStatus,
      mockBody: rule.mockBody,
      mockHeaders: rule.mockHeaders,
      isActive: rule.isActive !== false
    }
    this.rules.set(id, fullRule)
    return fullRule
  }

  public removeRule(id: string): boolean {
    return this.rules.delete(id)
  }

  public getRules(): NetworkMockRule[] {
    return Array.from(this.rules.values())
  }

  public toggleRule(id: string, active?: boolean): boolean {
    const rule = this.rules.get(id)
    if (!rule) return false
    rule.isActive = active !== undefined ? active : !rule.isActive
    return true
  }

  private matchRule(url: string, method: string): NetworkMockRule | undefined {
    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue
      if (rule.method && rule.method !== method) continue

      try {
        if (rule.urlPattern.startsWith('^') || rule.urlPattern.endsWith('$')) {
          const re = new RegExp(rule.urlPattern)
          if (re.test(url)) return rule
        } else if (url.includes(rule.urlPattern)) {
          return rule
        }
      } catch {
        if (url.includes(rule.urlPattern)) return rule
      }
    }
    return undefined
  }

  public clear(): void {
    this.rules.clear()
  }

  public destroy(): void {
    if (this.originalFetch && typeof window !== 'undefined') {
      window.fetch = this.originalFetch
      this.originalFetch = null
    }
    this.rules.clear()
    this.isInitialized = false
  }
}
