# ⚡ Phase 5: Framework Hooks, Interaction Replay & Auto-Fix Engine

**Package Scope:** `@dr-debug/core`, `@dr-debug/controller`  
**Status:** ⚪ `Planned`  
**Last Updated:** `2026-08-26`

---

## 🎯 Phase Goal
Supercharge Dr. Debug with deep framework-level intelligence (React component trees, Redux/Zustand store state), lightweight 30-second DOM session interaction replay via `rrweb`, and an automated GitHub-compatible Pull Request / patch generation engine.

---

## 📋 Task Checklist & Progress

- [ ] **5.1 Deep Framework State Interceptors**
  - [ ] **React DevTools Hook:** Hook `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` to read live component hierarchy, props, state, and render counts.
  - [ ] **Redux / Zustand Inspection:** Hook `window.__REDUX_DEVTOOLS_EXTENSION__` to capture dispatched actions, state diffs, and current store snapshots.
  - [ ] **Vue / Svelte Support:** Add adapter to detect and query Vue 3 / Svelte reactive component contexts when present.

- [ ] **5.2 Lightweight Pre-Bug Interaction Replay (`rrweb`)**
  - [ ] Integrate lightweight, privacy-conscious `rrweb-record` ring buffer holding the last **30 seconds** of user interactions (clicks, inputs, scrolls, DOM mutations).
  - [ ] Automatically mask sensitive input fields (`[type="password"]`, credit card inputs, `data-private`).
  - [ ] Feed serialized user interaction sequence to LLM when investigating reproduction steps: *"User clicked #checkout-btn → hovered dropdown → scrolled to footer"*.

- [ ] **5.3 Automated Auto-Fix & PR Engine**
  - [ ] Format prescribed fixes from the `done` tool into standard **unified diff (`.patch`)** format.
  - [ ] Validate diff syntax for compatibility with `git apply` and GitHub PR review formats.
  - [ ] Optional GitHub API integration: Create draft branch and open PR with diagnosis summary, reproduction steps, and applied fix.

---

## 🧪 Acceptance Criteria & Verification
1. **Framework Overhead:** React hook inspection adds $<0.5\text{ms}$ per component render.
2. **Privacy Compliance:** Interaction replay strictly masks passwords, authorization tokens, and marked PII.
3. **Patch Validity:** Generated git diffs apply cleanly against original source files via `git apply`.

---

## 📝 Phase Completion & Change Notes
*(Updates will be logged here as tasks are implemented)*
- **Status:** Initial specification drafted.
