import type { NetworkRecord } from '../types.js'

export class NetworkInterceptor {
  private records: NetworkRecord[] = []
  private maxRecords: number
  private isInstalled = false
  private originalFetch?: typeof globalThis.fetch
  private originalXHROpen?: typeof XMLHttpRequest.prototype.open
  private originalXHRSend?: typeof XMLHttpRequest.prototype.send
  private originalXHRSetRequestHeader?: typeof XMLHttpRequest.prototype.setRequestHeader

  constructor(maxRecords = 100) {
    this.maxRecords = maxRecords
  }

  public init(): void {
    if (this.isInstalled) return

    // 1. Hook globalThis.fetch / window.fetch
    const fetchTarget = typeof window !== 'undefined' && typeof window.fetch === 'function'
      ? window.fetch
      : typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
        ? globalThis.fetch
        : undefined

    if (fetchTarget) {
      this.originalFetch = fetchTarget
      const self = this
      const originalFetch = this.originalFetch

      const wrappedFetch = async function (this: any, ...args: Parameters<typeof fetch>): Promise<Response> {
        const startTime = Date.now()
        const perfStart = typeof performance !== 'undefined' ? performance.now() : startTime

        let url = ''
        let method = 'GET'
        let headers: Record<string, string> | undefined
        let bodyPreview: string | undefined

        try {
          const parsed = self.parseFetchArgs(args)
          url = parsed.url
          method = parsed.method
          headers = parsed.headers
          bodyPreview = parsed.bodyPreview
        } catch {
          // Guard against parameter inspection errors
        }

        // Bypass recording for Dr. Debug's internal AI inference and local daemon traffic
        if (self.isInternalTelemetryRequest(url, headers)) {
          return originalFetch.apply(this, args)
        }

        const record: NetworkRecord = {
          id: `req_${startTime}_${Math.random().toString(36).substring(2, 7)}`,
          method,
          url,
          startTime,
          requestHeaders: headers,
          requestBodyPreview: bodyPreview
        }

        try {
          self.pushRecord(record)
        } catch {
          // Protect telemetry recording
        }

        try {
          const response = await originalFetch.apply(this || globalThis, args)
          const duration = typeof performance !== 'undefined'
            ? Math.round(performance.now() - perfStart)
            : Date.now() - startTime
          record.endTime = Date.now()
          record.duration = duration
          record.status = response.status
          record.statusText = response.statusText
          record.isFailed = response.status >= 400
          record.isSlow = duration > 1500

          try {
            const resHeaders: Record<string, string> = {}
            response.headers?.forEach((val, key) => {
              resHeaders[key] = val
            })
            record.responseHeaders = resHeaders
          } catch {
            // Ignore header iteration failure
          }

          // Safe, non-destructive body inspection (strictly skip streams, SSE, opaque, or consumed bodies)
          if (
            response &&
            response.type !== 'opaque' &&
            !response.bodyUsed &&
            typeof response.clone === 'function'
          ) {
            const contentType = (response.headers?.get('content-type') || '').toLowerCase()
            const isStreaming =
              contentType.includes('event-stream') ||
              contentType.includes('stream') ||
              contentType.includes('multipart/') ||
              contentType.includes('octet-stream')

            if (!isStreaming && (contentType.includes('application/json') || contentType.includes('text/'))) {
              self.extractResponseBody(response, record)
            }
          }

          return response
        } catch (err: any) {
          const duration = typeof performance !== 'undefined'
            ? Math.round(performance.now() - perfStart)
            : Date.now() - startTime
          record.endTime = Date.now()
          record.duration = duration
          record.status = 0
          record.statusText = err?.message || 'NetworkError'
          record.isFailed = true
          const failureKind = self.classifyFailure(err, record.url)
          record.isCORS = failureKind.isCORS
          record.isCrossOrigin = failureKind.isCrossOrigin
          record.error = err?.message || 'Fetch failed'
          throw err
        }
      }

      if (typeof window !== 'undefined' && window.fetch) {
        try {
          window.fetch = wrappedFetch as any
        } catch {
          // Ignore
        }
      }
      if (typeof globalThis !== 'undefined' && globalThis.fetch && globalThis !== (typeof window !== 'undefined' ? window : null)) {
        try {
          globalThis.fetch = wrappedFetch as any
        } catch {
          // Ignore
        }
      }
    }

    // 2. Hook XMLHttpRequest
    if (typeof XMLHttpRequest !== 'undefined') {
      this.hookXHR()
    }

    this.isInstalled = true
  }

