# 🌐 Phase 6: Model Context Protocol (MCP) Server & IDE Bridge

**Package Scope:** `@dr-debug/mcp`  
**Status:** ⚪ `Planned`  
**Last Updated:** `2026-08-26`

---

## 🎯 Phase Goal
Turn Dr. Debug into a standard Model Context Protocol (MCP) server, allowing IDE AI agents (Cursor, Claude Code, Antigravity, Windsurf) to connect directly to the live browser runtime, query diagnostic resources in real-time, and trigger in-browser investigations from within the code editor.

---

## 📋 Task Checklist & Progress

- [ ] **6.1 Local Telemetry Transport Bridge (WebSocket & SSE)**
  - [ ] Implement lightweight local daemon server (`@dr-debug/mcp`) running on `localhost:9229`.
  - [ ] Establish auto-reconnecting WebSocket bridge between browser tab (script tag / extension) and the local MCP daemon.
  - [ ] Support multi-tab session routing (querying specific browser tabs by URL or tab ID).

- [ ] **6.2 MCP Resource Implementation**
  - [ ] Expose `drdebug://state/live`: Real-time `<debug_state>` XML token snapshot.
  - [ ] Expose `drdebug://console/errors`: Stream of uncaught exceptions and console traces.
  - [ ] Expose `drdebug://network/failures`: Active 4xx/5xx HTTP failures and CORS blocks.
  - [ ] Expose `drdebug://performance/vitals`: Live Web Vitals (LCP, CLS, INP) and Long Tasks.

- [ ] **6.3 MCP Tool Registration**
  - [ ] `drdebug_get_diagnostics`: Returns aggregated health summary and active anomalies.
  - [ ] `drdebug_inspect_request`: Fetches full HTTP request/response payloads for a given index.
  - [ ] `drdebug_inspect_error`: Fetches demangled stack trace and source location for an error.
  - [ ] `drdebug_execute_script`: Evaluates diagnostic JS expressions in the running webpage from the IDE.
  - [ ] `drdebug_investigate_issue`: Initiates Dr. Debug's in-browser Re-Act loop and returns root cause + fix to the IDE.

- [ ] **6.4 One-Command IDE Configuration**
  - [ ] Package `@dr-debug/mcp` for `npx @dr-debug/mcp` zero-install execution.
  - [ ] Provide simple copy-paste configuration snippet for `mcp_config.json` / Claude Desktop / Cursor.

---

## 🧪 Acceptance Criteria & Verification
1. **MCP Compliance:** Passes all official `@modelcontextprotocol/sdk` validation and inspector tests.
2. **Latency:** Local WebSocket telemetry round-trip latency $<15\text{ms}$.
3. **IDE Integration:** Cursor / Claude Code successfully queries live browser console errors and diagnoses a runtime bug without user manually copy-pasting logs.

---

## 📝 Phase Completion & Change Notes
*(Updates will be logged here as tasks are implemented)*
- **Status:** Initial specification drafted.
