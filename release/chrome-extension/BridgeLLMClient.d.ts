import type { ChatMessage, ILLMClient, LLMResponse, ToolDefinition } from '@dr-debug/llms';
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
export declare class BridgeLLMClient implements ILLMClient {
    private timeoutMs;
    constructor(options?: {
        timeoutMs?: number;
    });
    chat(messages: ChatMessage[], tools?: ToolDefinition[], signal?: AbortSignal): Promise<LLMResponse>;
    testConnection(): Promise<{
        success: boolean;
        message: string;
    }>;
    private call;
}
//# sourceMappingURL=BridgeLLMClient.d.ts.map