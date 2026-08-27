export interface ExtensionMessage {
  type: string
  payload?: any
  tabId?: number
}

export class BackgroundWorker {
  private tabPorts: Map<number, any> = new Map()

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
