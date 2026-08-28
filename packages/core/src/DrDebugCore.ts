import type { DebugController } from '@dr-debug/controller'
import type { ChatMessage, ILLMClient, ToolDefinition } from '@dr-debug/llms'
import { getSystemPrompt } from './prompts/system_prompt.js'
import { createDefaultTools } from './tools/index.js'
import {
  type AgentStep,
  type DebugReflection,
  DebugReflectionSchema,
  type DiagnosticTool,
  type InvestigationOptions,
  type InvestigationResult,
  type ToolContext
} from './types.js'

export class DrDebugCore {
  private controller: DebugController
  private llmClient: ILLMClient
  private tools: Map<string, DiagnosticTool> = new Map()

  constructor(controller: DebugController, llmClient: ILLMClient, customTools?: DiagnosticTool[]) {
    this.controller = controller
    this.llmClient = llmClient

    const toolsToRegister = customTools || createDefaultTools()
    toolsToRegister.forEach((tool) => {
      this.tools.set(tool.name, tool)
    })
  }

  public registerTool(tool: DiagnosticTool): void {
    this.tools.set(tool.name, tool)
  }

  public getRegisteredTools(): DiagnosticTool[] {
    return Array.from(this.tools.values())
  }

  public normalizeToolName(name: string): string {
    const cleaned = (name || '').trim().toLowerCase()
    if (this.tools.has(cleaned)) return cleaned

    const aliases: Record<string, string> = {
      inspect_network_request: 'inspect_request',
      inspect_network: 'inspect_request',
      inspect_errors: 'inspect_error',
      inspect_exception: 'inspect_error',
      inspect_dom: 'inspect_element',
      eval_js: 'execute_javascript',
      eval_javascript: 'execute_javascript',
      run_javascript: 'execute_javascript',
      get_storage: 'check_storage',
      inspect_storage: 'check_storage',
      inspect_docker: 'inspect_docker_logs',
      docker_logs: 'inspect_docker_logs',
      check_docker_logs: 'inspect_docker_logs',
      docker: 'inspect_docker_logs',
      get_docker_logs: 'inspect_docker_logs',
      causal_graph: 'graphify_errors',
      error_graph: 'graphify_errors',
      build_graph: 'graphify_errors',
      graph_errors: 'graphify_errors',
      generate_graph: 'graphify_errors',
      finish: 'done',
      complete: 'done',
      conclude: 'done'
    }

    return aliases[cleaned] || cleaned
  }

