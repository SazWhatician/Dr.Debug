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
