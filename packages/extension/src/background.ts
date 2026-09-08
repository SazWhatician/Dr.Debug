declare const chrome: any

import { OpenAIClient } from '@dr-debug/llms'

export interface ExtensionMessage {
  type: string
  payload?: any
  tabId?: number
}

interface StoredSettings {
  provider?: string
  apiKey?: string
  baseURL?: string
  model?: string
}

/** Base URL + default model per provider, so the popup only stores a choice. */
const PROVIDERS: Record<string, { baseURL: string; model: string }> = {
  groq: { baseURL: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-120b' },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' }
}

export class DockerStreamManager {
  private active = false
  private abortController: AbortController | null = null
  private retryTimer: any = null
  private port = 9229
  private containers: any[] = []
  private recentLogs: any[] = []
  private lastStatus: { connected: boolean; daemonRunning: boolean; error?: string } = {
    connected: false,
    daemonRunning: false
  }

  public start(): void {
    if (this.active) return
    this.active = true
    this.connect()
  }

  public stop(): void {
    this.active = false
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }
  }

  public getState() {
    return {
      type: 'INIT',
      status: this.lastStatus,
      containers: this.containers,
      recentLogs: this.recentLogs
    }
  }

  public async proxyFetch(endpoint: string, params?: any): Promise<any> {
    try {
      let url = `http://localhost:${this.port}${endpoint}`
      if (params && typeof params === 'object') {
        const sp = new URLSearchParams()
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null) sp.set(k, String(v))
        }
        const qs = sp.toString()
        if (qs) url += `?${qs}`
      }

      const res = await fetch(url)
      if (res.ok) {
        return await res.json()
      }
    } catch (err: any) {
      return { error: err?.message || 'Proxy fetch failed' }
    }
    return null
  }

  private async connect(): Promise<void> {
    if (!this.active) return
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = null
    }

    this.abortController = new AbortController()

    try {
      // 1. Probe daemon status
      const statusRes = await fetch(`http://localhost:${this.port}/docker/status`, {
        signal: AbortSignal.timeout(3000)
      }).catch(() => null)

      if (!statusRes || !statusRes.ok) {
        this.lastStatus = {
          connected: false,
          daemonRunning: false,
          error: 'Docker bridge service offline on port ' + this.port
        }
        this.broadcast({
          type: 'STATUS',
          connected: false,
          daemonRunning: false,
          error: this.lastStatus.error
        })
        this.scheduleRetry(4000)
        return
      }

      const statusData = await statusRes.json().catch(() => ({}))
      this.lastStatus = {
        connected: true,
        daemonRunning: statusData.daemonRunning ?? true
      }

      // 2. Open SSE stream
      const res = await fetch(`http://localhost:${this.port}/docker/stream`, {
        headers: { Accept: 'text/event-stream' },
        signal: this.abortController.signal
      })

      if (!res.ok || !res.body) {
        this.scheduleRetry(5000)
        return
      }

      this.broadcast({
        type: 'STATUS',
        connected: true,
        daemonRunning: this.lastStatus.daemonRunning
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (this.active) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim()
            try {
              const data = JSON.parse(jsonStr)
              if (data.type === 'INIT') {
                this.lastStatus = {
                  connected: true,
                  daemonRunning: data.status?.daemonRunning ?? true
                }
                this.containers = data.containers || []
                this.recentLogs = data.recentLogs || []
              } else if (data.type === 'CONTAINERS') {
                this.containers = data.containers || []
              } else if (data.type === 'LOG' && data.entry) {
                if (this.recentLogs.length >= 100) this.recentLogs.shift()
                this.recentLogs.push(data.entry)
              }
              this.broadcast(data)
            } catch {
              // keep-alive ping or parse ignore
            }
          }
        }
      }

      this.scheduleRetry(3000)
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      this.lastStatus = {
        connected: false,
        daemonRunning: false,
        error: err?.message || 'Disconnected from Docker daemon'
      }
      this.broadcast({
        type: 'STATUS',
        connected: false,
        daemonRunning: false,
        error: this.lastStatus.error
      })
      this.scheduleRetry(5000)
    }
  }

  private scheduleRetry(delayMs: number): void {
    if (!this.active || this.retryTimer) return
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null
      this.connect()
    }, delayMs)
  }

  private broadcast(data: any): void {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) return
    chrome.tabs.query({}, (tabs: any[]) => {
      if (chrome.runtime.lastError || !tabs) return
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'DR_DEBUG_DOCKER_EVENT', data }, () => {
            void chrome.runtime.lastError
          })
        }
      }
    })
  }
}

