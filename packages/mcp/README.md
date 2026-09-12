# 🔌 @dr-debug/mcp

> **Certified Model Context Protocol (MCP) Server & Docker Telemetry Bridge for Dr. Debug**  
> Built with Anthropic's official `@modelcontextprotocol/sdk`. Connects running browser tabs, frontend substrate anomalies, and backend Docker container logs directly to AI IDEs (Cursor, Claude Code, Antigravity, Windsurf, and VS Code).

[![npm version](https://img.shields.io/npm/v/@dr-debug/mcp.svg?color=blue)](https://www.npmjs.com/package/@dr-debug/mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

Created by **Saswat Mohanty** ([@SazWhatician](https://github.com/SazWhatician))  
- **GitHub:** [https://github.com/SazWhatician/DebugCopilot](https://github.com/SazWhatician/DebugCopilot)
- **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)

---

## ⚡ Instant Run

Run directly with `npx`:

```bash
npx -y @dr-debug/mcp
```

This boots the dual-mode bridge:
1. **Official MCP STDIO Server**: Speaks Model Context Protocol over standard I/O for Cursor, Claude Desktop, Antigravity, or VS Code.
2. **Local HTTP/WebSocket Gateway** (`http://127.0.0.1:9229`): Ingests telemetry from browser tabs and streams real-time Docker events (SSE) into the in-browser HUD.

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

> ⚡ **Exclusive Token Economy:** Saves **~95% of context tokens** (pruning 80,000 raw CDP tokens into <1,500 surgical tokens), cutting Cursor Composer & Agent debugging costs from ~$85/100 runs down to ~$3/100 runs while enforcing a strict &le; 5-line diff discipline.

### 3. Antigravity IDE (`mcp_config.json`)

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

When connected, your AI coding agent has direct access to the following 8 tools:

| Tool Name | Description |
|:---|:---|
| `drdebug_get_diagnostics` | Aggregated multi-substrate health status, active anomalies, error counts, and memory usage. |
| `drdebug_inspect_request` | Full HTTP request/response payloads, headers, timings, status, and cURL reproduction command. |
| `drdebug_get_ai_brief` | Paste-ready incident brief with demangled stack traces and XML `<debug_state>` snapshot. |
| `drdebug_inspect_error` | Deep error inspection with demangled stack frames, source file locations, and error details. |
| `drdebug_get_interaction_replay` | Chronological sequence of user clicks, inputs, and scrolls in the 30 seconds before errors. |
| `drdebug_execute_script` | Evaluates a JavaScript expression in the live browser tab and returns the serialized result. |
| `drdebug_list_docker_containers` | Lists local Docker containers, running states, images, forwarded ports, and health statuses. |
| `drdebug_get_docker_logs` | Queries Docker container stdout/stderr logs with container, level, grep, and tail filtering. |

---

## 📄 MCP Resources Exposed

AI agents can read live telemetry without executing tools:

* `drdebug://state/live`: Real-time `<debug_state>` XML token snapshot across substrates.
* `drdebug://console/errors`: Active uncaught runtime errors, unhandled rejections, and demangled stacks.
* `drdebug://network/failures`: Failed HTTP requests, status codes, request/response headers, and payloads.
* `drdebug://interactions/replay`: Chronological user interaction replay sequence.
* `drdebug://matrix/diagnostics`: 2D Substrate Diagnostics Matrix.
* `drdebug://tab/{tabId}/state`: Dynamic snapshot for a specific browser tab.
* `drdebug://container/{containerId}/logs`: Dynamic log stream for a specific Docker container.

---

## 💬 MCP Prompts Exposed

Dr. Debug registers one-click prompt workflows in Claude Desktop and Cursor:

1. **`drdebug_triage_incident`**: Injects current live browser telemetry, errors, and reproduction steps into the prompt, asking the AI to diagnose root cause and provide the code fix.
2. **`drdebug_correlate_500`**: Takes a failed `requestId`, automatically pulls the failed HTTP transaction and matches it with backend host Docker container logs for full-stack RCA.

---

## 🥊 Why `@dr-debug/mcp` over Google `chrome-devtools-mcp`?

| Dimension | Google `chrome-devtools-mcp` | `@dr-debug/mcp` |
|:---|:---|:---|
| **Core Function** | Browser automation / synthetic clicks & CDP commands | Pre-correlated diagnostic triage & runtime RCA |
| **Backend Integration** | ❌ None (stops at the browser boundary) | ✅ **Live Docker Bridge** correlates frontend 500s with host container crash logs |
| **Human QA Replay** | ❌ None (only knows synthetic agent actions) | ✅ **30s Interaction Replay** (human clicks, inputs, scrolls before crash) |
| **Token Cost** | ❌ 40k–80k tokens per bug (raw CDP dumps) | ✅ **<1,500 tokens** (structured RFC-9457 `<debug_state>` XML) |
| **Developer Cockpit** | ❌ Invisible headless protocol only | ✅ **Shadow DOM HUD** + Chrome Extension + DevTools Panel |
| **API Keys Needed** | None | **Zero API Keys Required** (AI IDE provides reasoning) |

---

## 📄 License

MIT © [Saswat Mohanty](https://github.com/SazWhatician)
