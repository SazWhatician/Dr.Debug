# 🧠 Phase 2: Re-Act Diagnostic Engine, Reflection Model & Tools

**Package Scope:** `@dr-debug/core`, `@dr-debug/llms`  
**Status:** ⚪ `Planned`  
**Last Updated:** `2026-08-26`

---

## 🎯 Phase Goal
Implement the autonomous cognitive brain of Dr. Debug. This includes the forced **Reflection-Before-Action** mental model, the iterative Re-Act diagnostic loop, model-agnostic LLM adapters, and the 9 specialized diagnostic tools.

---

## 📋 Task Checklist & Progress

- [ ] **2.1 Model-Agnostic LLM Client Adapter (`@dr-debug/llms`)**
  - [ ] Implement unified interface for OpenAI, Anthropic, Gemini, and local/custom OpenAI-compatible endpoints.
  - [ ] Implement robust error handling for rate limits, token budget overruns, and network timeouts with exponential backoff.
  - [ ] Support structured JSON output and function calling / tool use.

- [ ] **2.2 Reflection-Before-Action Mental Model (Zod MacroTool)**
  - [ ] Implement `DebugReflectionSchema` using Zod v4 enforcing 5 mandatory reflection fields:
    - `evaluation_previous_goal`: Evaluation of the last diagnostic tool output.
    - `working_hypothesis`: Current root-cause causal theory.
    - `memory`: Persistent findings discovered across multiple steps.
    - `next_goal`: Immediate sub-goal for this step.
    - `action`: The single diagnostic tool to dispatch.
  - [ ] Implement automatic reflection schema retry on LLM validation error.

- [ ] **2.3 Diagnostic Tool Registry (`@dr-debug/core/src/tools`)**
  - [ ] `inspect_error`: Detailed stack frame extraction, demangling, and line number resolution.
  - [ ] `inspect_request`: Deep inspection of HTTP request/response payloads, headers, query params, and body excerpts.
  - [ ] `inspect_element`: DOM node bounding box, computed styles, event listeners, and layout shift attribution.
  - [ ] `query_framework_state`: React Component inspection via DevTools hook, props, Zustand/Redux store dumps.
  - [ ] `execute_javascript`: Safe in-browser JS evaluation with `AbortSignal` and output formatting.
  - [ ] `find_correlations`: Temporal clustering of errors, network calls, and user interactions.
  - [ ] `replay_network_request`: Re-send failed requests with modified headers/parameters to test determinism.
  - [ ] `check_storage`: Inspect LocalStorage, SessionStorage, and Cookies for expired JWTs or corrupted state.
  - [ ] `done`: Formal conclusion tool outputting diagnosis, verified root cause, file paths, confidence score, and proposed code fix.

- [ ] **2.4 DrDebugCore Re-Act Execution Loop**
  - [ ] Build `DrDebugCore.ts` managing the step-by-step diagnostic trajectory.
  - [ ] Implement maximum step safeguards (e.g. max 8 steps per investigation to avoid infinite loops).
  - [ ] Implement event emitter broadcasting `onStepStart`, `onReflection`, `onToolExecute`, `onToolResult`, and `onDone`.
  - [ ] Maintain cumulative investigation memory and history compression.

---

## 🧪 Acceptance Criteria & Verification
1. **Determinism:** Agent successfully solves standard test scenarios (e.g., CORS cascading into TypeError) in $\le 4$ steps.
2. **Reflection Integrity:** Re-Act loop rejects any response that attempts tool execution without a validated `working_hypothesis`.
3. **Safety:** `execute_javascript` executes with timeout protection and captures runtime errors without crashing the main application thread.

---

## 📝 Phase Completion & Change Notes
*(Updates will be logged here as tasks are implemented)*
- **Status:** Initial specification drafted.
