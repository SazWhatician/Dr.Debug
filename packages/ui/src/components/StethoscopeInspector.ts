export interface InspectedElementInfo {
  selector: string
  tagName: string
  id: string
  className: string
  componentName?: string
  dimensions: { width: number; height: number; top: number; left: number }
  textContentSnippet: string
  attributes: Record<string, string>
}

export interface StethoscopeInspectorOptions {
  onElementInspected?: (info: InspectedElementInfo) => void
  onToggle?: (isActive: boolean) => void
}

export class StethoscopeInspector {
  private isActive = false
  private options: StethoscopeInspectorOptions
  private overlayEl: HTMLElement | null = null
  private badgeEl: HTMLElement | null = null
  private currentTarget: HTMLElement | null = null
  private hoveredListeners: {
    move: (e: MouseEvent) => void
    click: (e: MouseEvent) => void
    keydown: (e: KeyboardEvent) => void
  } | null = null

  constructor(options: StethoscopeInspectorOptions = {}) {
    this.options = options
  }

  public getIsActive(): boolean {
    return this.isActive
  }

  public toggle(): boolean {
    if (this.isActive) {
      this.deactivate()
    } else {
      this.activate()
    }
    return this.isActive
  }

  public activate(): void {
    if (this.isActive || typeof document === 'undefined') return
    this.isActive = true

    this.createOverlay()

    const onMove = (e: MouseEvent) => {
      if (!this.isActive) return
      const target = e.target as HTMLElement
      if (!target || target.id?.startsWith('dr-debug') || target.closest?.('#dr-debug-root')) {
        this.hideOverlay()
        return
      }
      this.currentTarget = target
      this.updateOverlay(target)
    }

    const onClick = (e: MouseEvent) => {
      if (!this.isActive) return
      const target = e.target as HTMLElement
      if (target?.id?.startsWith('dr-debug') || target?.closest?.('#dr-debug-root')) return

      e.preventDefault()
      e.stopPropagation()

      if (this.currentTarget) {
        const info = this.inspectElement(this.currentTarget)
        this.options.onElementInspected?.(info)
        this.deactivate()
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.deactivate()
      }
    }

    this.hoveredListeners = { move: onMove, click: onClick, keydown: onKeyDown }
    window.addEventListener('mousemove', onMove, true)
    window.addEventListener('click', onClick, true)
    window.addEventListener('keydown', onKeyDown, true)

    document.body?.classList.add('dr-debug-stethoscope-active')
    this.options.onToggle?.(true)
  }

  public deactivate(): void {
    if (!this.isActive) return
    this.isActive = false

    if (this.hoveredListeners) {
      window.removeEventListener('mousemove', this.hoveredListeners.move, true)
      window.removeEventListener('click', this.hoveredListeners.click, true)
      window.removeEventListener('keydown', this.hoveredListeners.keydown, true)
      this.hoveredListeners = null
    }

    this.hideOverlay()
    if (typeof document !== 'undefined') {
      document.body?.classList.remove('dr-debug-stethoscope-active')
    }
    this.currentTarget = null
    this.options.onToggle?.(false)
  }

  private createOverlay(): void {
    if (typeof document === 'undefined' || this.overlayEl) return

    this.overlayEl = document.createElement('div')
    this.overlayEl.className = 'dr-debug-stethoscope-overlay'
    this.overlayEl.style.display = 'none'

    this.badgeEl = document.createElement('div')
    this.badgeEl.className = 'dr-debug-stethoscope-badge'
    this.badgeEl.style.display = 'none'

    document.body.appendChild(this.overlayEl)
    document.body.appendChild(this.badgeEl)
  }

