# 🩺 Dr. Debug — Master Study & Phase Documentation

Welcome to the comprehensive phase-wise implementation roadmap for **Dr. Debug** (The autonomous in-browser AI debugging & observability agent).

---

## 🗺️ Phase Breakdown Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                      DR. DEBUG IMPLEMENTATION PHASES                   │
├─────────┬─────────────────────────────────────────────┬────────────────┤
│ Phase   │ Focus Area                                  │ Package Scope  │
├─────────┼─────────────────────────────────────────────┼────────────────┤
│ Phase 1 │ Deep Substrate Interceptors & Serializer    │ @dr-debug/ctrl │
│ Phase 2 │ Re-Act Diagnostic Engine, Reflection & Tools│ @dr-debug/core │
│ Phase 3 │ Shadow DOM Floating HUD & Standalone Bundle │ @dr-debug/ui   │
│ Phase 4 │ Chrome Extension & Dedicated DevTools Panel │ @dr-debug/ext  │
│ Phase 5 │ Framework State, Interaction Replay & Fixes │ @dr-debug/core │
│ Phase 6 │ Model Context Protocol (MCP) & IDE Bridge   │ @dr-debug/mcp  │
└─────────┴─────────────────────────────────────────────┴────────────────┘
```

---

## 📑 Phase Index & Status

| Document | Phase Title | Status | Primary Deliverables |
|:---|:---|:---:|:---|
| [**phase-1.md**](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-1.md) | **Deep Substrate & `<debug_state>` Serializer** | 🟢 *Completed* | Console, Network, Web Vitals, Memory Interceptors + Deterministic XML Serializer. *(16/16 tests passing)* |
| [**phase-2.md**](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-2.md) | **Re-Act Diagnostic Loop, Reflection & Tools** | 🟡 *Ready to Start* | Zod Reflection MacroTool, Diagnostic Tool Registry (`inspect_error`, `inspect_request`, `eval_js`), LLM Adapter. |
| [**phase-3.md**](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-3.md) | **Shadow DOM HUD & Standalone IIFE Bundle** | ⚪ *Planned* | Draggable floating panel, Step-by-step diagnostic timeline, zero-leak CSS, `dr-debug.js` script tag. |
| [**phase-4.md**](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-4.md) | **Chrome Extension & Dedicated DevTools Tab** | ⚪ *Planned* | WXT Extension, Content script auto-injection on any website, DevTools custom drawer panel, Source Maps demangler. |
| [**phase-5.md**](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-5.md) | **Framework Hooks, Interaction Replay & Auto-Fix** | ⚪ *Planned* | React/Redux hooks, lightweight 30s `rrweb` interaction buffer, GitHub-compatible unified diff generation. |
| [**phase-6.md**](file:///c:/Users/saswa/Desktop/DebugCopilot/study_docs/phase-6.md) | **Model Context Protocol (MCP) Server & IDE Bridge**| ⚪ *Planned* | Local MCP server daemon, live WebSocket telemetry bridge to Cursor, Claude Code, and Antigravity. |

---

## 🔄 Phase Maintenance Rule

> All phase progress, completions, and modifications are strictly tracked by the **`phase-tracker`** agent skill. Whenever work is done on any phase, its respective `phase-n.md` file must be updated.
