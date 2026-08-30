# 🌐 Phase 6: Model Context Protocol (MCP) Server & IDE Bridge

**Package Scope:** `@dr-debug/mcp`  
**Status:** 🟢 `Completed`  
**Last Updated:** `2026-08-30`

---

## 🎯 Phase Goal
Turn Dr. Debug into a standard Model Context Protocol (MCP) server, allowing IDE AI agents (Cursor, Claude Code, Antigravity, Windsurf) to connect directly to the live browser runtime, query diagnostic resources in real-time, and trigger in-browser investigations from within the code editor.

---

## 📋 Task Checklist & Progress

- [x] **6.1 Local Telemetry Transport Bridge (HTTP & WebSocket)**
  - [x] Implement lightweight local daemon server (`@dr-debug/mcp`) running on `localhost:9229`.
  - [x] Establish live telemetry bridge between browser tab (`DrDebug.ts`) and the local MCP daemon.
  - [x] Support multi-tab session routing (querying specific browser tabs by URL or tab ID).

- [x] **6.2 MCP Resource Implementation**
  - [x] Expose `drdebug://state/live`: Real-time `<debug_state>` XML token snapshot.
  - [x] Expose `drdebug://console/errors`: Stream of uncaught exceptions and console traces.
  - [x] Expose `drdebug://network/failures`: Active 4xx/5xx HTTP failures and CORS blocks.
  - [x] Expose `drdebug://interactions/replay`: User interaction sequence in the 30s leading up to errors.
  - [x] Expose `drdebug://matrix/diagnostics`: 2D Substrate × Severity grid.

- [x] **6.3 MCP Tool Registration**
  - [x] `drdebug_get_diagnostics`: Returns aggregated health summary and active anomalies.
  - [x] `drdebug_inspect_request`: Fetches full HTTP request/response payloads for a given request ID.
  - [x] `drdebug_inspect_error`: Fetches demangled stack trace and source location for an error.
  - [x] `drdebug_get_interaction_replay`: Fetches human-readable user reproduction sequence.
  - [x] `drdebug_execute_script`: Evaluates diagnostic JS expressions in the running webpage from the IDE.

- [x] **6.4 One-Command IDE Configuration**
  - [x] Package `@dr-debug/mcp` with CLI executable binary `dr-debug-mcp` (`npx @dr-debug/mcp`).
  - [x] Provide simple copy-paste configuration snippet for `mcp_config.json` / Claude Desktop / Cursor.

---

## 🧪 Acceptance Criteria & Verification
1. **MCP Compliance:** Adheres strictly to MCP JSON-RPC 2.0 protocol specifications.
2. **Standard Library First:** Zero external networking bloat (built with `node:http`).
3. **IDE Integration:** Cursor / Claude Code / Antigravity successfully query live browser resources and execute tools without manual copy-pasting.
4. **Automated Tests:** All unit and integration tests passing (`npm test`).

---

## 📝 Phase Completion & Change Notes
- **[2026-08-30]**: Completed Phase 6! Created `@dr-debug/mcp` package with `DrDebugMCPServer`, `MCPResourceManager`, `MCPToolManager`, `MCPTransport`, and CLI runner `npx @dr-debug/mcp`. Added live telemetry sync bridge in `packages/dr-debug/src/DrDebug.ts`.

