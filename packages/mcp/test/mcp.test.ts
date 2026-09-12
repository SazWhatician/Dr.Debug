import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { describe, expect, it } from 'vitest'
import { DrDebugMCPServer } from '../src/server.js'

describe('DrDebugMCPServer (Model Context Protocol Daemon & Tools)', () => {
  it('handles MCP initialize handshake and lists resources and tools via JSON-RPC', async () => {
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

    // 2. Ping
    const pingRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 10,
      method: 'ping',
      params: {}
    })
    expect(pingRes.result).toBeDefined()

    // 3. Resources List
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

    // 4. Tools List
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
    expect(toolNames).toContain('drdebug_list_docker_containers')
    expect(toolNames).toContain('drdebug_get_docker_logs')

    // 5. Resource Read
    const readRes = await server.handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'resources/read',
      params: { uri: 'drdebug://state/live' }
    })
    expect(readRes.result?.contents?.[0]?.mimeType).toBe('application/xml')

    // 6. Prompts List
    const promptList = await server.handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'prompts/list',
      params: {}
    })
    const promptNames = promptList.result?.prompts?.map((p: any) => p.name)
    expect(promptNames).toContain('drdebug_triage_incident')
    expect(promptNames).toContain('drdebug_correlate_500')
  })

  it('connects via official @modelcontextprotocol/sdk Client and verifies tools, resources, and prompts', async () => {
    const server = new DrDebugMCPServer({ port: 9301 })
    const client = new Client({ name: 'test-mcp-client', version: '1.0.0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])

    // 1. List and verify all registered tools
    const tools = await client.listTools()
    const toolNames = tools.tools.map((t) => t.name)
    expect(toolNames).toContain('drdebug_get_diagnostics')
    expect(toolNames).toContain('drdebug_inspect_request')
    expect(toolNames).toContain('drdebug_get_ai_brief')
    expect(toolNames).toContain('drdebug_inspect_error')
    expect(toolNames).toContain('drdebug_get_interaction_replay')
    expect(toolNames).toContain('drdebug_execute_script')
    expect(toolNames).toContain('drdebug_list_docker_containers')
    expect(toolNames).toContain('drdebug_get_docker_logs')

    // 2. Call Diagnostics Tool
    const diagRes = await client.callTool({
      name: 'drdebug_get_diagnostics',
      arguments: {}
    })
    expect(diagRes.content).toBeDefined()
    expect((diagRes.content as any)[0].type).toBe('text')
    const diagText = JSON.parse((diagRes.content as any)[0].text)
    expect(diagText.errorCount).toBe(0)

    // 3. Call Docker Tools
    const dockerListRes = await client.callTool({
      name: 'drdebug_list_docker_containers',
      arguments: {}
    })
    expect(dockerListRes.content).toBeDefined()

    const dockerLogsRes = await client.callTool({
      name: 'drdebug_get_docker_logs',
      arguments: { tail: 10 }
    })
    expect(dockerLogsRes.content).toBeDefined()

    // 4. List and Read Resources
    const resources = await client.listResources()
    expect(resources.resources.length).toBeGreaterThanOrEqual(5)
    const uris = resources.resources.map((r) => r.uri)
    expect(uris).toContain('drdebug://state/live')
    expect(uris).toContain('drdebug://console/errors')
    expect(uris).toContain('drdebug://network/failures')
    expect(uris).toContain('drdebug://matrix/diagnostics')

    const stateContent = await client.readResource({ uri: 'drdebug://state/live' })
    expect(stateContent.contents[0].mimeType).toBe('application/xml')

    // 5. List and Get Prompts
    const prompts = await client.listPrompts()
    const promptNames = prompts.prompts.map((p) => p.name)
    expect(promptNames).toContain('drdebug_triage_incident')
    expect(promptNames).toContain('drdebug_correlate_500')

    const incidentPrompt = await client.getPrompt({
      name: 'drdebug_triage_incident',
      arguments: {}
    })
    expect(incidentPrompt.messages.length).toBeGreaterThan(0)
    expect(incidentPrompt.messages[0].role).toBe('user')

    const correlatePrompt = await client.getPrompt({
      name: 'drdebug_correlate_500',
      arguments: { requestId: 'req_test_123' }
    })
    expect(correlatePrompt.messages.length).toBeGreaterThan(0)
    expect(correlatePrompt.messages[0].role).toBe('user')

    await client.close()
    await server.stop()
  })
})
