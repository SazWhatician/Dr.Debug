import type { ChatMessage, ILLMClient, LiteRTConfig, LLMResponse, ToolDefinition } from './types.js';
export declare class LiteRTClient implements ILLMClient {
    private modelPath;
    private modelName;
    private device;
    private temperature;
    private maxTokens;
    private engine?;
    private isInitialized;
    constructor(config?: LiteRTConfig);
    init(): Promise<void>;
    chat(messages: ChatMessage[], tools?: ToolDefinition[], signal?: AbortSignal): Promise<LLMResponse>;
    formatPrompt(messages: ChatMessage[], tools?: ToolDefinition[]): string;
    parseResponse(text: string): LLMResponse;
    private fallbackInference;
}
//# sourceMappingURL=LiteRTClient.d.ts.map