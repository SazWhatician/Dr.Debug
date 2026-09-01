"use strict";
(() => {
  // packages/extension/src/bridgeProtocol.ts
  var REQ = "DR_DEBUG_BRIDGE_REQ";
  var RES = "DR_DEBUG_BRIDGE_RES";
  var PUSH = "DR_DEBUG_BRIDGE_PUSH";

  // packages/extension/src/bridge.ts
  function respond(id, ok, result, error) {
    window.postMessage({ source: RES, id, ok, result, error }, "*");
  }
  function push(event, payload) {
    window.postMessage({ source: PUSH, event, payload }, "*");
  }
  function askWorker(type, payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, payload }, (response) => {
        const err = chrome.runtime.lastError;
        if (err) return reject(new Error(err.message));
        resolve(response);
      });
    });
  }
  window.addEventListener("message", async (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.source !== REQ || !msg.id) return;
    try {
      switch (msg.op) {
        case "GET_SETTINGS": {
          const settings = await askWorker("DR_DEBUG_GET_SETTINGS");
          const { apiKey, ...safe } = settings || {};
          respond(msg.id, true, { ...safe, hasApiKey: Boolean(apiKey) });
          break;
        }
        case "LLM_CHAT": {
          const res = await askWorker("DR_DEBUG_LLM_CHAT", msg.payload);
          if (res?.error) respond(msg.id, false, void 0, res.error);
          else respond(msg.id, true, res?.result);
          break;
        }
        case "TEST_CONNECTION": {
          const res = await askWorker("DR_DEBUG_TEST_CONNECTION");
          respond(msg.id, true, res?.result);
          break;
        }
        default:
          respond(msg.id, false, void 0, `Unknown bridge op: ${msg.op}`);
      }
    } catch (err) {
      respond(msg.id, false, void 0, err?.message || "Bridge failure");
    }
  });
  if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      switch (message?.type) {
        case "DR_DEBUG_TOGGLE_UI":
          push("TOGGLE_UI");
          sendResponse({ status: "forwarded" });
          break;
        case "DR_DEBUG_TRIGGER_INVESTIGATION":
          push("INVESTIGATE", { goal: message.goal });
          sendResponse({ status: "forwarded" });
          break;
        case "DR_DEBUG_UPDATE_SETTINGS":
          push("SETTINGS_CHANGED", message.settings);
          sendResponse({ status: "forwarded" });
          break;
        default:
          return false;
      }
      return false;
    });
  }
  if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const changed = Object.keys(changes);
      if (changed.some((k) => ["apiKey", "baseURL", "model", "provider", "enableUI"].includes(k))) {
        push("SETTINGS_CHANGED");
      }
    });
  }
})();
