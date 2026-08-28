import { ConsoleInterceptor } from './interceptors/console.js';
import { DockerInterceptor } from './interceptors/docker.js';
import { MemoryInterceptor } from './interceptors/memory.js';
import { NetworkInterceptor } from './interceptors/network.js';
import { PerformanceInterceptor } from './interceptors/performance.js';
import { buildCausalErrorGraph, computeCorrelations, debugStateToString } from './serializer.js';
export class DebugController {
    consoleInterceptor;
    networkInterceptor;
    performanceInterceptor;
    memoryInterceptor;
    dockerInterceptor;
    startTime = Date.now();
    isRunning = false;
    constructor(maxBufferSize = 100) {
        this.consoleInterceptor = new ConsoleInterceptor(maxBufferSize);
        this.networkInterceptor = new NetworkInterceptor(maxBufferSize);
        this.performanceInterceptor = new PerformanceInterceptor();
        this.memoryInterceptor = new MemoryInterceptor();
        this.dockerInterceptor = new DockerInterceptor(maxBufferSize);
    }
    init() {
        if (this.isRunning)
            return;
        this.startTime = Date.now();
        this.consoleInterceptor.init();
        this.networkInterceptor.init();
        this.performanceInterceptor.init();
        this.dockerInterceptor.init();
        this.isRunning = true;
    }
    getSnapshot() {
        const consoleEntries = this.consoleInterceptor.getEntries();
        const networkRecords = this.networkInterceptor.getRecords();
        const performanceMetrics = this.performanceInterceptor.getMetrics();
        const memorySnapshot = this.memoryInterceptor.sample();
        const dockerContainers = this.dockerInterceptor.getContainers();
        const dockerLogs = this.dockerInterceptor.getLogs();
        const dockerStatus = this.dockerInterceptor.getStatus();
        const errors = consoleEntries.filter((e) => e.level === 'error');
        const warns = consoleEntries.filter((e) => e.level === 'warn');
        const failedNet = networkRecords.filter((r) => r.isFailed);
        const slowNet = networkRecords.filter((r) => r.isSlow);
        const pageContext = {
            url: typeof window !== 'undefined' ? window.location?.href || '' : '',
            title: typeof document !== 'undefined' ? document.title || '' : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent || '' : '',
            uptimeSeconds: (Date.now() - this.startTime) / 1000,
            timestamp: Date.now()
        };
        const state = {
            pageContext,
            console: {
                total: consoleEntries.length,
                errorCount: errors.length,
                warnCount: warns.length,
                entries: consoleEntries
            },
            network: {
                total: networkRecords.length,
                failedCount: failedNet.length,
                slowCount: slowNet.length,
                records: networkRecords
            },
            performance: performanceMetrics,
            memory: memorySnapshot,
            docker: {
                isAvailable: dockerStatus.isAvailable,
                containers: dockerContainers,
                logs: dockerLogs,
                errorCount: dockerStatus.errorCount
            },
            correlations: []
        };
        state.correlations = computeCorrelations(state);
        state.causalGraph = buildCausalErrorGraph(state);
        return state;
    }
    serialize(options) {
        const state = this.getSnapshot();
        return debugStateToString(state, options);
    }
    getConsoleEntries() {
        return this.consoleInterceptor.getEntries();
    }
    getNetworkRecords() {
        return this.networkInterceptor.getRecords();
    }
    getPerformanceMetrics() {
        return this.performanceInterceptor.getMetrics();
    }
    getMemorySnapshot() {
        return this.memoryInterceptor.sample();
    }
    getDockerLogs(options) {
        return this.dockerInterceptor.getLogs(options);
    }
    getDockerContainers() {
        return this.dockerInterceptor.getContainers();
    }
    pushDockerLog(containerName, message, stream = 'stdout', timestamp, level) {
        return this.dockerInterceptor.pushLog(containerName, message, stream, timestamp, level);
    }
    setDockerContainers(containers) {
        this.dockerInterceptor.setContainers(containers);
    }
    getCorrelations() {
        return this.getSnapshot().correlations;
    }
    getCausalGraph(options) {
        const state = this.getSnapshot();
        return buildCausalErrorGraph(state, options);
    }
    clear() {
        this.consoleInterceptor.clear();
        this.networkInterceptor.clear();
        this.performanceInterceptor.clear();
        this.memoryInterceptor.clear();
        this.dockerInterceptor.clear();
    }
    destroy() {
        if (!this.isRunning)
            return;
        this.consoleInterceptor.destroy();
        this.networkInterceptor.destroy();
        this.performanceInterceptor.destroy();
        this.dockerInterceptor.destroy();
        this.isRunning = false;
    }
}
//# sourceMappingURL=DebugController.js.map