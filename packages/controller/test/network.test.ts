import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NetworkInterceptor } from '../src/interceptors/network.js'

describe('NetworkInterceptor', () => {
  let interceptor: NetworkInterceptor
  let originalGlobalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalGlobalFetch = globalThis.fetch
  })

  afterEach(() => {
    if (interceptor) interceptor.destroy()
    globalThis.fetch = originalGlobalFetch
  })

  it('captures successful fetch requests with status and timing', async () => {
    const mockResponse = new Response(JSON.stringify({ user: 'DrDebug', status: 'active' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
    globalThis.fetch = async () => mockResponse

    interceptor = new NetworkInterceptor(5)
    interceptor.init()

    const res = await window.fetch('https://api.acme.io/v1/user', {
      method: 'GET',
      headers: { Authorization: 'Bearer token123' }
    })

    expect(res.status).toBe(200)

    const records = interceptor.getRecords()
    expect(records.length).toBe(1)
    expect(records[0].url).toBe('https://api.acme.io/v1/user')
    expect(records[0].method).toBe('GET')
    expect(records[0].status).toBe(200)
    expect(records[0].isFailed).toBe(false)
    expect(records[0].requestHeaders?.['Authorization']).toBe('Bearer token123')
    expect(records[0].responseBodyPreview).toContain('"user":"DrDebug"')
  })

  it('captures failed 500 HTTP responses', async () => {
    const errorResponse = new Response('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    })
    globalThis.fetch = async () => errorResponse

    interceptor = new NetworkInterceptor(5)
    interceptor.init()

    await window.fetch('https://api.acme.io/v1/checkout', { method: 'POST' })

    const failed = interceptor.getFailed()
    expect(failed.length).toBe(1)
    expect(failed[0].status).toBe(500)
    expect(failed[0].isFailed).toBe(true)
    expect(failed[0].responseBodyPreview).toContain('Internal Server Error')
  })

  it('tags network/CORS failures with status 0', async () => {
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch (CORS block)')
    }

    interceptor = new NetworkInterceptor(5)
    interceptor.init()

    await expect(
      window.fetch('https://api.external.com/metrics', { method: 'POST' })
    ).rejects.toThrow('Failed to fetch')

    const failed = interceptor.getFailed()
    expect(failed.length).toBe(1)
    expect(failed[0].status).toBe(0)
    expect(failed[0].isCORS).toBe(true)
    expect(failed[0].isFailed).toBe(true)
  })

  it('evicts oldest network calls when exceeding max capacity', async () => {
    globalThis.fetch = async () => new Response('OK', { status: 200 })

    interceptor = new NetworkInterceptor(5)
    interceptor.init()

    for (let i = 1; i <= 7; i++) {
      await window.fetch(`https://api.acme.io/items/${i}`)
    }

    const records = interceptor.getRecords()
    expect(records.length).toBe(5)
    expect(records[0].url).toBe('https://api.acme.io/items/3')
    expect(records[4].url).toBe('https://api.acme.io/items/7')
  })
})
