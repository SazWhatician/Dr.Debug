import { describe, expect, it } from 'vitest'
import { MockLLMClient, OpenAIClient } from '../src/index.js'

describe('LLM Adapters', () => {
  it('MockLLMClient queues responses and returns them in order', async () => {
    const mock = new MockLLMClient([
      { content: 'First response', finishReason: 'stop' },
      { content: 'Second response', finishReason: 'stop' }
    ])

    const res1 = await mock.chat([{ role: 'user', content: 'Hello' }])
    expect(res1.content).toBe('First response')

    const res2 = await mock.chat([{ role: 'user', content: 'World' }])
    expect(res2.content).toBe('Second response')

    expect(mock.callHistory.length).toBe(2)
  })

  it('MockLLMClient supports custom dynamic handlers', async () => {
    const mock = new MockLLMClient([], (messages) => {
      const last = messages[messages.length - 1]
      return {
        content: `Echo: ${last.content}`,
        finishReason: 'stop'
      }
    })

    const res = await mock.chat([{ role: 'user', content: 'Testing dynamic handler' }])
    expect(res.content).toBe('Echo: Testing dynamic handler')
  })

  it('OpenAIClient initializes with custom baseURL and model', () => {
    const client = new OpenAIClient({
      apiKey: 'test-key',
      baseURL: 'https://custom.api.io/v1',
      model: 'claude-3-5-sonnet'
    })

    expect(client).toBeDefined()
  })
})
