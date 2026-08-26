# 🎨 Phase 3: Shadow DOM HUD & Standalone IIFE Bundle

**Package Scope:** `@dr-debug/ui`, `dr-debug`  
**Status:** ⚪ `Planned`  
**Last Updated:** `2026-08-26`

---

## 🎯 Phase Goal
Design and build the modern, non-intrusive in-browser developer HUD living inside an isolated Shadow DOM container. Provide a step-by-step diagnostic timeline, error indicator pill, interactive diff viewer for prescribed fixes, and package everything into a standalone, single-file IIFE bundle (`dist/dr-debug.js`).

---

## 📋 Task Checklist & Progress

- [ ] **3.1 Shadow DOM Isolation & CSS Sandbox (`@dr-debug/ui`)**
  - [ ] Mount UI inside `#dr-debug-root` with `attachShadow({ mode: 'open' })`.
  - [ ] Implement zero-bleed, pure Vanilla CSS styling to ensure host webpage styles never alter the HUD and vice versa.
  - [ ] Support dark/light mode detection with sleek modern developer aesthetics.

- [ ] **3.2 Floating Status Pill & Draggable Widget**
  - [ ] Compact floating status badge showing live health summary: `⚠️ 2 Errors | 1 Slow Network`.
  - [ ] Draggable / dockable positioning (retains user preference in `localStorage`).
  - [ ] Pulse animation when an active error occurs or when an investigation is running.

- [ ] **3.3 Interactive Diagnostic HUD Panel**
  - [ ] **Triage Stream Tab:** Live view of captured Console, Network, Web Vitals, and Heap.
  - [ ] **Investigation Timeline View:** Step-by-step display showing:
    - Current Hypothesis & Thought Process
    - Tool Dispatched & Raw Output
    - Persistent Discovered Facts
  - [ ] **Prescription / Root Cause Card:**
    - Plain English explanation of the issue
    - Culprit file and line number
    - Syntax-highlighted unified diff code fix with "Copy Patch" button.
  - [ ] **Manual Investigation Input:** Search bar allowing developers to prompt Dr. Debug (e.g. *"Why is checkout lagging?"*).

- [ ] **3.4 Standalone IIFE Distribution (`dr-debug`)**
  - [ ] Configure Vite/Rollup IIFE build combining Controller, Core, LLMs, and UI into `dist/dr-debug.js`.
  - [ ] Enable one-line script tag embedding with `data-*` attributes (`data-model`, `data-api-key`, `data-auto-investigate`).
  - [ ] Export programmatic TypeScript API: `new DrDebug({ ... }).investigate(...)`.

---

## 🧪 Acceptance Criteria & Verification
1. **Style Isolation:** Zero style bleed between complex UI frameworks (Tailwind, Bootstrap, Material UI) and the Shadow DOM HUD.
2. **Bundle Size:** Minified standalone IIFE bundle size $\le 45\text{ KB}$ (gzipped).
3. **Responsiveness:** Smooth 60fps dragging and step timeline animations without blocking host webpage events.

---

## 📝 Phase Completion & Change Notes
*(Updates will be logged here as tasks are implemented)*
- **Status:** Initial specification drafted.
