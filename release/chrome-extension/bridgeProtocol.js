/**
 * Shared contract between the MAIN-world content script (interceptors + UI) and
 * the ISOLATED-world bridge (chrome.* APIs).
 *
 * The interceptors must run in MAIN world to patch the page's own `console` and
 * `fetch`. MAIN world has no `chrome.runtime` / `chrome.storage` at all, so
 * everything needing an extension API goes over `window.postMessage` to the
 * ISOLATED bridge, which relays to the service worker.
 */
export const REQ = 'DR_DEBUG_BRIDGE_REQ';
export const RES = 'DR_DEBUG_BRIDGE_RES';
/** Bridge -> page, unprompted (settings changed in the popup). */
export const PUSH = 'DR_DEBUG_BRIDGE_PUSH';
/** Requests are matched to responses by id; the worker may answer out of order. */
export function newRequestId() {
    return `br_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
//# sourceMappingURL=bridgeProtocol.js.map