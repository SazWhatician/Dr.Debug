export interface ErrorGraphNode {
    id: string;
    label: string;
    layer: 'docker' | 'network' | 'console' | 'dom';
    summary: string;
    timestamp: number;
    metadata?: Record<string, any>;
    isRootCause?: boolean;
}
export interface ErrorGraphEdge {
    id: string;
    source: string;
    target: string;
    label: string;
    timeDeltaMs?: number;
    confidence: number;
    relationship: 'CAUSED_BY' | 'TRIGGERED_BY' | 'CORRELATED_WITH' | 'PROPAGATED_TO';
}
export interface CausalErrorGraph {
    nodes: ErrorGraphNode[];
    edges: ErrorGraphEdge[];
    rootCauseNodeId?: string;
    mermaidDiagram: string;
}
export declare class CausalGraphView {
    private element;
    private currentGraph;
    private selectedNodeId;
    constructor();
    getElement(): HTMLElement;
    updateGraph(graph: CausalErrorGraph): void;
    private renderEmpty;
    private render;
    private showNodeDetails;
    private escapeHtml;
}
//# sourceMappingURL=CausalGraphView.d.ts.map