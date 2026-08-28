import type { DebugController } from '@dr-debug/controller';
import type { ILLMClient } from '@dr-debug/llms';
import { type DiagnosticTool, type InvestigationOptions, type InvestigationResult } from './types.js';
export declare class DrDebugCore {
    private controller;
    private llmClient;
    private tools;
    constructor(controller: DebugController, llmClient: ILLMClient, customTools?: DiagnosticTool[]);
    registerTool(tool: DiagnosticTool): void;
    getRegisteredTools(): DiagnosticTool[];
    normalizeToolName(name: string): string;
    investigate(goal: string, options?: InvestigationOptions): Promise<InvestigationResult>;
}
//# sourceMappingURL=DrDebugCore.d.ts.map