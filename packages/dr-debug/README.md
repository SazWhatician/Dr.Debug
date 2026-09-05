# 🩺 Dr. Debug (`dr-debug`)

> **Autonomous In-Browser AI Debugging & Observability Agent**  
> Diagnoses client substrate crashes, network failures, memory leaks, and DOM anomalies directly within the browser runtime using Re-Act diagnostic loops.

[![npm version](https://img.shields.io/npm/v/dr-debug.svg?color=blue)](https://www.npmjs.com/package/dr-debug)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

Created by **Saswat Mohanty** ([@SazWhatician](https://github.com/SazWhatician))  
- **GitHub:** [https://github.com/SazWhatician/DebugCopilot](https://github.com/SazWhatician/DebugCopilot)
- **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)

---

## ⚡ Installation

Install via npm, pnpm, or yarn:

```bash
npm install dr-debug
```

Or run via CDN / HTML script tag:

```html
<script type="module" src="https://unpkg.com/dr-debug/dist/standalone.js"></script>
```

---

## 🚀 Quick Start

### 1. In Any Modern JavaScript / TypeScript Project

```typescript
import { DrDebug } from 'dr-debug'

// Initialize the autonomous debugging copilot
const doctor = new DrDebug({
  apiKey: process.env.GROQ_API_KEY || 'your-llm-api-key',
  model: 'llama-3.3-70b-versatile', // or 'openai:gpt-4o', 'claude-3-5-sonnet', or local 'litert'
  enableUI: true,      // Renders the sleek Shadow DOM HUD & floating widget
  enableDocker: true,  // Connects with local Docker bridge for backend logs
  enableMCP: true      // Enables IDE live synchronization
})

// Trigger diagnostic investigations programmatically
await doctor.investigate('Investigate recent API failures on checkout')
```

### 2. Standalone In-Browser Drop-In (Zero Bundler Required)

Add this script to your `index.html` or entry template:

```html
<script 
  type="module" 
  src="https://unpkg.com/dr-debug/dist/standalone.js"
  data-api-key="your-api-key"
  data-model="llama-3.3-70b-versatile">
</script>
```

---

## 🔬 Core Capabilities

- **Deep Substrate Telemetry Interception**: Monkeypatches and observes `fetch`, `XMLHttpRequest`, `console.error`, `window.onerror`, unhandled promise rejections, and Performance API metrics without leaking into application state.
- **Shadow DOM Diagnostic HUD**: Complete glassmorphic DevTools panel rendered into a sealed Shadow Root to ensure zero CSS collisions with host websites.
- **Re-Act Autonomous Loop**: Multi-turn reasoning agent that queries DOM trees, searches console logs, verifies network payloads, and generates concrete code diff solutions.
- **Docker Log Correlation**: Streams backend container logs and correlates them with frontend network timeouts to pinpoint full-stack root causes.
- **MCP Protocol Bridge**: Syncs tab telemetry with Cursor, VS Code, and Claude Code via Model Context Protocol.

---

## 🛠️ Configuration Options

| Option | Type | Default | Description |
|:---|:---|:---|:---|
| `apiKey` | `string` | `undefined` | LLM API key (Groq, OpenAI, Anthropic, or Gemini) |
| `model` | `string` | `'llama-3.3-70b-versatile'` | Target model name or provider format |
| `enableUI` | `boolean` | `true` | Show floating button and diagnostic modal |
| `enableDocker` | `boolean` | `false` | Enable Docker container telemetry sync |
| `enableMCP` | `boolean` | `false` | Enable Model Context Protocol websocket bridge |
| `mcpPort` | `number` | `9999` | Port for local MCP daemon bridge |

---

## 📄 License

MIT © [Saswat Mohanty](https://github.com/SazWhatician)
