// packages/extension/src/background.ts
var BackgroundWorker = class {
  tabPorts = /* @__PURE__ */ new Map();
  handleMessage(message, sender, sendResponse) {
    const tabId = sender.tab?.id || message.tabId;
    switch (message.type) {
      case "DR_DEBUG_CONNECT_TAB":
        if (tabId) {
          this.tabPorts.set(tabId, sender);
          sendResponse({ status: "connected", tabId });
        }
        break;
      case "DR_DEBUG_SAVE_SETTINGS":
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.set(message.payload, () => {
            sendResponse({ status: "saved" });
          });
          return true;
        }
        sendResponse({ status: "saved_mock" });
        break;
      case "DR_DEBUG_GET_SETTINGS":
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get(null, (items) => {
            sendResponse(items);
          });
          return true;
        }
        sendResponse({});
        break;
      default:
        sendResponse({ status: "unhandled_type", type: message.type });
        break;
    }
    return false;
  }
};
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  const worker = new BackgroundWorker();
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return worker.handleMessage(message, sender, sendResponse);
  });
}
export {
  BackgroundWorker
};
