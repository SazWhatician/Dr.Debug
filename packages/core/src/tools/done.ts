import type { DiagnosticTool, ToolContext } from '../types.js'

export const doneTool: DiagnosticTool = {
  name: 'done',
  description: 'Concludes the investigation and outputs the finalized diagnosis, verified root cause, confidence score, and suggested code fix.',
  parameters: {
    type: 'object',
    properties: {
      diagnosis: {
        type: 'string',
        description: 'Clear, high-level summary of what broke in the web application.'
      },
      rootCause: {
        type: 'string',
        description: 'Definite root cause identifying culprit files, line numbers, and causal sequence.'
      },
      fix: {
        type: 'string',
        description: 'Actionable code fix or unified diff showing how to fix the issue.'
      },
      confidence: {
        type: 'number',
        description: 'Confidence score from 0.0 to 1.0 backed by discovered evidence.'
      },
      filesToModify: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of filenames that need to be edited to resolve the bug.'
      }
    },
    required: ['diagnosis', 'rootCause', 'fix', 'confidence']
  },
  async execute(
    args: {
      diagnosis: string
      rootCause: string
      fix: string
      confidence: number
      filesToModify?: string[]
    },
    context: ToolContext
  ): Promise<string> {
    context.memory['finalResult'] = args

    return JSON.stringify(
      {
        status: 'investigation_concluded',
        ...args
      },
      null,
      2
    )
  }
}
