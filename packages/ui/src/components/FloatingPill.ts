export class FloatingPill {
  private element: HTMLElement
  private badgeText: HTMLElement
  private pulseDot: HTMLElement
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

    this.pulseDot = document.createElement('span')
    this.pulseDot.className = 'dr-debug-pulse'

    const icon = document.createElement('span')
    icon.className = 'dr-debug-pill-icon'
    icon.textContent = '🩺'

    this.badgeText = document.createElement('span')
    this.badgeText.className = 'dr-debug-pill-badge'
    this.badgeText.textContent = 'Dr. Debug'

    this.element.appendChild(this.pulseDot)
    this.element.appendChild(icon)
    this.element.appendChild(this.badgeText)

    this.element.addEventListener('click', (e) => {
      if (!this.hasMoved) {
        onClick()
      }
    })

    this.initDraggable()
  }

  public getElement(): HTMLElement {
    return this.element
  }

  public updateStatus(errorCount: number, slowNetCount: number, isRunning = false): void {
    if (isRunning) {
      this.pulseDot.className = 'dr-debug-pulse running'
      this.badgeText.textContent = 'Diagnosing...'
      return
    }

    if (errorCount > 0 || slowNetCount > 0) {
      this.pulseDot.className = 'dr-debug-pulse error'
      const parts: string[] = []
      if (errorCount > 0) parts.push(`${errorCount} Error${errorCount > 1 ? 's' : ''}`)
      if (slowNetCount > 0) parts.push(`${slowNetCount} Slow`)
      this.badgeText.textContent = `⚠️ ${parts.join(' | ')}`
    } else {
      this.pulseDot.className = 'dr-debug-pulse'
      this.badgeText.textContent = 'Dr. Debug ✅'
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
      this.isDragging = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    this.element.addEventListener('mousedown', onMouseDown)
  }
}
