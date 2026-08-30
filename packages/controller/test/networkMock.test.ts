import { describe, expect, it } from 'vitest'
import { NetworkMockInterceptor } from '../src/interceptors/networkMock.js'

describe('NetworkMockInterceptor (Time-Travel Network Spoofer)', () => {
  it('intercepts matching fetch requests and returns mocked JSON response', async () => {
    const spoofer = new NetworkMockInterceptor()
    spoofer.init()

    spoofer.addRule({
      urlPattern: '/api/v2/metrics',
      mockStatus: 200,
      mockBody: JSON.stringify({ status: 'ok', mocked: true })
    })

    const res = await fetch('https://api.acme.com/api/v2/metrics', { method: 'POST' })
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.mocked).toBe(true)

    spoofer.destroy()
  })
})
