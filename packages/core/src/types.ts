import type { DebugController } from '@dr-debug/controller'
import { z } from 'zod'

export const ToolActionSchema = z.object({
  name: z.string().describe('The name of the diagnostic tool to execute.'),
  arguments: z.record(z.any()).describe('The key-value arguments for the chosen tool.')
})

export const DebugReflectionSchema = z.object({
  evaluation_previous_goal: z
    .string()
    .describe(
      'Evaluation of the last diagnostic step result. State whether the previous hypothesis was confirmed, refuted, or yielded unexpected clues.'
    ),
  working_hypothesis: z
    .string()
    .describe(
      'Current working causal theory of the root cause (e.g. "Network 401 error caused token expiration, cascading into undefined state in UserProfile").'
    ),
  memory: z
    .string()
    .describe(
      'Cumulative persistent discoveries and confirmed facts retained across investigation steps.'
    ),
  next_goal: z
    .string()
    .describe(
      'The immediate sub-goal for this step to verify or advance the hypothesis.'
    ),
  action: ToolActionSchema.describe('The single diagnostic tool action to dispatch.')
})

export type DebugReflection = z.infer<typeof DebugReflectionSchema>
export type ToolAction = z.infer<typeof ToolActionSchema>

export interface ToolContext {
  controller: DebugController
  memory: Record<string, any>
  signal?: AbortSignal
}

export interface DiagnosticTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  execute(args: any, context: ToolContext): Promise<string>
}

export interface AgentStep {
  stepNumber: number
  reflection: DebugReflection
  toolCall: {
    name: string
    arguments: any
  }
  toolResult: string
  timestamp: number
}

export interface InvestigationResult {
  goal: string
  status: 'resolved' | 'unresolved' | 'max_steps_exceeded' | 'aborted'
  diagnosis: string
  rootCause: string
  fix?: string
  confidence: number
  filesToModify?: string[]
  steps: AgentStep[]
  durationMs: number
  finalMemory: string
}

export interface InvestigationOptions {
  maxSteps?: number
  signal?: AbortSignal
  onStepStart?: (stepNumber: number) => void
  onReflection?: (reflection: DebugReflection) => void
  onToolExecute?: (toolName: string, args: any) => void
  onToolResult?: (toolName: string, result: string) => void
  onDone?: (result: InvestigationResult) => void
}
