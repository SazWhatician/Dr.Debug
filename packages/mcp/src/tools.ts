import type { BrowserTabTelemetry, MCPToolDefinition } from './types.js'

export class MCPToolManager {
  public static listTools(): MCPToolDefinition[] {
    return [
      {
        name: 'drdebug_get_diagnostics',
        description: 'Returns the aggregated multi-substrate health status and active anomalies in the live browser application.',
        inputSchema: {
          type: 'object',
          properties: {
            tabId: {
              type: 'string',
              description: 'Optional browser tab ID (defaults to active tab).'
            }
          }
        }
      },
      {
        name: 'drdebug_inspect_request',
        description: 'Fetches full HTTP request/response payloads, headers, timings, and curl reproduction command for an API call.',
        inputSchema: {
          type: 'object',
          properties: {
            requestId: {
              type: 'string',
              description: 'The unique request ID to inspect.'
            }
          },
          required: ['requestId']
        }
      },
      {
        name: 'drdebug_inspect_error',
        description: 'Inspects a recorded runtime exception or console error, returning demangled stack frames and file locations.',
        inputSchema: {
          type: 'object',
          properties: {
            errorId: {
              type: 'string',
              description: 'The unique error ID to inspect.'
            }
          },
          required: ['errorId']
        }
      },
      {
        name: 'drdebug_get_interaction_replay',
        description: 'Returns the chronological sequence of user clicks, inputs, scrolls, and navigations in the 30 seconds before errors.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'drdebug_execute_script',
        description: 'Evaluates a JavaScript expression in the live browser tab and returns the serialized result.',
        inputSchema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'JavaScript code expression to evaluate.'
            }
          },
          required: ['expression']
        }
      }
    ]
  }

  public static async callTool(
    name: string,
    args: any,
    sessions: Map<string, BrowserTabTelemetry>,
    sendCommand: (command: any) => Promise<any>
  ): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
    const defaultSession = Array.from(sessions.values())[0]
    const state = defaultSession?.stateSnapshot || {}

    if (name === 'drdebug_get_diagnostics') {
      const summary = {
        url: state.pageContext?.url || 'No active page connected',
        title: state.pageContext?.title,
        errorCount: (state.console?.entries || []).filter((e: any) => e.level === 'error').length,
        failedRequests: (state.network?.records || []).filter((r: any) => r.isFailed).length,
        memoryUsageMB: state.memory ? Math.round((state.memory.usedJSHeapSize || 0) / (1024 * 1024)) : undefined,
        activeCorrelations: state.correlations?.length || 0,
        matrix: state.diagnosticMatrix
      }
      return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] }
    }

    if (name === 'drdebug_inspect_request') {
      const records = state.network?.records || []
      const req = records.find((r: any) => r.id === args.requestId || r.url.includes(args.requestId))
      if (!req) {
        return { content: [{ type: 'text', text: `Request "${args.requestId}" not found in recorded telemetry.` }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(req, null, 2) }] }
    }

    if (name === 'drdebug_inspect_error') {
      const entries = state.console?.entries || []
      const err = entries.find((e: any) => e.id === args.errorId || e.message.includes(args.errorId))
      if (!err) {
        return { content: [{ type: 'text', text: `Error "${args.errorId}" not found in recorded telemetry.` }], isError: true }
      }
      return { content: [{ type: 'text', text: JSON.stringify(err, null, 2) }] }
    }

    if (name === 'drdebug_get_interaction_replay') {
      const replay = state.interactionsHuman || 'No interactions recorded.'
      return { content: [{ type: 'text', text: replay }] }
    }

    if (name === 'drdebug_execute_script') {
      try {
        const res = await sendCommand({ type: 'EVAL_SCRIPT', expression: args.expression })
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] }
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Failed to evaluate in browser: ${err.message}` }], isError: true }
      }
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  }
}
