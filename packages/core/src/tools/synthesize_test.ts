import { TestSynthesizer } from '../patch/TestSynthesizer.js'
import type { DiagnosticTool, ToolContext } from '../types.js'

export const synthesizeTestTool: DiagnosticTool = {
  name: 'synthesize_test',
  description: 'Synthesizes an automated Playwright regression test script reproducing and asserting the fix for the diagnosed incident.',
  parameters: {
    type: 'object',
    properties: {
      diagnosis: {
        type: 'string',
        description: 'Short summary of the bug being tested.'
      },
      rootCause: {
        type: 'string',
        description: 'Explanation of root cause.'
      },
      targetUrl: {
        type: 'string',
        description: 'URL of the page under test.'
      }
    },
    required: ['diagnosis', 'rootCause']
  },
  async execute(
    args: { diagnosis: string; rootCause: string; targetUrl?: string },
    context: ToolContext
  ): Promise<string> {
    const mockResult = {
      goal: 'Test Synthesis',
      status: 'resolved' as const,
      diagnosis: args.diagnosis,
      rootCause: args.rootCause,
      confidence: 1.0,
      steps: [],
      durationMs: 0,
      finalMemory: ''
    }

    const interactions = context.controller.getInteractionReplay?.() || []
    const failedReq = context.controller.getNetworkRecords().find((r) => r.isFailed)
    const script = TestSynthesizer.synthesizePlaywright(mockResult, interactions, failedReq, args.targetUrl)

    return script
  }
}
