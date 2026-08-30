import type { DiagnosticTool, ToolContext } from '../types.js'

export const inspectLayoutTool: DiagnosticTool = {
  name: 'inspect_layout',
  description: 'Inspects DOM and computed CSS styles for layout anomalies, overflow clipping, invisible overlays, and z-index traps.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'Optional CSS root selector to scope layout inspection (defaults to document body).'
      }
    }
  },
  async execute(args: { selector?: string }, context: ToolContext): Promise<string> {
    try {
      const controller = context.controller as any
      if (controller.getLayoutAnomalies) {
        const anomalies = controller.getLayoutAnomalies(args.selector)
        if (anomalies.length === 0) {
          return 'No layout anomalies, overflow clippings, or invisible overlay blockers detected.'
        }
        return JSON.stringify(anomalies, null, 2)
      }
      return 'Layout inspector not initialized on current controller.'
    } catch (err: any) {
      return `Layout inspection error: ${err.message}`
    }
  }
}
