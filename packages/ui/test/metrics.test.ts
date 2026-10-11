import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DownloadMetricsService,
  formatDownloadCount
} from '../src/services/DownloadMetricsService.js'

describe('DownloadMetricsService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('formats download counts correctly across thresholds', () => {
    expect(formatDownloadCount(4)).toBe('4')
    expect(formatDownloadCount(450)).toBe('450')
    expect(formatDownloadCount(1250)).toBe('1,250+')
    expect(formatDownloadCount(9999)).toBe('9,999+')
    expect(formatDownloadCount(12500)).toBe('12.5k+')
  })

  it('returns baseline fallback when cache is empty and network is unavailable', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network offline'))
    const service = new DownloadMetricsService()
    const metrics = await service.fetchMetrics()

    expect(metrics.total).toBeGreaterThanOrEqual(4)
    expect(metrics.github).toBe(0)
  })

  it('correctly aggregates GitHub and CounterAPI counts', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const urlStr = String(url)
      if (urlStr.includes('api.github.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              assets: [
                { name: 'dr-debug-extension.zip', download_count: 500 },
                { name: 'dr-debug.standalone.min.js', download_count: 300 }
              ]
            }
          ]
        } as any)
      }
      if (urlStr.includes('api.counterapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 100 })
        } as any)
      }
      return Promise.reject(new Error('Unknown url'))
    })

    const service = new DownloadMetricsService()
    const metrics = await service.fetchMetrics()

    // 500 (gh) + 300 (gh) + 100 (counter) + 4 (baseline) = 904
    expect(metrics.github).toBe(800)
    expect(metrics.web).toBe(100)
    expect(metrics.total).toBe(904)
  })

  it('optimistically increments count on download click', async () => {
    const service = new DownloadMetricsService()
    localStorage.setItem(
      'dr_debug_metrics_cache_v2',
      JSON.stringify({ total: 4, github: 0, npm: 0, web: 0, timestamp: Date.now() })
    )

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ count: 1 })
    } as any)

    const newTotal = await service.recordDownloadClick()
    expect(newTotal).toBe(5)
    expect(service.getCachedMetrics()?.total).toBe(5)
  })
})
