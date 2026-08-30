import { describe, expect, it } from 'vitest'
import { PatchEngine } from '../src/patch/PatchEngine.js'
import type { InvestigationResult } from '../src/types.js'

describe('PatchEngine (Unified Diff & PR Generator)', () => {
  const sampleResult: InvestigationResult = {
    goal: 'Fix CORS header failure',
    status: 'resolved',
    diagnosis: 'CORS header missing on /metrics API endpoint',
    rootCause: 'Missing Access-Control-Allow-Origin header in server configuration',
    fix: '--- a/server.ts\n+++ b/server.ts\n@@ -10,1 +10,2 @@\n- res.setHeader("X-Custom", "1")\n+ res.setHeader("Access-Control-Allow-Origin", "*")',
    confidence: 0.99,
    filesToModify: ['src/server.ts'],
    steps: [],
    durationMs: 450,
    finalMemory: ''
  }

  it('generates valid git unified diff and validates patch structure', () => {
    const diff = PatchEngine.toUnifiedDiff(sampleResult)
    expect(diff).toContain('--- a/server.ts')
    expect(diff).toContain('+++ b/server.ts')
    expect(diff).toContain('+ res.setHeader("Access-Control-Allow-Origin", "*")')

    const validation = PatchEngine.validatePatch(diff)
    expect(validation.valid).toBe(true)
    expect(validation.errors.length).toBe(0)
  })

  it('formats GitHub PR markdown body with reproduction steps and diff block', () => {
    const pr = PatchEngine.toGitHubPRBody(
      sampleResult,
      '1. [2.0s ago] click on #checkout-btn\n2. [1.0s ago] input on #email'
    )
    expect(pr).toContain('## 🩺 Dr. Debug Autonomous Diagnosis')
    expect(pr).toContain('### 🔍 Diagnosis')
    expect(pr).toContain('CORS header missing on /metrics API endpoint')
    expect(pr).toContain('### 🖱️ User Interaction Replay')
    expect(pr).toContain('click on #checkout-btn')
    expect(pr).toContain('```diff')
  })
})
