export interface DownloadMetrics {
  total: number
  github: number
  npm: number
  web: number
  timestamp: number
}

const CACHE_KEY = 'dr_debug_metrics_cache_v1'
const CACHE_TTL_MS = 300000 // 5 minutes
const BASELINE_FLOOR = 1250

export function formatDownloadCount(count: number): string {
  if (count >= 10000) {
    const k = (count / 1000).toFixed(1)
    return `${k}k+`
  }
  if (count >= 1000) {
    return `${count.toLocaleString()}+`
  }
  return `${count}+`
}

export class DownloadMetricsService {
  private inFlightPromise: Promise<DownloadMetrics> | null = null

  public getCachedMetrics(): DownloadMetrics | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as DownloadMetrics
    } catch {
      return null
    }
  }

  public async fetchMetrics(): Promise<DownloadMetrics> {
    const cached = this.getCachedMetrics()
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise
    }

    this.inFlightPromise = this.doFetch(cached)
    try {
      return await this.inFlightPromise
    } finally {
      this.inFlightPromise = null
    }
  }

  private async doFetch(cachedFallback: DownloadMetrics | null): Promise<DownloadMetrics> {
    let githubTotal = 0
    let npmTotal = 0
    let webTotal = 0

    const timeout = 3000

    // 1. GitHub Releases API
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      const res = await fetch('https://api.github.com/repos/SazWhatician/Dr.Debug/releases', {
        signal: controller.signal
      })
      clearTimeout(timer)
      if (res.ok) {
        const releases = await res.json()
        if (Array.isArray(releases)) {
          for (const rel of releases) {
            if (Array.isArray(rel.assets)) {
              for (const asset of rel.assets) {
                githubTotal += Number(asset.download_count) || 0
              }
            }
          }
        }
      }
    } catch {
      githubTotal = cachedFallback?.github || 0
    }

    // 2. NPM Downloads API
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      const res = await fetch('https://api.npmjs.org/downloads/point/last-year/@dr-debug/mcp', {
        signal: controller.signal
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        npmTotal += Number(data.downloads) || 0
      }
    } catch {
      npmTotal = cachedFallback?.npm || 0
    }

    // 3. CounterAPI Web Direct Clicks
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      const res = await fetch('https://api.counterapi.dev/v1/dr-debug/downloads', {
        signal: controller.signal
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        webTotal = Number(data.count) || 0
      }
    } catch {
      webTotal = cachedFallback?.web || 0
    }

    const total = BASELINE_FLOOR + githubTotal + npmTotal + webTotal
    const result: DownloadMetrics = {
      total,
      github: githubTotal,
      npm: npmTotal,
      web: webTotal,
      timestamp: Date.now()
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result))
    } catch {
      // Storage unavailable / quota exceeded
    }

    return result
  }

  public async recordDownloadClick(): Promise<number> {
    const cached = this.getCachedMetrics()
    const currentTotal = cached ? cached.total : BASELINE_FLOOR
    const nextTotal = currentTotal + 1

    if (cached) {
      cached.total = nextTotal
      cached.web = (cached.web || 0) + 1
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
      } catch {}
    }

    // Asynchronously ping CounterAPI increment
    try {
      fetch('https://api.counterapi.dev/v1/dr-debug/downloads/up', {
        method: 'POST',
        keepalive: true
      }).catch(() => null)
    } catch {}

    return nextTotal
  }
}
