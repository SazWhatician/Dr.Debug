import { DebugController } from '@dr-debug/controller';
import { DrDebugCore, type InvestigationOptions, type InvestigationResult } from '@dr-debug/core';
import { type ILLMClient, type LiteRTConfig } from '@dr-debug/llms';
import { DrDebugUI } from '@dr-debug/ui';
export interface DrDebugOptions {
    model?: string;
    apiKey?: string;
    baseURL?: string;
    liteRT?: LiteRTConfig;
    llmClient?: ILLMClient;
    maxSteps?: number;
    language?: string;
    enableUI?: boolean;
    autoInvestigate?: boolean;
}
export declare class DrDebug {
    private controller;
    private core;
    private llmClient;
    private ui?;
    private options;
    private isAutoInvestigating;
    private syncInterval?;
    constructor(options?: DrDebugOptions);
    getController(): DebugController;
    getCore(): DrDebugCore;
    getUI(): DrDebugUI | undefined;
    investigate(goal?: string, options?: InvestigationOptions): Promise<InvestigationResult>;
    syncUIStatus(): void;
    private handleAutoTrigger;
    destroy(): void;
}
//# sourceMappingURL=DrDebug.d.ts.map