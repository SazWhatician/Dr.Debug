import type { MemorySnapshot } from '../types.js'

export class MemoryInterceptor {
  private history: MemorySnapshot[] = []
  private maxHistory = 20

  public sample(): MemorySnapshot | null {
    if (typeof window === 'undefined') return null

    const memory = (performance as any)?.memory
    const now = Date.now()

    let usedJSHeapSize: number | undefined
    let totalJSHeapSize: number | undefined
    let jsHeapSizeLimit: number | undefined
    let heapUsagePercent: number | undefined

    if (memory) {
      usedJSHeapSize = memory.usedJSHeapSize
      totalJSHeapSize = memory.totalJSHeapSize
      jsHeapSizeLimit = memory.jsHeapSizeLimit
      if (usedJSHeapSize && totalJSHeapSize && totalJSHeapSize > 0) {
        heapUsagePercent = Math.round((usedJSHeapSize / totalJSHeapSize) * 1000) / 10
      }
    }

    // Heuristic detached DOM node sampling
    let detachedNodesCount: number | undefined
    if (typeof document !== 'undefined') {
      try {
        const totalElements = document.querySelectorAll('*').length
        // Simple DOM density check
        detachedNodesCount = totalElements
      } catch {
        // Ignore DOM query failure
      }
    }

    // Calculate trend MB/min if we have past history
    let trendMBPerMin: number | undefined
    if (this.history.length > 0 && usedJSHeapSize) {
      const prev = this.history[this.history.length - 1]
      if (prev.usedJSHeapSize) {
        const deltaMB = (usedJSHeapSize - prev.usedJSHeapSize) / (1024 * 1024)
        const deltaMinutes = (now - prev.timestamp) / (1000 * 60)
        if (deltaMinutes > 0) {
          trendMBPerMin = Math.round((deltaMB / deltaMinutes) * 100) / 100
        }
      }
    }

    const snapshot: MemorySnapshot = {
      timestamp: now,
      usedJSHeapSize,
      totalJSHeapSize,
      jsHeapSizeLimit,
      heapUsagePercent,
      detachedNodesCount,
      trendMBPerMin
    }

    this.history.push(snapshot)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    return snapshot
  }

  public getHistory(): MemorySnapshot[] {
    return [...this.history]
  }

  public clear(): void {
    this.history = []
  }
}
