# 🩺 Dr. Debug

> **Autonomous in-browser AI debugging and runtime observability agent.**  
> Intercepts runtime failures, correlates host Docker logs & network telemetry with console errors, and prescribes verified code fixes directly inside the browser.

Created, architected, and built entirely by **[Saswat Mohanty (@SazWhatician)](https://github.com/SazWhatician)**.
- 🔗 **GitHub:** [https://github.com/SazWhatician](https://github.com/SazWhatician)
- 💼 **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)

[![Author: Saswat Mohanty](https://img.shields.io/badge/Author-Saswat%20Mohanty%20(@SazWhatician)-0284c7?style=flat-square&logo=github)](https://github.com/SazWhatician)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect%20on%20LinkedIn-0a66c2?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)
[![Tests](https://img.shields.io/badge/Tests-115%2F115%20Passing-34d399?style=flat-square)](https://github.com/SazWhatician/DebugCopilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-38bdf8?style=flat-square)](LICENSE)

---

## Why I Built This

Every frontend and full-stack developer knows the tedious debugging loop:
1. An endpoint fails with a `503`, a `401 Unauthorized`, or a silent CORS block.
2. React or your framework throws an unhandled exception three render cycles later.
3. You manually copy the stack trace from the Console, switch over to the Network tab to copy headers and payloads, and paste it all into an external LLM chat window.
4. The LLM hallucinates half the solution because it has no access to the live runtime execution state, the source maps, or the causal sequence of events.

I built **Dr. Debug** to eliminate that entire manual feedback loop. Instead of acting as an external chatbot, Dr. Debug embeds directly into the webpage runtime as an autonomous agent. When an anomaly triggers, it captures telemetry with zero overhead, reasons through hypotheses via a deterministic Re-Act loop, inspects the environment with dedicated diagnostic tools, and outputs a concrete root-cause analysis with an actionable unified patch.

---

## What It Does

- **Non-Blocking Telemetry Substrate**: Hooks into `console.error`, unhandled promise rejections, `fetch`/`XMLHttpRequest` traffic, Web Vitals (LCP, FID, CLS), and memory heap allocation. All interceptors are protected with re-entrancy mutexes to prevent recursive loops from React DevTools or analytics trackers.
- **Deterministic State Serialization**: Compiles fragmented browser events into a structured `<debug_state>` XML payload, complete with RFC-9457 HTTP problem details and source-mapped stack traces.
- **Autonomous Re-Act Diagnostic Engine**: Executes step-by-step diagnostic reasoning (`Thought -> Action -> Observation`) using tools like `inspect_error`, `inspect_request`, and safe `eval_js` until reaching high-confidence root-cause verification.
- **Zero-Pollution Shadow DOM HUD**: Draggable, glassmorphic UI cockpit encapsulated in an isolated Shadow Root (`#dr-debug-root`) to guarantee zero style leakage or layout shifts on host applications.
- **Manifest V3 Chrome Extension & DevTools Panel**: Run as an unpacked browser extension or dock it directly into the native Chrome DevTools workspace with one-click Markdown and JSON RCA exports.
- **Flexible LLM Provider Layer**: Works with ultra-fast cloud inference (Groq, Anthropic Claude, OpenAI) as well as offline/in-browser models via LiteRT and WebLLM.

---

## System Architecture

Dr. Debug is architected as a modular TypeScript monorepo:

```
DebugCopilot/
├── packages/
│   ├── controller/   # Multi-stream interceptors (Console, Fetch, XHR, Memory, Vitals) & XML serializer
│   ├── core/         # Re-Act reasoning loop, Zod reflection schema, and tool execution registry
│   ├── ui/           # Shadow DOM HUD, floating draggable pill, live equalizer, and drawer
│   ├── llms/         # LLM adapter layer (Groq, Anthropic, OpenAI, LiteRT / WebLLM)
│   ├── extension/    # Manifest V3 Chrome Extension & dedicated DevTools panel
│   └── dr-debug/     # Top-level orchestrator & standalone browser distribution
├── playground/       # Interactive live testing environment with simulated failure scenarios
└── scripts/          # Build and packaging automation
```

---

## Quickstart

### 1. Run as a Chrome Extension

Clone the repository, install dependencies, and build the extension bundle:

```bash
git clone https://github.com/SazWhatician/Dr.Debug.git
cd DebugCopilot
npm install
npm run build:extension
```

To load into your browser:
1. Open Google Chrome (or Edge / Brave / Arc) and navigate to `chrome://extensions`.
2. Turn on **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select `packages/extension` (or `packages/extension/dist`).
4. Navigate to any web application — the Dr. Debug floating capsule will appear automatically.

To package as a standalone `.zip` for distribution:
```powershell
Compress-Archive -Path packages/extension/dist/* -DestinationPath dr-debug-extension.zip -Force
```

---

### 2. Install as an NPM Package

```bash
npm install dr-debug
```

Initialize inside your frontend entry point (`main.ts`, `index.tsx`, etc.):

```typescript
import { DrDebug } from 'dr-debug'

const debuggerInstance = new DrDebug({
  enableUI: true,            // Mount floating Shadow DOM HUD
  autoInvestigate: false,     // Triage on demand or on error click
  modelProvider: 'groq',      // 'groq' | 'anthropic' | 'openai' | 'litert'
  apiKey: process.env.GROQ_API_KEY
})
```

---

### 3. Standalone Script Tag

Include the pre-bundled standalone distribution script before your application code:

```html
<script src="https://unpkg.com/dr-debug/dist/dr-debug.min.js"></script>
<script>
  window.__DR_DEBUG__ = new DrDebug({
    enableUI: true,
    modelProvider: 'groq',
    apiKey: 'YOUR_GROQ_API_KEY'
  });
</script>
```

---

## The Re-Act Diagnostic Workflow

When an investigation starts, Dr. Debug aggregates runtime context and iterates through a closed-loop reasoning process:

```
[ Raw Browser Telemetry: Console + Network + Memory ]
                         │
                         ▼
             [ <debug_state> XML Serializer ]
                         │
                         ▼
        ┌───────────────────────────────────┐
        │  Hypothesis Formulation (Thought) │
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │      Tool Execution (Action)      │
        │  inspect_request / inspect_error  │
        └─────────────────┬─────────────────┘
                          │
                          ▼
        ┌───────────────────────────────────┐
        │   Observation & Confidence Check  │
        └─────────────────┬─────────────────┘
                          │
                 (Confidence Verified)
                          │
                          ▼
        ┌───────────────────────────────────┐
        │    Root Cause Analysis (RCA)      │
        │     + Unified Diff Code Patch     │
        └───────────────────────────────────┘
```

### Diagnostic Tools
- `inspect_error`: Extracts parsed stack frames, demangled sourcemap lines, and error metadata.
- `inspect_request`: Inspects request/response headers, status codes, timing metrics, and response body payloads.
- `inspect_docker_logs`: Checks backend container logs, panics, and database timeouts.
- `graphify_errors`: Maps causal DAG relationships between backend errors and client crashes.
- `eval_js`: Executes expressions safely within the isolated page execution context.
- `done`: Finalizes the diagnostic session with root cause findings, confidence score, and a unified `.patch`.

---

## 📦 Downloadable Releases & Distribution

Dr. Debug is ready to ship and download in three distinct formats:

| Format | File Artifact | How to Use |
|:---|:---|:---|
| **Chrome DevTools Extension (ZIP)** | [`release/dr-debug-extension.zip`](release/dr-debug-extension.zip) | Unzip and load into `chrome://extensions` (Developer Mode) |
| **Chrome DevTools Extension (Folder)** | [`release/chrome-extension/`](release/chrome-extension/) | Direct "Load unpacked" folder in Google Chrome |
| **In-Browser Standalone Bundle (Minified)** | [`release/dr-debug.standalone.min.js`](release/dr-debug.standalone.min.js) | Drop into any HTML via `<script src="dr-debug.standalone.min.js"></script>` |
| **In-Browser Standalone Bundle (Full)** | [`release/dr-debug.standalone.js`](release/dr-debug.standalone.js) | Full source with developer comments & sourcemap |
| **NPM Package Tarball** | [`release/dr-debug-0.1.0.tgz`](release/) | Install in your package: `npm install ./dr-debug-0.1.0.tgz` |

### Building Downloadable Assets
To compile and package fresh downloadable archives at any time:
```bash
npm run package:release
```
All release bundles and the distribution guide are automatically created in the [`release/`](release/) directory.

---

## 🧪 Verification and Testing

Dr. Debug maintains a rigorous unit and integration test suite across all subpackages:

```bash
npm test
```

Current test status:
- **30 test suites passing (100%)**
- **115 total tests passing (100%)**
- Tests cover host Docker CLI streamer, interceptor mutex re-entrancy, RFC-9457 classification, source map VLQ line mapping, XML serializer determinism, and Re-Act reflection parsing.

---

## 👨‍💻 Author & Credits

Designed, architected, and built entirely by:

**Saswat Mohanty** (`@SazWhatician`)  
- **Role:** AI/ML Engineer  
- **Education:** Veer Surendra Sai University of Technology (VSSUT), Burla  
- **Origin:** Bhubaneswar, Odisha, India  
- 🔗 **GitHub:** [https://github.com/SazWhatician](https://github.com/SazWhatician)  
- 💼 **LinkedIn:** [https://www.linkedin.com/in/saswat-mohanty-0a4549331/](https://www.linkedin.com/in/saswat-mohanty-0a4549331/)

If you find Dr. Debug helpful, star the repository on GitHub and connect on LinkedIn!

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.

