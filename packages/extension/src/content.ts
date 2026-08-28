import { DrDebug } from 'dr-debug'

export class ContentScriptBridge {
  private instance?: DrDebug

  public init(): void {
    if (typeof window === 'undefined') return
    if (this.instance) return

    // Inject in-page DrDebug instance with silent telemetry observation
    this.instance = new DrDebug({
      enableUI: false,
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
      })
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

