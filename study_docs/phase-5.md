# ⚡ Phase 5: Framework Hooks, Interaction Replay & Auto-Fix Engine

**Package Scope:** `@dr-debug/core`, `@dr-debug/controller`  
**Status:** 🟢 `Completed`  
**Last Updated:** `2026-08-30`

---

## 🎯 Phase Goal
Supercharge Dr. Debug with deep framework-level intelligence (React component trees, Redux/Zustand store state), lightweight 30-second DOM session interaction replay with automatic PII masking, and an automated GitHub-compatible Pull Request / patch generation engine.

---

## 📋 Task Checklist & Progress

- [x] **5.1 Deep Framework State Interceptors**
  - [x] **React DevTools Hook:** Hook `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` to read live component hierarchy, props, state, and render counts.
  - [x] **Redux / Zustand Inspection:** Hook `window.__REDUX_DEVTOOLS_EXTENSION__` / `window.__REDUX_STORE__` to capture dispatched actions, state diffs, and current store snapshots.
  - [x] **Vue / Svelte Support:** Add adapter to detect and query Vue 3 / Svelte reactive component contexts when present.

- [x] **5.2 Lightweight Pre-Bug Interaction Replay**
  - [x] Integrate lightweight, privacy-conscious DOM event ring buffer holding the last **30 seconds** of user interactions (clicks, inputs, scrolls, DOM mutations).
  - [x] Automatically mask sensitive input fields (`[type="password"]`, credit card inputs, `data-private`, email patterns).
  - [x] Feed serialized user interaction sequence to LLM when investigating reproduction steps: *"User clicked #checkout-btn → hovered dropdown → scrolled to footer"*.

- [x] **5.3 Automated Auto-Fix & PR Engine**
  - [x] Format prescribed fixes into standard **unified diff (`.patch`)** format via `PatchEngine`.
  - [x] Validate diff syntax for compatibility with `git apply` and GitHub PR review formats.
  - [x] Generate GitHub PR body markdown with diagnosis summary, reproduction steps, and applied fix.
  - [x] Expose `generate_patch` diagnostic tool.

---

## 🧪 Acceptance Criteria & Verification
1. **Framework Overhead:** React hook inspection adds $<0.5\text{ms}$ per component render.
2. **Privacy Compliance:** Interaction replay strictly masks passwords, authorization tokens, and marked PII.
3. **Patch Validity:** Generated git diffs apply cleanly against original source files via `git apply`.
4. **Automated Tests:** All unit and integration tests passing (`npm test`).

---

## 📝 Phase Completion & Change Notes
- **[2026-08-30]**: Completed Phase 5! Implemented `FrameworkInterceptor` (React fiber commits, Redux/Zustand store state), `InteractionInterceptor` (30s PII-safe ring buffer for clicks/inputs/scrolls), `PatchEngine` (git-compatible unified diff and GitHub PR body generator), and `generate_patch` tool.

