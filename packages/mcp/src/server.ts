import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { z } from 'zod'
import { generatePonytailDebugPrompt } from '@dr-debug/core'
import { DockerBridge } from './DockerBridge.js'
import { MCPResourceManager } from './resources.js'
import { MCPToolManager } from './tools.js'
import { MCPTransport } from './transport.js'
import type { MCPRequest, MCPResponse } from './types.js'

export interface DrDebugMCPServerOptions {
  port?: number
  enableDocker?: boolean
}

export class DrDebugMCPServer {
  private mcpServer: McpServer
  private transport: MCPTransport
  private dockerBridge: DockerBridge
  private isRunning = false

  constructor(options: DrDebugMCPServerOptions = {}) {
    this.dockerBridge = new DockerBridge()
    this.transport = new MCPTransport(options.port || 9229, this.dockerBridge)

    // 1. Initialize Official Model Context Protocol Server
    this.mcpServer = new McpServer(
      {
        name: 'Dr. Debug Autonomous Observability',
        version: '0.1.15'
      },
      {
        capabilities: {
          resources: { subscribe: true },
          tools: {},
          prompts: {}
        }
      }
    )

    this.registerTools()
    this.registerResources()
    this.registerPrompts()
  }

  public getMcpServer(): McpServer {
    return this.mcpServer
  }

  public getDockerBridge(): DockerBridge {
    return this.dockerBridge
  }

  public getTransport(): MCPTransport {
    return this.transport
  }

