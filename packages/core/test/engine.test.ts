import { DebugController } from '@dr-debug/controller'
import { MockLLMClient } from '@dr-debug/llms'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DrDebugCore } from '../src/DrDebugCore.js'

describe('DrDebugCore (Re-Act Diagnostic Loop)', () => {
  let controller: DebugController

  beforeEach(() => {
    controller = new DebugController(10)
    controller.init()
  })

  afterEach(() => {
    controller.destroy()
  })

  it('runs a complete 3-step investigation diagnosing a CORS cascade bug', async () => {
    // 1. Seed Substrate with a real-world bug scenario (CORS failure -> TypeError cascade)
    const netRecords = controller.getNetworkRecords()
    netRecords.push({
      id: 'req_cors_1',
      method: 'POST',
      url: 'https://api.acme.io/v2/metrics',
      startTime: Date.now() - 2000,
      endTime: Date.now() - 1950,
      duration: 50,
      status: 0,
      isFailed: true,
      isCORS: true,
      error: 'CORS policy blocked Access-Control-Allow-Origin'
    })

    console.error(new Error("Cannot read properties of undefined (reading 'map')"))

    // 2. Program Mock LLM to simulate Dr. Debug Re-Act thought progression
    const mockResponses = [
      // Step 1: Analyze <debug_state>, choose inspect_error
      {
        content: JSON.stringify({
          evaluation_previous_goal: 'Initial triage: Encountered active TypeError and failed CORS request.',
          working_hypothesis: 'TypeError in component is a downstream casualty of failed /v2/metrics API request.',
          memory: 'Observed uncaught TypeError and CORS error on POST /v2/metrics.',
          next_goal: 'Inspect the stack trace of the TypeError to locate the component.',
          action: {
            name: 'inspect_error',
            arguments: { errorIndex: 0 }
          }
        }),
        finishReason: 'stop'
      },
      // Step 2: Analyze stack trace, inspect failed request
      {
        content: JSON.stringify({
          evaluation_previous_goal: 'Stack trace confirmed error occurred when mapping undefined metrics data.',
          working_hypothesis: 'The frontend component expected metric payload from /v2/metrics which failed due to CORS.',
          memory: 'Error occurred in UserBreakdown.tsx mapping undefined data.',
          next_goal: 'Inspect full request details of the failed /v2/metrics call.',
          action: {
            name: 'inspect_request',
            arguments: { requestIndex: 0 }
          }
        }),
        finishReason: 'stop'
      },
      // Step 3: Conclude with definitive root cause and code prescription
      {
        content: JSON.stringify({
          evaluation_previous_goal: 'Confirmed network call returned status 0 with CORS policy rejection.',
          working_hypothesis: 'Root cause fully confirmed: CORS failure on POST /v2/metrics led to undefined state in UserBreakdown.',
          memory: 'Root cause verified across both network and console telemetry.',
          next_goal: 'Conclude investigation and prescribe code fix.',
          action: {
            name: 'done',
            arguments: {
              diagnosis: 'Analytics dashboard crashed because POST /v2/metrics was blocked by CORS, resulting in undefined metric state.',
              rootCause: 'Cross-origin fetch to /v2/metrics was rejected by CORS (status 0). UserBreakdown.tsx attempted to call .map() on undefined state.',
              fix: '1. Add defensive fallback `(metrics || []).map(...)` in UserBreakdown.tsx:42.\n2. Configure `Access-Control-Allow-Origin: https://app.acme.io` on server endpoint.',
              confidence: 0.98,
              filesToModify: ['UserBreakdown.tsx', 'apiClient.ts']
            }
          }
        }),
        finishReason: 'stop'
      }
    ]

    const mockLLM = new MockLLMClient(mockResponses)
    const engine = new DrDebugCore(controller, mockLLM)

    const stepStartEvents: number[] = []
    const toolExecEvents: string[] = []

    const result = await engine.investigate('Why is the analytics chart crashing?', {
      onStepStart: (step) => stepStartEvents.push(step),
      onToolExecute: (tool) => toolExecEvents.push(tool)
    })

    // 3. Verify Investigation Result
    expect(result.status).toBe('resolved')
    expect(result.steps.length).toBe(3)
    expect(result.confidence).toBe(0.98)
    expect(result.diagnosis).toContain('POST /v2/metrics was blocked by CORS')
    expect(result.rootCause).toContain('UserBreakdown.tsx attempted to call .map()')
    expect(result.fix).toContain('(metrics || []).map')
    expect(result.filesToModify).toEqual(['UserBreakdown.tsx', 'apiClient.ts'])

    expect(stepStartEvents).toEqual([1, 2, 3])
    expect(toolExecEvents).toEqual(['inspect_error', 'inspect_request', 'done'])
  })
})
