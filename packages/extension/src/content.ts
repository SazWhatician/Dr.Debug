declare const chrome: any

import { DrDebug } from 'dr-debug'


export class ContentScriptBridge {
  private instance?: DrDebug

  public init(): void {
    if (typeof window === 'undefined') return
    if (this.instance) return

    // Load user settings from chrome.storage or fallback to localStorage
    const defaultOptions: Record<string, any> = {
      enableUI: true,
      autoInvestigate: false
    }

    const loadLocalFallback = (): Record<string, any> => {
      try {
        const raw = localStorage.getItem('dr_debug_settings')
        if (raw) {
          const parsed = JSON.parse(raw)
          return {
            enableUI: parsed.enableUI !== false,
            autoInvestigate: parsed.autoInvestigate === true,
            apiKey: parsed.apiKey,
            baseURL: parsed.baseURL,
            model: parsed.model
          }
        }
      } catch {
        // ignore
      }
      return defaultOptions
    }


    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['apiKey', 'baseURL', 'model', 'enableUI', 'autoInvestigate'], (settings: any) => {
        const localSettings = loadLocalFallback()
        const options = {
          enableUI: settings?.enableUI ?? localSettings.enableUI,
          autoInvestigate: settings?.autoInvestigate ?? localSettings.autoInvestigate,
          apiKey: settings?.apiKey || localSettings.apiKey,
          baseURL: settings?.baseURL || localSettings.baseURL,
          model: settings?.model || localSettings.model
        }
        this.bootInstance(options)
      })
    } else {
      this.bootInstance(loadLocalFallback())
    }

    // Listen for extension commands
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
        if (message.type === 'DR_DEBUG_TRIGGER_INVESTIGATION') {
          this.instance
            ?.investigate(message.goal)
            .then((result) => {
              sendResponse({ status: 'success', result })
            })
            .catch((err) => {
              sendResponse({ status: 'error', error: err.message })
            })
          return true
        }

        if (message.type === 'DR_DEBUG_GET_LIVE_TELEMETRY') {
          const controller = this.instance?.getController()
          sendResponse({
            snapshot: controller?.getSnapshot()
          })
          return false
        }

        if (message.type === 'DR_DEBUG_TOGGLE_UI') {
          const ui = this.instance?.getUI()
          if (ui) {
            ui.toggleCockpit()
            sendResponse({ status: 'success' })
          } else {
            sendResponse({ status: 'no_ui' })
          }
          return false
        }

        if (message.type === 'DR_DEBUG_UPDATE_SETTINGS') {
          if (message.settings) {
            if (this.instance) {
              this.instance.updateLLMConfig({
                apiKey: message.settings.apiKey,
                baseURL: message.settings.baseURL,
                model: message.settings.model
              })
            } else {
              this.bootInstance({
                enableUI: message.settings.enableUI !== false,
                autoInvestigate: message.settings.autoInvestigate === true,
                apiKey: message.settings.apiKey,
                baseURL: message.settings.baseURL,
                model: message.settings.model
              })
            }
            sendResponse({ status: 'updated' })
          }
          return false
        }
      })
    }

  }

  private bootInstance(options: any): void {
    if (this.instance) return
    this.instance = new DrDebug(options)
    if (typeof window !== 'undefined') {
      ;(window as any).__DR_DEBUG__ = this.instance
    }
  }

  public getInstance(): DrDebug | undefined {
    return this.instance
  }

  public destroy(): void {
    this.instance?.destroy()
    this.instance = undefined
  }
}

// Auto-bootstrap in webpage
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (!(window as any).__DR_DEBUG_BRIDGE__) {
    const bridge = new ContentScriptBridge()
    bridge.init()
    ;(window as any).__DR_DEBUG_BRIDGE__ = bridge
    ;(window as any).__DR_DEBUG__ = bridge.getInstance()
  }
}