  private registerTools(): void {
    // 1. Diagnostics / Aggregated State
    this.mcpServer.tool(
      'drdebug_get_diagnostics',
      'Returns the aggregated multi-substrate health status and active anomalies in the live browser application.',
      {
        tabId: z.string().optional().describe('Optional browser tab ID (defaults to active tab).')
      },
      async (args) => {
        return MCPToolManager.callTool(
          'drdebug_get_diagnostics',
          args,
          this.transport.getSessions(),
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
      }
    )

    // 2. Network Request Inspection
    this.mcpServer.tool(
      'drdebug_inspect_request',
      'Fetches full HTTP request/response payloads, headers, timings, and curl reproduction command for an API call.',
      {
        requestId: z.string().describe('The unique request ID or URL substring to inspect.')
      },
      async (args) => {
        return MCPToolManager.callTool(
          'drdebug_inspect_request',
          args,
          this.transport.getSessions(),
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
      }
    )

    // 3. AI Brief
    this.mcpServer.tool(
      'drdebug_get_ai_brief',
      'Returns the full paste-ready incident brief for AI assistants (Claude Code, Cursor, Antigravity) with complete request/response headers, body payloads, cURL reproduction, and demangled stacks.',
      {
        targetId: z.string().optional().describe('Optional specific error ID or request ID to focus on.')
      },
      async (args) => {
        return MCPToolManager.callTool(
          'drdebug_get_ai_brief',
          args,
          this.transport.getSessions(),
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
      }
    )

    // 4. Runtime / Console Error Inspection
    this.mcpServer.tool(
      'drdebug_inspect_error',
      'Inspects a recorded runtime exception or console error, returning demangled stack frames and file locations.',
      {
        errorId: z.string().describe('The unique error ID or message substring to inspect.')
      },
      async (args) => {
        return MCPToolManager.callTool(
          'drdebug_inspect_error',
          args,
          this.transport.getSessions(),
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
      }
    )

    // 5. 30s Human Interaction Replay Sequence
    this.mcpServer.tool(
      'drdebug_get_interaction_replay',
      'Returns the chronological sequence of user clicks, inputs, scrolls, and navigations in the 30 seconds before errors.',
      {},
      async (args) => {
        return MCPToolManager.callTool(
          'drdebug_get_interaction_replay',
          args,
          this.transport.getSessions(),
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
      }
    )

    // 6. In-Browser Script Execution
    this.mcpServer.tool(
      'drdebug_execute_script',
      'Evaluates a JavaScript expression in the live browser tab and returns the serialized result.',
      {
        expression: z.string().describe('JavaScript code expression to evaluate in the connected browser tab.'),
        tabId: z.string().optional().describe('Optional target tab ID.')
      },
      async (args) => {
        return MCPToolManager.callTool(
          'drdebug_execute_script',
          args,
          this.transport.getSessions(),
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
      }
    )

    // 7. Host Docker Containers
    this.mcpServer.tool(
      'drdebug_list_docker_containers',
      'Lists local Docker containers, their running states, images, forwarded ports, and health statuses.',
      {},
      async (args) => {
        return MCPToolManager.callTool(
          'drdebug_list_docker_containers',
          args,
          this.transport.getSessions(),
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
      }
    )

    // 8. Docker Logs Query & Grep
    this.mcpServer.tool(
      'drdebug_get_docker_logs',
      'Queries and streams Docker container standard output and standard error logs with filtering by container, log level, regex grep, and line tail.',
      {
        container: z.string().optional().describe('Optional container name or ID to filter logs.'),
        level: z.enum(['error', 'warn', 'info', 'log']).optional().describe('Optional log level filter.'),
        grep: z.string().optional().describe('Optional regex or substring to grep in log messages.'),
        tail: z.number().optional().default(50).describe('Number of recent log lines to retrieve (default 50).')
      },
      async (args) => {
        return MCPToolManager.callTool(
          'drdebug_get_docker_logs',
          args,
          this.transport.getSessions(),
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
      }
    )
  }

  private registerResources(): void {
    // 1. Live Debug State XML
    this.mcpServer.resource(
      'live-state',
      'drdebug://state/live',
      {
        mimeType: 'application/xml',
        description: 'Real-time <debug_state> XML token snapshot across console, network, docker, and memory.'
      },
      async (uri) => {
        const res = MCPResourceManager.readResource(uri.href, this.transport.getSessions(), this.dockerBridge)
        return { contents: [{ uri: uri.href, mimeType: res.mimeType, text: res.text || '' }] }
      }
    )

    // 2. Console Errors
    this.mcpServer.resource(
      'console-errors',
      'drdebug://console/errors',
      {
        mimeType: 'application/json',
        description: 'Active uncaught runtime errors, unhandled rejections, and demangled stack frames.'
      },
      async (uri) => {
        const res = MCPResourceManager.readResource(uri.href, this.transport.getSessions(), this.dockerBridge)
        return { contents: [{ uri: uri.href, mimeType: res.mimeType, text: res.text || '' }] }
      }
    )

    // 3. Network Failures
    this.mcpServer.resource(
      'network-failures',
      'drdebug://network/failures',
      {
        mimeType: 'application/json',
        description: 'Failed HTTP requests, status codes, request/response headers, and payloads.'
      },
      async (uri) => {
        const res = MCPResourceManager.readResource(uri.href, this.transport.getSessions(), this.dockerBridge)
        return { contents: [{ uri: uri.href, mimeType: res.mimeType, text: res.text || '' }] }
      }
    )

    // 4. Interaction Replay Sequence
    this.mcpServer.resource(
      'interactions-replay',
      'drdebug://interactions/replay',
      {
        mimeType: 'text/plain',
        description: 'Chronological list of user clicks, inputs, scrolls in the 30 seconds leading up to bugs.'
      },
      async (uri) => {
        const res = MCPResourceManager.readResource(uri.href, this.transport.getSessions(), this.dockerBridge)
        return { contents: [{ uri: uri.href, mimeType: res.mimeType, text: res.text || '' }] }
      }
    )

    // 5. Diagnostics Matrix
    this.mcpServer.resource(
      'matrix-diagnostics',
      'drdebug://matrix/diagnostics',
      {
        mimeType: 'application/json',
        description: '2D Substrate Diagnostics Matrix.'
      },
      async (uri) => {
        const res = MCPResourceManager.readResource(uri.href, this.transport.getSessions(), this.dockerBridge)
        return { contents: [{ uri: uri.href, mimeType: res.mimeType, text: res.text || '' }] }
      }
    )

    // 6. Dynamic Template: Tab State
    this.mcpServer.resource(
      'tab-state',
      new ResourceTemplate('drdebug://tab/{tabId}/state', { list: undefined }),
      {
        mimeType: 'application/json',
        description: 'Tab-specific debug telemetry snapshot.'
      },
      async (uri) => {
        const res = MCPResourceManager.readResource(uri.href, this.transport.getSessions(), this.dockerBridge)
        return { contents: [{ uri: uri.href, mimeType: res.mimeType, text: res.text || '' }] }
      }
    )

    // 7. Dynamic Template: Container Logs
    this.mcpServer.resource(
      'container-logs',
      new ResourceTemplate('drdebug://container/{containerId}/logs', { list: undefined }),
      {
        mimeType: 'application/json',
        description: 'Docker container stdout/stderr log stream.'
      },
      async (uri) => {
        const res = MCPResourceManager.readResource(uri.href, this.transport.getSessions(), this.dockerBridge)
        return { contents: [{ uri: uri.href, mimeType: res.mimeType, text: res.text || '' }] }
      }
    )
  }

  private registerPrompts(): void {
    // 1. Incident Triage
    this.mcpServer.prompt(
      'drdebug_triage_incident',
      'Auto-formats the current live browser state snapshot into an instant incident triage prompt.',
      {
        tabId: z.string().optional().describe('Optional tab ID to triage.')
      },
      async ({ tabId }) => {
        const sessions = this.transport.getSessions()
        const session = tabId ? sessions.get(tabId) : Array.from(sessions.values())[0]
        const state = session?.stateSnapshot || {}
        let brief = state.sessionDebugPrompt || state.unifiedPrompt
        if (!brief && session?.stateSnapshot) {
          try {
            brief = generatePonytailDebugPrompt(session.stateSnapshot)
          } catch {
            // fallback
          }
        }
        if (!brief) {
          brief = state.serializedXml || '<debug_state><note>No active browser session connected.</note></debug_state>'
        }
        const errorCount = (state.console?.entries || []).filter((e: any) => e.level === 'error').length
        const failedCount = (state.network?.records || []).filter((r: any) => r.isFailed).length

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `🩺 **Dr. Debug Incident Triage**\n` +
                  `URL: ${state.pageContext?.url || 'No active URL'}\n` +
                  `Active Errors: ${errorCount} | Failed Requests: ${failedCount}\n\n` +
                  `${brief}\n\n` +
                  `Please provide a regular, helpful developer response explaining what broke, why it happened, locate the culprit source file in the workspace, directly apply the minimal fix using your file editing tools, and explain what you changed and how to verify it.`
              }
            }
          ]
        }
      }
    )

    // 2. Full-Stack 500 Correlation
    this.mcpServer.prompt(
      'drdebug_correlate_500',
      'Correlates a failed frontend HTTP network request with backend host Docker container logs around the failure timestamp.',
      {
        requestId: z.string().describe('The failed request ID to correlate with backend logs.')
      },
      async ({ requestId }) => {
        const sessions = this.transport.getSessions()
        const session = Array.from(sessions.values())[0]
        const records = session?.stateSnapshot?.network?.records || []
        const req = records.find((r: any) => r.id === requestId || (r.url && r.url.includes(requestId)))
        const dockerLogs = this.dockerBridge.getLogs({ tail: 40 })

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `🩺 **Dr. Debug End-to-End RCA (Frontend ↔ Docker Correlation)**\n\n` +
                  `Failed Frontend Request:\n` +
                  `\`\`\`json\n${JSON.stringify(req || { error: 'Request not found in recorded telemetry', requestId }, null, 2)}\n\`\`\`\n\n` +
                  `Recent Host Docker Container Logs Around Event:\n` +
                  `\`\`\`json\n${JSON.stringify(dockerLogs, null, 2)}\n\`\`\`\n\n` +
                  `Please analyze both sides of the contract, identify the backend exception or schema mismatch causing this 500 error, explain the root cause and context in 1–2 clear sentences so the developer understands, and apply or provide the minimal fix.`
              }
            }
          ]
        }
      }
    )
  }

