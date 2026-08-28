import { z } from 'zod';
export const ToolActionSchema = z.object({
    name: z.string().describe('The name of the diagnostic tool to execute.'),
    arguments: z.record(z.any()).describe('The key-value arguments for the chosen tool.')
});
export const DebugReflectionSchema = z.object({
    evaluation_previous_goal: z
        .string()
        .describe('Evaluation of the last diagnostic step result. State whether the previous hypothesis was confirmed, refuted, or yielded unexpected clues.'),
    working_hypothesis: z
        .string()
        .describe('Current working causal theory of the root cause (e.g. "Network 401 error caused token expiration, cascading into undefined state in UserProfile").'),
    memory: z
        .string()
        .describe('Cumulative persistent discoveries and confirmed facts retained across investigation steps.'),
    next_goal: z
        .string()
        .describe('The immediate sub-goal for this step to verify or advance the hypothesis.'),
    action: ToolActionSchema.describe('The single diagnostic tool action to dispatch.')
});
//# sourceMappingURL=types.js.map