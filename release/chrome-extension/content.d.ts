import { DrDebug } from 'dr-debug';
/**
 * MAIN-world content script: the interceptors need to patch the page's own
 * `console` and `fetch`, which is only possible from here. MAIN world has no
 * `chrome.*`, so settings and LLM calls go through the ISOLATED bridge.
 */
export declare class ContentScriptBridge {
    private instance?;
    private llmClient;
    init(): void;
    private requestSettings;
    /**
     * Decides whether to route through the worker-backed LLM or stay on the
     * offline engine, based on whether a key is actually saved.
     */
    private applySettings;
    private listenForPushes;
    private bootInstance;
    getInstance(): DrDebug | undefined;
    destroy(): void;
}
//# sourceMappingURL=content.d.ts.map