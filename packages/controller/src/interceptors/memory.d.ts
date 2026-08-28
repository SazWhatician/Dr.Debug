import type { MemorySnapshot } from '../types.js';
export declare class MemoryInterceptor {
    private history;
    private maxHistory;
    sample(): MemorySnapshot | null;
    getHistory(): MemorySnapshot[];
    clear(): void;
}
//# sourceMappingURL=memory.d.ts.map