  private parseFetchArgs(args: Parameters<typeof fetch>): {
    url: string
    method: string
    headers?: Record<string, string>
    bodyPreview?: string
  } {
    let url = ''
    let method = 'GET'
    let headers: Record<string, string> | undefined
    let bodyPreview: string | undefined

    const [input, init] = args

    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.toString()
    } else if (typeof input === 'object' && input !== null && 'url' in input) {
      url = (input as Request).url
      method = (input as Request).method || 'GET'
      if ((input as Request).headers && !init?.headers) {
        try {
          headers = this.normalizeHeaders((input as Request).headers)
        } catch {
          // Ignore header parsing error
        }
      }
    }

    if (init) {
      if (init.method) method = init.method.toUpperCase()
      if (init.headers) {
        try {
          headers = this.normalizeHeaders(init.headers)
        } catch {
          // Ignore
        }
      }
      if (init.body) {
        bodyPreview = this.serializeBody(init.body)
      }
    }

    return { url, method, headers, bodyPreview }
  }

  private normalizeHeaders(headers: HeadersInit): Record<string, string> {
    const result: Record<string, string> = {}
    if (headers instanceof Headers) {
      headers.forEach((v, k) => {
        result[k] = v
      })
    } else if (Array.isArray(headers)) {
      headers.forEach(([k, v]) => {
        result[k] = v
      })
    } else if (typeof headers === 'object' && headers !== null) {
      Object.assign(result, headers)
    }
    return result
  }

  private serializeBody(body: any): string | undefined {
    if (!body) return undefined
    if (typeof body === 'string') return body.slice(0, 1024)
    if (body instanceof URLSearchParams) return body.toString().slice(0, 1024)
    try {
      return JSON.stringify(body).slice(0, 1024)
    } catch {
      return `[${typeof body} Object]`
    }
  }

  private async extractResponseBody(response: Response, record: NetworkRecord): Promise<void> {
    try {
      if (response.bodyUsed) return
      const clone = response.clone()
      const text = await clone.text()
      record.responseBodyPreview = text.slice(0, 2048)
    } catch {
      // Clone stream could not be read; ignore safely
    }
  }

  /**
   * A failed cross-origin fetch surfaces to JS as an opaque "Failed to fetch",
   * which covers a missing CORS header, a refused connection, DNS failure and a
   * TLS error equally. So `isCORS` is only asserted when the error text actually
   * says so; the weaker `isCrossOrigin` records "cross-origin and opaque" without
   * claiming to know which of those it was.
   */
  private classifyFailure(err: any, url: string): { isCORS: boolean; isCrossOrigin: boolean } {
    const msg = (err?.message || '').toLowerCase()
    const isOpaque =
      msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed')
    const namesCORS = msg.includes('cors') || msg.includes('cross-origin')

    let crossOrigin = false
    if (typeof window !== 'undefined' && window.location) {
      try {
        crossOrigin = new URL(url, window.location.href).origin !== window.location.origin
      } catch {
        crossOrigin = true
      }
    }

    return {
      isCORS: namesCORS,
      isCrossOrigin: crossOrigin && (isOpaque || namesCORS)
    }
  }

  private hookXHR(): void {
    const self = this
    const proto = XMLHttpRequest.prototype

    this.originalXHROpen = proto.open
    this.originalXHRSend = proto.send
    this.originalXHRSetRequestHeader = proto.setRequestHeader

    const xhrStateMap = new WeakMap<
      XMLHttpRequest,
      {
        record: NetworkRecord
        perfStart: number
        requestHeaders: Record<string, string>
      }
    >()

    proto.open = function (this: XMLHttpRequest, ...args: any[]) {
      try {
        const method = (args[0] || 'GET').toUpperCase()
        const url = String(args[1] || '')

        if (self.isInternalTelemetryRequest(url)) {
          return self.originalXHROpen!.apply(this, args as any)
        }

        const startTime = Date.now()

        const record: NetworkRecord = {
          id: `xhr_${startTime}_${Math.random().toString(36).substring(2, 7)}`,
          method,
          url,
          startTime
        }

        xhrStateMap.set(this, {
          record,
          perfStart: typeof performance !== 'undefined' ? performance.now() : startTime,
          requestHeaders: {}
        })

        self.pushRecord(record)
      } catch {
        // Safe telemetry capture
      }

      return self.originalXHROpen!.apply(this, arguments as any)
    }

    proto.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
      try {
        const state = xhrStateMap.get(this)
        if (state) {
          state.requestHeaders[name] = value
          state.record.requestHeaders = state.requestHeaders
        }
      } catch {
        // Safe telemetry capture
      }

      return self.originalXHRSetRequestHeader!.apply(this, arguments as any)
    }

    proto.send = function (this: XMLHttpRequest, body?: any) {
      try {
        const state = xhrStateMap.get(this)
        if (state) {
          state.perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now()
          if (body) {
            state.record.requestBodyPreview = self.serializeBody(body)
          }

          this.addEventListener('loadend', () => {
            try {
              const duration = typeof performance !== 'undefined'
                ? Math.round(performance.now() - state.perfStart)
                : Date.now() - state.record.startTime
              state.record.endTime = Date.now()
              state.record.duration = duration
              state.record.status = this.status
              state.record.statusText = this.statusText
              state.record.isFailed = this.status === 0 || this.status >= 400
              state.record.isSlow = duration > 1500
              if (this.status === 0) {
                const xhrFailure = self.classifyFailure(new Error('XHR Network Error'), state.record.url)
                state.record.isCORS = xhrFailure.isCORS
                state.record.isCrossOrigin = xhrFailure.isCrossOrigin
              }

              if (this.responseType === '' || this.responseType === 'text') {
                state.record.responseBodyPreview = (this.responseText || '').slice(0, 2048)
              } else if (this.responseType === 'json' && this.response) {
                try {
                  state.record.responseBodyPreview = typeof this.response === 'string'
                    ? this.response.slice(0, 2048)
                    : JSON.stringify(this.response).slice(0, 2048)
                } catch {
                  state.record.responseBodyPreview = '[JSON Response]'
                }
              }
            } catch {
              // Ignore any loadend telemetry error safely
            }
          })
        }
      } catch {
        // Safe telemetry capture
      }

      return self.originalXHRSend!.apply(this, arguments as any)
    }
  }

  private pushRecord(record: NetworkRecord): void {
    this.records.push(record)
    if (this.records.length > this.maxRecords) {
      this.records.shift()
    }
  }

  public getRecords(): NetworkRecord[] {
    return [...this.records]
  }

  public getFailed(): NetworkRecord[] {
    return this.records.filter((r) => r.isFailed)
  }

  public getSlow(): NetworkRecord[] {
    return this.records.filter((r) => r.isSlow)
  }

  public clear(): void {
    this.records = []
  }

  public destroy(): void {
    if (!this.isInstalled) return

    if (this.originalFetch) {
      if (typeof window !== 'undefined') {
        try {
          window.fetch = this.originalFetch
        } catch {
          // Ignore
        }
      }
      if (typeof globalThis !== 'undefined') {
        try {
          globalThis.fetch = this.originalFetch
        } catch {
          // Ignore
        }
      }
    }

    if (typeof XMLHttpRequest !== 'undefined') {
      if (this.originalXHROpen) XMLHttpRequest.prototype.open = this.originalXHROpen
      if (this.originalXHRSend) XMLHttpRequest.prototype.send = this.originalXHRSend
      if (this.originalXHRSetRequestHeader) {
        XMLHttpRequest.prototype.setRequestHeader = this.originalXHRSetRequestHeader
      }
    }

    this.isInstalled = false
  }

  private isInternalTelemetryRequest(url: string, headers?: Record<string, string>): boolean {
    if (headers) {
      const isInternalHeader = Object.entries(headers).some(
        ([k, v]) => k.toLowerCase() === 'x-dr-debug-internal' && v === 'true'
      )
      if (isInternalHeader) return true
    }
    if (!url) return false
    return (
      url.includes(':9229/docker') ||
      url.includes(':9229/mcp') ||
      url.includes(':9229/telemetry')
    )
  }
}
