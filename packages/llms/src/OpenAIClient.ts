import type { ChatMessage, ILLMClient, LLMConfig, LLMResponse, ToolDefinition } from './types.js'

export class OpenAIClient implements ILLMClient {
  private apiKey: string
  private baseURL: string
  private model: string
  private temperature: number
  private maxTokens: number
  private headers: Record<string, string>

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey || ''
    this.baseURL = (config.baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '')
    this.model = config.model || 'gpt-4o'
    this.temperature = config.temperature ?? 0.1
    this.maxTokens = config.maxTokens ?? 2048
    this.headers = config.headers || {}
  }

  public async chat(
    messages: ChatMessage[],
    tools?: ToolDefinition[],
    signal?: AbortSignal
  ): Promise<LLMResponse> {
    const url = `${this.baseURL}/chat/completions`

    const body: Record<string, any> = {
      model: this.model,
      messages: messages.map((m) => {
        const msg: Record<string, any> = {
          role: m.role,
          content: m.content
        }
        if (m.name) msg.name = m.name
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
        if (m.tool_calls) msg.tool_calls = m.tool_calls
        return msg
      }),
      temperature: this.temperature,
      max_tokens: this.maxTokens
    }

    if (tools && tools.length > 0) {
      body.tools = tools
      body.tool_choice = 'auto'
    }

    let maxRetries = 3
    let delay = 1000

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          ...this.headers
        },
        body: JSON.stringify(body),
        signal
      })

      if (response.status === 429 && attempt < maxRetries) {
        let waitMs = delay
        try {
          const errJson = await response.clone().json()
          const match = errJson?.error?.message?.match(/try again in ([\d\.]+)s/)
          if (match) {
            waitMs = Math.ceil(parseFloat(match[1]) * 1000) + 200
          }
        } catch {
          // ignore
        }
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        delay *= 2
        continue
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      const choice = data.choices?.[0]

      return {
        content: choice?.message?.content ?? null,
        toolCalls: choice?.message?.tool_calls,
        usage: data.usage
          ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens
            }
          : undefined,
        finishReason: choice?.finish_reason
      }
    }

    throw new Error('OpenAI API request failed: Max retries exceeded')
  }
}
