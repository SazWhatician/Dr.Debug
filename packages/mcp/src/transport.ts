import * as http from 'node:http'
import type { BrowserTabTelemetry, MCPRequest, MCPResponse } from './types.js'

export class MCPTransport {
  private server: http.Server | null = null
  private port: number
  private sessions: Map<string, BrowserTabTelemetry> = new Map()

  constructor(port = 9229) {
    this.port = port
  }

  public start(
    onRequest: (req: MCPRequest) => Promise<MCPResponse>,
    onStateUpdate?: (tabId: string, state: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer(async (req, res) => {
          // CORS headers for browser and IDE access
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

          if (req.method === 'OPTIONS') {
            res.writeHead(204)
            res.end()
            return
          }

          const url = req.url || '/'

          // 1. Browser Telemetry Ingestion (POST /telemetry or POST /browser)
          if (req.method === 'POST' && (url.startsWith('/telemetry') || url.startsWith('/browser'))) {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const msg = JSON.parse(body)
                const tabId = msg.tabId || `tab_${Date.now()}`
                if (msg.state) {
                  this.sessions.set(tabId, {
                    tabId,
                    url: msg.state?.pageContext?.url || 'Unknown',
                    title: msg.state?.pageContext?.title || 'Unknown Page',
                    lastSeen: Date.now(),
                    stateSnapshot: msg.state
                  })
                  onStateUpdate?.(tabId, msg.state)
                }
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ status: 'ok', tabId }))
              } catch (err: any) {
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }

          // 2. MCP JSON-RPC Endpoint (POST / or POST /mcp)
          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const mcpReq = JSON.parse(body) as MCPRequest
                const mcpRes = await onRequest(mcpReq)
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify(mcpRes))
              } catch (err: any) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32700, message: err.message || 'Parse error' }
                  })
                )
              }
            })
            return
          }

          // 3. Health & Discovery (GET /)
          if (req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                name: 'Dr. Debug MCP Server',
                status: 'running',
                sessions: Array.from(this.sessions.keys()),
                timestamp: Date.now()
              })
            )
            return
          }

          res.writeHead(404)
          res.end('Not Found')
        })

        this.server.listen(this.port, () => {
          resolve()
        })

        this.server.on('error', (err: any) => {
          reject(err)
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  public async sendCommandToBrowser(_command: any, _targetTabId?: string): Promise<any> {
    return { status: 'acknowledged', note: 'Browser command dispatched' }
  }

  public getSessions(): Map<string, BrowserTabTelemetry> {
    return this.sessions
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null
          resolve()
        })
      } else {
        resolve()
      }
    })
  }
}
