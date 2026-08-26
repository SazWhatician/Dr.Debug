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
        // Try parsing content directly
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/)
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
        let toolArgs = {}
        try {
          toolArgs = JSON.parse(firstCall.function.arguments || '{}')
        } catch {
          // ignore
        }

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

      // If still no valid reflection, generate a structured fallback to maintain loop resilience
      if (!reflection) {
        reflection = {
          evaluation_previous_goal: 'Parsed raw text output.',
          working_hypothesis: 'Analyzing console & network anomalies.',
          memory: cumulativeMemory,
          next_goal: 'Inspect initial errors',
          action: {
            name: 'inspect_error',
            arguments: { errorIndex: 0 }
          }
        }
      }

      cumulativeMemory = reflection.memory || cumulativeMemory
      options.onReflection?.(reflection)

      // Execute Diagnostic Tool
      const actionName = reflection.action.name
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
