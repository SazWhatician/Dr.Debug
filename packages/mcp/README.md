# 🔌 @dr-debug/mcp

> **Model Context Protocol (MCP) Server & Docker Telemetry Bridge for Dr. Debug**  
> Connects running browser tabs, frontend substrate errors, and backend Docker container logs directly to AI IDEs (Cursor, Claude Code, Antigravity, Windsurf, and VS Code).

[![npm version](https://img.shields.io/npm/v/@dr-debug/mcp.svg?color=blue)](https://www.npmjs.com/package/@dr-debug/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

Created by **Saswat Mohanty** ([@SazWhatician](https://github.com/SazWhatician))  
- **GitHub:** [https://github.com/SazWhatician/DebugCopilot](https://github.com/SazWhatician/DebugCopilot)
- **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)

---

## ⚡ Instant Run (Zero Installation)

Run directly with `npx`:

```bash
npx -y @dr-debug/mcp
```

This boots the dual-mode bridge:
1. **MCP STDIO Server**: Ready for Cursor, Claude Code, Antigravity, or VS Code.
2. **Local HTTP/WebSocket Gateway** (`http://127.0.0.1:9999`): Streams real-time Docker container states and browser telemetry.

---

## 🛠️ Adding to Your AI Editor / IDE

### 1. Claude Desktop / Claude Code (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "dr-debug": {
      "command": "npx",
      "args": ["-y", "@dr-debug/mcp"]
    }
  }
}
```

### 2. Cursor IDE (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "dr-debug": {
      "command": "npx",
      "args": ["-y", "@dr-debug/mcp"]
    }
  }
}
```

---

## 🔬 MCP Tools Exposed

When connected, your AI coding agent has direct access to the following tools:

- `list_browser_tabs`: Discover active tabs with Dr. Debug instrumented.
- `get_browser_state`: Fetch the full `<debug_state>` snapshot (DOM anomalies, console errors, network failures).
- `get_recent_errors`: Query high-priority substrate and runtime exceptions.
- `get_network_log`: Inspect recent HTTP requests, status codes, and request/response payloads.
- `list_docker_containers`: Inspect local Docker containers, images, ports, and health statuses.
- `get_docker_logs`: Stream container standard output and standard error logs to correlate with browser errors.

---

## 📄 License

MIT © [Saswat Mohanty](https://github.com/SazWhatician)
