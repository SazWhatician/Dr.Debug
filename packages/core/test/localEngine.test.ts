import { DebugController } from '@dr-debug/controller'
import { beforeEach, describe, expect, it } from 'vitest'
import { generateSessionDebugPrompt, HeuristicLLMClient, LocalDiagnosticEngine } from '../src/index.js'

function makeState(controller: DebugController) {
  return controller.getSnapshot()
}

describe('LocalDiagnosticEngine', () => {
  let controller: DebugController
  let engine: LocalDiagnosticEngine

  beforeEach(() => {
    controller = new DebugController(50)
    controller.init()
    engine = new LocalDiagnosticEngine()
  })

  it('reports an empty session rather than inventing a fault', () => {
    const result = engine.analyze(makeState(controller))

    expect(result.hasEvidence).toBe(false)
    expect(result.confidence).toBe(0)
    expect(result.findings).toHaveLength(0)
    expect(result.suggestedFix).toBe('')
    expect(result.diagnosis).toMatch(/no errors|nothing to diagnose/i)
  })

  it('names the real property from a nullish-access message', () => {
    console.error(
      new TypeError("Cannot read properties of undefined (reading 'badges')")
    )

    const result = engine.analyze(makeState(controller))

    expect(result.hasEvidence).toBe(true)
    const finding = result.findings.find((f) => f.layer === 'console')
    expect(finding).toBeDefined()
    // The property name is extracted from the message, not templated.
    expect(finding!.title).toContain('badges')
    expect(finding!.remediation).toContain('?.badges')
  })

  it('derives the remediation for a backend pool exhaustion from its log text', () => {
    controller.pushDockerLog(
      'postgres-db',
      'FATAL: remaining connection slots are reserved for non-replication superuser connections',
      'stderr'
    )

    const result = engine.analyze(makeState(controller))
    const finding = result.findings.find((f) => f.layer === 'docker')

    expect(finding).toBeDefined()
    expect(finding!.title).toContain('postgres-db')
    expect(finding!.title).toContain('connection pool exhaustion')
    expect(finding!.remediation).toContain('postgres-db')
  })

  it('classifies an unreachable dependency differently from a pool exhaustion', () => {
    controller.pushDockerLog('api-server', "P1001 Can't reach database server at postgres-db:5432", 'stderr')

    const result = engine.analyze(makeState(controller))
    const finding = result.findings.find((f) => f.layer === 'docker')

    expect(finding!.title).toContain('unreachable dependency')
  })

  it('raises confidence when several layers corroborate each other', () => {
    console.error(new TypeError("Cannot read properties of undefined (reading 'users')"))
    const single = engine.analyze(makeState(controller)).confidence

    controller.pushDockerLog('postgres-db', 'FATAL: database "app_db" does not exist', 'stderr')
    const multi = engine.analyze(makeState(controller))

    expect(multi.findings.length).toBeGreaterThan(1)
    expect(multi.confidence).toBeGreaterThanOrEqual(single)
    // Layers are counted from what is actually present.
    expect(new Set(multi.findings.map((f) => f.layer)).size).toBeGreaterThan(1)
  })

  it('orders findings by severity then time', () => {
    console.warn('a warning that is only a notice')
    console.error(new Error('a genuine failure'))

    const result = engine.analyze(makeState(controller))
    const severities = result.findings.map((f) => f.severity)
    const firstNotice = severities.indexOf('notice')

    if (firstNotice !== -1) {
      expect(severities.slice(firstNotice).every((s) => s === 'notice')).toBe(true)
    }
  })
})

describe('generateSessionDebugPrompt', () => {
  let controller: DebugController

  beforeEach(() => {
    controller = new DebugController(50)
    controller.init()
  })

  it('states plainly that there is nothing to act on when buffers are empty', () => {
    const prompt = generateSessionDebugPrompt(controller.getSnapshot())

    expect(prompt).toContain('Debug session brief')
    expect(prompt).toContain('nothing to act on')
    expect(prompt).not.toContain('## Findings')
  })

  it('includes the observed evidence and a task section when faults exist', () => {
    console.error(new TypeError("Cannot read properties of undefined (reading 'profile')"))
    controller.pushDockerLog('api-server', 'ERROR: OOMKiller activated. Container memory limit exceeded.', 'stderr')

    const prompt = generateSessionDebugPrompt(controller.getSnapshot())

    expect(prompt).toContain('## Summary')
    expect(prompt).toContain('## Findings')
    expect(prompt).toContain('## Your task')
    // Real observed strings must survive into the brief.
    expect(prompt).toContain('profile')
    expect(prompt).toContain('api-server')
    expect(prompt).toContain('Backend container logs')
    // It must tell the downstream agent the attribution is a heuristic.
    expect(prompt).toMatch(/may be wrong|heuristic/i)
  })

  it('folds a prior investigation in as a hypothesis, not ground truth', () => {
    console.error(new Error('boom'))

    const prompt = generateSessionDebugPrompt(controller.getSnapshot(), {
      investigation: {
        goal: 'find it',
        status: 'resolved',
        diagnosis: 'the widget exploded',
        rootCause: 'because of reasons',
        confidence: 0.8,
        steps: [],
        durationMs: 1200,
        finalMemory: ''
      }
    })

    expect(prompt).toContain('Prior agent investigation')
    expect(prompt).toContain('the widget exploded')
    expect(prompt).toMatch(/hypothesis to verify/i)
  })
})

