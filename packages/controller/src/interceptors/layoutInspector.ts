import type { LayoutAnomaly } from '../types.js'

export class LayoutInspector {
  public inspect(targetSelector?: string): LayoutAnomaly[] {
    if (typeof document === 'undefined') return []

    const anomalies: LayoutAnomaly[] = []
    const root = targetSelector ? document.querySelector(targetSelector) : document.body
    if (!root) return anomalies

    const elements = Array.from(root.querySelectorAll('*')).slice(0, 150) as HTMLElement[]

    for (const el of elements) {
      if (el.id?.startsWith('dr-debug')) continue
      const style = window.getComputedStyle(el)
      const selector = this.getSelector(el)

      // 1. Invisible Overlay Blocking Clicks (z-index > 100 with zero opacity or transparent bg but pointer-events active)
      const zIndex = parseInt(style.zIndex, 10)
      if (!isNaN(zIndex) && zIndex > 99) {
        const opacity = parseFloat(style.opacity)
        if (opacity === 0 && style.pointerEvents !== 'none') {
          anomalies.push({
            type: 'invisible_overlay',
            selector,
            severity: 'high',
            description: `Element has z-index ${zIndex} and opacity 0 but pointer-events are enabled, intercepting user clicks.`,
            computedValues: { zIndex: style.zIndex, opacity: style.opacity, pointerEvents: style.pointerEvents }
          })
        }
      }

      // 2. Overflow clipping with child exceeding parent bounding rect
      if (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden') {
        const rect = el.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0 && el.scrollWidth > rect.width + 10) {
          anomalies.push({
            type: 'overflow_clip',
            selector,
            severity: 'medium',
            description: `Element content overflows horizontally (${el.scrollWidth}px > ${Math.round(rect.width)}px) and is clipped by overflow:hidden.`,
            computedValues: { scrollWidth: `${el.scrollWidth}px`, clientWidth: `${rect.width}px`, overflow: style.overflow }
          })
        }
      }

      // 3. Offscreen Interactive Elements (interactive buttons/inputs rendered off-canvas)
      if (['BUTTON', 'A', 'INPUT', 'SELECT'].includes(el.tagName)) {
        const rect = el.getBoundingClientRect()
        const isOffscreen = rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth
        if (isOffscreen && style.display !== 'none' && style.visibility !== 'hidden') {
          anomalies.push({
            type: 'offscreen',
            selector,
            severity: 'low',
            description: `Interactive <${el.tagName.toLowerCase()}> is rendered offscreen at (${Math.round(rect.left)}, ${Math.round(rect.top)}).`,
            computedValues: { top: `${Math.round(rect.top)}px`, left: `${Math.round(rect.left)}px` }
          })
        }
      }
    }

    return anomalies
  }

  private getSelector(el: HTMLElement): string {
    if (el.id) return `#${el.id}`
    const tag = el.tagName.toLowerCase()
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(/\s+/).slice(0, 2).join('.')}` : ''
    return `${tag}${cls}`
  }
}
