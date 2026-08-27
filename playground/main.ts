import { DrDebug } from '../packages/dr-debug/src/index.js'
import { MockLLMClient } from '../packages/llms/src/index.js'

let doctor: DrDebug | null = null

// Load stored API key if any
const storedKey = localStorage.getItem('dr_debug_api_key') || ''
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement
const providerSelect = document.getElementById('provider-select') as HTMLSelectElement
const agentStatus = document.getElementById('agent-status') as HTMLSpanElement

if (apiKeyInput && storedKey) {
  apiKeyInput.value = storedKey
}

function initDrDebug() {
  if (doctor) {
    doctor.destroy()
  }

  const provider = providerSelect.value
  const apiKey = apiKeyInput.value.trim()

  if (apiKey) {
    localStorage.setItem('dr_debug_api_key', apiKey)
  }

  if (provider === 'mock') {
    doctor = new DrDebug({
      llmClient: new MockLLMClient({
        responses: [
          {
            toolCalls: [
              {
                id: 'call_1',
                type: 'function',
                function: {
                  name: 'inspect_error',
                  arguments: JSON.stringify({ errorIndex: 0 })
                }
              }
            ]
          },
          {
            toolCalls: [
              {
                id: 'call_2',
                type: 'function',
                function: {
                  name: 'done',
                  arguments: JSON.stringify({
                    diagnosis: 'Detected uncaught TypeError caused by uninitialized data structure in component tree.',
                    rootCause: 'Data array was undefined when rendering list items without fallback empty array.',
                    fix: '--- a/UserProfile.tsx\n+++ b/UserProfile.tsx\n@@ -12,3 +12,3 @@\n- const items = data.items.map(i => i.name)\n+ const items = (data?.items || []).map(i => i.name)',
                    confidence: 0.96,
                    filesToModify: ['UserProfile.tsx']
                  })
                }
              }
            ]
          }
        ]
      }),
      enableUI: true
    })
    agentStatus.textContent = '🟢 Dr. Debug running in Mock Mode (Simulated AI Agent, Zero Keys needed).'
  } else if (provider === 'groq') {
    doctor = new DrDebug({
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: apiKey || undefined,
      model: 'openai/gpt-oss-120b',
      enableUI: true
    })
    agentStatus.textContent = apiKey 
      ? '⚡ Dr. Debug connected to Groq LPU Ultra-Fast Inference (Model: openai/gpt-oss-120b).' 
      : '⚠️ Groq mode selected: Please enter your Groq API Key above and click Apply.'
  } else {
    doctor = new DrDebug({
      apiKey: apiKey || undefined,
      model: 'gpt-4o',
      enableUI: true
    })
    agentStatus.textContent = apiKey 
      ? '🧠 Dr. Debug connected to OpenAI (Model: gpt-4o).' 
      : '⚠️ OpenAI mode selected: Please enter your OpenAI API Key above and click Apply.'
  }

  console.log('🩺 [Playground] Dr. Debug initialized successfully!')
}

// 1. Initial Dr. Debug Setup
initDrDebug()

// Re-init button
document.getElementById('btn-reinit')?.addEventListener('click', () => {
  initDrDebug()
})

providerSelect.addEventListener('change', () => {
  const isMock = providerSelect.value === 'mock'
  const keyGroup = document.getElementById('api-key-group')
  if (keyGroup) {
    keyGroup.style.opacity = isMock ? '0.4' : '1'
  }
})

// 2. Trigger Bug Scenarios
document.getElementById('trigger-null-error')?.addEventListener('click', () => {
  console.log('💥 [Trigger] Simulating uncaught TypeError in UI component...')
  try {
    const rawData: any = { user: null }
    rawData.user.profile.badges.map((b: any) => b.title)
  } catch (err: any) {
    console.error(err)
  }
})

document.getElementById('trigger-404')?.addEventListener('click', async () => {
  console.log('💥 [Trigger] Dispatching failed 404 API request...')
  try {
    await fetch('/api/v1/user/metrics/404-not-found')
  } catch (err) {
    console.warn('Fetch failed:', err)
  }
})

document.getElementById('trigger-cors')?.addEventListener('click', async () => {
  console.log('💥 [Trigger] Dispatching cross-origin request to trigger CORS violation...')
  try {
    await fetch('https://inaccessible-origin-example-security.org/v1/data')
  } catch (err) {
    console.error('CORS blocked:', err)
  }
})

document.getElementById('trigger-log-spam')?.addEventListener('click', () => {
  console.log('💥 [Trigger] Emitting telemetry spam burst...')
  for (let i = 1; i <= 8; i++) {
    console.warn(`[SystemWarning] Heartbeat jitter alert seq=${i} latency=${100 + i * 40}ms`)
  }
  console.error('[FatalException] Connection pool exhausted at ConnectionManager.ts:42:10')
})

// 3. Autonomous Investigation Trigger
document.getElementById('btn-run-investigation')?.addEventListener('click', async () => {
  const goalInput = document.getElementById('goal-input') as HTMLInputElement
  const goal = goalInput?.value || 'Diagnose the latest error on page'

  if (!doctor) return

  // Automatically open the HUD Cockpit
  doctor.ui?.openCockpit()
  
  console.log(`🩺 Starting investigation for: "${goal}"`)
  try {
    const result = await doctor.investigate(goal)
    console.log('🩺 Investigation completed:', result)
  } catch (err: any) {
    console.error('Diagnosis failed:', err)
  }
})

// 4. Live Telemetry Poller for UI preview
setInterval(() => {
  if (!doctor) return
  const telemetry = doctor.controller.getTelemetry()
  
  const consolePreview = document.getElementById('console-preview')
  const consoleCount = document.getElementById('console-count')
  if (consolePreview && consoleCount) {
    consoleCount.textContent = String(telemetry.console.length)
    if (telemetry.console.length > 0) {
      consolePreview.textContent = telemetry.console
        .slice(-5)
        .map((c) => `[${c.type.toUpperCase()}] ${c.args.join(' ')}`)
        .join('\n')
    }
  }

  const networkPreview = document.getElementById('network-preview')
  const networkCount = document.getElementById('network-count')
  if (networkPreview && networkCount) {
    networkCount.textContent = String(telemetry.network.length)
    if (telemetry.network.length > 0) {
      networkPreview.textContent = telemetry.network
        .slice(-5)
        .map((n) => `[${n.method}] ${n.url} (${n.status || 'pending'}${n.isFailed ? ' ❌' : ''})`)
        .join('\n')
    }
  }
}, 1000)
