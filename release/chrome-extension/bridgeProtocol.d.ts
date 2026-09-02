/**
 * Shared contract between the MAIN-world content script (interceptors + UI) and
 * the ISOLATED-world bridge (chrome.* APIs).
 *
 * The interceptors must run in MAIN world to patch the page's own `console` and
 * `fetch`. MAIN world has no `chrome.runtime` / `chrome.storage` at all, so
 * everything needing an extension API goes over `window.postMessage` to the
 * ISOLATED bridge, which relays to the service worker.
 */
export declare const REQ = "DR_DEBUG_BRIDGE_REQ";
export declare const RES = "DR_DEBUG_BRIDGE_RES";
/** Bridge -> page, unprompted (settings changed in the popup). */
export declare const PUSH = "DR_DEBUG_BRIDGE_PUSH";
export type BridgeOp = 'GET_SETTINGS' | 'LLM_CHAT' | 'TEST_CONNECTION';
export interface BridgeRequest {
    source: typeof REQ;
    id: string;
    op: BridgeOp;
    payload?: any;
}
export interface BridgeResponse {
    source: typeof RES;
    id: string;
    ok: boolean;
    result?: any;
    error?: string;
}
export interface BridgePush {
    source: typeof PUSH;
    event: 'SETTINGS_CHANGED' | 'TOGGLE_UI' | 'INVESTIGATE';
    payload?: any;
}
/** Requests are matched to responses by id; the worker may answer out of order. */
export declare function newRequestId(): string;
//# sourceMappingURL=bridgeProtocol.d.ts.map