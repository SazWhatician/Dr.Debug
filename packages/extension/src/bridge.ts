declare const chrome: any

import {
  type BridgePush,
  type BridgeRequest,
  PUSH,
  REQ,
  RES
} from './bridgeProtocol.js'

/**
 * ISOLATED-world content script. Runs alongside the MAIN-world script on every
 * page and is the only half with access to `chrome.storage` / `chrome.runtime`.
 * It relays page requests to the service worker and pushes popup commands back
 * down to the page.
 */

function respond(id: string, ok: boolean, result?: any, error?: string): void {
  window.postMessage({ source: RES, id, ok, result, error }, '*')
}

function push(event: BridgePush['event'], payload?: any): void {
  window.postMessage({ source: PUSH, event, payload }, '*')
}

function askWorker(type: string, payload?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response: any) => {
      const err = chrome.runtime.lastError
      if (err) return reject(new Error(err.message))
      resolve(response)
    })
  })
}

// ── Page -> worker ───────────────────────────────────────────────────────────
window.addEventListener('message', async (event: MessageEvent) => {
  if (event.source !== window) return
  const msg = event.data as BridgeRequest | undefined
  if (!msg || msg.source !== REQ || !msg.id) return

  try {
    switch (msg.op) {
      case 'GET_SETTINGS': {
        const settings = await askWorker('DR_DEBUG_GET_SETTINGS')
        // The key is deliberately withheld: MAIN world never needs it, since the
        // worker performs the API call itself.
        const { apiKey, ...safe } = settings || {}
        respond(msg.id, true, { ...safe, hasApiKey: Boolean(apiKey) })
        break
      }

      case 'LLM_CHAT': {
        const res = await askWorker('DR_DEBUG_LLM_CHAT', msg.payload)
        if (res?.error) respond(msg.id, false, undefined, res.error)
        else respond(msg.id, true, res?.result)
        break
      }

      case 'TEST_CONNECTION': {
        const res = await askWorker('DR_DEBUG_TEST_CONNECTION')
        respond(msg.id, true, res?.result)
        break
      }

      default:
        respond(msg.id, false, undefined, `Unknown bridge op: ${msg.op}`)
    }
  } catch (err: any) {
    respond(msg.id, false, undefined, err?.message || 'Bridge failure')
  }
})

// ── Popup/worker -> page ─────────────────────────────────────────────────────
if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
    switch (message?.type) {
      case 'DR_DEBUG_TOGGLE_UI':
        push('TOGGLE_UI')
        sendResponse({ status: 'forwarded' })
        break
      case 'DR_DEBUG_TRIGGER_INVESTIGATION':
        push('INVESTIGATE', { goal: message.goal })
        sendResponse({ status: 'forwarded' })
        break
      case 'DR_DEBUG_UPDATE_SETTINGS':
        push('SETTINGS_CHANGED', message.settings)
        sendResponse({ status: 'forwarded' })
        break
      default:
        return false
    }
    return false
  })
}

// Settings edited in the popup land in storage; mirror them to the page live.
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes: any, area: string) => {
    if (area !== 'local') return
    const changed = Object.keys(changes)
    if (changed.some((k) => ['apiKey', 'baseURL', 'model', 'provider', 'enableUI'].includes(k))) {
      push('SETTINGS_CHANGED')
    }
  })
}
