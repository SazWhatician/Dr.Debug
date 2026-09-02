import { newRequestId, REQ, RES } from './bridgeProtocol.js';
const DEFAULT_TIMEOUT_MS = 90_000;
/**
 * Runs the LLM call in the extension service worker rather than in the page.
 *
 * Three things this buys over calling the API from MAIN world:
 *  - the page's CSP `connect-src` cannot block it (verified: a MAIN-world fetch
 *    to the API is blocked outright under `connect-src 'self'`)
 *  - the API key never enters page JS, so page scripts cannot read it
 *  - the request does not go through the patched page `fetch`, so the agent's own
 *    API traffic stops polluting the telemetry it is diagnosing
 */
export class BridgeLLMClient {
    timeoutMs;
    constructor(options = {}) {
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    }
    async chat(messages, tools, signal) {
        return await this.call('LLM_CHAT', { messages, tools }, signal);
    }
    async testConnection() {
        try {
            return await this.call('TEST_CONNECTION', {});
        }
        catch (err) {
            return { success: false, message: err?.message || 'Bridge unreachable' };
        }
    }
    call(op, payload, signal) {
        if (typeof window === 'undefined') {
            return Promise.reject(new Error('BridgeLLMClient requires a window'));
        }
        const id = newRequestId();
        return new Promise((resolve, reject) => {
            let settled = false;
            const cleanup = () => {
                window.removeEventListener('message', onMessage);
                clearTimeout(timer);
                signal?.removeEventListener('abort', onAbort);
            };
            const finish = (fn) => {
                if (settled)
                    return;
                settled = true;
                cleanup();
                fn();
            };
            const onMessage = (event) => {
                // Only same-window messages from our own bridge, matching this request.
                if (event.source !== window)
                    return;
                const data = event.data;
                if (!data || data.source !== RES || data.id !== id)
                    return;
                finish(() => data.ok
                    ? resolve(data.result)
                    : reject(new Error(data.error || 'Bridge request failed')));
            };
            const onAbort = () => finish(() => reject(new DOMException('Aborted', 'AbortError')));
            const timer = setTimeout(() => finish(() => reject(new Error(`LLM bridge timed out after ${this.timeoutMs}ms. The service worker may be asleep — reload the page.`))), this.timeoutMs);
            window.addEventListener('message', onMessage);
            if (signal?.aborted)
                return onAbort();
            signal?.addEventListener('abort', onAbort);
            window.postMessage({ source: REQ, id, op, payload }, '*');
        });
    }
}
//# sourceMappingURL=BridgeLLMClient.js.map