import { MCPResourceManager } from './resources.js'
import { MCPToolManager } from './tools.js'
import { MCPTransport } from './transport.js'
import type { MCPRequest, MCPResponse } from './types.js'

export interface DrDebugMCPServerOptions {
  port?: number
}

export class DrDebugMCPServer {
  private transport: MCPTransport
  private isRunning = false

  constructor(options: DrDebugMCPServerOptions = {}) {
    this.transport = new MCPTransport(options.port || 9229)
  }

  public async start(): Promise<void> {
    if (this.isRunning) return

    await this.transport.start(async (req: MCPRequest): Promise<MCPResponse> => {
      return this.handleRequest(req)
    })

    this.isRunning = true
  }

  public async handleRequest(req: MCPRequest): Promise<MCPResponse> {
    const { id, method, params } = req
    const sessions = this.transport.getSessions()

    try {
      // 1. Initialize Handshake
      if (method === 'initialize') {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              resources: { subscribe: true },
              tools: {}
            },
            serverInfo: {
              name: 'Dr. Debug Autonomous Observability MCP Server',
              version: '0.1.0'
            }
          }
        }
      }

      // 2. Resource listing
      if (method === 'resources/list') {
        const resources = MCPResourceManager.listResources(sessions)
        return { jsonrpc: '2.0', id, result: { resources } }
      }

      // 3. Resource reading
      if (method === 'resources/read') {
        const content = MCPResourceManager.readResource(params.uri, sessions)
        return { jsonrpc: '2.0', id, result: { contents: [content] } }
      }

      // 4. Tool listing
      if (method === 'tools/list') {
        const tools = MCPToolManager.listTools()
        return { jsonrpc: '2.0', id, result: { tools } }
      }

      // 5. Tool execution
      if (method === 'tools/call') {
        const result = await MCPToolManager.callTool(
          params.name,
          params.arguments || {},
          sessions,
          (cmd) => this.transport.sendCommandToBrowser(cmd)
        )
        return { jsonrpc: '2.0', id, result }
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
    await this.transport.stop()
    this.isRunning = false
  }
}
