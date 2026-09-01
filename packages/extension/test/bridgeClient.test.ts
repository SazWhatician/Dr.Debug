import { describe, expect, it, vi } from 'vitest'
import { BridgeLLMClient } from '../src/BridgeLLMClient.js'
import { REQ, RES } from '../src/bridgeProtocol.js'

/**
 * Stands in for the ISOLATED bridge: answers requests posted by the client.
 *
 * Replies are dispatched with `source: window` explicitly, because the client
 * only trusts same-window messages (a real page can receive messages from
 * iframes and other origins) and happy-dom's `postMessage` leaves `source` null.
 */
function reply(data: any): void {
  window.dispatchEvent(new MessageEvent('message', { data, source: window as any }))
}

function fakeBridge(handler: (req: any) => any | Promise<any>): () => void {
  const onMessage = async (event: MessageEvent) => {
    const data = event.data
    if (!data || data.source !== REQ) return
    const res = await handler(data)
    if (res === undefined) return // simulate a bridge that never answers
    reply({ source: RES, id: data.id, ...res })
  }
  window.addEventListener('message', onMessage)
  return () => window.removeEventListener('message', onMessage)
}

describe('BridgeLLMClient', () => {
  it('sends the chat payload and resolves with the worker result', async () => {
    const captured: any[] = []
    const stop = fakeBridge((req) => {
      captured.push(req)
      return { ok: true, result: { content: 'hello', finishReason: 'stop' } }
    })

    const client = new BridgeLLMClient()
    const res = await client.chat(
      [{ role: 'user', content: 'diagnose' }],
      [{ type: 'function', function: { name: 'inspect_error', description: 'x', parameters: { type: 'object', properties: {} } } }]
    )

    expect(res.content).toBe('hello')
    expect(captured).toHaveLength(1)
    expect(captured[0].op).toBe('LLM_CHAT')
    expect(captured[0].payload.messages[0].content).toBe('diagnose')
    expect(captured[0].payload.tools).toHaveLength(1)
    stop()
  })

  it('rejects with the worker error message', async () => {
    const stop = fakeBridge(() => ({ ok: false, error: 'No API key saved.' }))
    const client = new BridgeLLMClient()

    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toThrow('No API key saved.')
    stop()
  })

  it('ignores responses belonging to another request', async () => {
    // A stale reply with a mismatched id must not settle this call.
    const stop = fakeBridge((req) => {
      reply({ source: RES, id: 'someone-elses-id', ok: true, result: { content: 'WRONG' } })
      return { ok: true, result: { content: 'RIGHT' } }
    })

    const client = new BridgeLLMClient()
    const res = await client.chat([{ role: 'user', content: 'x' }])

    expect(res.content).toBe('RIGHT')
    stop()
  })

  it('times out when the bridge never answers', async () => {
    const stop = fakeBridge(() => undefined)
    const client = new BridgeLLMClient({ timeoutMs: 60 })

    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/timed out/i)
    stop()
  })

  it('honours an abort signal', async () => {
    const stop = fakeBridge(() => undefined)
    const controller = new AbortController()
    const client = new BridgeLLMClient({ timeoutMs: 5000 })

    const pending = client.chat([{ role: 'user', content: 'x' }], undefined, controller.signal)
    controller.abort()

    await expect(pending).rejects.toThrow(/abort/i)
    stop()
  })

  it('rejects immediately if the signal is already aborted', async () => {
    const stop = fakeBridge(() => ({ ok: true, result: { content: 'should not arrive' } }))
    const client = new BridgeLLMClient()

    await expect(
      client.chat([{ role: 'user', content: 'x' }], undefined, AbortSignal.abort())
    ).rejects.toThrow(/abort/i)
    stop()
  })

  it('does not leak listeners across calls', async () => {
    const stop = fakeBridge(() => ({ ok: true, result: { content: 'ok' } }))
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')

    const client = new BridgeLLMClient()
    await client.chat([{ role: 'user', content: 'a' }])
    await client.chat([{ role: 'user', content: 'b' }])

    // one add + one remove per call
    expect(add.mock.calls.filter((c) => c[0] === 'message')).toHaveLength(2)
    expect(remove.mock.calls.filter((c) => c[0] === 'message')).toHaveLength(2)

    add.mockRestore()
    remove.mockRestore()
    stop()
  })
})
