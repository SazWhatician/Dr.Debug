import { describe, expect, it } from 'vitest'
import { LayoutInspector } from '../src/interceptors/layoutInspector.js'

describe('LayoutInspector (CSS & Visual Layout Anomaly Detection)', () => {
  it('detects invisible full-screen overlay with pointer-events active', () => {
    const overlay = document.createElement('div')
    overlay.id = 'broken-modal-overlay'
    overlay.style.zIndex = '999'
    overlay.style.opacity = '0'
    overlay.style.pointerEvents = 'auto'
    document.body.appendChild(overlay)

    const inspector = new LayoutInspector()
    const anomalies = inspector.inspect()

    expect(anomalies.length).toBeGreaterThanOrEqual(1)
    const overlayAnomaly = anomalies.find((a) => a.type === 'invisible_overlay')
    expect(overlayAnomaly).toBeDefined()
    expect(overlayAnomaly?.selector).toBe('#broken-modal-overlay')

    overlay.remove()
  })
})
