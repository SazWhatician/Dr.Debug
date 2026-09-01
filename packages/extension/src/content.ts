import { DrDebug } from 'dr-debug'
import { BridgeLLMClient } from './BridgeLLMClient.js'
import { type BridgePush, newRequestId, PUSH, REQ, RES } from './bridgeProtocol.js'

/**
 * MAIN-world content script: the interceptors need to patch the page's own
 * `console` and `fetch`, which is only possible from here. MAIN world has no
 * `chrome.*`, so settings and LLM calls go through the ISOLATED bridge.
 */
export class ContentScriptBridge {
  private instance?: DrDebug
  private llmClient = new BridgeLLMClient()

  public init(): void {
    if (typeof window === 'undefined' || this.instance) return

    this.listenForPushes()

    // Boot immediately so telemetry capture starts at document_start; the LLM
    // client works regardless of whether a key is saved yet, because the worker
    // resolves credentials per request.
    this.bootInstance()

    void this.applySettings()
  }

  private async requestSettings(): Promise<Record<string, any>> {
    return new Promise((resolve) => {
      const id = newRequestId()
      const timer = setTimeout(() => {
        window.removeEventListener('message', onMessage)
        resolve({})
      }, 1200)

      const onMessage = (event: MessageEvent) => {
        if (event.source !== window) return
        const data = event.data
        if (!data || data.source !== RES || data.id !== id) return
        clearTimeout(timer)
        window.removeEventListener('message', onMessage)
        resolve(data.ok ? data.result || {} : {})
      }

      window.addEventListener('message', onMessage)
      window.postMessage({ source: REQ, id, op: 'GET_SETTINGS' }, '*')
    })
  }

  /**
   * Decides whether to route through the worker-backed LLM or stay on the
   * offline engine, based on whether a key is actually saved.
   */
  private async applySettings(attempt = 0): Promise<void> {
    const settings = await this.requestSettings()
    if (!this.instance) return

    if (settings.hasApiKey) {
      this.instance.updateLLMConfig({ llmClient: this.llmClient })
      return
    }

    // This script and the ISOLATED bridge both load at document_start with no
    // guaranteed order, and the service worker may still be waking, so the first
    // ask can go unanswered. Retry briefly rather than silently staying offline.
    if (attempt < 4) {
      setTimeout(() => void this.applySettings(attempt + 1), 400 * (attempt + 1))
    }
  }

  private listenForPushes(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return
      const data = event.data as BridgePush | undefined
      if (!data || data.source !== PUSH) return

      switch (data.event) {
        case 'TOGGLE_UI':
          this.instance?.getUI()?.toggleCockpit()
          break
        case 'INVESTIGATE':
          this.instance?.getUI()?.openCockpit()
          void this.instance?.investigate(data.payload?.goal)
          break
        case 'SETTINGS_CHANGED':
          void this.applySettings()
          break
      }
    })
  }

  private bootInstance(): void {
    if (this.instance) return
    // No apiKey passed: with none saved, DrDebug falls back to its offline
    // engine, and applySettings() upgrades it to the bridge client if a key
    // exists. Either way the key stays out of this world.
    this.instance = new DrDebug({ enableUI: true })
    ;(window as any).__DR_DEBUG__ = this.instance
  }

  public getInstance(): DrDebug | undefined {
    return this.instance
  }

  public destroy(): void {
    this.instance?.destroy()
    this.instance = undefined
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!(window as any).__DR_DEBUG_BRIDGE__) {
    const bridge = new ContentScriptBridge()
    bridge.init()
    ;(window as any).__DR_DEBUG_BRIDGE__ = bridge
  }
}
