import type { DockerContainerInfo } from '../packages/controller/src/index.js'
import { DrDebug } from '../packages/dr-debug/src/index.js'

let doctor: DrDebug | null = null

const storedKey = localStorage.getItem('dr_debug_api_key') || ''
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement
const providerSelect = document.getElementById('provider-select') as HTMLSelectElement
const agentStatus = document.getElementById('agent-status') as HTMLSpanElement

if (apiKeyInput) apiKeyInput.value = storedKey

/**
 * Containers the DockerInterceptor knows about. Real deployments feed this from
 * `docker ps`; here the triggers below stand in for a live log stream.
 */
const CONTAINERS: DockerContainerInfo[] = [
  { id: 'api-1', name: 'api-server', image: 'node:18-alpine', state: 'running', status: 'Up 4 minutes', ports: ['3000:3000'] },
  { id: 'db-1', name: 'postgres-db', image: 'postgres:15', state: 'running', status: 'Up 4 minutes', ports: ['5432:5432'] },
  { id: 'cache-1', name: 'redis-cache', image: 'redis:7', state: 'running', status: 'Up 4 minutes', ports: ['6379:6379'] }
]

function initDrDebug(): void {
  if (doctor) doctor.destroy()

  const provider = providerSelect.value
  const apiKey = (apiKeyInput.value || '').trim()
  if (apiKey) localStorage.setItem('dr_debug_api_key', apiKey)

  if (provider === 'local') {
    // No llmClient passed: DrDebug falls back to HeuristicLLMClient, which reads
    // live telemetry each turn instead of replaying a canned script.
    doctor = new DrDebug({ enableUI: true })
    agentStatus.textContent =
      'Local engine active — no API key needed. It reads your real console/network/Docker buffers, picks the next tool from what it finds, and derives the diagnosis from the evidence.'
  } else if (provider === 'groq') {
    doctor = new DrDebug({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey,
      model: 'openai/gpt-oss-120b',
      enableUI: true
    })
    agentStatus.textContent = apiKey
      ? 'Connected to Groq (openai/gpt-oss-120b) — the LLM drives tool selection.'
      : 'Enter a Groq API key above and press Apply, or switch back to the local engine.'
  } else {
    doctor = new DrDebug({ apiKey: apiKey || undefined, model: 'gpt-4o', enableUI: true })
    agentStatus.textContent = apiKey
      ? 'Connected to OpenAI (gpt-4o) — the LLM drives tool selection.'
      : 'Enter an OpenAI API key above and press Apply, or switch back to the local engine.'
  }

  doctor.getController().setDockerContainers(CONTAINERS)
  ;(window as any).__DR_DEBUG__ = doctor
}

initDrDebug()

document.getElementById('btn-reinit')?.addEventListener('click', initDrDebug)

providerSelect.addEventListener('change', () => {
  const needsKey = providerSelect.value !== 'local'
  const keyGroup = document.getElementById('api-key-group')
  if (keyGroup) {
    keyGroup.style.opacity = needsKey ? '1' : '0.4'
    keyGroup.style.pointerEvents = needsKey ? 'auto' : 'none'
  }
})
providerSelect.dispatchEvent(new Event('change'))

// ── Frontend fault triggers ───────────────────────────────────────────────────
// Each one produces a genuine browser event that the interceptors record; the
// engine then analyses whatever actually landed in the buffers.

document.getElementById('trigger-null-error')?.addEventListener('click', () => {
  try {
    const payload: any = { user: null }
    payload.user.profile.badges.map((b: any) => b.title)
  } catch (err) {
    console.error(err)
  }
})

document.getElementById('trigger-404')?.addEventListener('click', async () => {
  try {
    await fetch('/api/v1/user/metrics/does-not-exist')
  } catch {
    /* recorded by the network interceptor */
  }
})

document.getElementById('trigger-cors')?.addEventListener('click', async () => {
  try {
    await fetch('https://inaccessible-origin-example-security.org/v1/data')
  } catch (err: any) {
    console.error('Cross-origin request blocked:', err)
  }
})

document.getElementById('trigger-log-spam')?.addEventListener('click', () => {
  for (let i = 1; i <= 8; i++) {
    console.warn(`[Heartbeat] jitter seq=${i} latency=${100 + i * 40}ms`)
  }
  console.error('[ConnectionManager] Connection pool exhausted at ConnectionManager.ts:42')
})

// ── Backend (Docker) fault triggers ──────────────────────────────────────────

function pushLogs(entries: Array<[string, string, ('stdout' | 'stderr')?]>): void {
  const ctrl = doctor?.getController()
  if (!ctrl) return
  entries.forEach(([container, message, stream]) => {
    ctrl.pushDockerLog(container, message, stream ?? 'stderr')
  })
}

document.getElementById('trigger-db-crash')?.addEventListener('click', () => {
  pushLogs([
    ['postgres-db', 'FATAL: remaining connection slots are reserved for non-replication superuser connections'],
    ['postgres-db', 'ERROR: max_connections (100) reached — refusing new connection from 172.20.0.3'],
    ['api-server', 'PrismaClientKnownRequestError: P2024 Timed out fetching a new connection from the connection pool'],
    ['api-server', 'Error: POST /api/v1/resource/run failed — upstream DB unavailable']
  ])
  console.error('[API] Backend returned 503: DB connection pool exhausted')
})