  private updateOverlay(el: HTMLElement): void {
    if (!this.overlayEl || !this.badgeEl) return
    const rect = el.getBoundingClientRect()

    this.overlayEl.style.display = 'block'
    this.overlayEl.style.top = `${rect.top + window.scrollY}px`
    this.overlayEl.style.left = `${rect.left + window.scrollX}px`
    this.overlayEl.style.width = `${rect.width}px`
    this.overlayEl.style.height = `${rect.height}px`

    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(/\s+/).slice(0, 2).join('.')}` : ''
    const compName = this.detectComponentName(el)

    this.badgeEl.style.display = 'flex'
    this.badgeEl.innerHTML = `
      <span class="badge-tag">&lt;${tag}${id}${cls}&gt;</span>
      ${compName ? `<span class="badge-comp">⚛ ${compName}</span>` : ''}
      <span class="badge-dims">${Math.round(rect.width)}×${Math.round(rect.height)}</span>
    `

    // Position badge above element, or below if too close to top
    const badgeTop = rect.top + window.scrollY - 28
    this.badgeEl.style.top = `${badgeTop > 5 ? badgeTop : rect.bottom + window.scrollY + 6}px`
    this.badgeEl.style.left = `${Math.max(8, rect.left + window.scrollX)}px`
  }

  private hideOverlay(): void {
    if (this.overlayEl) this.overlayEl.style.display = 'none'
    if (this.badgeEl) this.badgeEl.style.display = 'none'
  }

  public inspectElement(el: HTMLElement): InspectedElementInfo {
    const rect = el.getBoundingClientRect()
    const selector = this.getSelector(el)
    const compName = this.detectComponentName(el)

    const attributes: Record<string, string> = {}
    if (el.attributes) {
      for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i]
        if (!attr.name.startsWith('data-dr-debug')) {
          attributes[attr.name] = attr.value.slice(0, 80)
        }
      }
    }

    return {
      selector,
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      className: typeof el.className === 'string' ? el.className : '',
      componentName: compName,
      dimensions: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left)
      },
      textContentSnippet: el.textContent?.trim().slice(0, 80) || '',
      attributes
    }
  }

  private detectComponentName(el: HTMLElement): string | undefined {
    try {
      // 1. React Fiber inspection
      const keys = Object.keys(el)
      const fiberKey = keys.find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'))
      if (fiberKey) {
        let fiber = (el as any)[fiberKey]
        while (fiber) {
          if (typeof fiber.type === 'function') {
            return fiber.type.displayName || fiber.type.name || undefined
          }
          if (typeof fiber.type === 'string') {
            // HTML tag
          } else if (fiber.type && typeof fiber.type === 'object') {
            return fiber.type.displayName || fiber.type.name || undefined
          }
          fiber = fiber.return
        }
      }

      // 2. Vue component
      if ((el as any).__vueParentComponent) {
        return (el as any).__vueParentComponent?.type?.name || (el as any).__vueParentComponent?.type?.__name
      }
    } catch {}
    return undefined
  }

  public highlightFailingElements(selectors: string[]): void {
    if (typeof document === 'undefined') return
    // Remove previous outlines
    document.querySelectorAll('.dr-debug-error-boundary-outline').forEach(node => {
      node.classList.remove('dr-debug-error-boundary-outline')
    })

    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel)
        if (el && !el.id?.startsWith('dr-debug')) {
          el.classList.add('dr-debug-error-boundary-outline')
        }
      } catch {}
    }
  }

  private getSelector(el: HTMLElement): string {
    if (el.id) return `#${el.id}`
    const tag = el.tagName.toLowerCase()
    const cls = typeof el.className === 'string' && el.className ? `.${el.className.split(/\s+/).slice(0, 2).join('.')}` : ''
    return `${tag}${cls}`
  }

  public destroy(): void {
    this.deactivate()
    if (this.overlayEl?.parentNode) {
      this.overlayEl.parentNode.removeChild(this.overlayEl)
    }
    if (this.badgeEl?.parentNode) {
      this.badgeEl.parentNode.removeChild(this.badgeEl)
    }
    this.overlayEl = null
    this.badgeEl = null
  }
}
