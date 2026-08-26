import type { DiagnosticTool, ToolContext } from '../types.js'

export const inspectErrorTool: DiagnosticTool = {
  name: 'inspect_error',
  description: 'Inspects a specific console error or exception by its index in the console stream to retrieve full stack frames, file locations, line numbers, and frequency.',
  parameters: {
    type: 'object',
    properties: {
      errorIndex: {
        type: 'number',
        description: 'The zero-based index of the error in the console stream (e.g. 0, 1).'
      }
    },
    required: ['errorIndex']
  },
  async execute(args: { errorIndex: number }, context: ToolContext): Promise<string> {
    const entries = context.controller.getConsoleEntries()
    const errorEntries = entries.filter((e) => e.level === 'error')

    if (errorEntries.length === 0) {
      return 'No errors recorded in the console stream.'
    }

    const index = args.errorIndex ?? 0
    const entry = errorEntries[index] || errorEntries[0]

    const result = {
      id: entry.id,
      type: entry.type,
      message: entry.message,
      occurrences: entry.count,
      timestamp: new Date(entry.timestamp).toISOString(),
      rawStack: entry.stack || '(No raw stack available)',
      parsedFrames: entry.parsedStack || []
    }

    return JSON.stringify(result, null, 2)
  }
}
