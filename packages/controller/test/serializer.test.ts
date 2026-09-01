import { describe, expect, it } from 'vitest'
import {
  computeCorrelations,
  computeDiagnosticMatrix,
  debugStateToString,
  generateCurlCommand,
  generateUnifiedAIDebugPrompt,
  getErrorHistogram,
  getHttpStatusExplainer
} from '../src/serializer.js'
import type { DebugState } from '../src/types.js'



describe('debugStateToString & computeCorrelations', () => {
  const now = Date.now()

  const mockState: DebugState = {
    pageContext: {
      url: 'https://app.acme.io/analytics',
      title: 'Analytics Dashboard',
      userAgent: 'Mozilla/5.0 HappyDOM',
      uptimeSeconds: 24.5,
      timestamp: now
    },
    console: {
      total: 2,
      errorCount: 1,
      warnCount: 1,
      entries: [
        {
          id: 'err_1',
          type: 'uncaught_error',
          level: 'error',
          timestamp: now + 1200, // 1.2s after network failure
          message: "Cannot read properties of undefined (reading 'map')",
          count: 1,
          firstSeen: now + 1200,
          lastSeen: now + 1200,
          parsedStack: [
            {
              functionName: 'UserBreakdown',
              filename: 'UserBreakdown.tsx',
              lineno: 42,
              colno: 18
            }
          ]
        },
        {
          id: 'warn_1',
          type: 'console_warn',
          level: 'warn',
          timestamp: now - 500,
          message: 'Component updated during render',
          count: 1,
          firstSeen: now - 500,
          lastSeen: now - 500
        }
      ]
    },
    network: {
      total: 2,
      failedCount: 1,
      slowCount: 0,
      records: [
        {
          id: 'req_1',
          method: 'POST',
          url: 'https://api.acme.io/v2/metrics',
          startTime: now,
          endTime: now + 50,
          duration: 50,
          status: 0,
          isFailed: true,
          isCORS: true,
          error: 'CORS policy blocked request'
        },
        {
          id: 'req_2',
          method: 'GET',
          url: 'https://api.acme.io/v1/session',
          startTime: now - 2000,
          endTime: now - 1950,
          duration: 50,
          status: 200,
          isFailed: false
        }
      ]
    },
    performance: {
      longTasks: [{ startTime: 1200, duration: 85, name: 'self' }],
      vitals: {
        LCP: { name: 'LCP', value: 3100, rating: 'needs-improvement' },
        CLS: { name: 'CLS', value: 0.05, rating: 'good' }
      },
      slowResources: []
    },
    memory: {
      timestamp: now,
      usedJSHeapSize: 45 * 1024 * 1024,
      totalJSHeapSize: 80 * 1024 * 1024,
      heapUsagePercent: 56.3,
      trendMBPerMin: 1.4,
      domNodeCount: 180
    },
    correlations: []
  }

  it('computes temporal correlation between network failure and subsequent console error', () => {
    const correlations = computeCorrelations(mockState)
    expect(correlations.length).toBe(1)
    expect(correlations[0].likelihood).toBe('high')
    expect(correlations[0].description).toContain('POST https://api.acme.io/v2/metrics')
    expect(correlations[0].description).toContain("Cannot read properties of undefined (reading 'map')")
  })

  it('serializes complete DebugState into well-formed XML block', () => {
    const xml = debugStateToString(mockState)

    expect(xml).toContain('<debug_state>')
    expect(xml).toContain('</debug_state>')

    // Page context
    expect(xml).toContain('URL: https://app.acme.io/analytics')
    expect(xml).toContain('Title: "Analytics Dashboard"')

    // Console stream
    expect(xml).toContain('<console_stream total="2" errors="1" warnings="1">')
    expect(xml).toContain("Cannot read properties of undefined (reading 'map')")
    expect(xml).toContain('UserBreakdown (UserBreakdown.tsx:42:18)')

    // Network stream
    expect(xml).toContain('<network_stream total="2" failed="1" slow="0">')
    expect(xml).toContain('CORS_FAIL [POST] https://api.acme.io/v2/metrics')

    // Performance
    expect(xml).toContain('LCP: 3.10s (needs-improvement)')
    expect(xml).toContain('Long Tasks: 1 detected (Latest: 85ms)')

    // Memory
    expect(xml).toContain('Used Heap: 45.0MB / 80.0MB (56.3%)')
    expect(xml).toContain('Heap Trend: +1.4MB/min ⚠️ (Elevated Heap Growth)')

    // Correlations
    expect(xml).toContain('<heuristic_correlations>')
    expect(xml).toContain('[HIGH LIKELIHOOD]')
  })

  it('generates a unified AI debug prompt with payload, headers, and Claude/Antigravity formatting', () => {
    const prompt = generateUnifiedAIDebugPrompt('req_1', mockState)


    expect(prompt).toContain('### 🚨 Dr. Debug Incident Report for AI Assistants (Claude Code / Antigravity)')
    expect(prompt).toContain('POST https://api.acme.io/v2/metrics')
    expect(prompt).toContain('HTTP Network Transaction:')
    expect(prompt).toContain('Task for AI Coding Assistant (Claude Code / Antigravity):')
  })

  it('computes error histogram buckets over time', () => {
    const histogram = getErrorHistogram(mockState, 5)
    expect(histogram.length).toBe(5)
    const totalErrors = histogram.reduce((sum, b) => sum + b.total, 0)
    expect(totalErrors).toBeGreaterThanOrEqual(2)
  })

  it('computes 2D Diagnostic Matrix with cross-cutting substrates and severities', () => {
    const matrix = computeDiagnosticMatrix(mockState)

    expect(matrix.totalErrors).toBeGreaterThanOrEqual(2)
    expect(matrix.substrateCounts.network).toBeGreaterThanOrEqual(1)
    expect(matrix.substrateCounts.console).toBeGreaterThanOrEqual(1)
    expect(matrix.cells['network:critical']).toBeDefined()
    expect(matrix.cells['network:critical'].count).toBeGreaterThanOrEqual(1)
  })

  it('generates executable cURL reproduction commands and RFC status intelligence', () => {
    const curl = generateCurlCommand({
      method: 'POST',
      url: 'https://api.acme.io/v2/metrics',
      requestHeaders: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token' },
      requestBodyPreview: '{"metric": "latency"}'
    })

    expect(curl).toContain("curl \\\n  -X POST \\\n  'https://api.acme.io/v2/metrics'")
    expect(curl).toContain("-H 'Content-Type: application/json'")
    expect(curl).toContain("-H 'Authorization: Bearer test-token'")
    expect(curl).toContain("--data-raw '{\"metric\": \"latency\"}'")

    const rfc504 = getHttpStatusExplainer(504)
    expect(rfc504.title).toContain('504 Gateway Timeout')
    expect(rfc504.explanation).toContain('gateway')
    expect(rfc504.recommendation).toBeDefined()

    const rfc401 = getHttpStatusExplainer(401)
    expect(rfc401.title).toContain('401 Unauthorized')
  })
})



