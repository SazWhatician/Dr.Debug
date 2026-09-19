import { DR_DEBUG_LOGO } from '../assets/logo.js'
import { AudioChimes } from './AudioChimes.js'

export interface PillPosition {
  side: 'left' | 'right'
  top: number
  offset: number
}

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
    this.element.addEventListener('click', (e) => {
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

    this.restoreSavedPosition()
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

  /**
   * Smoothly recenters the floating pill to its default home position (bottom-right: 24px, 24px),
   * uncollapses if collapsed, clears saved position, and gives audio/visual feedback.
   */
  public recenter(): void {
    // 1. Reset inline placement styles
    this.element.style.left = ''
    this.element.style.top = ''
    this.element.style.right = '24px'
    this.element.style.bottom = '24px'

    // 2. Uncollapse if currently in stealth orb mode
    if (this.isCollapsed) {
      this.expand()
    }

    // 3. Clear persisted position from localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('dr_debug_pill_pos')
      }
    } catch {
      // ignore
    }

    // 4. Audio confirmation
    this.audioChimes.playClickSound()

    // 5. Brief visual feedback pulse
    this.element.classList.remove('dr-debug-pill-recentered')
    void this.element.offsetWidth // trigger reflow
    this.element.classList.add('dr-debug-pill-recentered')
    setTimeout(() => {
      this.element.classList.remove('dr-debug-pill-recentered')
    }, 1200)
  }

  private restoreSavedPosition(): void {
    if (typeof localStorage === 'undefined' || typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem('dr_debug_pill_pos')
      if (!raw) return
      const pos: PillPosition = JSON.parse(raw)
      if (pos && typeof pos.top === 'number' && (pos.side === 'left' || pos.side === 'right')) {
        const maxY = Math.max(8, (window.innerHeight || 800) - 50)
        const validTop = Math.max(8, Math.min(maxY, pos.top))
        const validOffset = typeof pos.offset === 'number' ? pos.offset : 20

        this.element.style.top = `${validTop}px`
        this.element.style.bottom = 'auto'
        if (pos.side === 'left') {
          this.element.style.left = `${validOffset}px`
          this.element.style.right = 'auto'
        } else {
          this.element.style.left = 'auto'
          this.element.style.right = `${validOffset}px`
        }
      }
    } catch {
      // ignore parsing errors
    }
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
    const handleDragStart = (clientX: number, clientY: number, pointerId?: number) => {
      this.isDragging = true
      this.hasMoved = false
      this.startX = clientX
      this.startY = clientY

      const rect = this.element.getBoundingClientRect()
      this.initialX = rect.left
      this.initialY = rect.top

      this.element.classList.add('dr-debug-pill-dragging')

      if (pointerId !== undefined && typeof this.element.setPointerCapture === 'function') {
        try {
          this.element.setPointerCapture(pointerId)
        } catch {
          // ignore if unsupported
        }
      }
    }

    const handleDragMove = (clientX: number, clientY: number) => {
      if (!this.isDragging) return
      const dx = clientX - this.startX
      const dy = clientY - this.startY

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.hasMoved = true

        const pillW = this.element.offsetWidth || 140
        const pillH = this.element.offsetHeight || 38
        const winW = typeof window !== 'undefined' ? window.innerWidth : 1024
        const winH = typeof window !== 'undefined' ? window.innerHeight : 768

        const minX = 8
        const maxX = Math.max(minX, winW - pillW - 8)
        const minY = 8
        const maxY = Math.max(minY, winH - pillH - 8)

        const clampedX = Math.max(minX, Math.min(maxX, this.initialX + dx))
        const clampedY = Math.max(minY, Math.min(maxY, this.initialY + dy))

        this.element.style.left = `${clampedX}px`
        this.element.style.top = `${clampedY}px`
        this.element.style.right = 'auto'
        this.element.style.bottom = 'auto'
      }
    }

    const handleDragEnd = (pointerId?: number) => {
      if (!this.isDragging) return
      this.isDragging = false
      this.element.classList.remove('dr-debug-pill-dragging')

      if (pointerId !== undefined && typeof this.element.releasePointerCapture === 'function') {
        try {
          this.element.releasePointerCapture(pointerId)
        } catch {
          // ignore
        }
      }

      // Magnetic Snap to closest edge if moved
      if (this.hasMoved) {
        const rect = this.element.getBoundingClientRect()
        const winW = typeof window !== 'undefined' ? window.innerWidth : 1024
        const winH = typeof window !== 'undefined' ? window.innerHeight : 768
        const snapPadding = 20
        const isNearLeftEdge = rect.left < 50
        const isNearRightEdge = rect.right > winW - 50

        let side: 'left' | 'right'
        if (rect.left < winW / 2) {
          this.element.style.left = `${snapPadding}px`
          this.element.style.right = 'auto'
          side = 'left'
        } else {
          this.element.style.left = 'auto'
          this.element.style.right = `${snapPadding}px`
          side = 'right'
        }

        const maxY = Math.max(8, winH - rect.height - 8)
        const clampedY = Math.max(8, Math.min(maxY, rect.top))
        this.element.style.top = `${clampedY}px`
        this.element.style.bottom = 'auto'

        // Save position to localStorage
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(
              'dr_debug_pill_pos',
              JSON.stringify({ side, top: clampedY, offset: snapPadding })
            )
          }
        } catch {
          // ignore
        }

        // Stealth Bezel Collapse if dragged directly onto screen edge
        if (isNearLeftEdge || isNearRightEdge) {
          this.collapse()
        }
      }
    }

    // Modern Pointer Events (Pointer Capture enabled)
    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      this.element.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0) return
        handleDragStart(e.clientX, e.clientY, e.pointerId)
      })

      this.element.addEventListener('pointermove', (e: PointerEvent) => {
        handleDragMove(e.clientX, e.clientY)
      })

      this.element.addEventListener('pointerup', (e: PointerEvent) => {
        handleDragEnd(e.pointerId)
      })

      this.element.addEventListener('pointercancel', (e: PointerEvent) => {
        handleDragEnd(e.pointerId)
      })
    }

    // Fallback Mouse Events
    this.element.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return
      if (this.isDragging) return // already handled by pointerdown
      handleDragStart(e.clientX, e.clientY)

      const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientX, ev.clientY)
      const onMouseUp = () => {
        handleDragEnd()
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    })
  }

  public setTheme(theme: string): void {
    this.element.classList.remove(
      'theme-minimal-glass',
      'theme-windows-xp',
      'theme-monotone-skeuomorphic',
      'theme-cyber-matrix'
    )
    if (theme === 'minimal-glass' || theme === 'windows-xp') {
      this.element.classList.add('theme-minimal-glass')
    } else if (theme === 'monotone-skeuomorphic') {
      this.element.classList.add('theme-monotone-skeuomorphic')
    } else if (theme === 'cyber-matrix') {
      this.element.classList.add('theme-cyber-matrix')
    }
  }

  public getAudioChimes(): AudioChimes {
    return this.audioChimes
  }
}

