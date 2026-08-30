import { describe, expect, it } from 'vitest'
import { DrDebugMCPServer } from '../src/server.js'

describe('DrDebugMCPServer (Model Context Protocol Daemon & Tools)', () => {
  it('handles MCP initialize handshake and lists resources and tools', async () => {
    const server = new DrDebugMCPServer({ port: 9299 })

    // 1. Initialize
    const initRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    })
    expect(initRes.result?.protocolVersion).toBe('2024-11-05')
    expect(initRes.result?.serverInfo?.name).toContain('Dr. Debug')

    // 2. Resources List
    const resList = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'resources/list',
      params: {}
    })
    expect(resList.result?.resources?.length).toBeGreaterThanOrEqual(4)
    const uris = resList.result?.resources.map((r: any) => r.uri)
    expect(uris).toContain('drdebug://state/live')
    expect(uris).toContain('drdebug://console/errors')
    expect(uris).toContain('drdebug://network/failures')

    // 3. Tools List
    const toolList = await server.handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
      params: {}
    })
    const toolNames = toolList.result?.tools.map((t: any) => t.name)
    expect(toolNames).toContain('drdebug_get_diagnostics')
    expect(toolNames).toContain('drdebug_inspect_request')
    expect(toolNames).toContain('drdebug_inspect_error')
    expect(toolNames).toContain('drdebug_execute_script')

    // 4. Resource Read
    const readRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/read',
      params: { uri: 'drdebug://state/live' }
    })
    expect(readRes.result?.contents?.[0]?.mimeType).toBe('application/xml')
  })
})
