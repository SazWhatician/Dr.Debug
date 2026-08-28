import type { ConsoleEntry } from '../types.js';
export declare class ConsoleInterceptor {
    private ringBuffer;
    private maxEntries;
    private isInstalled;
    private isCapturing;
    private originalConsole;
    private errorHandler?;
    private rejectionHandler?;
    constructor(maxEntries?: number);
    init(): void;
    private captureConsoleLog;
    private push;
    private parseStack;
    getEntries(): ConsoleEntry[];
    getErrors(): ConsoleEntry[];
    getWarnings(): ConsoleEntry[];
    clear(): void;
    destroy(): void;
}
//# sourceMappingURL=console.d.ts.map