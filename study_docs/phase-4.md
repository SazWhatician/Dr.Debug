# 🔌 Phase 4: Chrome Extension & Dedicated DevTools Panel

**Package Scope:** `@dr-debug/extension`  
**Status:** ⚪ `Planned`  
**Last Updated:** `2026-08-26`

---

## 🎯 Phase Goal
Deliver a zero-setup Chrome Extension (built with WXT) that allows developers to run Dr. Debug on *any* live website, staging deployment, or production app without modifying source code, complete with a dedicated Chrome DevTools Panel and automatic Source Map resolution.

---

## 📋 Task Checklist & Progress

- [ ] **4.1 WXT (Web Extension Tools) Extension Architecture**
  - [ ] Set up WXT monorepo package supporting Manifest V3 for Chromium-based browsers.
  - [ ] Configure background service worker, popup UI, content scripts, and devtools entrypoints.
  - [ ] Implement secure API key and custom LLM endpoint storage using `chrome.storage.local`.

- [ ] **4.2 Content Script Injection & Interceptor Bridge**
  - [ ] Build isolated content script that injects `@dr-debug/controller` and `@dr-debug/ui` into the host page's execution context (`world: 'MAIN'`).
  - [ ] Establish two-way communication channel between in-page Dr. Debug runtime, extension background worker, and devtools panel.

- [ ] **4.3 Dedicated Chrome DevTools Panel**
  - [ ] Register "Dr. Debug" tab inside Chrome Developer Tools (`chrome.devtools.panels.create`).
  - [ ] Embed the full Dr. Debug diagnostic cockpit directly into the DevTools window for developers who prefer DevTools docking over floating in-page HUDs.
  - [ ] Provide exportable RCA reports (Markdown & JSON format) for sharing in Jira, Linear, or Slack.

- [ ] **4.4 Automatic Source Map Resolution Engine**
  - [ ] Intercept minified stack traces and fetch `.map` files (from inline source maps or remote source map URLs).
  - [ ] Utilize `source-map` / `source-map-js` to map minified runtime bundle line/column numbers back to original TypeScript / JSX source files and function names.

---

## 🧪 Acceptance Criteria & Verification
1. **Third-Party Site Injection:** Extension injects cleanly on arbitrary complex web applications (e.g. GitHub, Reddit, Stripe Dashboard) without console errors or page breakage.
2. **DevTools Integration:** DevTools panel stays in sync with active tab navigation and error events.
3. **Source Map Accuracy:** Accurately unminifies production stack traces down to the exact original TypeScript source line.

---

## 📝 Phase Completion & Change Notes
*(Updates will be logged here as tasks are implemented)*
- **Status:** Initial specification drafted.
