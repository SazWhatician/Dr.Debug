import { DrDebug } from '../packages/dr-debug/src/index.js'
import { MockLLMClient } from '../packages/llms/src/index.js'

let doctor: DrDebug | null = null

const storedKey = localStorage.getItem('dr_debug_api_key') || ''
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement
const providerSelect = document.getElementById('provider-select') as HTMLSelectElement
const agentStatus = document.getElementById('agent-status') as HTMLSpanElement

if (apiKeyInput && storedKey) {
  apiKeyInput.value = storedKey
}

// Rich 4-step mock that demonstrates the full Re-Act loop
function createRichMock(): MockLLMClient {
  return new MockLLMClient({
    responses: [
      {
        toolCalls: [{
          id: 'c1', type: 'function',
          function: { name: 'inspect_error', arguments: JSON.stringify({ errorIndex: 0 }) }
        }]
      },
      {
        toolCalls: [{
          id: 'c2', type: 'function',
          function: { name: 'inspect_request', arguments: JSON.stringify({ requestIndex: 0 }) }
        }]
      },
      {
        toolCalls: [{
          id: 'c3', type: 'function',
          function: { name: 'inspect_docker_logs', arguments: JSON.stringify({ level: 'error', tail: 10 }) }
        }]
      },
      {
        toolCalls: [{
          id: 'c4', type: 'function',
          function: { name: 'graphify_errors', arguments: JSON.stringify({ includeDocker: true, timeframeMs: 8000 }) }
        }]
      },
      {
        toolCalls: [{
          id: 'c5', type: 'function',
          function: {
            name: 'done',
            arguments: JSON.stringify({
              diagnosis: 'The frontend TypeError is a direct downstream effect of the API returning 503. The API is failing because the PostgreSQL container (postgres-db) exhausted its connection pool — confirmed in Docker stderr: "FATAL: remaining connection slots reserved for superuser".',
              rootCause: 'PostgreSQL max_connections (100) reached due to a connection leak in the backend ORM layer — sessions are not being closed after requests, accumulating until the pool saturates. This causes the API to return 503 on all new requests, which the frontend fetch handler does not guard against, producing the uncaught TypeError.',
              confidence: 0.97,
              filesToModify: ['backend/src/db/session.py', 'frontend/src/api/client.ts'],
              fix: '--- a/backend/src/db/session.py\n+++ b/backend/src/db/session.py\n@@ -24,5 +24,6 @@\n async def get_db():\n-    session = SessionFactory()\n-    yield session\n+    async with SessionFactory() as session:\n+        yield session\n+        await session.close()\n\n--- a/frontend/src/api/client.ts\n+++ b/frontend/src/api/client.ts\n@@ -8,3 +8,5 @@\n export async function callAPI(url: string) {\n   const res = await fetch(url)\n-  return res.json()\n+  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)\n+  return res.json().catch(() => null)\n }'
            })
          }
        }]
      }
    ]
  })
}

function seedDocker(): void {
  if (!doctor) return
  const ctrl = doctor.getController()
  ctrl.setDockerContainers([
    { id: 'api-1', name: 'api-server', image: 'node:18-alpine', status: 'running' },
    { id: 'db-1', name: 'postgres-db', image: 'postgres:15', status: 'running' },
    { id: 'cache-1', name: 'redis-cache', image: 'redis:7', status: 'running' },
  ])
}

function initDrDebug(): void {
  if (doctor) doctor.destroy()

  const provider = providerSelect.value
  const apiKey = apiKeyInput.value.trim()
  if (apiKey) localStorage.setItem('dr_debug_api_key', apiKey)

  if (provider === 'mock') {
    doctor = new DrDebug({ llmClient: createRichMock(), enableUI: true })
    agentStatus.textContent = '🟢 Mock AI Agent active — no API key needed. Trigger a scenario then click Investigate Now.'
  } else if (provider === 'groq') {
    doctor = new DrDebug({ baseURL: 'https://api.groq.com/openai/v1', apiKey: apiKey || undefined, model: 'openai/gpt-oss-120b', enableUI: true })
    agentStatus.textContent = apiKey ? '⚡ Connected to Groq (openai/gpt-oss-120b).' : '⚠️ Enter your Groq API key above and click Apply.'
  } else {
    doctor = new DrDebug({ apiKey: apiKey || undefined, model: 'gpt-4o', enableUI: true })
    agentStatus.textContent = apiKey ? '🧠 Connected to OpenAI (gpt-4o).' : '⚠️ Enter your OpenAI API key above and click Apply.'
  }

  seedDocker()
  console.log('🩺 [Playground] Dr. Debug initialized.')
}

initDrDebug()

document.getElementById('btn-reinit')?.addEventListener('click', initDrDebug)

providerSelect.addEventListener('change', () => {
  const isMock = providerSelect.value === 'mock'
  const keyGroup = document.getElementById('api-key-group')
  if (keyGroup) keyGroup.style.opacity = isMock ? '0.4' : '1'
})

// ─────────────────────────────────────────────
// Frontend bug triggers
// ─────────────────────────────────────────────
document.getElementById('trigger-null-error')?.addEventListener('click', () => {
  try {
    const rawData: any = { user: null }
    rawData.user.profile.badges.map((b: any) => b.title)
  } catch (err: any) {
    console.error(err)
  }
})

