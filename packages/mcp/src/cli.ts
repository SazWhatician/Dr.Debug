#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
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

async function main(): Promise<void> {
  // 1. Start background HTTP telemetry ingestion & Docker bridge
  await server.start()

  // 2. Connect official Model Context Protocol STDIO transport
  const transport = new StdioServerTransport()
  await server.connect(transport)

  process.stderr.write(`✅ Dr. Debug Daemon is active on port ${port}\n`)
  process.stderr.write(`🐳 Host Docker Stream: http://localhost:${port}/docker/stream (SSE)\n`)
  process.stderr.write(`🔌 Model Context Protocol: stdio & http://localhost:${port}/mcp\n`)
  process.stderr.write(`💡 Open your web app and click the "🐳 Docker" tab in Dr. Debug to view live container logs!\n`)
}

main().catch((err) => {
  process.stderr.write(`❌ Failed to start Dr. Debug Daemon: ${err?.message || err}\n`)
  process.exit(1)
})