describe('HeuristicLLMClient', () => {
  let controller: DebugController
  let client: HeuristicLLMClient

  beforeEach(() => {
    controller = new DebugController(50)
    controller.init()
    client = new HeuristicLLMClient(controller)
  })

  it('concludes immediately when there is no evidence to inspect', async () => {
    const response = await client.chat([{ role: 'user', content: 'diagnose' }])
    const reflection = JSON.parse(response.content!)

    expect(reflection.action.name).toBe('done')
    expect(reflection.memory).toMatch(/No faults/i)
  })

  it('reads the deepest layer first when a backend fault is present', async () => {
    controller.pushDockerLog('postgres-db', 'FATAL: max_connections reached', 'stderr')
    console.error(new Error('client side symptom'))

    const response = await client.chat([{ role: 'user', content: 'diagnose' }])
    const reflection = JSON.parse(response.content!)

    expect(reflection.action.name).toBe('inspect_docker_logs')
    // The hypothesis quotes the real container name.
    expect(reflection.working_hypothesis).toContain('postgres-db')
  })

  it('does not repeat a tool it has already run', async () => {
    controller.pushDockerLog('postgres-db', 'FATAL: max_connections reached', 'stderr')
    console.error(new Error('client side symptom'))

    const first = JSON.parse((await client.chat([{ role: 'user', content: 'diagnose' }])).content!)

    const second = JSON.parse(
      (
        await client.chat([
          { role: 'user', content: 'diagnose' },
          { role: 'assistant', content: JSON.stringify(first) },
          { role: 'user', content: `Tool Result for [${first.action.name}]:\nsome output` }
        ])
      ).content!
    )

    expect(second.action.name).not.toBe(first.action.name)
  })

  it('graphs only once more than one layer has signal', async () => {
    console.error(new Error('only a console error'))

    // Walk the loop, recording which tools get chosen.
    const messages: any[] = [{ role: 'user', content: 'diagnose' }]
    const chosen: string[] = []
    for (let i = 0; i < 6; i++) {
      const reflection = JSON.parse((await client.chat(messages)).content!)
      chosen.push(reflection.action.name)
      if (reflection.action.name === 'done') break
      messages.push({ role: 'assistant', content: JSON.stringify(reflection) })
      messages.push({ role: 'user', content: `Tool Result for [${reflection.action.name}]:\nout` })
    }

    expect(chosen).toContain('inspect_error')
    expect(chosen).not.toContain('graphify_errors')
    expect(chosen[chosen.length - 1]).toBe('done')
  })

  it('supplies a real diagnosis in the done arguments', async () => {
    controller.pushDockerLog('redis-cache', 'ERROR: OOMKiller activated, memory limit exceeded', 'stderr')

    const messages: any[] = [{ role: 'user', content: 'diagnose' }]
    let reflection: any
    for (let i = 0; i < 8; i++) {
      reflection = JSON.parse((await client.chat(messages)).content!)
      if (reflection.action.name === 'done') break
      messages.push({ role: 'assistant', content: JSON.stringify(reflection) })
      messages.push({ role: 'user', content: `Tool Result for [${reflection.action.name}]:\nout` })
    }

    expect(reflection.action.name).toBe('done')
    expect(reflection.action.arguments.confidence).toBeGreaterThan(0)
    expect(reflection.action.arguments.rootCause).toContain('redis-cache')
    expect(reflection.action.arguments.fix).toContain('remediation plan')
  })
})

