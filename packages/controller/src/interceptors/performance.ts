import type { LongTaskEntry, PerformanceMetrics, WebVitalMetric } from '../types.js'

export class PerformanceInterceptor {
  private longTasks: LongTaskEntry[] = []
  private vitals: Record<string, WebVitalMetric> = {}
  private slowResources: PerformanceMetrics['slowResources'] = []
  private observers: PerformanceObserver[] = []
  private isInstalled = false
  private maxLongTasks = 50

  public init(): void {
    if (this.isInstalled || typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return
    }

    // 1. Long Tasks (>50ms)
    this.safeObserve('longtask', (list) => {
      for (const entry of list.getEntries()) {
        this.longTasks.push({
          startTime: Math.round(entry.startTime),
          duration: Math.round(entry.duration),
          name: entry.name,
          attribution: (entry as any).attribution
        })
        if (this.longTasks.length > this.maxLongTasks) {
          this.longTasks.shift()
        }
      }
    })

    // 2. Largest Contentful Paint (LCP)
    this.safeObserve('largest-contentful-paint', (list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        const val = Math.round(lastEntry.startTime)
        this.vitals['LCP'] = {
          name: 'LCP',
          value: val,
          rating: val <= 2500 ? 'good' : val <= 4000 ? 'needs-improvement' : 'poor',
          attribution: (lastEntry as any).element?.tagName?.toLowerCase()
        }
      }
    })

    // 3. Layout Shift (CLS)
    let clsValue = 0
    this.safeObserve('layout-shift', (list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value || 0
        }
      }
      const rounded = Math.round(clsValue * 1000) / 1000
      this.vitals['CLS'] = {
        name: 'CLS',
        value: rounded,
        rating: rounded <= 0.1 ? 'good' : rounded <= 0.25 ? 'needs-improvement' : 'poor'
      }
    })

    // 4. Slow Resources (>1500ms duration)
    this.safeObserve('resource', (list) => {
      for (const entry of list.getEntries()) {
        const resEntry = entry as PerformanceResourceTiming
        const duration = Math.round(resEntry.duration)
        if (duration > 1500) {
          this.slowResources.push({
            name: resEntry.name,
            duration,
            size: resEntry.transferSize,
            initiatorType: resEntry.initiatorType
          })
          if (this.slowResources.length > 30) {
            this.slowResources.shift()
          }
        }
      }
    })

    this.isInstalled = true
  }

  private safeObserve(
    entryType: string,
    callback: (list: PerformanceObserverEntryList) => void
  ): void {
    try {
      if (PerformanceObserver.supportedEntryTypes?.includes(entryType)) {
        const observer = new PerformanceObserver((list) => {
          callback(list)
        })
        observer.observe({ type: entryType, buffered: true })
        this.observers.push(observer)
      }
    } catch {
      // Entry type not supported in this runtime environment
    }
  }

  public recordCustomVital(vital: WebVitalMetric): void {
    this.vitals[vital.name] = vital
  }

  public getMetrics(): PerformanceMetrics {
    return {
      longTasks: [...this.longTasks],
      vitals: { ...this.vitals },
      slowResources: [...this.slowResources]
    }
  }

  public clear(): void {
    this.longTasks = []
    this.vitals = {}
    this.slowResources = []
  }

  public destroy(): void {
    this.observers.forEach((obs) => obs.disconnect())
    this.observers = []
    this.isInstalled = false
  }
}
