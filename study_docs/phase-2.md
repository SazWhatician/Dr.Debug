# 🧠 Phase 2: Re-Act Diagnostic Engine, Reflection Model & Tools

**Package Scope:** `@dr-debug/core`, `@dr-debug/llms`  
**Status:** 🟢 `Completed`  
**Last Updated:** `2026-08-26`

---

## 🎯 Phase Goal
Implement the autonomous cognitive brain of Dr. Debug. This includes the forced **Reflection-Before-Action** mental model, the iterative Re-Act diagnostic loop, model-agnostic LLM adapters, and the 9 specialized diagnostic tools.

---

## 📋 Task Checklist & Progress

- [x] **2.1 Model-Agnostic LLM Client Adapter (`@dr-debug/llms`)**
  - [x] Implement unified interface for OpenAI, Anthropic, Gemini, and local/custom OpenAI-compatible endpoints.
  - [x] Implement robust error handling for rate limits, token budget overruns, and network timeouts with exponential backoff.
  - [x] Support structured JSON output and function calling / tool use.
  - [x] Implement `MockLLMClient` for deterministic testing and fixture playback.

- [x] **2.2 Reflection-Before-Action Mental Model (Zod MacroTool)**
  - [x] Implement `DebugReflectionSchema` using Zod v4 enforcing 5 mandatory reflection fields:
    - `evaluation_previous_goal`: Evaluation of the last diagnostic tool output.
    - `working_hypothesis`: Current root-cause causal theory.
    - `memory`: Persistent findings discovered across multiple steps.
    - `next_goal`: Immediate sub-goal for this step.
    - `action`: The single diagnostic tool to dispatch.
  - [x] Implement automatic reflection schema parsing and tool-call fallback.

- [x] **2.3 Diagnostic Tool Registry (`@dr-debug/core/src/tools`)**
  - [x] `inspect_error`: Detailed stack frame extraction, demangling, and line number resolution.
  - [x] `inspect_request`: Deep inspection of HTTP request/response payloads, headers, query params, and body excerpts.
  - [x] `inspect_element`: DOM node bounding box, computed styles, event listeners, and layout shift attribution.
  - [x] `query_framework_state`: React Component inspection via DevTools hook, props, Zustand/Redux store dumps.
  - [x] `execute_javascript`: Safe in-browser JS evaluation with `AbortSignal` and output formatting.
  - [x] `find_correlations`: Temporal clustering of errors, network calls, and user interactions.
  - [x] `inspect_docker_logs`: Inspects and filters live Docker backend container logs (stdout/stderr) for server panics and OOM events.
  - [x] `graphify_errors`: Constructs multi-layer full-stack Causal Error Graphs (Docker ➔ Network ➔ Console ➔ UI) with root cause detection and Mermaid generation.
  - [x] `replay_network_request`: Re-send failed requests with modified headers/parameters to test determinism.
  - [x] `check_storage`: Inspect LocalStorage, SessionStorage, and Cookies for expired JWTs or corrupted state.
  - [x] `done`: Formal conclusion tool outputting diagnosis, verified root cause, file paths, confidence score, and proposed code fix.

- [x] **2.4 DrDebugCore Re-Act Execution Loop**
  - [x] Build `DrDebugCore.ts` managing the step-by-step diagnostic trajectory.
  - [x] Implement maximum step safeguards (e.g. max 8 steps per investigation to avoid infinite loops).
  - [x] Implement event emitter broadcasting `onStepStart`, `onReflection`, `onToolExecute`, `onToolResult`, and `onDone`.
  - [x] Maintain cumulative investigation memory and history compression.

---

## 🧪 Acceptance Criteria & Verification
1. **Determinism:** Agent successfully solves standard test scenarios (e.g., CORS cascading into TypeError) in $\le 4$ steps.
2. **Reflection Integrity:** Re-Act loop validates reflection schemas before executing tools.
3. **Safety:** `execute_javascript` executes with timeout protection and captures runtime errors without crashing the main application thread.
4. **Test Coverage:** All 59 tests across 17 test files passing with 100% success.

---

## 📝 Phase Completion & Change Notes
- **[2026-08-26]**: Initial specification drafted.
- **[2026-08-26]**: Implemented `@dr-debug/llms` (`OpenAIClient`, `MockLLMClient`) and `@dr-debug/core` (`DrDebugCore`, `DebugReflectionSchema`, and all 9 diagnostic tools). Full test suite passing (28/28 tests across 9 test files). TypeScript typecheck passed with 0 errors. Phase 2 marked as **🟢 Completed**.
- **[2026-08-28]**: Added `inspect_docker_logs` and `graphify_errors` diagnostic tools for full-stack Docker backend inspection and Causal Error DAG generation with Mermaid export. Test suite expanded to 59/59 tests passing across 17 test files.