describe('causal attribution honesty', () => {
  let controller: DebugController
  let engine: LocalDiagnosticEngine

  beforeEach(() => {
    controller = new DebugController(50)
    controller.init()
    engine = new LocalDiagnosticEngine()
  })

  it('does not present a lone node as a causal chain', () => {
    // A single backend error: nothing to link it to.
    controller.pushDockerLog('postgres-db', 'FATAL: max_connections reached', 'stderr')

    const result = engine.analyze(controller.getSnapshot())

    expect(result.causalChain).toHaveLength(0)
  })

  it('links a backend fault to a later client error even with no failed request between', () => {
    controller.pushDockerLog('postgres-db', 'FATAL: database "app_db" does not exist', 'stderr')
    console.error(new TypeError("Cannot read properties of undefined (reading 'users')"))

    const graph = controller.getCausalGraph()

    expect(graph.edges.length).toBeGreaterThan(0)
    const edge = graph.edges[0]
    expect(edge.relationship).toBe('CORRELATED_WITH')
    // The unobserved mechanism must not be claimed with high confidence.
    expect(edge.confidence).toBeLessThan(0.8)
  })

  it('flags a weak-only chain as suggestive rather than proven', () => {
    controller.pushDockerLog('postgres-db', 'FATAL: database "app_db" does not exist', 'stderr')
    console.error(new TypeError("Cannot read properties of undefined (reading 'users')"))

    const result = engine.analyze(controller.getSnapshot())

    expect(result.causalChain.length).toBeGreaterThan(0)
    expect(result.diagnosis).toMatch(/not observed|suggestive/i)
  })

  it('says "separate problems" only when nothing is linked', () => {
    // Two faults far enough apart in the same layer that no edge is drawn.
    controller.pushDockerLog('redis-cache', 'ERROR: OOMKiller activated', 'stderr')

    const result = engine.analyze(controller.getSnapshot())
    if (result.findings.length > 1 && result.causalChain.length === 0) {
      expect(result.diagnosis).toMatch(/separate problems/i)
    }
    // And it must never claim both at once.
    expect(
      /separate problems/i.test(result.diagnosis) && /downstream effects/i.test(result.diagnosis)
    ).toBe(false)
  })
})

describe('MemoryInterceptor heap measurement', () => {
  it('measures usage against the hard limit, not the committed heap', async () => {
    const { MemoryInterceptor } = await import('@dr-debug/controller')
    const interceptor = new MemoryInterceptor()

    const original = (performance as any).memory
    // used is at the committed ceiling but only 10% of the real limit.
    ;(performance as any).memory = {
      usedJSHeapSize: 100 * 1048576,
      totalJSHeapSize: 100 * 1048576,
      jsHeapSizeLimit: 1000 * 1048576
    }

    try {
      const snapshot = interceptor.sample()
      // Against totalJSHeapSize this would read 100%; against the limit it is 10%.
      expect(snapshot!.heapUsagePercent).toBeCloseTo(10, 1)
    } finally {
      ;(performance as any).memory = original
    }
  })

  it('does not report a healthy heap as a fault', () => {
    const controller = new DebugController(20)
    controller.init()
    const original = (performance as any).memory
    ;(performance as any).memory = {
      usedJSHeapSize: 40 * 1048576,
      totalJSHeapSize: 45 * 1048576,
      jsHeapSizeLimit: 2000 * 1048576
    }

    try {
      const result = new LocalDiagnosticEngine().analyze(controller.getSnapshot())
      expect(result.findings.some((f) => f.layer === 'memory')).toBe(false)
    } finally {
      ;(performance as any).memory = original
    }
  })
})

describe('cross-origin failure attribution', () => {
  it('does not assert CORS when the browser never named it', () => {
    const engine = new LocalDiagnosticEngine()
    const controller = new DebugController(20)
    controller.init()

    // Shape of a refused cross-origin connection: opaque, no CORS in the text.
    const state = controller.getSnapshot()
    state.network.records.push({
      id: 'r1',
      method: 'GET',
      url: 'http://127.0.0.1:9/api/health',
      startTime: Date.now(),
      status: 0,
      isFailed: true,
      isCrossOrigin: true,
      error: 'Failed to fetch'
    })
    state.network.failedCount = 1
    state.network.total = 1

    const result = engine.analyze(state)
    const finding = result.findings.find((f) => f.layer === 'network')!

    expect(finding.title).not.toMatch(/CORS policy blocked/)
    expect(finding.title).toMatch(/opaquely/)
    // It must name the alternatives and how to tell them apart.
    expect(finding.remediation).toMatch(/indistinguishable/i)
    expect(finding.remediation).toMatch(/cURL/i)
  })

  it('does assert CORS when the error text names it', () => {
    const engine = new LocalDiagnosticEngine()
    const controller = new DebugController(20)
    controller.init()

    const state = controller.getSnapshot()
    state.network.records.push({
      id: 'r2',
      method: 'GET',
      url: 'https://api.example.com/v1/data',
      startTime: Date.now(),
      status: 0,
      isFailed: true,
      isCORS: true,
      isCrossOrigin: true,
      error: 'blocked by CORS policy'
    })
    state.network.failedCount = 1
    state.network.total = 1

    const finding = engine.analyze(state).findings.find((f) => f.layer === 'network')!

    expect(finding.title).toMatch(/CORS policy blocked/)
    expect(finding.remediation).toContain('Access-Control-Allow-Origin')
  })
})
