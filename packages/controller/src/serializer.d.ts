import type { CausalErrorGraph, DebugState, SerializerOptions, TemporalCorrelation } from './types.js';
export declare function computeCorrelations(state: DebugState): TemporalCorrelation[];
export declare function buildCausalErrorGraph(state: DebugState, options?: {
    timeframeMs?: number;
    includeDocker?: boolean;
}): CausalErrorGraph;
export declare function debugStateToString(state: DebugState, options?: SerializerOptions): string;
//# sourceMappingURL=serializer.d.ts.map