import type { DiagnosticTool, ToolContext } from '../types.js'

export const inspectDockerLogsTool: DiagnosticTool = {
  name: 'inspect_docker_logs',
  description: 'Inspects and filters live Docker backend container logs (stdout/stderr) to diagnose server crashes, database errors, and microservice panics.',
  parameters: {
    type: 'object',
    properties: {
      container: {
        type: 'string',
        description: 'Optional name or substring of the container to inspect (e.g. "api", "backend", "db"). If omitted, logs from all containers are retrieved.'
      },
      level: {
        type: 'string',
        enum: ['error', 'warn', 'info', 'all'],
        description: 'Optional severity filter (default: "all" or "error" if investigating bugs).'
      },
      grep: {
        type: 'string',
        description: 'Optional search keyword or regex to filter log messages.'
      },
      tail: {
        type: 'number',
        description: 'Maximum number of recent log lines to retrieve (default: 30).'
      },
      sinceSeconds: {
        type: 'number',
        description: 'Optional lookback window in seconds (e.g. 60 for the last minute).'
      }
    }
  },
  async execute(
    args: {
      container?: string
      level?: 'error' | 'warn' | 'info' | 'all'
      grep?: string
      tail?: number
      sinceSeconds?: number
    },
    context: ToolContext
  ): Promise<string> {
    const logs = context.controller.getDockerLogs({
      container: args.container,
      level: args.level,
      grep: args.grep,
      tail: args.tail || 30,
      sinceSeconds: args.sinceSeconds
    })

    const containers = context.controller.getDockerContainers()

    if (logs.length === 0) {
      if (containers.length === 0) {
        return 'No active Docker containers or logs recorded in the current session.'
      }
      return `No matching logs found for query. Active containers: ${containers.map((c) => c.name).join(', ')}`
    }

    const lines: string[] = [
      `=== DOCKER CONTAINER LOGS (${logs.length} entries) ===`
    ]

    logs.forEach((log, idx) => {
      const timeStr = new Date(log.timestamp).toISOString().split('T')[1]?.slice(0, 12) || ''
      const lvl = log.level.toUpperCase().padEnd(5, ' ')
      lines.push(`[${idx + 1}] ${timeStr} [${log.containerName}] ${lvl} (${log.stream}): ${log.message}`)
    })

    return lines.join('\n')
  }
}