  public async connect(transport: Transport): Promise<void> {
    await this.mcpServer.connect(transport)
  }

  public async connectStdio(): Promise<void> {
    const stdio = new StdioServerTransport()
    await this.connect(stdio)
  }

  public async start(): Promise<void> {
    if (this.isRunning) return

    // Start Docker bridge discovery in background
    this.dockerBridge.start().catch((err) => {
      console.warn('Docker bridge initialization warning:', err.message)
    })

    // Start background HTTP transport for browser telemetry & HUD SSE stream
    await this.transport.start(async (req: MCPRequest): Promise<MCPResponse> => {
      return this.handleRequest(req)
    })

    this.isRunning = true
  }

  public async handleRequest(req: MCPRequest): Promise<MCPResponse> {
    const { id, method, params } = req
    const sessions = this.transport.getSessions()

    try {
      // 1. Initialize Handshake (JSON-RPC 2.0 direct compatibility)
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              resources: { subscribe: true },
              tools: {},
              prompts: {}
            },
            serverInfo: {
              name: 'Dr. Debug Autonomous Observability MCP Server',
              version: '0.1.15'
            }
          }
        }
      }

      // 2. Ping
      if (method === 'ping') {
        return { jsonrpc: '2.0', id, result: {} }
      }

      // 3. Resource listing
      if (method === 'resources/list') {
        const resources = MCPResourceManager.listResources(sessions, this.dockerBridge)
        return { jsonrpc: '2.0', id, result: { resources } }
      }

      // 4. Resource reading
      if (method === 'resources/read') {
        const content = MCPResourceManager.readResource(params.uri, sessions, this.dockerBridge)
        return { jsonrpc: '2.0', id, result: { contents: [content] } }
      }

      // 5. Tool listing
      if (method === 'tools/list') {
        const tools = MCPToolManager.listTools()
        return { jsonrpc: '2.0', id, result: { tools } }
      }

      // 6. Tool execution
      if (method === 'tools/call') {
        const result = await MCPToolManager.callTool(
          params.name,
          params.arguments || {},
          sessions,
          (cmd, tid) => this.transport.sendCommandToBrowser(cmd, tid),
          this.dockerBridge
        )
        return { jsonrpc: '2.0', id, result }
      }

      // 7. Prompts listing
      if (method === 'prompts/list') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: [
              {
                name: 'drdebug_triage_incident',
                description: 'Auto-formats the current live browser state snapshot into an instant incident triage prompt.',
                arguments: [
                  {
                    name: 'tabId',
                    description: 'Optional tab ID to triage.',
                    required: false
                  }
                ]
              },
              {
                name: 'drdebug_correlate_500',
                description: 'Correlates a failed frontend HTTP network request with backend host Docker container logs around the failure timestamp.',
                arguments: [
                  {
                    name: 'requestId',
                    description: 'The failed request ID to correlate with backend logs.',
                    required: true
                  }
                ]
              }
            ]
          }
        }
      }

      // 7b. Prompt execution (prompts/get)
      if (method === 'prompts/get') {
        const promptName = params?.name
        const promptArgs = params?.arguments || {}

        if (promptName === 'drdebug_triage_incident') {
          const session = promptArgs.tabId ? sessions.get(promptArgs.tabId) : Array.from(sessions.values())[0]
          const state = session?.stateSnapshot || {}
          let brief = state.sessionDebugPrompt || state.unifiedPrompt
          if (!brief && session?.stateSnapshot) {
            try {
              brief = generatePonytailDebugPrompt(session.stateSnapshot)
            } catch {
              // fallback
            }
          }
          if (!brief) {
            brief = state.serializedXml || '<debug_state><note>No active browser session connected.</note></debug_state>'
          }
          const errorCount = (state.console?.entries || []).filter((e: any) => e.level === 'error').length
          const failedCount = (state.network?.records || []).filter((r: any) => r.isFailed).length

          return {
            jsonrpc: '2.0',
            id,
            result: {
              description: 'Auto-formatted instant incident triage prompt',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `🩺 **Dr. Debug Incident Triage**\n` +
                      `URL: ${state.pageContext?.url || 'No active URL'}\n` +
                      `Active Errors: ${errorCount} | Failed Requests: ${failedCount}\n\n` +
                      `${brief}\n\n` +
                      `Please provide a regular, helpful developer response explaining what broke, why it happened, locate the culprit source file in the workspace, directly apply the minimal fix using your file editing tools, and explain what you changed and how to verify it.`
                  }
                }
              ]
            }
          }
        }

        if (promptName === 'drdebug_correlate_500') {
          const session = Array.from(sessions.values())[0]
          const records = session?.stateSnapshot?.network?.records || []
          const req = records.find((r: any) => r.id === promptArgs.requestId || (r.url && r.url.includes(promptArgs.requestId)))
          const dockerLogs = this.dockerBridge.getLogs({ tail: 40 })

          return {
            jsonrpc: '2.0',
            id,
            result: {
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `🩺 **Dr. Debug End-to-End RCA (Frontend ↔ Docker Correlation)**\n\n` +
                      `Failed Frontend Request:\n` +
                      `\`\`\`json\n${JSON.stringify(req || { error: 'Request not found in recorded telemetry', requestId: promptArgs.requestId }, null, 2)}\n\`\`\`\n\n` +
                      `Recent Host Docker Container Logs Around Event:\n` +
                      `\`\`\`json\n${JSON.stringify(dockerLogs, null, 2)}\n\`\`\`\n\n` +
                      `Please analyze both sides of the contract, identify the backend exception or schema mismatch causing this 500 error, explain the root cause and context in 1–2 clear sentences so the developer understands, and apply or provide the minimal fix.`
                  }
                }
              ]
            }
          }
        }

        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Prompt not found: ${promptName}` }
        }
      }

      // 8. Notifications initialized
      if (method === 'notifications/initialized') {
        return { jsonrpc: '2.0', id, result: {} }
      }

      // Fallback for unrecognized methods
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      }
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32603, message: err.message || 'Internal MCP Server Error' }
      }
    }
  }

  public async stop(): Promise<void> {
    this.dockerBridge.stop()
    await this.transport.stop()
    await this.mcpServer.close().catch(() => {})
    this.isRunning = false
  }
}
