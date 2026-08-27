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
    const pulse = shadow.querySelector('.dr-debug-pulse')

    // Initial state
    ui.updatePillStatus(0, 0, false)
    expect(badge?.textContent).toContain('Dr. Debug')

    // Error state
    ui.updatePillStatus(2, 1, false)
    expect(badge?.textContent).toContain('2 Errors | 1 Slow')
    expect(pulse?.classList.contains('error')).toBe(true)

    // Running state
    ui.updatePillStatus(2, 1, true)
    expect(badge?.textContent).toBe('Diagnosing...')
    expect(pulse?.classList.contains('running')).toBe(true)

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
    const btn = shadow.querySelector('.dr-debug-btn') as HTMLButtonElement

    input.value = 'Why is the checkout button unresponsive?'
    btn.click()

    expect(onInvestigate).toHaveBeenCalledWith('Why is the checkout button unresponsive?')

    ui.destroy()
  })
})
