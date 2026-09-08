#!/usr/bin/env node
import * as readline from 'node:readline'
import { DrDebugMCPServer } from './server.js'

const port = parseInt(process.env.DR_DEBUG_MCP_PORT || '9229', 10)
const server = new DrDebugMCPServer({ port })

// STDIO JSON-RPC 2.0 Pipe for IDEs (Cursor, Claude Desktop, Antigravity, Windsurf)
// All banners & diagnostics MUST go to process.stderr so stdout remains pure JSON-RPC.
const banner = `
┌─────────────────────────────────────────────────────────────┐
│ 🩺 Dr. Debug Host Docker Bridge & MCP Daemon                │
│ 👨‍💻 Created by Saswat Mohanty (@SazWhatician)               │
│ 🔗 GitHub: https://github.com/SazWhatician                   │
│ 💼 LinkedIn: https://www.linkedin.com/in/saswat-mohanty/    │
└─────────────────────────────────────────────────────────────┘`

process.stderr.write(banner + '\n')

// Set up readline interface for standard input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
})

rl.on('line', async (line: string) => {
  const trimmed = line.trim()
  if (!trimmed) return

  try {
    const req = JSON.parse(trimmed)
    const res = await server.handleRequest(req)
    if (res) {
      process.stdout.write(JSON.stringify(res) + '\n')
    }
  } catch (err: any) {
    process.stdout.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: err?.message || 'JSON Parse error' }
      }) + '\n'
    )
  }
})

server
  .start()
  .then(() => {
    process.stderr.write(`✅ Dr. Debug Daemon is active on port ${port}\n`)
    process.stderr.write(`🐳 Host Docker Stream: http://localhost:${port}/docker/stream (SSE)\n`)
    process.stderr.write(`🔌 Model Context Protocol: stdio & http://localhost:${port}/mcp\n`)
    process.stderr.write(`💡 Open your web app and click the "🐳 Docker" tab in Dr. Debug to view live container logs!\n`)
  })
  .catch((err) => {
    process.stderr.write(`❌ Failed to start Dr. Debug Daemon: ${err.message}\n`)
    process.exit(1)
  })

