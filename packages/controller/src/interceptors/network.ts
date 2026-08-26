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
    const fetchTarget = typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
      ? globalThis.fetch
      : typeof window !== 'undefined' && typeof window.fetch === 'function'
        ? window.fetch
        : undefined

    if (fetchTarget) {
      this.originalFetch = fetchTarget
      const wrappedFetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
        const startTime = Date.now()
        const perfStart = typeof performance !== 'undefined' ? performance.now() : startTime
        const { url, method, headers, bodyPreview } = this.parseFetchArgs(args)

        const record: NetworkRecord = {
          id: `req_${startTime}_${Math.random().toString(36).substring(2, 7)}`,
          method,
          url,
          startTime,
          requestHeaders: headers,
          requestBodyPreview: bodyPreview
        }

        this.pushRecord(record)

        try {
          const response = await this.originalFetch!(...args)
          const duration = typeof performance !== 'undefined'
            ? Math.round(performance.now() - perfStart)
            : Date.now() - startTime
          record.endTime = Date.now()
          record.duration = duration
          record.status = response.status
          record.statusText = response.statusText
          record.isFailed = response.status >= 400
          record.isSlow = duration > 1500

          const resHeaders: Record<string, string> = {}
          try {
            response.headers?.forEach((val, key) => {
              resHeaders[key] = val
            })
          } catch {
            // Ignore header iteration failure
          }
          record.responseHeaders = resHeaders

          // Non-destructive body inspection
          if (typeof response.clone === 'function') {
            this.extractResponseBody(response.clone(), record)
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
          record.isCORS = this.detectCORSError(err, record.url)
          record.error = err?.message || 'Fetch failed'
          throw err
        }
      }

      if (typeof globalThis !== 'undefined') globalThis.fetch = wrappedFetch
      if (typeof window !== 'undefined') window.fetch = wrappedFetch
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
    }

    if (init) {
      if (init.method) method = init.method.toUpperCase()
      if (init.headers) {
        headers = this.normalizeHeaders(init.headers)
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

  private async extractResponseBody(responseClone: Response, record: NetworkRecord): Promise<void> {
    try {
      const contentType = responseClone.headers?.get('content-type') || ''
      if (contentType.includes('application/json') || contentType.includes('text/')) {
        const text = await responseClone.text()
        record.responseBodyPreview = text.slice(0, 2048)
      } else {
        record.responseBodyPreview = `[Binary / Stream content: ${contentType}]`
      }
    } catch {
      // Clone stream could not be read; ignore
    }
  }

  private detectCORSError(err: any, url: string): boolean {
    const msg = (err?.message || '').toLowerCase()
    if (msg.includes('cors') || msg.includes('failed to fetch') || msg.includes('networkerror')) {
      if (typeof window !== 'undefined' && window.location) {
        try {
          const targetOrigin = new URL(url, window.location.href).origin
          if (targetOrigin !== window.location.origin) {
            return true
          }
        } catch {
          return true
        }
      }
    }
    return false
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
      const method = (args[0] || 'GET').toUpperCase()
      const url = String(args[1] || '')
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
      return self.originalXHROpen!.apply(this, args as any)
    }

    proto.setRequestHeader = function (this: XMLHttpRequest, name: string, value: string) {
      const state = xhrStateMap.get(this)
      if (state) {
        state.requestHeaders[name] = value
        state.record.requestHeaders = state.requestHeaders
      }
      return self.originalXHRSetRequestHeader!.apply(this, [name, value])
    }

    proto.send = function (this: XMLHttpRequest, body?: any) {
      const state = xhrStateMap.get(this)
      if (state) {
        state.perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now()
        if (body) {
          state.record.requestBodyPreview = self.serializeBody(body)
        }

        this.addEventListener('loadend', () => {
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
            state.record.isCORS = self.detectCORSError(new Error('XHR Network Error'), state.record.url)
          }

          if (this.responseType === '' || this.responseType === 'text') {
            state.record.responseBodyPreview = (this.responseText || '').slice(0, 2048)
          } else if (this.responseType === 'json') {
            try {
              state.record.responseBodyPreview = JSON.stringify(this.response).slice(0, 2048)
            } catch {
              state.record.responseBodyPreview = '[JSON Response]'
            }
          }
        })
      }

      return self.originalXHRSend!.apply(this, [body])
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
      if (typeof globalThis !== 'undefined') globalThis.fetch = this.originalFetch
      if (typeof window !== 'undefined') window.fetch = this.originalFetch
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
}
