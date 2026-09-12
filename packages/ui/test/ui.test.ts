import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DrDebugUI } from '../src/index.js'

describe('DrDebugUI (Shadow DOM HUD & Cockpit)', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('mounts into #dr-debug-root with Shadow DOM isolation', () => {
    const ui = new DrDebugUI()
    const root = document.getElementById('dr-debug-root')

    expect(root).toBeDefined()
    expect(root?.shadowRoot).toBeDefined()

    const shadow = ui.getShadowRoot()
    expect(shadow.querySelector('.dr-debug-pill')).toBeDefined()
    expect(shadow.querySelector('.dr-debug-modal')).toBeDefined()
    expect(shadow.querySelector('style')).toBeDefined()

    ui.destroy()
    expect(document.getElementById('dr-debug-root')).toBeNull()
  })

  it('updates pill status correctly on error and running states', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()
    const badge = shadow.querySelector('.dr-debug-pill-badge')

    // Initial state
    ui.updatePillStatus(0, 0, 0, false)
    expect(badge?.textContent).toContain('Dr. Debug')
    expect(badge?.textContent).toContain('HEALTHY')

    // Error state
    ui.updatePillStatus(2, 0, 1, false)
    expect(badge?.textContent).toContain('2 ERR')
    expect(badge?.textContent).toContain('1 SLOW')

    // Running state
    ui.updatePillStatus(2, 0, 1, true)
    expect(badge?.textContent).toContain('DIAGNOSING')

    ui.destroy()
  })

  it('toggles and opens Cockpit drawer on pill click or method call', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()
    const modal = shadow.querySelector('.dr-debug-modal')

    expect(modal?.classList.contains('hidden')).toBe(true)

    ui.openCockpit()
    expect(modal?.classList.contains('hidden')).toBe(false)

    ui.closeCockpit()
    expect(modal?.classList.contains('hidden')).toBe(true)

    ui.toggleCockpit()
    expect(modal?.classList.contains('hidden')).toBe(false)

    ui.destroy()
  })

  it('renders diagnostic timeline steps and final prescription diff card', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()

    ui.openCockpit()
    ui.addTimelineStep({
      stepNumber: 1,
      hypothesis: 'Network call to /v2/metrics failed due to CORS',
      toolName: 'inspect_request',
      toolOutput: '{"status": 0, "error": "net::ERR_FAILED"}'
    })

    const stepCards = shadow.querySelectorAll('.dr-debug-step-card')
    expect(stepCards.length).toBe(1)
    expect(stepCards[0].textContent).toContain('inspect_request')
    expect(stepCards[0].textContent).toContain('Network call to /v2/metrics failed')

    ui.showPrescription({
      diagnosis: 'Analytics endpoint blocked by CORS',
      rootCause: 'Missing Access-Control-Allow-Origin header',
      fix: '--- a/client.ts\n+++ b/client.ts\n- fetch(url)\n+ fetch(url, { mode: "cors" })',
      confidence: 0.98,
      filesToModify: ['src/client.ts']
    })

    const prescriptionCard = shadow.querySelector('.dr-debug-prescription-card')
    expect(prescriptionCard).toBeDefined()
    expect(prescriptionCard?.textContent).toContain('Analytics endpoint blocked by CORS')
    expect(prescriptionCard?.textContent).toContain('src/client.ts')

    const diffAdd = shadow.querySelector('.dr-debug-diff-add')
    const diffDel = shadow.querySelector('.dr-debug-diff-del')
    expect(diffAdd?.textContent).toContain('+ fetch(url, { mode: "cors" })')
    expect(diffDel?.textContent).toContain('- fetch(url)')

    ui.destroy()
  })

  it('renders triage telemetry stream items', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()

    ui.openCockpit()
    ui.updateTriage({
      errors: ['TypeError: Cannot read property of undefined'],
      slowRequests: ['GET /api/users (3200ms)'],
      memory: { usedMB: 48, totalMB: 96 }
    })

    const items = shadow.querySelectorAll('.dr-debug-telemetry-item')
    expect(items.length).toBe(3)

    ui.destroy()
  })

  it('invokes onInvestigate callback when user submits manual query', async () => {
    const onInvestigate = vi.fn()
    const ui = new DrDebugUI({ onInvestigate })
    const shadow = ui.getShadowRoot()

    const input = shadow.querySelector('.dr-debug-input') as HTMLInputElement
    const btn = shadow.querySelector('#dr-debug-query-submit') as HTMLButtonElement

    input.value = 'Why is the checkout button unresponsive?'
    btn.click()

    expect(onInvestigate).toHaveBeenCalledWith('Why is the checkout button unresponsive?')

    ui.destroy()
  })

  it('switches to errors tab and renders 2D error matrix view with search and mode switcher', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()

    ui.openCockpit()
    ui.switchTab('errors')

    const errView = shadow.querySelector('.dr-debug-error-dashboard')
    expect(errView).toBeDefined()

    const matrixGrid = shadow.querySelector('.dr-debug-2d-matrix')
    expect(matrixGrid).toBeDefined()

    const searchInput = shadow.querySelector('.dr-debug-search-input') as HTMLInputElement
    expect(searchInput).toBeDefined()

    const btnStream = shadow.querySelector('#btn-mode-stream') as HTMLButtonElement
    expect(btnStream).toBeDefined()
    btnStream.click()

    const chartWrapper = shadow.querySelector('.dr-debug-chart-wrapper') as HTMLElement
    expect(chartWrapper.style.display).toBe('flex')

    ui.destroy()
  })

  it('switches to docker tab and renders dedicated Docker dashboard with containers and log terminal', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()

    ui.openCockpit()
    ui.switchTab('docker')

    const dockerView = shadow.querySelector('.dr-debug-docker-dashboard')
    expect(dockerView).toBeDefined()

    const statusBanner = shadow.querySelector('.dr-debug-docker-header')
    expect(statusBanner).toBeDefined()
    expect(statusBanner?.textContent).toContain('Docker Engine Bridge')

    const terminal = shadow.querySelector('.dr-debug-docker-terminal')
    expect(terminal).toBeDefined()

    const searchInput = shadow.querySelector('.dr-debug-dock-search') as HTMLInputElement
    expect(searchInput).toBeDefined()

    ui.destroy()
  })

  it('keeps the tab bar clean and renders interactive (i) Guide triggers inside each tab view', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()

    ui.openCockpit()

    // Tab bar buttons are clean (no nested info buttons cluttering navigation)
    const tabButtons = shadow.querySelectorAll('.dr-debug-tab')
    expect(tabButtons.length).toBe(6)

    const tabInfoButtonsOnBar = shadow.querySelectorAll('.dr-debug-tabs .dr-debug-tab-info-btn')
    expect(tabInfoButtonsOnBar.length).toBe(0)

    // In-tab guide trigger buttons exist inside tab views
    const tabKeys = ['errors', 'triage', 'graph', 'docker', 'timeline', 'prescription']
    tabKeys.forEach((key) => {
      const btn = shadow.querySelector(`#dr-debug-guide-btn-${key}`)
      expect(btn).toBeTruthy()
    })

    const infoCard = shadow.querySelector('#dr-debug-tab-info-card') as HTMLElement
    expect(infoCard).toBeTruthy()
    expect(ui.isTabInfoVisible()).toBe(false)

    // Click on Error Matrix in-tab guide button
    const errorsGuideBtn = shadow.querySelector('#dr-debug-guide-btn-errors') as HTMLElement
    errorsGuideBtn.click()

    expect(ui.isTabInfoVisible()).toBe(true)
    expect(ui.getActiveTabInfo()).toBe('errors')
    expect(infoCard.textContent).toContain('Error Matrix')
    expect(infoCard.textContent).toContain('2D Substrate × Severity matrix and chronological timeline')
    expect(infoCard.textContent).toContain('AI Prompt Generator')

    // Close button
    const closeBtn = infoCard.querySelector('#dr-debug-tab-info-close') as HTMLElement
    expect(closeBtn).toBeTruthy()
    closeBtn.click()
    expect(ui.isTabInfoVisible()).toBe(false)

    // Switch to docker tab and click in-tab docker guide button
    ui.switchTab('docker')
    const dockerGuideBtn = shadow.querySelector('#dr-debug-guide-btn-docker') as HTMLElement
    dockerGuideBtn.click()
    expect(ui.isTabInfoVisible()).toBe(true)
    expect(ui.getActiveTabInfo()).toBe('docker')
    expect(infoCard.textContent).toContain('Docker Containers')
    expect(infoCard.textContent).toContain('Full-Stack Host Engine Bridge')

    // Close guide
    ui.hideTabInfo()
    expect(ui.isTabInfoVisible()).toBe(false)

    // Test programmatic API
    ui.showTabInfo('graph')
    expect(ui.isTabInfoVisible()).toBe(true)
    expect(infoCard.textContent).toContain('Causal Graph')
    expect(infoCard.textContent).toContain('ROOT CAUSE')

    ui.toggleTabInfo('graph')
    expect(ui.isTabInfoVisible()).toBe(false)

    ui.destroy()
  })

  it('supports theme switching across Dr.Debug, Minimalistic glassmorphism, and Monotone skeuomorphism', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()
    const modal = shadow.querySelector('.dr-debug-modal') as HTMLElement

    // Default theme is Dr.Debug (original)
    expect(ui.getTheme()).toBe('dr-debug')
    expect(modal.classList.contains('theme-minimal-glass')).toBe(false)
    expect(modal.classList.contains('theme-monotone-skeuomorphic')).toBe(false)

    // Switch to Minimalistic glassmorphism (light theme)
    ui.setTheme('minimal-glass')
    expect(ui.getTheme()).toBe('minimal-glass')
    expect(modal.classList.contains('theme-minimal-glass')).toBe(true)
    expect(modal.classList.contains('theme-monotone-skeuomorphic')).toBe(false)

    // Switch to Monotone skeuomorphism (darker theme)
    ui.setTheme('monotone-skeuomorphic')
    expect(ui.getTheme()).toBe('monotone-skeuomorphic')
    expect(modal.classList.contains('theme-monotone-skeuomorphic')).toBe(true)
    expect(modal.classList.contains('theme-minimal-glass')).toBe(false)

    // Switch back to Dr.Debug (original)
    ui.setTheme('dr-debug')
    expect(ui.getTheme()).toBe('dr-debug')
    expect(modal.classList.contains('theme-minimal-glass')).toBe(false)
    expect(modal.classList.contains('theme-monotone-skeuomorphic')).toBe(false)

    // Test theme select in SettingsModal
    const themeSelect = shadow.querySelector('#dr-debug-theme') as HTMLSelectElement
    expect(themeSelect).toBeTruthy()
    themeSelect.value = 'minimal-glass'
    themeSelect.dispatchEvent(new Event('change'))

    expect(ui.getTheme()).toBe('minimal-glass')
    expect(modal.classList.contains('theme-minimal-glass')).toBe(true)

    ui.destroy()
  })

  it('renders telemetry stream with visible, themeable text classes in light mode without hardcoded white inline styles', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()

    ui.openCockpit()
    ui.setTheme('minimal-glass')
    ui.switchTab('triage')

    ui.updateTriage({
      errors: ['TypeError: Cannot read properties of undefined'],
      slowRequests: ['GET /api/checkout/pay (1450ms) [500]'],
      memory: { usedMB: 54, totalMB: 128 }
    })

    const items = shadow.querySelectorAll('.dr-debug-telemetry-item')
    expect(items.length).toBe(3)

    const payloads = shadow.querySelectorAll('.dr-debug-telemetry-payload')
    expect(payloads.length).toBe(2)
    payloads.forEach((p) => {
      // Must not contain hardcoded bright white inline style
      expect((p as HTMLElement).style.color).not.toBe('rgb(241, 245, 249)')
      expect((p as HTMLElement).style.color).not.toBe('#f1f5f9')
    })

    const textEl = shadow.querySelector('.dr-debug-telemetry-text')
    expect(textEl).toBeTruthy()
    expect((textEl as HTMLElement).style.color).not.toBe('#cbd5e1')

    ui.destroy()
  })

  it('synchronizes external extension settings into SettingsModal without exposing raw credentials', () => {
    const ui = new DrDebugUI()
    const shadow = ui.getShadowRoot()

    ui.openCockpit()

    // Push simulated extension settings update
    ui.updateSettings({
      provider: 'gemini',
      model: 'gemini-flash-latest',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      hasApiKey: true,
      apiKeyMasked: '••••••••2oDw'
    })

    const providerSelect = shadow.querySelector('#dr-debug-provider') as HTMLSelectElement
    const modelInput = shadow.querySelector('#dr-debug-model') as HTMLInputElement
    const apiKeyInput = shadow.querySelector('#dr-debug-api-key') as HTMLInputElement

    expect(providerSelect.value).toBe('gemini')
    expect(modelInput.value).toBe('gemini-flash-latest')
    expect(apiKeyInput.placeholder).toBe('••••••••2oDw')

    ui.destroy()
  })

  describe('Clipboard Resilience Utility', () => {
    it('copies text via navigator.clipboard.writeText when available', async () => {
      const { copyToClipboard } = await import('../src/index.js')
      const writeTextSpy = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: writeTextSpy
        }
      })

      const success = await copyToClipboard('test clipboard content')
      expect(success).toBe(true)
      expect(writeTextSpy).toHaveBeenCalledWith('test clipboard content')
      vi.unstubAllGlobals()
    })

    it('falls back to execCommand copy when navigator.clipboard.writeText rejects', async () => {
      const { copyToClipboard } = await import('../src/index.js')
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError: Document not focused'))
        }
      })
      const execCommandSpy = vi.fn().mockReturnValue(true)
      document.execCommand = execCommandSpy

      const success = await copyToClipboard('fallback content')
      expect(success).toBe(true)
      expect(execCommandSpy).toHaveBeenCalledWith('copy')
      vi.unstubAllGlobals()
    })

    it('binds copy button with visual feedback and debouncing', async () => {
      const { bindCopyButton } = await import('../src/index.js')
      const writeTextSpy = vi.fn().mockResolvedValue(undefined)
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: writeTextSpy
        }
      })

      const btn = document.createElement('button')
      btn.innerHTML = '<span>Original</span>'
      document.body.appendChild(btn)

      bindCopyButton(btn, () => 'my-text', { successText: 'Copied!', durationMs: 100 })

      btn.click()
      // Wait for async copy resolution
      await new Promise((r) => setTimeout(r, 20))

      expect(writeTextSpy).toHaveBeenCalledWith('my-text')
      expect(btn.innerHTML).toBe('<span>Copied!</span>')
      expect(btn.classList.contains('copied')).toBe(true)

      // After duration, original text is restored
      await new Promise((r) => setTimeout(r, 120))
      expect(btn.innerHTML).toBe('<span>Original</span>')
      expect(btn.classList.contains('copied')).toBe(false)

      btn.remove()
      vi.unstubAllGlobals()
    })
  })

  describe('SettingsModal Smart 1-Click Update', () => {
    it('shows Up to Date without opening any window when already on the latest release', async () => {
      const ui = new DrDebugUI()
      const shadow = ui.getShadowRoot()
      ui.openCockpit()

      // Mock fetch to simulate GitHub latest release returning 0.1.9
      const originalFetch = global.fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tag_name: 'v0.1.9', name: 'Dr. Debug v0.1.9' })
      }) as any

      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

      const updateBtn = shadow.querySelector('#dr-debug-btn-check-update') as HTMLButtonElement
      expect(updateBtn).toBeDefined()

      updateBtn.click()

      // Allow async fetch and DOM updates
      await new Promise((r) => setTimeout(r, 50))

      expect(updateBtn.innerHTML).toContain('Up to Date')
      expect(openSpy).not.toHaveBeenCalled()

      global.fetch = originalFetch
      openSpy.mockRestore()
      ui.destroy()
    })
  })
})



