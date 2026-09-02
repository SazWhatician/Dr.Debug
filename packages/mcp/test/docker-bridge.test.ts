import { describe, expect, it } from 'vitest'
import { DockerBridge } from '../src/DockerBridge.js'
import { DrDebugMCPServer } from '../src/server.js'

describe('DockerBridge & Host Container Streamer', () => {
  it('correctly classifies error levels across stdout and stderr streams', () => {
    const bridge = new DockerBridge()

    expect(bridge.classifyLogLevel('FATAL: remaining connection slots are reserved', 'stdout')).toBe('error')
    expect(bridge.classifyLogLevel('PANIC: runtime error: index out of range', 'stdout')).toBe('error')
    expect(bridge.classifyLogLevel('Server panic: uncaught exception', 'stdout')).toBe('error')
    expect(bridge.classifyLogLevel('Warning: database connection pool is 90% full', 'stdout')).toBe('warn')
    expect(bridge.classifyLogLevel('Listening on port 5432', 'stderr')).toBe('error') // stderr tagged as error
    expect(bridge.classifyLogLevel('Server ready for incoming connections', 'stdout')).toBe('info')
    expect(bridge.classifyLogLevel('DEBUG: cache hit for key 123', 'stdout')).toBe('log')
  })

  it('manages DockerBridge status and handles lifecycle gracefully', async () => {
    const bridge = new DockerBridge()
    const status = await bridge.checkDockerAvailability()

    expect(status).toHaveProperty('isAvailable')
    expect(status).toHaveProperty('daemonRunning')
    expect(status).toHaveProperty('containerCount')

    bridge.stop()
  })

  it('exposes dockerBridge on DrDebugMCPServer and handles start/stop', async () => {
    const server = new DrDebugMCPServer({ port: 9388 })
    expect(server.getDockerBridge()).toBeDefined()

    const bridge = server.getDockerBridge()
    expect(bridge.getStatus()).toBeDefined()

    await server.stop()
  })
})
