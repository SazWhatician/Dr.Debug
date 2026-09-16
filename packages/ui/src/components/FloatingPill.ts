import { DR_DEBUG_LOGO } from '../assets/logo.js'
import { AudioChimes } from './AudioChimes.js'

export class FloatingPill {
  private element: HTMLElement
  private badgeText: HTMLElement
  private equalizer: HTMLElement
  private audioChimes: AudioChimes
  private isDragging = false
  private startX = 0
  private startY = 0
  private initialX = 0
  private initialY = 0
  private hasMoved = false
  private isCollapsed = false
  private previousTotalIssues = 0

  constructor(onClick: () => void, audioChimes?: AudioChimes) {
    this.audioChimes = audioChimes || new AudioChimes()
    this.element = document.createElement('div')
    this.element.className = 'dr-debug-pill'
    this.element.title = 'Dr. Debug - Click to open Cockpit · Double-click to collapse'

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

    // Click handler: expand if collapsed, otherwise open Cockpit
    this.element.addEventListener('click', () => {
      if (this.hasMoved) return
      if (this.isCollapsed) {
        this.expand()
      } else {
        onClick()
      }
    })

    // Double click: Stealth Bezel Collapse toggle
    this.element.addEventListener('dblclick', (e) => {
      e.stopPropagation()
      this.toggleCollapse()
    })

    this.initDraggable()
  }

  public getElement(): HTMLElement {
    return this.element
  }

  public getIsCollapsed(): boolean {
    return this.isCollapsed
  }

  public collapse(): void {
    if (this.isCollapsed) return
    this.isCollapsed = true
    this.element.classList.add('dr-debug-pill-collapsed')
    this.element.title = 'Dr. Debug (Collapsed) — Click to expand HUD'
    this.audioChimes.playClickSound()
  }

  public expand(): void {
    if (!this.isCollapsed) return
    this.isCollapsed = false
    this.element.classList.remove('dr-debug-pill-collapsed')
    this.element.title = 'Dr. Debug - Click to open Cockpit · Double-click to collapse'
    this.audioChimes.playClickSound()
  }

  public toggleCollapse(): boolean {
    if (this.isCollapsed) {
      this.expand()
    } else {
      this.collapse()
    }
    return this.isCollapsed
  }

  private renderBadge(title: string, chipText: string, chipClass: string): void {
    while (this.badgeText.firstChild) {
      this.badgeText.removeChild(this.badgeText.firstChild)
    }
    const titleSpan = document.createElement('span')
    titleSpan.className = 'dr-debug-pill-title'
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

    // Trigger subtle sci-fi alert chime when new issues emerge
    if (totalIssues > this.previousTotalIssues && (errorCount > 0 || failedNetCount > 0)) {
      this.audioChimes.playIncidentAlert()
    }
    this.previousTotalIssues = totalIssues

    if (totalIssues > 0) {
      this.element.classList.add('has-incident')
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
      this.element.classList.remove('has-incident')
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
        const snapPadding = 20
        const isNearLeftEdge = rect.left < 50
        const isNearRightEdge = rect.right > window.innerWidth - 50

        if (rect.left < window.innerWidth / 2) {
          this.element.style.left = `${snapPadding}px`
          this.element.style.right = 'auto'
        } else {
          this.element.style.left = 'auto'
          this.element.style.right = `${snapPadding}px`
        }

        // Stealth Bezel Collapse if dragged directly onto screen edge
        if (isNearLeftEdge || isNearRightEdge) {
          this.collapse()
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

  public getAudioChimes(): AudioChimes {
    return this.audioChimes
  }
}
