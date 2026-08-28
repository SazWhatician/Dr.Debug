import type { ChatMessage, ILLMClient, LLMConfig, LLMResponse, ToolDefinition } from './types.js';
export declare class OpenAIClient implements ILLMClient {
    private apiKey;
    private baseURL;
    private model;
    private temperature;
    private maxTokens;
    private headers;
    constructor(config: LLMConfig);
    chat(messages: ChatMessage[], tools?: ToolDefinition[], signal?: AbortSignal): Promise<LLMResponse>;
}
//# sourceMappingURL=OpenAIClient.d.ts.map