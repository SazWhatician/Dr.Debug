import type { DebugController } from '@dr-debug/controller';
import { z } from 'zod';
export declare const ToolActionSchema: z.ZodObject<{
    name: z.ZodString;
    arguments: z.ZodRecord<z.ZodString, z.ZodAny>;
}, "strip", z.ZodTypeAny, {
    name: string;
    arguments: Record<string, any>;
}, {
    name: string;
    arguments: Record<string, any>;
}>;
export declare const DebugReflectionSchema: z.ZodObject<{
    evaluation_previous_goal: z.ZodString;
    working_hypothesis: z.ZodString;
    memory: z.ZodString;
    next_goal: z.ZodString;
    action: z.ZodObject<{
        name: z.ZodString;
        arguments: z.ZodRecord<z.ZodString, z.ZodAny>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        arguments: Record<string, any>;
    }, {
        name: string;
        arguments: Record<string, any>;
    }>;
}, "strip", z.ZodTypeAny, {
    evaluation_previous_goal: string;
    working_hypothesis: string;
    memory: string;
    next_goal: string;
    action: {
        name: string;
        arguments: Record<string, any>;
    };
}, {
    evaluation_previous_goal: string;
    working_hypothesis: string;
    memory: string;
    next_goal: string;
    action: {
        name: string;
        arguments: Record<string, any>;
    };
}>;
export type DebugReflection = z.infer<typeof DebugReflectionSchema>;
export type ToolAction = z.infer<typeof ToolActionSchema>;
export interface ToolContext {
    controller: DebugController;
    memory: Record<string, any>;
    signal?: AbortSignal;
}
export interface DiagnosticTool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
    execute(args: any, context: ToolContext): Promise<string>;
}
export interface AgentStep {
    stepNumber: number;
    reflection: DebugReflection;
    toolCall: {
        name: string;
        arguments: any;
    };
    toolResult: string;
    timestamp: number;
}
export interface InvestigationResult {
    goal: string;
    status: 'resolved' | 'unresolved' | 'max_steps_exceeded' | 'aborted';
    diagnosis: string;
    rootCause: string;
    fix?: string;
    confidence: number;
    filesToModify?: string[];
    steps: AgentStep[];
    durationMs: number;
    finalMemory: string;
}
export interface InvestigationOptions {
    maxSteps?: number;
    signal?: AbortSignal;
    onStepStart?: (stepNumber: number) => void;
    onReflection?: (reflection: DebugReflection) => void;
    onToolExecute?: (toolName: string, args: any) => void;
    onToolResult?: (toolName: string, result: string) => void;
    onDone?: (result: InvestigationResult) => void;
}
//# sourceMappingURL=types.d.ts.map