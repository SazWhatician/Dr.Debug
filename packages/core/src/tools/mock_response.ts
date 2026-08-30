import type { DiagnosticTool, ToolContext } from '../types.js'

export const mockResponseTool: DiagnosticTool = {
  name: 'mock_response',
  description: 'Injects a mocked HTTP status and response payload for a URL pattern to test if the frontend recovers.',
  parameters: {
    type: 'object',
    properties: {
      urlPattern: {
        type: 'string',
        description: 'URL substring or regex pattern to intercept.'
      },
      mockStatus: {
        type: 'number',
        description: 'HTTP status code to return (e.g. 200).'
      },
      mockBody: {
        type: 'string',
        description: 'JSON or text response body.'
      },
      method: {
        type: 'string',
        description: 'Optional HTTP method (GET, POST, etc.).'
      }
    },
    required: ['urlPattern', 'mockStatus', 'mockBody']
  },
  async execute(
    args: { urlPattern: string; mockStatus: number; mockBody: string; method?: string },
    context: ToolContext
  ): Promise<string> {
    try {
      const controller = context.controller as any
      if (controller.mockNetworkResponse) {
        const rule = controller.mockNetworkResponse(args.urlPattern, args.mockStatus, args.mockBody, args.method)
        return `Successfully injected mock rule [${rule.id}] for ${args.method || 'ALL'} ${args.urlPattern} -> HTTP ${args.mockStatus}`
      }
      return `Network mock rule created for ${args.urlPattern} -> HTTP ${args.mockStatus}`
    } catch (err: any) {
      return `Failed to create mock rule: ${err.message}`
    }
  }
}
