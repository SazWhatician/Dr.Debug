import type { PerformanceMetrics, WebVitalMetric } from '../types.js';
export declare class PerformanceInterceptor {
    private longTasks;
    private vitals;
    private slowResources;
    private observers;
    private isInstalled;
    private maxLongTasks;
    init(): void;
    private safeObserve;
    recordCustomVital(vital: WebVitalMetric): void;
    getMetrics(): PerformanceMetrics;
    clear(): void;
    destroy(): void;
}
//# sourceMappingURL=performance.d.ts.map