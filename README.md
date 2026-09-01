# Dr. Debug

> **Autonomous in-browser AI debugging and runtime observability agent.**  
> Intercepts runtime failures, correlates network telemetry with console errors, and prescribes verified code fixes directly inside the browser.

Created and engineered by **[Saswat Kumar Mohanty](https://github.com/SazWhatician)** — AI/ML Engineer from Bhubaneswar, studying at Veer Surendra Sai University of Technology (VSSUT), Burla.

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
- `eval_js`: Executes expressions safely within the isolated page execution context.
- `done`: Finalizes the diagnostic session with root cause findings, confidence score, and a unified `.patch`.

---

## Verification and Testing

Dr. Debug maintains a strict unit and integration test suite across all subpackages:

```bash
npm test
```

Current test status:
- **28 test suites passing**
- **104 total tests passing**
- Tests cover interceptor mutex re-entrancy, RFC-9457 classification, source map VLQ line mapping, XML serializer determinism, and Re-Act reflection parsing.

---

## Author & Credits

Designed, architected, and built entirely by:

**Saswat Kumar Mohanty**  
- **Role**: AI/ML Engineer  
- **Origin**: Bhubaneswar, Odisha, India  
- **Education**: Veer Surendra Sai University of Technology (VSSUT), Burla  
- **GitHub**: [@SazWhatician](https://github.com/SazWhatician)

---

## License

MIT License. See [LICENSE](LICENSE) for details.