document.getElementById('trigger-404')?.addEventListener('click', async () => {
  try { await fetch('/api/v1/user/metrics/404-not-found') } catch {}
})

document.getElementById('trigger-cors')?.addEventListener('click', async () => {
  try {
    await fetch('https://inaccessible-origin-example-security.org/v1/data')
  } catch (err: any) {
    console.error('CORS blocked:', err)
  }
})

document.getElementById('trigger-log-spam')?.addEventListener('click', () => {
  for (let i = 1; i <= 8; i++) {
    console.warn(`[SystemWarning] Heartbeat jitter seq=${i} latency=${100 + i * 40}ms`)
  }
  console.error('[FatalException] Connection pool exhausted at ConnectionManager.ts:42')
})

// ─────────────────────────────────────────────
// Docker log triggers
// ─────────────────────────────────────────────
document.getElementById('trigger-db-crash')?.addEventListener('click', () => {
  if (!doctor) return
  const ctrl = doctor.getController()
  ctrl.pushDockerLog('postgres-db', 'FATAL: remaining connection slots are reserved for non-replication superuser connections', 'stderr')
  ctrl.pushDockerLog('postgres-db', 'ERROR: max_connections (100) reached — refusing new connection from 172.20.0.3', 'stderr')
  ctrl.pushDockerLog('api-server', 'PrismaClientKnownRequestError: P2024 Timed out fetching a new connection from the connection pool', 'stderr')
  ctrl.pushDockerLog('api-server', 'Error: POST /api/v1/resource/run failed — upstream DB unavailable', 'stderr')
  console.error('[API] Backend returned 503: DB connection pool exhausted')
})

document.getElementById('trigger-oom')?.addEventListener('click', () => {
  if (!doctor) return
  const ctrl = doctor.getController()
  ctrl.pushDockerLog('api-server', 'FATAL: Killed process 1 (node) — Total anonymous memory 512M/512M used', 'stderr')
  ctrl.pushDockerLog('api-server', 'ERROR: OOMKiller activated. Container memory limit (512Mi) exceeded.', 'stderr')
  ctrl.pushDockerLog('redis-cache', 'WARNING: Memory overcommit must be enabled! Background save may fail under low memory conditions.', 'stdout')
  console.error('[System] OOM kill detected on api-server — container restarting')
})

document.getElementById('trigger-cascade')?.addEventListener('click', async () => {
  if (!doctor) return
  const ctrl = doctor.getController()
  // Layer 1: DB crash
  ctrl.pushDockerLog('postgres-db', "FATAL: database \"app_db\" does not exist", 'stderr')
  ctrl.pushDockerLog('api-server', "PrismaClientKnownRequestError: P1001 Can't reach database server at postgres-db:5432", 'stderr')
  await new Promise(r => setTimeout(r, 250))
  // Layer 2: API failure
  try { await fetch('/api/v1/health') } catch {}
  await new Promise(r => setTimeout(r, 150))
  // Layer 3: Frontend crash from the API failure
  try {
    const data: any = undefined
    data.users.length
  } catch (err: any) {
    console.error('Cascade failure:', err)
  }
})

// ─────────────────────────────────────────────
// Autonomous investigation
// ─────────────────────────────────────────────
document.getElementById('btn-run-investigation')?.addEventListener('click', async () => {
  const goalInput = document.getElementById('goal-input') as HTMLInputElement
  const goal = goalInput?.value || 'Diagnose all current errors and find the root cause'
  if (!doctor) return

  doctor.getUI()?.openCockpit()

  try {
    await doctor.investigate(goal)
  } catch (err: any) {
    console.error('Investigation failed:', err)
  }
})

// ─────────────────────────────────────────────
// Live telemetry preview (1-second poll)
// ─────────────────────────────────────────────
setInterval(() => {
  if (!doctor) return
  const snapshot = doctor.getController().getSnapshot()

  const consoleCount = document.getElementById('console-count')
  const consolePreview = document.getElementById('console-preview')
  if (consoleCount && consolePreview) {
    consoleCount.textContent = String(snapshot.console.entries.length)
    consolePreview.textContent = snapshot.console.entries.length > 0
      ? snapshot.console.entries.slice(-5).map(c => `[${c.level.toUpperCase()}] ${c.message}`).join('\n')
      : 'No console entries recorded yet.'
  }

  const networkCount = document.getElementById('network-count')
  const networkPreview = document.getElementById('network-preview')
  if (networkCount && networkPreview) {
    networkCount.textContent = String(snapshot.network.records.length)
    networkPreview.textContent = snapshot.network.records.length > 0
      ? snapshot.network.records.slice(-5).map(n => `[${n.method}] ${n.url} ${n.status ? `(${n.status})` : ''} ${n.isFailed ? '❌' : n.isSlow ? '⏳' : ''}`).join('\n')
      : 'No network entries recorded yet.'
  }

  const dockerCount = document.getElementById('docker-count')
  const dockerPreview = document.getElementById('docker-preview')
  if (dockerCount && dockerPreview) {
    dockerCount.textContent = String(snapshot.docker.logs.length)
    dockerPreview.textContent = snapshot.docker.logs.length > 0
      ? snapshot.docker.logs.slice(-5).map(l => `[${l.containerName}] ${l.level.toUpperCase()}: ${l.message.slice(0, 80)}`).join('\n')
      : 'No Docker logs yet. Click a Docker trigger above.'
  }
}, 1000)
