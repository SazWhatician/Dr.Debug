import { beforeEach, describe, expect, it } from 'vitest'
import { DockerInterceptor } from '../src/interceptors/docker.js'

describe('DockerInterceptor', () => {
  let interceptor: DockerInterceptor

  beforeEach(() => {
    interceptor = new DockerInterceptor(5)
    interceptor.init()
  })

  it('captures logs and automatically detects error severity', () => {
    const entry = interceptor.pushLog('api-server', 'FATAL: database connection pool exhausted', 'stderr')
    expect(entry.level).toBe('error')
    expect(entry.containerName).toBe('api-server')
    expect(entry.stream).toBe('stderr')

    const infoEntry = interceptor.pushLog('api-server', 'Server listening on port 8080', 'stdout')
    expect(infoEntry.level).toBe('info')
  })

  it('parses embedded ISO timestamps in container logs', () => {
    const timestampStr = '2026-08-28T10:15:30.000Z'
    const expectedTime = Date.parse(timestampStr)
    const entry = interceptor.pushLog('auth-service', `${timestampStr} [ERROR] Invalid JWT signature`)

    expect(entry.timestamp).toBe(expectedTime)
    expect(entry.level).toBe('error')
  })

  it('filters logs by container, level, grep, and tail', () => {
    interceptor.pushLog('api', 'User signup initiated', 'stdout')
    interceptor.pushLog('api', 'Error: Stripe webhook failed', 'stderr')
    interceptor.pushLog('db', 'Postgres running checkpoint', 'stdout')
    interceptor.pushLog('db', 'PANIC: disk full', 'stderr')

    const apiErrors = interceptor.getLogs({ container: 'api', level: 'error' })
    expect(apiErrors.length).toBe(1)
    expect(apiErrors[0].message).toContain('Stripe webhook failed')

    const dbGrep = interceptor.getLogs({ container: 'db', grep: 'checkpoint' })
    expect(dbGrep.length).toBe(1)
    expect(dbGrep[0].message).toContain('checkpoint')

    const tailLogs = interceptor.getLogs({ tail: 2 })
    expect(tailLogs.length).toBe(2)
  })

  it('evicts oldest logs when ring buffer exceeds maxBufferSize', () => {
    for (let i = 1; i <= 7; i++) {
      interceptor.pushLog('worker', `Job ${i} completed`)
    }

    const allLogs = interceptor.getLogs()
    expect(allLogs.length).toBe(5)
    expect(allLogs[0].message).toBe('Job 3 completed')
    expect(allLogs[4].message).toBe('Job 7 completed')
  })

  it('manages container state list and status', () => {
    interceptor.setContainers([
      {
        id: 'c1',
        name: 'web-api',
        image: 'node:20-alpine',
        state: 'running',
        status: 'Up 2 hours',
        ports: ['8080:8080']
      }
    ])

    const containers = interceptor.getContainers()
    expect(containers.length).toBe(1)
    expect(containers[0].name).toBe('web-api')

    interceptor.pushLog('web-api', 'Crash occurred', 'stderr')
    const status = interceptor.getStatus()
    expect(status.isAvailable).toBe(true)
    expect(status.containerCount).toBe(1)
    expect(status.errorCount).toBe(1)
  })
})

describe('DockerBridgeClient Connection Resilience', () => {
  it('handles INIT events and sets connection status', async () => {
    const { DockerBridgeClient } = await import('../src/DockerBridgeClient.js')
    let statusState: any = null
    const client = new DockerBridgeClient({
      onStatusChange: (s) => {
        statusState = s
      }
    })

    client.handleEvent({
      type: 'INIT',
      status: { connected: true, daemonRunning: true },
      containers: [{ id: 'c1', name: 'app', state: 'running' }],
      recentLogs: []
    })

    expect(statusState?.connected).toBe(true)
    expect(statusState?.daemonRunning).toBe(true)
  })

  it('ignores secondary external STATUS disconnect when direct EventSource is OPEN', async () => {
    const { DockerBridgeClient } = await import('../src/DockerBridgeClient.js')
    let statusChanges: any[] = []
    const client = new DockerBridgeClient({
      onStatusChange: (s) => {
        statusChanges.push(s)
      }
    })

    // Simulate direct EventSource is open and active
    ;(client as any).eventSource = { readyState: 1 /* OPEN */ }
    ;(client as any).isConnected = true

    // Background worker fails a health-probe and broadcasts disconnect
    client.handleEvent({
      type: 'STATUS',
      connected: false,
      daemonRunning: false
    })

    // Direct EventSource takes precedence; status is NOT dropped
    expect((client as any).isConnected).toBe(true)
    expect(statusChanges.length).toBe(0)
  })

  it('does not immediately tear down connection or flap status during transient SSE reconnecting state', async () => {
    const { DockerBridgeClient } = await import('../src/DockerBridgeClient.js')
    let statusChanges: any[] = []
    const client = new DockerBridgeClient({
      onStatusChange: (s) => {
        statusChanges.push(s)
      }
    })

    ;(client as any).isConnected = true

    let mockES: any = {
      readyState: 0, // CONNECTING
      close: () => {}
    }

    // Call connect() with a mock EventSource constructor
    const originalEventSource = globalThis.EventSource
    globalThis.EventSource = function () {
      return mockES
    } as any

    client.connect()

    // Trigger onerror while in CONNECTING (readyState === 0)
    mockES.onerror()

    // Status should still be true (grace period started, no immediate drop to offline)
    expect((client as any).isConnected).toBe(true)
    expect(statusChanges.length).toBe(0)
    expect((client as any).disconnectGraceTimer).toBeDefined()

    // Clean up
    client.disconnect()
    expect((client as any).disconnectGraceTimer).toBeNull()
    globalThis.EventSource = originalEventSource
  })
})
