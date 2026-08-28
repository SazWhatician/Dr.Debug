import { type CausalErrorGraph } from './CausalGraphView.js';
export interface StepItem {
    stepNumber: number;
    hypothesis: string;
    toolName: string;
    toolArgs?: any;
    toolOutput?: string;
    memory?: string;
}
export interface PrescriptionData {
    diagnosis: string;
    rootCause: string;
    fix: string;
    confidence?: number;
    filesToModify?: string[];
}
export declare class CockpitPanel {
    private onClose;
    private onInvestigate;
    private element;
    private timelineContainer;
    private triageContainer;
    private graphContainer;
    private prescriptionContainer;
    private causalGraphView;
    private queryInput;
    private queryButton;
    private tabTimeline;
    private tabTriage;
    private tabGraph;
    private tabPrescription;
    private heapMetricBadge;
    private uptimeMetricBadge;
    private activeTab;
    private steps;
    private startTime;
    private isMaximized;
    private maximizeBtn;
    constructor(onClose: () => void, onInvestigate: (query: string) => void);
    getElement(): HTMLElement;
    show(): void;
    hide(): void;
    toggle(): void;
    isVisible(): boolean;
    setBusy(busy: boolean): void;
    switchTab(tab: 'timeline' | 'triage' | 'graph' | 'prescription'): void;
    updateCausalGraph(graph: CausalErrorGraph): void;
    clearTimeline(): void;
    renderEmptyTimeline(): void;
    renderEmptyPrescription(): void;
    addStep(step: StepItem): void;
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
    private toggleMaximize;
    private makeCopyBtn;
    private startUptimeTicker;
    private triggerInvestigate;
    private formatDiffHtml;
    private escapeHtml;
    private initDraggable;
}
//# sourceMappingURL=CockpitPanel.d.ts.map