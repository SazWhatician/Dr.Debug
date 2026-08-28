import type { ChatMessage, ILLMClient, LLMResponse, ToolDefinition } from './types.js';
export declare class MockLLMClient implements ILLMClient {
    private responses;
    private customHandler?;
    callHistory: Array<{
        messages: ChatMessage[];
        tools?: ToolDefinition[];
    }>;
    constructor(responses?: LLMResponse[], customHandler?: (messages: ChatMessage[], tools?: ToolDefinition[]) => Promise<LLMResponse> | LLMResponse);
    enqueue(response: LLMResponse): void;
    setHandler(handler: (messages: ChatMessage[], tools?: ToolDefinition[]) => Promise<LLMResponse> | LLMResponse): void;
    chat(messages: ChatMessage[], tools?: ToolDefinition[], _signal?: AbortSignal): Promise<LLMResponse>;
    clear(): void;
}
//# sourceMappingURL=MockLLMClient.d.ts.map