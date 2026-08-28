import { DebugController } from '@dr-debug/controller'
import { describe, expect, it } from 'vitest'
import { graphifyErrorsTool } from '../src/tools/graphify_errors.js'
import { inspectDockerLogsTool } from '../src/tools/inspect_docker_logs.js'
import type { ToolContext } from '../src/types.js'

describe('Docker & Graphify Diagnostic Tools', () => {
  it('inspect_docker_logs returns formatted container logs and filters by grep', async () => {
    const controller = new DebugController()
    controller.init()
    controller.pushDockerLog('auth-api', 'Received login request', 'stdout')
    controller.pushDockerLog('auth-api', 'FATAL: JWT_SECRET environment variable is missing', 'stderr')
    controller.pushDockerLog('payment-api', 'Stripe checkout initiated', 'stdout')

    const context: ToolContext = {
      controller,
      memory: {}
    }

    // Query all logs
    const resAll = await inspectDockerLogsTool.execute({}, context)
    expect(resAll).toContain('=== DOCKER CONTAINER LOGS')
    expect(resAll).toContain('auth-api')
    expect(resAll).toContain('JWT_SECRET')

    // Query with filter
    const resFiltered = await inspectDockerLogsTool.execute({ container: 'auth-api', level: 'error' }, context)
    expect(resFiltered).toContain('JWT_SECRET')
    expect(resFiltered).not.toContain('payment-api')

    controller.destroy()
  })

  it('graphify_errors constructs causal graph and highlights root cause', async () => {
    const controller = new DebugController()
    controller.init()
    controller.pushDockerLog('db-service', 'PANIC: Connection to PostgreSQL timed out', 'stderr')

    const context: ToolContext = {
      controller,
      memory: {}
    }

    const graphOutput = await graphifyErrorsTool.execute({}, context)
    expect(graphOutput).toContain('=== CAUSAL ERROR GRAPH')
    expect(graphOutput).toContain('PRIMARY ROOT CAUSE DETECTED')
    expect(graphOutput).toContain('db-service')
    expect(graphOutput).toContain('```mermaid')

    controller.destroy()
  })
})
