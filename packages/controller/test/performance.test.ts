import { beforeEach, describe, expect, it } from 'vitest'
import { PerformanceInterceptor } from '../src/interceptors/performance.js'

describe('PerformanceInterceptor', () => {
  let interceptor: PerformanceInterceptor

  beforeEach(() => {
    interceptor = new PerformanceInterceptor()
  })

  it('records custom Web Vitals metrics', () => {
    interceptor.recordCustomVital({
      name: 'LCP',
      value: 2100,
      rating: 'good',
      attribution: 'img#hero'
    })
    interceptor.recordCustomVital({
      name: 'CLS',
      value: 0.18,
      rating: 'needs-improvement'
    })

    const metrics = interceptor.getMetrics()
    expect(metrics.vitals['LCP']).toBeDefined()
    expect(metrics.vitals['LCP'].value).toBe(2100)
    expect(metrics.vitals['LCP'].rating).toBe('good')

    expect(metrics.vitals['CLS']).toBeDefined()
    expect(metrics.vitals['CLS'].value).toBe(0.18)
    expect(metrics.vitals['CLS'].rating).toBe('needs-improvement')
  })

  it('clears performance records', () => {
    interceptor.recordCustomVital({
      name: 'INP',
      value: 80,
      rating: 'good'
    })

    expect(Object.keys(interceptor.getMetrics().vitals).length).toBe(1)
    interceptor.clear()
    expect(Object.keys(interceptor.getMetrics().vitals).length).toBe(0)
  })
})
