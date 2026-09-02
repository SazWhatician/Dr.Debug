#!/usr/bin/env node
import { DrDebugMCPServer } from './server.js'

const port = parseInt(process.env.DR_DEBUG_MCP_PORT || '9229', 10)
const server = new DrDebugMCPServer({ port })

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ 🩺 Dr. Debug Host Docker Bridge & MCP Daemon                │
│ 👨‍💻 Created by Saswat Mohanty (@SazWhatician)               │
│ 🔗 GitHub: https://github.com/SazWhatician                   │
│ 💼 LinkedIn: https://www.linkedin.com/in/saswat-mohanty/    │
└─────────────────────────────────────────────────────────────┘
`)

server
  .start()
  .then(() => {
    console.log(`✅ Dr. Debug Daemon is active on port ${port}`)
    console.log(`🐳 Host Docker Stream: http://localhost:${port}/docker/stream (SSE)`)
    console.log(`🔌 Model Context Protocol: ws://localhost:${port}`)
    console.log(`\n💡 Open your web app and click the "🐳 Docker" tab in Dr. Debug to view live container logs!`)
  })
  .catch((err) => {
    console.error('❌ Failed to start Dr. Debug Daemon:', err.message)
    process.exit(1)
  })
