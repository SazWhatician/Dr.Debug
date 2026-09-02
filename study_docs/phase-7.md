# 🐳 Phase 7: Host Docker Bridge & Dedicated Docker Cockpit Page

## 🎯 Objective
Empower Dr. Debug with real-time access to the developer's host Docker engine (containers and live `stdout`/`stderr` log streams) and provide a dedicated, full-featured **Docker Dashboard Page** inside the Shadow DOM Cockpit and DevTools panel.

---

## 🏗️ Architecture & Component Design

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER HOST ENVIRONMENT                           │
│                                                                        │
│   Docker Engine (CLI / Daemon Socket)                                  │
│         │                                                              │
│         ▼ (spawn 'docker ps' & 'docker logs -f')                       │
│   @dr-debug/mcp Daemon (Local Node.js on port 9229)                    │
│     ├── DockerBridge (Zero-dependency event emitter & log streamer)    │
│     ├── GET /docker/status      (Daemon & container status)            │
│     ├── GET /docker/containers  (List active containers & health)      │
│     ├── GET /docker/logs        (Query logs with level/grep/tail)      │
│     └── GET /docker/stream      (Server-Sent Events real-time stream)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ localhost:9229
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   DR. DEBUG IN-BROWSER OBSERVER                        │
│                                                                        │
│   @dr-debug/controller                                                 │
│     ├── DockerBridgeClient (Auto-connects to SSE stream on port 9229)  │
│     ├── DockerInterceptor.pushLog()                                    │
│     └── buildCausalErrorGraph()                                        │
│           (Correlates Docker panics ➔ Network 5xx ➔ React TypeError)   │
│                                                                        │
│   @dr-debug/ui (Shadow DOM HUD Cockpit)                                │
│     └── 🐳 Dedicated Docker Dashboard Tab                              │
│           ├── Status Banner (Daemon Active / Bridge Offline)           │
│           ├── Host Container Grid (Image, status, ports, panics)       │
│           ├── Live Monospace Log Terminal with auto-scroll             │
│           └── ⚡ Inline "Diagnose with Dr. Debug" trigger               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📦 Key Deliverables

### 1. Zero-Dependency Docker Host Bridge (`@dr-debug/mcp`)
- **[DockerBridge.ts](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/mcp/src/DockerBridge.ts)**:
  - Connects to host `docker` CLI without heavy external packages like `dockerode`.
  - Probes daemon availability (`docker version`).
  - Discovers active containers (`docker ps --format "{{json .}}"`).
  - Streams live logs (`docker logs --follow --tail 50 --timestamps <container>`).
  - Classifies severity levels (`FATAL`, `PANIC`, `ERROR`, `EXCEPTION`, `WARN`, `INFO`).
- **[transport.ts](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/mcp/src/transport.ts)**:
  - Mounted `/docker/status`, `/docker/containers`, `/docker/logs`, and `/docker/stream` (SSE).

### 2. Client-Side Bridge Adapter (`@dr-debug/controller`)
- **[DockerBridgeClient.ts](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/controller/src/DockerBridgeClient.ts)**:
  - Connects in-browser via `EventSource` to `http://localhost:9229/docker/stream`.
  - Feeds incoming container logs to `DebugController.pushDockerLog` and containers to `DebugController.setDockerContainers`.
  - Automatic reconnection backoff when daemon restarts.
- **[DebugController.ts](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/controller/src/DebugController.ts)**:
  - Exposes `connectDockerBridge(port?: number)`.

### 3. Dedicated Docker Dashboard Page (`@dr-debug/ui`)
- **[DockerDashboardView.ts](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/ui/src/components/DockerDashboardView.ts)**:
  - **Engine Status Header**: Connection indicator, total container counters, error badges.
  - **Container Selector Grid**: Interactive container cards showing image, exposed ports, status (`running`, `exited`), and error counts. Clicking any container filters the stream.
  - **Live Log Terminal**: Monospace dark-mode console (`JetBrains Mono`), colorized error tags, auto-scroll toggle, search filter (`grep`), and "Clear" / "Copy for AI" actions.
  - **1-Click AI Diagnosis**: Inline `⚡ Diagnose` button on every container error line that directly initiates a causal investigation.
- **[CockpitPanel.ts](file:///c:/Users/saswa/Desktop/DebugCopilot/packages/ui/src/components/CockpitPanel.ts)**:
  - Added dedicated **`🐳 Docker`** tab and body container.
  - Dynamically updates Docker error badge in the tab header.

---

## 🧪 Verification & Results
- **Unit & Integration Suite**:
  - `packages/mcp/test/docker-bridge.test.ts`: Passed (severity classification, status checks, lifecycle).
  - `packages/ui/test/ui.test.ts`: Passed (dedicated Docker tab rendering, status banner, terminal, filters).
  - **Master Suite**: **115/115 tests passing across 30 test files**.
