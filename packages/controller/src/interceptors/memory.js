export class MemoryInterceptor {
    history = [];
    maxHistory = 20;
    sample() {
        if (typeof window === 'undefined')
            return null;
        const memory = performance?.memory;
        const now = Date.now();
        let usedJSHeapSize;
        let totalJSHeapSize;
        let jsHeapSizeLimit;
        let heapUsagePercent;
        if (memory) {
            usedJSHeapSize = memory.usedJSHeapSize;
            totalJSHeapSize = memory.totalJSHeapSize;
            jsHeapSizeLimit = memory.jsHeapSizeLimit;
            if (usedJSHeapSize && totalJSHeapSize && totalJSHeapSize > 0) {
                heapUsagePercent = Math.round((usedJSHeapSize / totalJSHeapSize) * 1000) / 10;
            }
        }
        // Heuristic detached DOM node sampling
        let detachedNodesCount;
        if (typeof document !== 'undefined') {
            try {
                const totalElements = document.querySelectorAll('*').length;
                // Simple DOM density check
                detachedNodesCount = totalElements;
            }
            catch {
                // Ignore DOM query failure
            }
        }
        // Calculate trend MB/min if we have past history
        let trendMBPerMin;
        if (this.history.length > 0 && usedJSHeapSize) {
            const prev = this.history[this.history.length - 1];
            if (prev.usedJSHeapSize) {
                const deltaMB = (usedJSHeapSize - prev.usedJSHeapSize) / (1024 * 1024);
                const deltaMinutes = (now - prev.timestamp) / (1000 * 60);
                if (deltaMinutes > 0) {
                    trendMBPerMin = Math.round((deltaMB / deltaMinutes) * 100) / 100;
                }
            }
        }
        const snapshot = {
            timestamp: now,
            usedJSHeapSize,
            totalJSHeapSize,
            jsHeapSizeLimit,
            heapUsagePercent,
            detachedNodesCount,
            trendMBPerMin
        };
        this.history.push(snapshot);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        return snapshot;
    }
    getHistory() {
        return [...this.history];
    }
    clear() {
        this.history = [];
    }
}
//# sourceMappingURL=memory.js.map