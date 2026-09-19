import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AudioChimes,
  DrDebugUI,
  FloatingPill,
  IncidentExporter,
  StethoscopeInspector
} from '../src/index.js'

describe('Mega Update Features (Typography, Bezel Collapse, Audio Chimes, Stethoscope, Exporter)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  describe('FloatingPill — Typography & Stealth Bezel Collapse', () => {
    it('renders unified brand typography with .dr-debug-pill-title and .dr-debug-chip', () => {
      const pill = new FloatingPill(() => {})
      const el = pill.getElement()

      const title = el.querySelector('.dr-debug-pill-title')
      expect(title).toBeDefined()
      expect(title?.textContent).toBe('Dr. Debug')

      const chip = el.querySelector('.dr-debug-chip')
      expect(chip).toBeDefined()
      expect(chip?.textContent).toBe('ACTIVE')
    })

    it('collapses into 36px status orb on collapse() and expands on expand()', () => {
      const pill = new FloatingPill(() => {})
      const el = pill.getElement()

      expect(pill.getIsCollapsed()).toBe(false)
      expect(el.classList.contains('dr-debug-pill-collapsed')).toBe(false)

      pill.collapse()
      expect(pill.getIsCollapsed()).toBe(true)
      expect(el.classList.contains('dr-debug-pill-collapsed')).toBe(true)

      pill.expand()
      expect(pill.getIsCollapsed()).toBe(false)
      expect(el.classList.contains('dr-debug-pill-collapsed')).toBe(false)
    })

    it('toggles collapse on double-click event', () => {
      const pill = new FloatingPill(() => {})
      const el = pill.getElement()

      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      expect(pill.getIsCollapsed()).toBe(true)

      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      expect(pill.getIsCollapsed()).toBe(false)
    })

    it('expands automatically when clicked while collapsed', () => {
      const onClick = vi.fn()
      const pill = new FloatingPill(onClick)
      const el = pill.getElement()

      pill.collapse()
      expect(pill.getIsCollapsed()).toBe(true)

      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(pill.getIsCollapsed()).toBe(false)
      expect(onClick).not.toHaveBeenCalled()
    })

    it('triggers incident chime and pulse class on new errors', () => {
      const chimes = new AudioChimes()
      const alertSpy = vi.spyOn(chimes, 'playIncidentAlert')

      const pill = new FloatingPill(() => {}, chimes)
      const el = pill.getElement()

      pill.updateStatus(2, 1, 0, false)
      expect(alertSpy).toHaveBeenCalled()
      expect(el.classList.contains('has-incident')).toBe(true)

      pill.updateStatus(0, 0, 0, false)
      expect(el.classList.contains('has-incident')).toBe(false)
    })

    it('recenters the pill to bottom-right, uncollapses, and clears localStorage position on recenter()', () => {
      const chimes = new AudioChimes()
      const clickSpy = vi.spyOn(chimes, 'playClickSound')
      const pill = new FloatingPill(() => {}, chimes)
      const el = pill.getElement()

      // Simulate dragging pill to custom coordinates
      el.style.left = '120px'
      el.style.top = '140px'
      el.style.right = 'auto'
      el.style.bottom = 'auto'
      pill.collapse()
      localStorage.setItem('dr_debug_pill_pos', JSON.stringify({ side: 'left', top: 140, offset: 20 }))

      expect(pill.getIsCollapsed()).toBe(true)
      expect(localStorage.getItem('dr_debug_pill_pos')).toBeTruthy()

      // Call recenter()
      pill.recenter()

      expect(pill.getIsCollapsed()).toBe(false)
      expect(el.style.left).toBe('')
      expect(el.style.top).toBe('')
      expect(el.style.right).toBe('24px')
      expect(el.style.bottom).toBe('24px')
      expect(localStorage.getItem('dr_debug_pill_pos')).toBeNull()
      expect(clickSpy).toHaveBeenCalled()
    })

    it('restores saved position from localStorage on initialization', () => {
      localStorage.setItem('dr_debug_pill_pos', JSON.stringify({ side: 'left', top: 250, offset: 20 }))
      const pill = new FloatingPill(() => {})
      const el = pill.getElement()

      expect(el.style.left).toBe('20px')
      expect(el.style.top).toBe('250px')
      expect(el.style.right).toBe('auto')
      expect(el.style.bottom).toBe('auto')

      localStorage.removeItem('dr_debug_pill_pos')
    })
  })

  describe('AudioChimes — Tactile Sci-Fi HUD Synthesizer', () => {
    it('executes sound synthesizers safely without throwing in headless environment', () => {
      const chimes = new AudioChimes()

      expect(() => chimes.playIncidentAlert()).not.toThrow()
      expect(() => chimes.playIncidentAlert('warp-drop')).not.toThrow()
      expect(() => chimes.playIncidentAlert('sonar-pulse')).not.toThrow()
      expect(() => chimes.playIncidentAlert('cyber-glitch')).not.toThrow()
      expect(() => chimes.playIncidentAlert('subtle-bell')).not.toThrow()
      expect(() => chimes.playIncidentAlert('retro-alarm')).not.toThrow()

      expect(() => chimes.playWarpDropChime()).not.toThrow()
      expect(() => chimes.playSonarPulseChime()).not.toThrow()
      expect(() => chimes.playCyberGlitchChime()).not.toThrow()
      expect(() => chimes.playSubtleBellChime()).not.toThrow()
      expect(() => chimes.playRetroAlarmChime()).not.toThrow()

      expect(() => chimes.playResolveChime()).not.toThrow()
      expect(() => chimes.playClickSound()).not.toThrow()

      expect(chimes.getErrorChimeProfile()).toBe('warp-drop')
      chimes.setErrorChimeProfile('cyber-glitch')
      expect(chimes.getErrorChimeProfile()).toBe('cyber-glitch')
    })

    it('toggles sound mute state and updates preference', () => {
      const chimes = new AudioChimes(true)
      expect(chimes.getIsEnabled()).toBe(true)

      chimes.toggleSound()
      expect(chimes.getIsEnabled()).toBe(false)

      chimes.toggleSound()
      expect(chimes.getIsEnabled()).toBe(true)

      chimes.destroy()
    })
  })

  describe('StethoscopeInspector — In-Page Visual Inspection & Outlines', () => {
    it('activates and deactivates inspection mode cleanly', () => {
      const inspector = new StethoscopeInspector()

      expect(inspector.getIsActive()).toBe(false)
      inspector.activate()
      expect(inspector.getIsActive()).toBe(true)
      expect(document.body.classList.contains('dr-debug-stethoscope-active')).toBe(true)

      inspector.deactivate()
      expect(inspector.getIsActive()).toBe(false)
      expect(document.body.classList.contains('dr-debug-stethoscope-active')).toBe(false)
      inspector.destroy()
    })

    it('inspects DOM elements and extracts metadata accurately', () => {
      const btn = document.createElement('button')
      btn.id = 'checkout-btn'
      btn.className = 'btn-primary active'
      btn.textContent = 'Pay $25.00'
      btn.setAttribute('data-test', 'checkout')
      document.body.appendChild(btn)

      const inspector = new StethoscopeInspector()
      const info = inspector.inspectElement(btn)

      expect(info.tagName).toBe('button')
      expect(info.id).toBe('checkout-btn')
      expect(info.className).toContain('btn-primary')
      expect(info.textContentSnippet).toBe('Pay $25.00')
      expect(info.attributes['data-test']).toBe('checkout')

      inspector.destroy()
    })

    it('highlights failing elements with error boundary dashed outline', () => {
      const el = document.createElement('div')
      el.id = 'failed-widget'
      document.body.appendChild(el)

      const inspector = new StethoscopeInspector()
      inspector.highlightFailingElements(['#failed-widget'])

      expect(el.classList.contains('dr-debug-error-boundary-outline')).toBe(true)
      inspector.destroy()
    })
  })

  describe('IncidentExporter — Standalone HTML & GitHub Markdown Export', () => {
    const sampleData = {
      timestamp: '2026-09-16T12:00:00Z',
      url: 'http://localhost:3000/checkout',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
      viewport: { width: 1920, height: 1080 },
      metrics: {
        errorCount: 1,
        failedNetCount: 1,
        slowNetCount: 0,
        heapMB: 52
      },
      errors: [
        {
          message: 'TypeError: Cannot read properties of undefined (reading orderId)',
          stack: 'TypeError: Cannot read properties\n    at checkout.ts:42',
          timestamp: Date.now()
        }
      ],
      networkRequests: [
        {
          url: 'http://localhost:3000/api/orders',
          method: 'POST',
          status: 500,
          durationMs: 420
        }
      ],
      interactions: [
        { type: 'click', timestamp: Date.now(), target: 'button#checkout-btn', detail: '"Pay"' }
      ],
      prescription: {
        rootCause: 'Frontend payload omitted orderId required by backend validator.',
        codePatches: [
          {
            file: 'src/checkout.ts',
            diff: '- const payload = {}\n+ const payload = { orderId: crypto.randomUUID() }'
          }
        ]
      }
    }

    it('builds a complete standalone self-contained HTML report', () => {
      const exporter = new IncidentExporter()
      const html = exporter.buildHTMLReport(sampleData)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('🩺 DR. DEBUG')
      expect(html).toContain('INCIDENT REPLAY BUNDLE')
      expect(html).toContain('TypeError: Cannot read properties of undefined')
      expect(html).toContain('http://localhost:3000/api/orders')
      expect(html).toContain('dr-debug-raw-bundle')
    })

    it('builds formatted GitHub Flavored Markdown with reproduction steps and code patch', () => {
      const exporter = new IncidentExporter()
      const md = exporter.buildGitHubMarkdown(sampleData)

      expect(md).toContain('# 🩺 Dr. Debug Incident Report')
      expect(md).toContain('**Target URL:** `http://localhost:3000/checkout`')
      expect(md).toContain('## 💥 Root Cause Analysis (AI Diagnosed)')
      expect(md).toContain('## 🛠️ Suggested Code Fix')
      expect(md).toContain('```diff')
      expect(md).toContain('## 📋 User Interaction Replay')
    })
  })

  describe('DrDebugUI Master Integration & UI Placement', () => {
    it('initializes HUD with Stethoscope, AudioChimes, and Exporter accessible', () => {
      const ui = new DrDebugUI()

      expect(ui.getAudioChimes()).toBeDefined()
      expect(ui.getStethoscopeInspector()).toBeDefined()
      expect(ui.getIncidentExporter()).toBeDefined()

      expect(ui.toggleSound()).toBe(false)
      expect(ui.toggleSound()).toBe(true)

      expect(ui.toggleStethoscope()).toBe(true)
      expect(ui.toggleStethoscope()).toBe(false)

      ui.destroy()
    })

    it('keeps top navbar strictly minimal and usual without crowding, with settings button preserved', () => {
      const ui = new DrDebugUI()
      const shadow = ui.getShadowRoot()
      ui.openCockpit()

      const metrics = shadow.querySelector('.dr-debug-header-metrics')
      expect(metrics).toBeTruthy()

      // Navbar must NOT contain sound or stethoscope or bundle buttons
      expect(metrics?.querySelector('#dr-debug-btn-sound')).toBeNull()
      expect(metrics?.querySelector('#dr-debug-btn-bundle')).toBeNull()
      expect(metrics?.querySelector('#dr-debug-btn-stethoscope')).toBeNull()

      // Navbar MUST contain heap, uptime, copy for AI, settings, maximize, close
      expect(metrics?.querySelector('#dr-debug-heap-val')).toBeTruthy()
      expect(metrics?.querySelector('#dr-debug-uptime-val')).toBeTruthy()
      expect(metrics?.querySelector('.dr-debug-export-btn')).toBeTruthy()
      expect(metrics?.querySelector('#dr-debug-settings-btn')).toBeTruthy()

      ui.destroy()
    })

    it('places the mute/sound toggle inside SettingsModal with 1-click toggle and dropdown', () => {
      const ui = new DrDebugUI()
      const shadow = ui.getShadowRoot()
      ui.openCockpit()

      const soundToggleBtn = shadow.querySelector('#dr-debug-btn-sound-toggle') as HTMLButtonElement
      const soundSelect = shadow.querySelector('#dr-debug-sound') as HTMLSelectElement

      expect(soundToggleBtn).toBeTruthy()
      expect(soundSelect).toBeTruthy()

      // Click mute toggle button
      soundToggleBtn.click()
      expect(ui.getAudioChimes().getIsEnabled()).toBe(false)
      expect(soundSelect.value).toBe('muted')
      expect(soundToggleBtn.textContent).toContain('Muted')

      // Click again to re-enable
      soundToggleBtn.click()
      expect(ui.getAudioChimes().getIsEnabled()).toBe(true)
      expect(soundSelect.value).toBe('enabled')
      expect(soundToggleBtn.textContent).toContain('Enabled')

      // Incident Error Chimes selector
      const chimeSelect = shadow.querySelector('#dr-debug-error-chime') as HTMLSelectElement
      const testChimeBtn = shadow.querySelector('#dr-debug-btn-test-chime') as HTMLButtonElement

      expect(chimeSelect).toBeTruthy()
      expect(testChimeBtn).toBeTruthy()
      expect(chimeSelect.options.length).toBe(5)

      // Change error chime selection to cyber-glitch
      chimeSelect.value = 'cyber-glitch'
      chimeSelect.dispatchEvent(new Event('change'))
      expect(ui.getAudioChimes().getErrorChimeProfile()).toBe('cyber-glitch')

      // Preview chime click
      expect(() => testChimeBtn.click()).not.toThrow()

      ui.destroy()
    })

    it('places Export HTML button inside Telemetry tab and Stethoscope in action bar', () => {
      const ui = new DrDebugUI()
      const shadow = ui.getShadowRoot()
      ui.openCockpit()
      ui.switchTab('triage')

      ui.updateTriage({
        errors: ['ReferenceError: foo is not defined'],
        slowRequests: [],
        memory: { usedMB: 40, totalMB: 128 }
      })

      // In-tab export HTML button exists
      const tabExportBtn = shadow.querySelector('#dr-debug-tab-export-html')
      expect(tabExportBtn).toBeTruthy()
      expect(tabExportBtn?.textContent).toContain('Export HTML')

      // Stethoscope inspect button is in controlsRow
      const stethoscopeBtn = shadow.querySelector('#dr-debug-btn-stethoscope')
      expect(stethoscopeBtn).toBeTruthy()

      ui.destroy()
    })

    it('renders dynamic resize handles on the Cockpit panel and supports resetSize() / resetLayout()', () => {
      const ui = new DrDebugUI()
      const shadow = ui.getShadowRoot()
      ui.openCockpit()

      const modal = shadow.querySelector('.dr-debug-modal') as HTMLElement
      expect(modal).toBeTruthy()

      const handleT = modal.querySelector('.dr-debug-resize-t')
      const handleL = modal.querySelector('.dr-debug-resize-l')
      const handleTL = modal.querySelector('.dr-debug-resize-tl')

      expect(handleT).toBeTruthy()
      expect(handleL).toBeTruthy()
      expect(handleTL).toBeTruthy()

      // Set custom size and persist to localStorage
      modal.style.width = '640px'
      modal.style.height = '720px'
      localStorage.setItem('dr_debug_cockpit_size', JSON.stringify({ width: 640, height: 720 }))

      expect(localStorage.getItem('dr_debug_cockpit_size')).toBeTruthy()

      ui.resetCockpitSize()
      expect(modal.style.width).toBe('')
      expect(modal.style.height).toBe('')
      expect(localStorage.getItem('dr_debug_cockpit_size')).toBeNull()

      ui.destroy()
    })

    it('recenters the pill via DrDebugUI.recenterPill()', () => {
      const ui = new DrDebugUI()
      const shadow = ui.getShadowRoot()
      const pillEl = shadow.querySelector('.dr-debug-pill') as HTMLElement

      pillEl.style.left = '50px'
      pillEl.style.top = '50px'
      pillEl.style.right = 'auto'
      pillEl.style.bottom = 'auto'

      ui.recenterPill()

      expect(pillEl.style.left).toBe('')
      expect(pillEl.style.top).toBe('')
      expect(pillEl.style.right).toBe('24px')
      expect(pillEl.style.bottom).toBe('24px')

      ui.destroy()
    })

    it('guarantees Dr. Debug (original) as strict default theme without unintended Windows XP fallback', () => {
      localStorage.removeItem('dr_debug_theme')
      localStorage.removeItem('dr_debug_settings')

      const ui = new DrDebugUI()
      const shadow = ui.getShadowRoot()
      const modal = shadow.querySelector('.dr-debug-modal') as HTMLElement
      const pill = shadow.querySelector('.dr-debug-pill') as HTMLElement
      const themeSelect = shadow.querySelector('#dr-debug-theme') as HTMLSelectElement

      expect(ui.getTheme()).toBe('dr-debug')
      expect(themeSelect.value).toBe('dr-debug')
      expect(modal.classList.contains('theme-minimal-glass')).toBe(false)
      expect(modal.classList.contains('theme-windows-xp')).toBe(false)
      expect(modal.classList.contains('theme-monotone-skeuomorphic')).toBe(false)
      expect(modal.classList.contains('theme-cyber-matrix')).toBe(false)
      expect(pill.classList.contains('theme-minimal-glass')).toBe(false)
      expect(pill.classList.contains('theme-cyber-matrix')).toBe(false)

      ui.destroy()
    })

    it('supports Cyber Matrix HUD theme with theme-cyber-matrix class and unique polygon styling classes', () => {
      const ui = new DrDebugUI()
      const shadow = ui.getShadowRoot()
      const modal = shadow.querySelector('.dr-debug-modal') as HTMLElement
      const pill = shadow.querySelector('.dr-debug-pill') as HTMLElement

      ui.setTheme('cyber-matrix')
      expect(ui.getTheme()).toBe('cyber-matrix')
      expect(modal.classList.contains('theme-cyber-matrix')).toBe(true)
      expect(pill.classList.contains('theme-cyber-matrix')).toBe(true)

      // Fallback for invalid theme string defaults to dr-debug
      ui.setTheme('nonexistent-theme' as any)
      expect(ui.getTheme()).toBe('dr-debug')
      expect(modal.classList.contains('theme-cyber-matrix')).toBe(false)
      expect(modal.classList.contains('theme-minimal-glass')).toBe(false)

      ui.destroy()
    })
  })
})
