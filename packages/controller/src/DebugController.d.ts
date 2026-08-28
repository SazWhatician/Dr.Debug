import type { CausalErrorGraph, ConsoleEntry, DebugState, DockerContainerInfo, DockerLogEntry, LogLevel, MemorySnapshot, NetworkRecord, PerformanceMetrics, SerializerOptions, TemporalCorrelation } from './types.js';
export declare class DebugController {
    private consoleInterceptor;
    private networkInterceptor;
    private performanceInterceptor;
    private memoryInterceptor;
    private dockerInterceptor;
    private startTime;
    private isRunning;
    constructor(maxBufferSize?: number);
    init(): void;
    getSnapshot(): DebugState;
    serialize(options?: SerializerOptions): string;
    getConsoleEntries(): ConsoleEntry[];
    getNetworkRecords(): NetworkRecord[];
    getPerformanceMetrics(): PerformanceMetrics;
    getMemorySnapshot(): MemorySnapshot | null;
    getDockerLogs(options?: {
        container?: string;
        level?: LogLevel | 'all';
        grep?: string;
        tail?: number;
        sinceSeconds?: number;
    }): DockerLogEntry[];
    getDockerContainers(): DockerContainerInfo[];
    pushDockerLog(containerName: string, message: string, stream?: 'stdout' | 'stderr', timestamp?: number, level?: LogLevel): DockerLogEntry;
    setDockerContainers(containers: DockerContainerInfo[]): void;
    getCorrelations(): TemporalCorrelation[];
    getCausalGraph(options?: {
        timeframeMs?: number;
        includeDocker?: boolean;
    }): CausalErrorGraph;
    clear(): void;
    destroy(): void;
}
//# sourceMappingURL=DebugController.d.ts.map