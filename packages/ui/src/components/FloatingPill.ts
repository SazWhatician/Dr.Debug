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
    this.equalizer.innerHTML = `
      <div class="dr-debug-eq-bar"></div>
      <div class="dr-debug-eq-bar"></div>
      <div class="dr-debug-eq-bar"></div>
    `

    const icon = document.createElement('span')
    icon.className = 'dr-debug-pill-icon'
    icon.innerHTML = `<img src="${DR_DEBUG_LOGO}" class="dr-debug-logo pill-logo" alt="Dr. Debug" />`

    this.badgeText = document.createElement('div')
    this.badgeText.className = 'dr-debug-pill-badge'
    this.badgeText.innerHTML = `<span>Dr. Debug</span> <span class="dr-debug-chip ok">ACTIVE</span>`

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

  public updateStatus(
    errorCount: number,
    failedNetCount = 0,
    slowNetCount = 0,
    isRunning = false
  ): void {
    if (isRunning) {
      this.badgeText.innerHTML = `<span>Dr. Debug</span> <span class="dr-debug-chip run">DIAGNOSING</span>`
      return
    }

    const totalIssues = errorCount + failedNetCount + slowNetCount

    if (totalIssues > 0) {
      const chips: string[] = []
      if (errorCount > 0) chips.push(`<span class="dr-debug-chip err">${errorCount} ERR</span>`)
      if (failedNetCount > 0) chips.push(`<span class="dr-debug-chip net">${failedNetCount} NET</span>`)
      if (slowNetCount > 0) chips.push(`<span class="dr-debug-chip net">${slowNetCount} SLOW</span>`)
      this.badgeText.innerHTML = chips.join(' ')
    } else {
      this.badgeText.innerHTML = `<span>Dr. Debug</span> <span class="dr-debug-chip ok">HEALTHY</span>`
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
}

