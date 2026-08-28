import type { DockerContainerInfo, DockerLogEntry, LogLevel } from '../types.js';
export declare class DockerInterceptor {
    private logRingBuffer;
    private containers;
    private maxBufferSize;
    private isAvailable;
    private logCounter;
    constructor(maxBufferSize?: number);
    init(): void;
    setContainers(containers: DockerContainerInfo[]): void;
    getContainers(): DockerContainerInfo[];
    pushLog(containerName: string, rawMessage: string, stream?: 'stdout' | 'stderr', customTimestamp?: number, customLevel?: LogLevel): DockerLogEntry;
    getLogs(options?: {
        container?: string;
        level?: LogLevel | 'all';
        grep?: string;
        tail?: number;
        sinceSeconds?: number;
    }): DockerLogEntry[];
    getStatus(): {
        isAvailable: boolean;
        containerCount: number;
        errorCount: number;
    };
    clear(): void;
    destroy(): void;
}
//# sourceMappingURL=docker.d.ts.map