import { DR_DEBUG_LOGO } from '../assets/logo.js'

export class FloatingPill {
  private element: HTMLElement
  private badgeText: HTMLElement
  private equalizer: HTMLElement
  private isDragging = false
  private startX = 0
  private startY = 0
  private initialX = 0
  private initialY = 0
  private hasMoved = false

  constructor(onClick: () => void) {
    this.element = document.createElement('div')
    this.element.className = 'dr-debug-pill'
    this.element.title = 'Dr. Debug - Click to open Cockpit'

    // Live Equalizer Visualizer Bars
    this.equalizer = document.createElement('div')
    this.equalizer.className = 'dr-debug-equalizer'
    for (let i = 0; i < 3; i++) {
      const bar = document.createElement('div')
      bar.className = 'dr-debug-eq-bar'
      this.equalizer.appendChild(bar)
    }

    const icon = document.createElement('span')
    icon.className = 'dr-debug-pill-icon'
    const img = document.createElement('img')
    img.src = DR_DEBUG_LOGO
    img.className = 'dr-debug-logo pill-logo'
    img.alt = 'Dr. Debug'
    icon.appendChild(img)

    this.badgeText = document.createElement('div')
    this.badgeText.className = 'dr-debug-pill-badge'
    this.renderBadge('Dr. Debug', 'ACTIVE', 'ok')

    this.element.appendChild(this.equalizer)
    this.element.appendChild(icon)
    this.element.appendChild(this.badgeText)

    this.element.addEventListener('click', () => {
      if (!this.hasMoved) {
        onClick()
      }
    })

    this.initDraggable()
  }

  public getElement(): HTMLElement {
    return this.element
  }

  private renderBadge(title: string, chipText: string, chipClass: string): void {
    while (this.badgeText.firstChild) {
      this.badgeText.removeChild(this.badgeText.firstChild)
    }
    const titleSpan = document.createElement('span')
    titleSpan.textContent = title
    const chipSpan = document.createElement('span')
    chipSpan.className = `dr-debug-chip ${chipClass}`
    chipSpan.textContent = chipText
    this.badgeText.appendChild(titleSpan)
    this.badgeText.appendChild(document.createTextNode(' '))
    this.badgeText.appendChild(chipSpan)
  }

  public updateStatus(
    errorCount: number,
    failedNetCount = 0,
    slowNetCount = 0,
    isRunning = false
  ): void {
    if (isRunning) {
      this.renderBadge('Dr. Debug', 'DIAGNOSING', 'run')
      return
    }

    const totalIssues = errorCount + failedNetCount + slowNetCount

    if (totalIssues > 0) {
      while (this.badgeText.firstChild) {
        this.badgeText.removeChild(this.badgeText.firstChild)
      }
      const chips: Array<{ text: string; cls: string }> = []
      if (errorCount > 0) chips.push({ text: `${errorCount} ERR`, cls: 'err' })
      if (failedNetCount > 0) chips.push({ text: `${failedNetCount} NET`, cls: 'net' })
      if (slowNetCount > 0) chips.push({ text: `${slowNetCount} SLOW`, cls: 'net' })

      chips.forEach((c, idx) => {
        if (idx > 0) this.badgeText.appendChild(document.createTextNode(' '))
        const chipSpan = document.createElement('span')
        chipSpan.className = `dr-debug-chip ${c.cls}`
        chipSpan.textContent = c.text
        this.badgeText.appendChild(chipSpan)
      })
    } else {
      this.renderBadge('Dr. Debug', 'HEALTHY', 'ok')
    }
  }

  private initDraggable(): void {
    const onMouseDown = (e: MouseEvent) => {
      this.isDragging = true
      this.hasMoved = false
      this.startX = e.clientX
      this.startY = e.clientY

      const rect = this.element.getBoundingClientRect()
      this.initialX = rect.left
      this.initialY = rect.top

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return
      const dx = e.clientX - this.startX
      const dy = e.clientY - this.startY

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.hasMoved = true
        this.element.style.left = `${this.initialX + dx}px`
        this.element.style.top = `${this.initialY + dy}px`
        this.element.style.right = 'auto'
        this.element.style.bottom = 'auto'
      }
    }

    const onMouseUp = () => {
      if (!this.isDragging) return
      this.isDragging = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)

      // Magnetic Snap to closest edge if moved
      if (this.hasMoved) {
        const rect = this.element.getBoundingClientRect()
        const snapPadding = 24
        if (rect.left < window.innerWidth / 2) {
          this.element.style.left = `${snapPadding}px`
          this.element.style.right = 'auto'
        } else {
          this.element.style.left = 'auto'
          this.element.style.right = `${snapPadding}px`
        }
      }
    }

    this.element.addEventListener('mousedown', onMouseDown)
  }

  public setTheme(theme: string): void {
    this.element.classList.remove('theme-minimal-glass', 'theme-monotone-skeuomorphic')
    if (theme === 'minimal-glass') {
      this.element.classList.add('theme-minimal-glass')
    } else if (theme === 'monotone-skeuomorphic') {
      this.element.classList.add('theme-monotone-skeuomorphic')
    }
  }
}

