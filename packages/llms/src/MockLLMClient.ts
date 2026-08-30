import type { ChatMessage, ILLMClient, LLMResponse, ToolDefinition } from './types.js'

export class MockLLMClient implements ILLMClient {
  private responses: LLMResponse[] = []
  private customHandler?: (messages: ChatMessage[], tools?: ToolDefinition[]) => Promise<LLMResponse> | LLMResponse
  public callHistory: Array<{ messages: ChatMessage[]; tools?: ToolDefinition[] }> = []

  constructor(
    responsesOrOptions?: LLMResponse[] | { responses?: LLMResponse[]; customHandler?: (messages: ChatMessage[], tools?: ToolDefinition[]) => Promise<LLMResponse> | LLMResponse },
    customHandler?: (messages: ChatMessage[], tools?: ToolDefinition[]) => Promise<LLMResponse> | LLMResponse
  ) {
    if (Array.isArray(responsesOrOptions)) {
      this.responses = [...responsesOrOptions]
      this.customHandler = customHandler
    } else if (responsesOrOptions && typeof responsesOrOptions === 'object') {
      if (responsesOrOptions.responses && Array.isArray(responsesOrOptions.responses)) {
        this.responses = [...responsesOrOptions.responses]
      }
      this.customHandler = responsesOrOptions.customHandler || customHandler
    }
  }

  public enqueue(response: LLMResponse): void {
    this.responses.push(response)
  }

  public setHandler(handler: (messages: ChatMessage[], tools?: ToolDefinition[]) => Promise<LLMResponse> | LLMResponse): void {
    this.customHandler = handler
  }

  public async chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    _signal?: AbortSignal
  ): Promise<LLMResponse> {
    this.callHistory.push({ messages: [...messages], tools: tools ? [...tools] : undefined })

    if (this.customHandler) {
      return await this.customHandler(messages, tools)
    }

    if (this.responses.length > 0) {
      return this.responses.shift()!
    }

    return {
      content: 'Mock response: No more queued responses.',
      finishReason: 'stop'
    }
  }

  public clear(): void {
    this.responses = []
    this.callHistory = []
    this.customHandler = undefined
  }
}
