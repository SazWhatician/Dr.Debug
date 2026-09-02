export interface RCAReport {
    goal: string;
    diagnosis: string;
    rootCause: string;
    fix?: string;
    confidence?: number;
    filesToModify?: string[];
    durationMs?: number;
    timestamp?: number;
    steps: Array<{
        stepNumber: number;
        hypothesis: string;
        toolName: string;
        toolOutput?: string;
    }>;
}
export declare function generateMarkdownRCA(report: RCAReport): string;
export declare function generateJsonRCA(report: RCAReport): string;
//# sourceMappingURL=panel.d.ts.map