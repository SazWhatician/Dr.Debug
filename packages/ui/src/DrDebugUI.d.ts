import { type PrescriptionData, type StepItem } from './components/CockpitPanel.js';
export interface DrDebugUIOptions {
    onInvestigate?: (query: string) => Promise<void> | void;
    container?: HTMLElement;
}
export declare class DrDebugUI {
    private host;
    private shadowRoot;
    private pill;
    private cockpit;
    constructor(options?: DrDebugUIOptions);
    getShadowRoot(): ShadowRoot;
    getHost(): HTMLElement;
    updatePillStatus(errorCount: number, failedNetCount?: number, slowNetCount?: number, isRunning?: boolean): void;
    addTimelineStep(step: StepItem): void;
    showPrescription(prescription: PrescriptionData): void;
    updateTriage(telemetry: {
        errors: string[];
        slowRequests: string[];
        vitals?: Record<string, any>;
        memory?: {
            usedMB?: number;
            totalMB?: number;
        };
    }): void;
    updateCausalGraph(graph: any): void;
    clearTimeline(): void;
    toggleCockpit(): void;
    openCockpit(): void;
    closeCockpit(): void;
    private runDemoInvestigation;
    destroy(): void;
}
//# sourceMappingURL=DrDebugUI.d.ts.map