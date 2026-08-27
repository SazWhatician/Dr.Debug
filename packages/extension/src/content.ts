import { DrDebug } from 'dr-debug'

export class ContentScriptBridge {
  private instance?: DrDebug

  public init(): void {
    if (typeof window === 'undefined') return

    // Inject in-page DrDebug instance
    this.instance = new DrDebug({
      enableUI: true,
      autoInvestigate: false
    })

    // Listen for extension commands
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message: any, sender: any, sendResponse: any) => {
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
      })
    }
  }

  public getInstance(): DrDebug | undefined {
    return this.instance
  }

  public destroy(): void {
    this.instance?.destroy()
  }
}

// Auto-bootstrap in webpage
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const bridge = new ContentScriptBridge()
  bridge.init()
  ;(window as any).__DR_DEBUG_BRIDGE__ = bridge
  ;(window as any).__DR_DEBUG__ = bridge.getInstance()
  console.log('%c🩺 Dr. Debug Active', 'background: #06b6d4; color: #000; font-weight: bold; padding: 2px 8px; border-radius: 4px;', 'Monitoring Console, Network, DOM & Performance telemetry.')
}
