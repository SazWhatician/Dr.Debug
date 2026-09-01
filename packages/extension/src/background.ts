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
  groq: { baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  openai: { baseURL: 'https://api.openai.com/v1', model: 'gpt-4o' }
}

export class BackgroundWorker {
  private tabPorts: Map<number, any> = new Map()

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
    const preset = PROVIDERS[settings.provider || 'groq'] || PROVIDERS.groq

    if (!settings.apiKey) {
      throw new Error('No API key saved. Open the Dr. Debug popup, paste your key and press Save.')
    }

    return new OpenAIClient({
      apiKey: settings.apiKey,
      baseURL: settings.baseURL || preset.baseURL,
      model: settings.model || preset.model
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
