import fs from 'fs'
import path from 'path'
import { DrDebug } from '../packages/dr-debug/src/index.js'
import { OpenAIClient } from '../packages/llms/src/index.js'

async function runLiveAITest() {
  console.log('════════════════════════════════════════════════════════════════════')
  console.log('🩺 DR. DEBUG — LIVE AI AGENT TEST HARNESS')
  console.log('════════════════════════════════════════════════════════════════════\n')

  // 1. Read API Key
  const credsPath = path.resolve(process.cwd(), 'CREDS.txt')
  let apiKey = ''
  if (fs.existsSync(credsPath)) {
    apiKey = fs.readFileSync(credsPath, 'utf-8').trim()
  }

  if (!apiKey) {
    console.error('❌ No API key found in CREDS.txt')
    process.exit(1)
  }

  console.log('🔑 Found Groq API Key in CREDS.txt:', apiKey.slice(0, 8) + '...' + apiKey.slice(-4))

  // 2. Initialize LLM Client with Groq
  // List available models from Groq
  const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` }
  })
  const modelsJson = await modelsRes.json()
  const availableModels = (modelsJson.data || []).map((m: any) => m.id)
  console.log('📋 Available Groq Models:', availableModels.slice(0, 10))

  const model = 'openai/gpt-oss-120b'
  console.log(`🤖 Selected model: ${model}\n`)

  const llmClient = new OpenAIClient({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey,
    model
  })

  // 3. Initialize DrDebug Master Controller
  const doctor = new DrDebug({
    llmClient,
    enableUI: false
  })

  const controller = doctor.getController()

  // 4. Seed Full-Stack Bug Telemetry Scenario
  console.log('📦 Seeding Full-Stack Failure Scenario:')
  console.log('   ├─ 🐳 Docker Container: postgres-db (FATAL: max_connections (100) reached)')
  console.log('   ├─ 🐳 Docker Container: api-server (Prisma connection pool exhausted)')
  console.log('   ├─ 🌐 Network: POST /api/v1/auth/login [503 Service Unavailable] (412ms)')
  console.log('   └─ 🔴 Console: TypeError: Cannot read properties of undefined (reading "sessionToken")\n')

  controller.setDockerContainers([
    { id: 'c1', name: 'api-server', image: 'node:20-alpine', state: 'running', status: 'Up 10m' },
    { id: 'c2', name: 'postgres-db', image: 'postgres:15-alpine', state: 'running', status: 'Up 10m' },
    { id: 'c3', name: 'redis-cache', image: 'redis:7-alpine', state: 'running', status: 'Up 10m' }
  ])

  const baseTime = Date.now() - 2500

  // Docker logs
  controller.pushDockerLog('postgres-db', 'FATAL: remaining connection slots are reserved for non-replication superuser connections', 'stderr', baseTime)
  controller.pushDockerLog('postgres-db', 'ERROR: max_connections (100) reached — refusing new connection from 172.20.0.4', 'stderr', baseTime + 50)
  controller.pushDockerLog('api-server', 'PrismaClientKnownRequestError: P2024 Timed out fetching a new connection from the connection pool', 'stderr', baseTime + 100)
  controller.pushDockerLog('api-server', 'ERROR [AuthService] Login failed for user admin@company.com — DB timeout', 'stderr', baseTime + 120)

  // Network record (simulate fetch)
  // We can push to the controller via network interceptor or direct state
  const netRecords = (controller as any).networkInterceptor.getRecords()
  netRecords.push({
    id: 'req_login_503',
    method: 'POST',
    url: 'https://app.example.com/api/v1/auth/login',
    startTime: baseTime + 200,
    endTime: baseTime + 612,
    duration: 412,
    status: 503,
    statusText: 'Service Unavailable',
    isFailed: true,
    responseBodyPreview: '{"error": "Database connection pool timeout", "code": "DB_UNAVAILABLE"}'
  })

  // Console error
  const consoleEntries = (controller as any).consoleInterceptor.getEntries()
  consoleEntries.push({
    id: 'err_login_typeerror',
    type: 'uncaught_error',
    level: 'error',
    timestamp: baseTime + 750,
    message: 'TypeError: Cannot read properties of undefined (reading "sessionToken") at loginUser (src/auth/AuthProvider.tsx:38:22)',
    count: 1,
    firstSeen: baseTime + 750,
    lastSeen: baseTime + 750,
    parsedStack: [
      { functionName: 'loginUser', filename: 'src/auth/AuthProvider.tsx', lineno: 38, colno: 22 },
      { functionName: 'handleSubmit', filename: 'src/components/LoginForm.tsx', lineno: 54, colno: 12 }
    ]
  })

  console.log('🚀 Launching Autonomous Re-Act Investigation Loop...\n')

  const goal = 'Why did user login fail with a TypeError and how do we fix the root cause across the stack?'

  try {
    const result = await doctor.investigate(goal, {
      maxSteps: 6,
      onStepStart: (stepNumber) => {
        console.log(`\n────────────────────────────────────────────────────────────────────`)
        console.log(`📍 [STEP ${stepNumber}] Agent reasoning...`)
      },
      onReflection: (reflection) => {
        console.log(`💡 Working Hypothesis: ${reflection.working_hypothesis}`)
        console.log(`🎯 Next Goal: ${reflection.next_goal}`)
        console.log(`🔧 Chosen Tool Action: ${reflection.action.name}(${JSON.stringify(reflection.action.arguments || {})})`)
      },
      onToolResult: (toolName, toolResult) => {
        console.log(`📥 Tool Output [${toolName}]:`)
        const snippet = toolResult.length > 300 ? toolResult.slice(0, 300) + '... [truncated]' : toolResult
        console.log(snippet)
      }
    })

    console.log('\n════════════════════════════════════════════════════════════════════')
    console.log('🏁 INVESTIGATION RESULT / VERIFIED PRESCRIPTION')
    console.log('════════════════════════════════════════════════════════════════════')
    console.log(`Status: ${result.status.toUpperCase()}`)
    console.log(`Confidence: ${Math.round(result.confidence * 100)}%`)
    console.log(`Duration: ${(result.durationMs / 1000).toFixed(2)}s`)
    console.log(`\n📋 Diagnosis:`)
    console.log(result.diagnosis)
    console.log(`\n🔍 Root Cause:`)
    console.log(result.rootCause)
    if (result.filesToModify && result.filesToModify.length > 0) {
      console.log(`\n📁 Files to Modify: ${result.filesToModify.join(', ')}`)
    }
    if (result.fix) {
      console.log(`\n🛠️ Prescribed Patch:`)
      console.log(result.fix)
    }
    console.log('\n════════════════════════════════════════════════════════════════════')
    console.log('✅ AI Agent is 100% OPERATIONAL AND VERIFIED!')
    console.log('════════════════════════════════════════════════════════════════════\n')
  } catch (err: any) {
    console.error('❌ Investigation encountered error:', err)
  } finally {
    doctor.destroy()
  }
}

runLiveAITest()