  public async investigate(
    goal: string,
    options: InvestigationOptions = {}
  ): Promise<InvestigationResult> {
    const startTime = Date.now()
    const maxSteps = options.maxSteps ?? 8
    const steps: AgentStep[] = []
    const memoryStore: Record<string, any> = {}
    let cumulativeMemory = 'No findings yet.'

    const toolContext: ToolContext = {
      controller: this.controller,
      memory: memoryStore,
      signal: options.signal
    }

    // Build initial state snapshot
    const initialDebugState = this.controller.serialize()

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: getSystemPrompt()
      },
      {
        role: 'user',
        content: `Investigation Goal: "${goal}"\n\nCurrent Browser State:\n${initialDebugState}\n\nPlease analyze the telemetry, formulate your working hypothesis, and choose the first diagnostic action.`
      }
    ]

    const toolDefs: ToolDefinition[] = Array.from(this.tools.values()).map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))

    for (let stepNumber = 1; stepNumber <= maxSteps; stepNumber++) {
      if (options.signal?.aborted) {
        return {
          goal,
          status: 'aborted',
          diagnosis: 'Investigation was aborted by user signal.',
          rootCause: 'Aborted',
          confidence: 0,
          steps,
          durationMs: Date.now() - startTime,
          finalMemory: cumulativeMemory
        }
      }

      options.onStepStart?.(stepNumber)

      // Call LLM
      const response = await this.llmClient.chat(messages, toolDefs, options.signal)
      const rawContent = response.content || ''

      // Parse Reflection & Tool Call
      let reflection: DebugReflection | null = null

      // Check if response contains structured JSON or tool call
      try {
        // Strip markdown code blocks if present
        let cleanContent = rawContent.trim()
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }

        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          const validated = DebugReflectionSchema.safeParse(parsed)
          if (validated.success) {
            reflection = validated.data
          }
        }
      } catch {
        // Fallback to toolCall if available
      }

      if (!reflection && response.toolCalls && response.toolCalls.length > 0) {
        const firstCall = response.toolCalls[0]
        let toolArgs: any = {}
        try {
          toolArgs = JSON.parse(firstCall.function.arguments || '{}')
        } catch {
          // ignore
        }

        if (toolArgs && typeof toolArgs === 'object' && toolArgs.action && toolArgs.action.name) {
          reflection = {
            evaluation_previous_goal: toolArgs.evaluation_previous_goal || 'Direct tool dispatch from function call.',
            working_hypothesis: toolArgs.working_hypothesis || 'Evaluating diagnostic action.',
            memory: toolArgs.memory || cumulativeMemory,
            next_goal: toolArgs.next_goal || `Execute ${toolArgs.action.name}`,
            action: {
              name: toolArgs.action.name,
              arguments: toolArgs.action.arguments || toolArgs.action.parameters || {}
            }
          }
        } else {
          reflection = {
            evaluation_previous_goal: 'Direct tool dispatch from model function calling.',
            working_hypothesis: 'Evaluating selected diagnostic tool.',
            memory: cumulativeMemory,
            next_goal: `Execute ${firstCall.function.name}`,
            action: {
              name: firstCall.function.name,
              arguments: toolArgs
            }
          }
        }
      }

      // If still no valid reflection, generate an adaptive fallback
      if (!reflection) {
        const failedNet = this.controller.getNetworkRecords().filter((r) => r.isFailed)
        if (failedNet.length > 0) {
          reflection = {
            evaluation_previous_goal: 'Autonomous triage selected failed network stream.',
            working_hypothesis: `Investigating failed network request to ${failedNet[0].url}`,
            memory: cumulativeMemory,
            next_goal: 'Inspect failed network request details',
            action: {
              name: 'inspect_request',
              arguments: { requestIndex: 0 }
            }
          }
        } else {
          reflection = {
            evaluation_previous_goal: 'Autonomous triage selected console stream.',
            working_hypothesis: 'Analyzing recorded console events.',
            memory: cumulativeMemory,
            next_goal: 'Inspect recorded error details',
            action: {
              name: 'inspect_error',
              arguments: { errorIndex: 0 }
            }
          }
        }
      }

      cumulativeMemory = reflection.memory || cumulativeMemory
      options.onReflection?.(reflection)

      // Execute Diagnostic Tool
      const actionName = this.normalizeToolName(reflection.action.name)
      const actionArgs = reflection.action.arguments || {}
      const targetTool = this.tools.get(actionName)

      options.onToolExecute?.(actionName, actionArgs)

      let toolResult = ''
      if (!targetTool) {
        toolResult = `Error: Tool "${actionName}" does not exist in registry. Available tools: ${Array.from(this.tools.keys()).join(', ')}`
      } else {
        try {
          toolResult = await targetTool.execute(actionArgs, toolContext)
        } catch (err: any) {
          toolResult = `Tool execution error: ${err.message}`
        }
      }

      options.onToolResult?.(actionName, toolResult)

      const agentStep: AgentStep = {
        stepNumber,
        reflection,
        toolCall: {
          name: actionName,
          arguments: actionArgs
        },
        toolResult,
        timestamp: Date.now()
      }
      steps.push(agentStep)

      // Check if investigation is done
      if (actionName === 'done') {
        const finalData = memoryStore['finalResult'] || actionArgs
        const result: InvestigationResult = {
          goal,
          status: 'resolved',
          diagnosis: finalData.diagnosis || 'Root cause identified.',
          rootCause: finalData.rootCause || 'Diagnostic conclusion reached.',
          fix: finalData.fix,
          confidence: finalData.confidence ?? 0.9,
          filesToModify: finalData.filesToModify,
          steps,
          durationMs: Date.now() - startTime,
          finalMemory: cumulativeMemory
        }

        options.onDone?.(result)
        return result
      }

      // Append step to conversation history
      messages.push({
        role: 'assistant',
        content: JSON.stringify(reflection, null, 2)
      })
      messages.push({
        role: 'user',
        content: `Tool Result for [${actionName}]:\n${toolResult}\n\nEvaluate this evidence and proceed to the next step.`
      })
    }

    // If max steps reached without calling done
    const unresolvedResult: InvestigationResult = {
      goal,
      status: 'max_steps_exceeded',
      diagnosis: 'Investigation exceeded maximum diagnostic steps without reaching a verified conclusion.',
      rootCause: steps[steps.length - 1]?.reflection.working_hypothesis || 'Inconclusive',
      confidence: 0.3,
      steps,
      durationMs: Date.now() - startTime,
      finalMemory: cumulativeMemory
    }

    options.onDone?.(unresolvedResult)
    return unresolvedResult
  }
}
