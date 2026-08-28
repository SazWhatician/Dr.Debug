# 🔌 Phase 4: Chrome Extension & Dedicated DevTools Panel

**Package Scope:** `@dr-debug/extension`  
**Status:** 🟢 `Completed`  
**Last Updated:** `2026-08-27`

---

## 🎯 Phase Goal
Deliver a zero-setup Chrome Extension that allows developers to run Dr. Debug on *any* live website, staging deployment, or production app without modifying source code, complete with a dedicated Chrome DevTools Panel and automatic Source Map resolution.

---

## 📋 Task Checklist & Progress

- [x] **4.1 Manifest V3 Extension Architecture (`@dr-debug/extension`)**
  - [x] Set up `@dr-debug/extension` monorepo package supporting Manifest V3 for Chromium-based browsers.
  - [x] Configure background service worker, popup UI, content scripts, and devtools entrypoints.
  - [x] Implement secure settings and model storage using `chrome.storage.local`.

- [x] **4.2 Content Script Injection & Interceptor Bridge**
  - [x] Build isolated content script that injects `DrDebug` into the host page's execution context.
  - [x] Establish two-way communication channel between in-page Dr. Debug runtime, extension background worker, and devtools panel.

- [x] **4.3 Dedicated Chrome DevTools Panel & RCA Exporter**
  - [x] Register "Dr. Debug" tab inside Chrome Developer Tools (`devtools.ts`).
  - [x] Embed the diagnostic cockpit directly into the DevTools window for developers who prefer DevTools docking.
  - [x] Provide exportable RCA reports (Markdown & JSON format) for sharing in Jira, Linear, or Slack.

- [x] **4.4 Automatic Source Map Resolution Engine**
  - [x] Implement fast Base64-VLQ decoder (`decodeVLQ`) for standard SourceMap V3.
  - [x] Build `SourceMapResolver` to map minified bundle `line:col` back to original TypeScript / JSX source files.
  - [x] Implement `demangleStack` to unminify runtime error stack traces.

---

## 🧪 Acceptance Criteria & Verification
1. **Third-Party Site Injection:** Extension injects cleanly on arbitrary complex web applications without console errors.
2. **DevTools Integration:** Dedicated panel stays in sync with active tab navigation and error events.
3. **Source Map Accuracy:** Accurately unminifies production stack traces down to the exact original TypeScript source line.
4. **Test Suite:** All 50 monorepo tests passing cleanly (`npm test`).
5. **Type Safety:** 100% strict TypeScript typecheck passes with zero errors (`npm run typecheck`).

---

## 📝 Phase Completion & Change Notes
- **[2026-08-27]**: Implemented `@dr-debug/extension` package with Manifest V3 background service worker, content script bridge, DevTools RCA Markdown/JSON exporter, and VLQ `SourceMapResolver`.
- **[2026-08-28]**: Hardened network and console interceptors to eliminate third-party site breakage (fixed `fetch`/`XHR` illegal invocation, recursive getter/setter loops, stream locking on SSE, early DOM insertion during `document_start`, and circular JSON handling). All 50 tests passing cleanly.
