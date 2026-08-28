import { describe, expect, it } from 'vitest'
import { DebugController } from '../src/DebugController.js'
import { buildCausalErrorGraph, computeCorrelations } from '../src/serializer.js'
import type { DebugState } from '../src/types.js'

describe('Causal Error Graph & Full-Stack Correlations', () => {
  it('correlates Docker backend panic with HTTP 500 failure and frontend TypeError', () => {
    const baseTime = 1700000000000

    const mockState: DebugState = {
      pageContext: {
        url: 'http://localhost:3000/dashboard',
        title: 'App Dashboard',
        userAgent: 'TestBrowser',
        uptimeSeconds: 10,
        timestamp: baseTime + 2000
      },
      console: {
        total: 1,
        errorCount: 1,
        warnCount: 0,
        entries: [
          {
            id: 'err_1',
            type: 'uncaught_error',
            level: 'error',
            timestamp: baseTime + 350,
            message: 'TypeError: Cannot read properties of undefined (reading "user")',
            count: 1,
            firstSeen: baseTime + 350,
            lastSeen: baseTime + 350
          }
        ]
      },
      network: {
        total: 1,
        failedCount: 1,
        slowCount: 0,
        records: [
          {
            id: 'req_1',
            method: 'POST',
            url: '/api/v1/auth/session',
            startTime: baseTime + 20,
            endTime: baseTime + 300,
            duration: 280,
            status: 500,
            isFailed: true
          }
        ]
      },
      performance: { longTasks: [], vitals: {}, slowResources: [] },
      memory: null,
      docker: {
        isAvailable: true,
        containers: [
          { id: 'c1', name: 'api-backend', image: 'api:latest', state: 'running', status: 'Up 1m' }
        ],
        logs: [
          {
            id: 'doc_1',
            containerName: 'api-backend',
            timestamp: baseTime,
            stream: 'stderr',
            message: 'FATAL: PostgreSQL pool connection timeout after 5000ms',
            level: 'error'
          }
        ],
        errorCount: 1
      },
      correlations: []
    }

    const correlations = computeCorrelations(mockState)
    expect(correlations.length).toBeGreaterThanOrEqual(2)

    // Verify Docker -> Network correlation
    const dockerNetCorr = correlations.find((c) => c.sourceEvent.type === 'docker')
    expect(dockerNetCorr).toBeDefined()
    expect(dockerNetCorr?.description).toContain('api-backend')
    expect(dockerNetCorr?.targetEvent.type).toBe('network')

    // Verify Network -> Console correlation
    const netConsoleCorr = correlations.find((c) => c.sourceEvent.type === 'network')
    expect(netConsoleCorr).toBeDefined()
    expect(netConsoleCorr?.targetEvent.type).toBe('console')

    // Build Causal Graph
    const graph = buildCausalErrorGraph(mockState)
    expect(graph.nodes.length).toBe(3)
    expect(graph.edges.length).toBe(2)

    // Root cause should be the Docker backend panic
    expect(graph.rootCauseNodeId).toBe('doc_1')
    const rootNode = graph.nodes.find((n) => n.id === 'doc_1')
    expect(rootNode?.isRootCause).toBe(true)

    // Verify Mermaid diagram output
    expect(graph.mermaidDiagram).toContain('graph TD')
    expect(graph.mermaidDiagram).toContain('api-backend')
    expect(graph.mermaidDiagram).toContain('CAUSED_HTTP_FAILURE')
    expect(graph.mermaidDiagram).toContain('TRIGGERED_CLIENT_ERROR')
  })

  it('DebugController exposes and synchronizes CausalGraph', () => {
    const controller = new DebugController()
    controller.init()

    controller.pushDockerLog('worker-service', 'PANIC: redis out of memory', 'stderr')
    const graph = controller.getCausalGraph()

    expect(graph.nodes.length).toBe(1)
    expect(graph.nodes[0].layer).toBe('docker')
    expect(graph.nodes[0].label).toContain('worker-service')
    expect(graph.rootCauseNodeId).toBe(graph.nodes[0].id)

    controller.destroy()
  })
})
