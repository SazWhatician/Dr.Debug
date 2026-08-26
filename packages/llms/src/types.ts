export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface ChatMessage {
  role: MessageRole
  content: string
  name?: string
  tool_call_id?: string
  tool_calls?: ToolCall[]
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolParameterSchema {
  type: 'object'
  properties: Record<string, any>
  required?: string[]
  additionalProperties?: boolean
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: ToolParameterSchema
  }
}

export interface LLMConfig {
  apiKey?: string
  baseURL?: string
  model: string
  temperature?: number
  maxTokens?: number
  headers?: Record<string, string>
}

export interface LLMResponse {
  content: string | null
  toolCalls?: ToolCall[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

export interface ILLMClient {
  chat(messages: ChatMessage[], tools?: ToolDefinition[], signal?: AbortSignal): Promise<LLMResponse>
}