document.getElementById('trigger-oom')?.addEventListener('click', () => {
  pushLogs([
    ['api-server', 'FATAL: Killed process 1 (node) — total anonymous memory 512M/512M used'],
    ['api-server', 'ERROR: OOMKiller activated. Container memory limit (512Mi) exceeded.'],
    ['redis-cache', 'WARNING: Memory overcommit must be enabled — background save may fail under low memory', 'stdout']
  ])
  console.error('[System] OOM kill detected on api-server — container restarting')
})

/**
 * Emits a fault at each layer in real chronological order so the correlation
 * engine has genuine timestamps to link, rather than a pre-built graph.
 */
document.getElementById('trigger-cascade')?.addEventListener('click', async () => {
  pushLogs([
    ['postgres-db', 'FATAL: database "app_db" does not exist'],
    ['api-server', "PrismaClientKnownRequestError: P1001 Can't reach database server at postgres-db:5432"]
  ])

  await new Promise((r) => setTimeout(r, 260))
  try {
    // Port 9 (discard) refuses connections, so this is a real transport failure
    // rather than something the dev server answers with a 200.
    await fetch('http://127.0.0.1:9/api/v1/health')
  } catch {
    /* recorded by the network interceptor */
  }

  await new Promise((r) => setTimeout(r, 180))
  try {
    const data: any = undefined
    data.users.length
  } catch (err) {
    console.error('Cascade failure reached the client:', err)
  }
})

// ── Investigation & hand-off ─────────────────────────────────────────────────

document.getElementById('btn-run-investigation')?.addEventListener('click', async () => {
  const goalInput = document.getElementById('goal-input') as HTMLInputElement
  const goal = goalInput?.value?.trim() || 'Diagnose every active fault and identify the root cause'
  if (!doctor) return

  doctor.getUI()?.openCockpit()
  try {
    await doctor.investigate(goal)
  } catch (err) {
    console.error('Investigation failed:', err)
  }
})

const copyBriefBtn = document.getElementById('btn-copy-brief') as HTMLButtonElement | null
copyBriefBtn?.addEventListener('click', async () => {
  if (!doctor) return
  const brief = doctor.getSessionDebugPrompt()
  const original = copyBriefBtn.textContent
  try {
    await navigator.clipboard.writeText(brief)
    copyBriefBtn.textContent = `Copied ${(brief.length / 1024).toFixed(1)}KB brief`
  } catch {
    copyBriefBtn.textContent = 'Copy failed — see console'
    console.log(brief)
  }
  setTimeout(() => { copyBriefBtn.textContent = original }, 2600)
})

document.getElementById('btn-clear')?.addEventListener('click', () => {
  doctor?.getController().clear()
  doctor?.getUI()?.clearTimeline()
})

// ── Live telemetry preview ───────────────────────────────────────────────────

setInterval(() => {
  if (!doctor) return
  const snapshot = doctor.getController().getSnapshot()

  const set = (countId: string, previewId: string, count: number, text: string) => {
    const countEl = document.getElementById(countId)
    const previewEl = document.getElementById(previewId)
    if (countEl) countEl.textContent = String(count)
    if (previewEl) previewEl.textContent = text
  }

  set(
    'console-count',
    'console-preview',
    snapshot.console.entries.length,
    snapshot.console.entries.length > 0
      ? snapshot.console.entries
          .slice(-5)
          .map((c) => `[${c.level.toUpperCase()}] ${c.message.slice(0, 110)}${c.count > 1 ? ` (×${c.count})` : ''}`)
          .join('\n')
      : 'Nothing recorded yet.'
  )

  set(
    'network-count',
    'network-preview',
    snapshot.network.records.length,
    snapshot.network.records.length > 0
      ? snapshot.network.records
          .slice(-5)
          .map((n) => {
            const flag = n.isFailed ? 'FAILED' : n.isSlow ? 'SLOW' : 'ok'
            return `${n.method} ${n.url.slice(0, 60)} → ${n.status ?? '—'} [${flag}]`
          })
          .join('\n')
      : 'Nothing recorded yet.'
  )

  set(
    'docker-count',
    'docker-preview',
    snapshot.docker?.logs.length ?? 0,
    (snapshot.docker?.logs.length ?? 0) > 0
      ? snapshot.docker!.logs
          .slice(-5)
          .map((l) => `[${l.containerName}] ${l.level.toUpperCase()}: ${l.message.slice(0, 90)}`)
          .join('\n')
      : 'No container logs yet — use a backend trigger above.'
  )

  const graphEl = document.getElementById('graph-summary')
  if (graphEl) {
    const graph = snapshot.causalGraph
    graphEl.textContent = graph && graph.nodes.length > 0
      ? `${graph.nodes.length} error node(s), ${graph.edges.length} causal edge(s)` +
        (graph.rootCauseNodeId
          ? ` · root: ${graph.nodes.find((n) => n.id === graph.rootCauseNodeId)?.label ?? 'unknown'}`
          : ' · no root attributed yet')
      : 'No correlations yet — trigger faults in more than one layer.'
  }
}, 1000)
