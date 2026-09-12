import { generatePonytailDebugPrompt } from '@dr-debug/core'
import type { DockerBridge } from './DockerBridge.js'
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
        name: 'drdebug_get_ai_brief',
        description: 'Returns the full paste-ready incident brief for AI assistants (Claude Code, Cursor, Antigravity) with complete request/response headers, body payloads, cURL reproduction, and demangled stacks.',
        inputSchema: {
          type: 'object',
          properties: {
            targetId: {
              type: 'string',
              description: 'Optional specific error ID or request ID to focus on. If omitted, returns active session brief.'
            }
          }
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
            },
            tabId: {
              type: 'string',
              description: 'Optional target tab ID.'
            }
          },
          required: ['expression']
        }
      },
      {
        name: 'drdebug_list_docker_containers',
        description: 'Lists local Docker containers, their running states, images, forwarded ports, and health statuses.',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'drdebug_get_docker_logs',
        description: 'Queries and streams Docker container standard output and standard error logs with filtering by container, log level, regex grep, and line tail.',
        inputSchema: {
          type: 'object',
          properties: {
            container: {
              type: 'string',
              description: 'Optional container name or ID to filter logs.'
            },
            level: {
              type: 'string',
              enum: ['error', 'warn', 'info', 'log'],
              description: 'Optional log level filter.'
            },
            grep: {
              type: 'string',
              description: 'Optional regex or substring to grep in log messages.'
            },
            tail: {
              type: 'number',
              description: 'Number of recent log lines to retrieve (default 50).'
            }
          }
        }
      }
    ]
  }

  public static async callTool(
    name: string,
    args: any,
    sessions: Map<string, BrowserTabTelemetry>,
    sendCommand: (command: any, targetTabId?: string) => Promise<any>,
    dockerBridge?: DockerBridge
  ): Promise<{ content: Array<{ type: 'text'; text: string }>; isError?: boolean }> {
    const targetSession = args?.tabId ? sessions.get(args.tabId) : Array.from(sessions.values())[0]
    const state = targetSession?.stateSnapshot || {}

    if (name === 'drdebug_get_diagnostics' || name === 'get_browser_state') {
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

    if (name === 'drdebug_get_ai_brief') {
      let prompt = state.sessionDebugPrompt || state.unifiedPrompt
      if (!prompt && targetSession?.stateSnapshot) {
        try {
          prompt = generatePonytailDebugPrompt(targetSession.stateSnapshot)
        } catch {
          // fallback
        }
      }

      if (!prompt && dockerBridge) {
        const dockerErrors = dockerBridge.getLogs({ level: 'error', tail: 20 })
        if (dockerErrors.length > 0) {
          prompt = `# 🐳 Dr. Debug Incident Brief (Backend Docker Logs)\n\n` +
            `No active browser tab telemetry connected, but host backend container errors were detected:\n\n` +
            dockerErrors.map((l: any) => `- [${l.containerName} / ${l.stream}] ${l.message}`).join('\n') +
            `\n\n### ✂️ Instructions for AI Coding Assistant (Ponytail Protocol)\n` +
            `1. Locate the backend source file causing the container error.\n` +
            `2. Directly apply the minimal surgical fix (≤ 5 lines) using file editing tools.\n` +
            `3. Provide a 1-sentence verification command.`
        }
      }

      if (!prompt) {
        prompt = `# 🩺 Dr. Debug Incident Brief\n\n` +
          `No active browser tab telemetry captured yet.\n\n` +
          `To stream live browser telemetry:\n` +
          `1. Ensure your web application is running (e.g. at http://localhost:3000 or http://localhost:5173).\n` +
          `2. Open the page in Chrome with the Dr. Debug extension active, or load the Dr. Debug script.\n` +
          `3. Trigger the runtime error or user flow in the browser; telemetry will stream automatically into this MCP session.`
      }

      return { content: [{ type: 'text', text: prompt }] }
    }

    if (name === 'drdebug_inspect_request' || name === 'get_network_log') {
      const records = state.network?.records || []
      if (!args?.requestId && name === 'get_network_log') {
        return { content: [{ type: 'text', text: JSON.stringify(records, null, 2) }] }
      }
      const req = records.find((r: any) => r.id === args.requestId || (r.url && r.url.includes(args.requestId)))
      if (!req) {
        return { content: [{ type: 'text', text: `Request "${args.requestId}" not found in recorded telemetry.` }], isError: true }
      }
      const inspectPayload = {
        id: req.id,
        method: req.method,
        url: req.url,
        status: req.status,
        statusText: req.statusText,
        durationMs: req.duration,
        isFailed: req.isFailed,
        isSlow: req.isSlow,
        isCORS: req.isCORS,
        isCrossOrigin: req.isCrossOrigin,
        requestHeaders: req.requestHeaders || {},
        requestPayload: req.requestBodyPreview || null,
        responseHeaders: req.responseHeaders || {},
        responsePayload: req.responseBodyPreview || null,
        curl: req.curl || `curl -X ${req.method} "${req.url}"`,
        error: req.error || null,
        initiator: req.initiator || null
      }
      return { content: [{ type: 'text', text: JSON.stringify(inspectPayload, null, 2) }] }
    }

    if (name === 'drdebug_inspect_error' || name === 'get_recent_errors') {
      const entries = state.console?.entries || []
      if (!args?.errorId && name === 'get_recent_errors') {
        const errors = entries.filter((e: any) => e.level === 'error')
        return { content: [{ type: 'text', text: JSON.stringify(errors, null, 2) }] }
      }
      const err = entries.find((e: any) => e.id === args.errorId || (e.message && e.message.includes(args.errorId)))
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
        const res = await sendCommand({ type: 'EVAL_SCRIPT', expression: args.expression }, args.tabId)
        return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] }
      } catch (err: any) {
        return { content: [{ type: 'text', text: `Failed to evaluate in browser: ${err.message}` }], isError: true }
      }
    }

    if (name === 'drdebug_list_docker_containers' || name === 'list_docker_containers') {
      if (!dockerBridge) {
        return { content: [{ type: 'text', text: 'Docker bridge is not available or initialized.' }], isError: true }
      }
      await dockerBridge.refreshContainers()
      const containers = dockerBridge.getContainers()
      return { content: [{ type: 'text', text: JSON.stringify(containers, null, 2) }] }
    }

    if (name === 'drdebug_get_docker_logs' || name === 'get_docker_logs') {
      if (!dockerBridge) {
        return { content: [{ type: 'text', text: 'Docker bridge is not available or initialized.' }], isError: true }
      }
      const logs = dockerBridge.getLogs({
        container: args?.container,
        level: args?.level,
        grep: args?.grep,
        tail: typeof args?.tail === 'number' ? args.tail : 50
      })
      return { content: [{ type: 'text', text: JSON.stringify(logs, null, 2) }] }
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  }
}
