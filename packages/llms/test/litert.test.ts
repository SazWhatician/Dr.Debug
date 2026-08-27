import { describe, expect, it } from 'vitest'
import { LiteRTClient } from '../src/index.js'
import type { ChatMessage, ToolDefinition } from '../src/types.js'

describe('LiteRTClient (On-Device Inference)', () => {
  it('formats prompt template with start/end of turn tags and tool instructions', () => {
    const client = new LiteRTClient({
      modelName: 'gemma-2b-it',
      device: 'webgpu'
    })

    const messages: ChatMessage[] = [
      { role: 'system', content: 'You are Dr. Debug.' },
      { role: 'user', content: 'Why did fetch fail?' }
    ]

    const tools: ToolDefinition[] = [
      {
        type: 'function',
        function: {
          name: 'inspect_request',
          description: 'Inspect HTTP request',
          parameters: { type: 'object', properties: { requestIndex: { type: 'number' } } }
        }
      }
    ]

    const prompt = client.formatPrompt(messages, tools)

    expect(prompt).toContain('<start_of_turn>system')
    expect(prompt).toContain('You are Dr. Debug.')
    expect(prompt).toContain('inspect_request')
    expect(prompt).toContain('<tool_call>')
    expect(prompt).toContain('<start_of_turn>user\nWhy did fetch fail?<end_of_turn>')
    expect(prompt).toContain('<start_of_turn>model\n')
  })

  it('parses <tool_call> tags correctly from model output', () => {
    const client = new LiteRTClient()
    const output = `I should inspect the failed network request.
<tool_call>
{"name": "inspect_request", "arguments": {"requestIndex": 0}}
</tool_call>`

    const parsed = client.parseResponse(output)

    expect(parsed.toolCalls).toBeDefined()
    expect(parsed.toolCalls?.length).toBe(1)
    expect(parsed.toolCalls?.[0].function.name).toBe('inspect_request')
    expect(JSON.parse(parsed.toolCalls?.[0].function.arguments || '{}')).toEqual({ requestIndex: 0 })
    expect(parsed.finishReason).toBe('tool_calls')
  })

  it('executes chat using custom LiteRTEngine mock', async () => {
    const mockEngine = {
      generate: async (prompt: string) => {
        if (prompt.includes('Why is checkout slow?')) {
          return '<tool_call>{"name": "inspect_error", "arguments": {"errorIndex": 1}}</tool_call>'
        }
        return 'All metrics nominal.'
      }
    }

    const client = new LiteRTClient({ engine: mockEngine })
    const response = await client.chat([{ role: 'user', content: 'Why is checkout slow?' }])

    expect(response.toolCalls?.[0].function.name).toBe('inspect_error')
  })
})
