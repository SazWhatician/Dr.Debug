#!/usr/bin/env node
import { DrDebugMCPServer } from './server.js'

const port = parseInt(process.env.DR_DEBUG_MCP_PORT || '9229', 10)
const server = new DrDebugMCPServer({ port })

console.log('🩺 Starting Dr. Debug MCP Daemon on ws://localhost:' + port + '...')

server
  .start()
  .then(() => {
    console.log(`✅ Dr. Debug MCP Server is listening on ws://localhost:${port}`)
    console.log('\n📋 Add to your IDE mcp_config.json / Claude Desktop / Cursor settings:')
    console.log(
      JSON.stringify(
        {
          mcpServers: {
            'dr-debug': {
              command: 'npx',
              args: ['-y', '@dr-debug/mcp'],
              env: {
                DR_DEBUG_MCP_PORT: String(port)
              }
            }
          }
        },
        null,
        2
      )
    )
  })
  .catch((err) => {
    console.error('❌ Failed to start Dr. Debug MCP server:', err.message)
    process.exit(1)
  })