export class BackgroundWorker {
  private tabPorts: Map<number, any> = new Map()
  private dockerManager: DockerStreamManager

  constructor() {
    this.dockerManager = new DockerStreamManager()
    this.dockerManager.start()
  }

  private readSettings(): Promise<StoredSettings> {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return resolve({})
      chrome.storage.local.get(['provider', 'apiKey', 'baseURL', 'model'], (items: any) =>
        resolve(items || {})
      )
    })
  }

  /**
   * Builds the client here in the worker so the API key never crosses into page
   * context, and so the request is not subject to the page's CSP.
   */
  private async resolveClient(): Promise<OpenAIClient> {
    const settings = await this.readSettings()
    const isGroqKey = Boolean(settings.apiKey?.startsWith('gsk_'))
    const provider = isGroqKey && !settings.provider ? 'groq' : (settings.provider || 'groq')
    const preset = PROVIDERS[provider] || PROVIDERS.groq

    if (!settings.apiKey) {
      throw new Error('No API key saved. Open the Dr. Debug popup, paste your key and press Save.')
    }

    let model = settings.model || preset.model
    if (model === 'llama-3.3-70b-versatile') {
      model = 'openai/gpt-oss-120b'
    }

    return new OpenAIClient({
      apiKey: settings.apiKey,
      baseURL: settings.baseURL || preset.baseURL,
      model
    })
  }

  public handleMessage(
    message: ExtensionMessage,
    sender: { tab?: { id?: number } },
    sendResponse: (response?: any) => void
  ): boolean {
    const tabId = sender.tab?.id || message.tabId

    switch (message.type) {
      case 'DR_DEBUG_CONNECT_TAB':
        if (tabId) {
          this.tabPorts.set(tabId, sender)
          sendResponse({ status: 'connected', tabId })
        }
        break

      case 'DR_DEBUG_SAVE_SETTINGS':
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set(message.payload, () => {
            sendResponse({ status: 'saved' })
          })
          return true
        }
        sendResponse({ status: 'saved_mock' })
        break

      case 'DR_DEBUG_GET_SETTINGS':
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.get(null, (items: any) => {
            sendResponse(items)
          })
          return true
        }
        sendResponse({})
        break

      case 'DR_DEBUG_LLM_CHAT': {
        const { messages, tools } = message.payload || {}
        if (!Array.isArray(messages)) {
          sendResponse({ error: 'LLM_CHAT requires a messages array' })
          return false
        }
        this.resolveClient()
          .then((client) => client.chat(messages, tools))
          .then((result) => sendResponse({ result }))
          .catch((err: any) => sendResponse({ error: err?.message || 'LLM request failed' }))
        return true
      }

      case 'DR_DEBUG_TEST_CONNECTION':
        this.resolveClient()
          .then((client) => client.testConnection())
          .then((result) => sendResponse({ result }))
          .catch((err: any) =>
            sendResponse({ result: { success: false, message: err?.message || 'Failed' } })
          )
        return true

      case 'DR_DEBUG_GET_DOCKER_STATE':
        sendResponse(this.dockerManager.getState())
        return false

      case 'DR_DEBUG_DOCKER_FETCH': {
        const { endpoint, params } = message.payload || {}
        this.dockerManager
          .proxyFetch(endpoint || '/docker/status', params)
          .then((result) => sendResponse({ result }))
          .catch((err: any) => sendResponse({ error: err?.message || 'Docker fetch failed' }))
        return true
      }

      default:
        sendResponse({ status: 'unhandled_type', type: message.type })
        break
    }

    return false
  }
}

// Global bootstrap for Chromium service worker
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  const worker = new BackgroundWorker()
  chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
    return worker.handleMessage(message, sender, sendResponse)
  })
}
