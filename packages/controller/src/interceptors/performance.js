export class PerformanceInterceptor {
    longTasks = [];
    vitals = {};
    slowResources = [];
    observers = [];
    isInstalled = false;
    maxLongTasks = 50;
    init() {
        if (this.isInstalled || typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
            return;
        }
        // 1. Long Tasks (>50ms)
        this.safeObserve('longtask', (list) => {
            for (const entry of list.getEntries()) {
                this.longTasks.push({
                    startTime: Math.round(entry.startTime),
                    duration: Math.round(entry.duration),
                    name: entry.name,
                    attribution: entry.attribution
                });
                if (this.longTasks.length > this.maxLongTasks) {
                    this.longTasks.shift();
                }
            }
        });
        // 2. Largest Contentful Paint (LCP)
        this.safeObserve('largest-contentful-paint', (list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
                const val = Math.round(lastEntry.startTime);
                this.vitals['LCP'] = {
                    name: 'LCP',
                    value: val,
                    rating: val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor',
                    attribution: lastEntry.element?.tagName?.toLowerCase()
                };
            }
        });
        // 3. Layout Shift (CLS)
        let clsValue = 0;
        this.safeObserve('layout-shift', (list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value || 0;
                }
            }
            const rounded = Math.round(clsValue * 1000) / 1000;
            this.vitals['CLS'] = {
                name: 'CLS',
                value: rounded,
                rating: rounded <= 0.1 ? 'good' : rounded <= 0.25 ? 'needs-improvement' : 'poor'
            };
        });
        // 4. INP (Interaction to Next Paint) via 'event' entries
        let inpMax = 0;
        this.safeObserve('event', (list) => {
            for (const entry of list.getEntries()) {
                if (entry.duration > inpMax) {
                    inpMax = entry.duration;
                    const val = Math.round(inpMax);
                    this.vitals['INP'] = {
                        name: 'INP',
                        value: val,
                        rating: val <= 200 ? 'good' : val <= 500 ? 'needs-improvement' : 'poor'
                    };
                }
            }
        }, { durationThreshold: 40 });
        // 5. Slow Resources (>1500ms duration)
        this.safeObserve('resource', (list) => {
            for (const entry of list.getEntries()) {
                const resEntry = entry;
                const duration = Math.round(resEntry.duration);
                if (duration > 1500) {
                    this.slowResources.push({
                        name: resEntry.name,
                        duration,
                        size: resEntry.transferSize,
                        initiatorType: resEntry.initiatorType
                    });
                    if (this.slowResources.length > 30) {
                        this.slowResources.shift();
                    }
                }
            }
        });
        this.isInstalled = true;
    }
    safeObserve(entryType, callback, extraOptions = {}) {
        try {
            if (PerformanceObserver.supportedEntryTypes?.includes(entryType)) {
                const observer = new PerformanceObserver(callback);
                observer.observe({ type: entryType, buffered: true, ...extraOptions });
                this.observers.push(observer);
            }
        }
        catch {
            // Entry type not supported in this runtime environment
        }
    }
    recordCustomVital(vital) {
        this.vitals[vital.name] = vital;
    }
    getMetrics() {
        return {
            longTasks: [...this.longTasks],
            vitals: { ...this.vitals },
            slowResources: [...this.slowResources]
        };
    }
    clear() {
        this.longTasks = [];
        this.vitals = {};
        this.slowResources = [];
    }
    destroy() {
        this.observers.forEach((obs) => obs.disconnect());
        this.observers = [];
        this.isInstalled = false;
    }
}
//# sourceMappingURL=performance.js.map