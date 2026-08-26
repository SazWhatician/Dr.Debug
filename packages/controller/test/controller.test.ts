import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DebugController } from '../src/DebugController.js'

describe('DebugController (Master Facade)', () => {
  let controller: DebugController
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    if (controller) controller.destroy()
    globalThis.fetch = originalFetch
  })

  it('collects multi-stream telemetry and serializes to XML', async () => {
    const mockRes = new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
    globalThis.fetch = async () => mockRes

    controller = new DebugController(10)
    controller.init()

    // 1. Trigger console error
    console.error('Master controller test error')

    // 2. Trigger fetch
    await window.fetch('https://api.acme.io/v1/ping')

    // 3. Get snapshot
    const snapshot = controller.getSnapshot()
    expect(snapshot.console.total).toBe(1)
    expect(snapshot.network.total).toBe(1)
    expect(snapshot.console.errorCount).toBe(1)

    // 4. Serialize
    const xml = controller.serialize()
    expect(xml).toContain('<debug_state>')
    expect(xml).toContain('Master controller test error')
    expect(xml).toContain('https://api.acme.io/v1/ping')
  })

  it('clears all internal buffers on clear()', () => {
    controller = new DebugController(10)
    controller.init()

    console.log('Sample log')
    expect(controller.getConsoleEntries().length).toBe(1)

    controller.clear()
    expect(controller.getConsoleEntries().length).toBe(0)
    expect(controller.getNetworkRecords().length).toBe(0)
  })
})
