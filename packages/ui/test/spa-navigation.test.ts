import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { DrDebugUI, DrDebugCockpit, DrDebugReact } from '../src/index.js'

describe('DrDebugUI SPA Navigation & Layout Self-Healing', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"><div class="layout-page">Page 1 Content</div></div>'
  })

  afterEach(() => {
    const existing = document.getElementById('dr-debug-root')
    if (existing?.parentNode) {
      existing.parentNode.removeChild(existing)
    }
  })

  it('self-heals and re-attaches to document.body when DOM is wiped during SPA route transition', async () => {
    const ui = new DrDebugUI()
    expect(document.contains(ui.getHost())).toBe(true)
    expect(document.getElementById('dr-debug-root')).toBeDefined()

    // Simulate SPA router wiping document.body for a new page
    document.body.innerHTML = '<div id="app"><div class="layout-page">Page 2 Content</div></div>'
    expect(document.contains(ui.getHost())).toBe(false)

    // Trigger ensureHostAttached directly or via route event
    ui.ensureHostAttached()
    expect(document.contains(ui.getHost())).toBe(true)
    expect(document.body.contains(ui.getHost())).toBe(true)

    ui.destroy()
  })

  it('re-attaches automatically when history.pushState or history.replaceState is invoked', () => {
    const ui = new DrDebugUI()
    expect(document.contains(ui.getHost())).toBe(true)

    // Detach host simulating a framework DOM diff removal
    ui.getHost().remove()
    expect(document.contains(ui.getHost())).toBe(false)

    // Simulate React Router / Next.js calling history.pushState
    history.pushState({ page: 'about' }, '', '/about')

    expect(document.contains(ui.getHost())).toBe(true)
    expect(document.body.contains(ui.getHost())).toBe(true)

    // Simulate history.replaceState
    ui.getHost().remove()
    expect(document.contains(ui.getHost())).toBe(false)
    history.replaceState({ page: 'contact' }, '', '/contact')

    expect(document.contains(ui.getHost())).toBe(true)

    ui.destroy()
  })

  it('re-attaches on popstate and hashchange events', () => {
    const ui = new DrDebugUI()
    expect(document.contains(ui.getHost())).toBe(true)

    // Detach host
    ui.getHost().remove()
    expect(document.contains(ui.getHost())).toBe(false)

    // Simulate back/forward button navigation
    window.dispatchEvent(new PopStateEvent('popstate'))
    expect(document.contains(ui.getHost())).toBe(true)

    // Simulate hash navigation
    ui.getHost().remove()
    expect(document.contains(ui.getHost())).toBe(false)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(document.contains(ui.getHost())).toBe(true)

    ui.destroy()
  })

  it('gracefully falls back to document.body when custom container is unmounted on route change', () => {
    const customContainer = document.createElement('div')
    customContainer.id = 'layout-custom-container'
    document.body.appendChild(customContainer)

    const ui = new DrDebugUI({ container: customContainer })
    expect(customContainer.contains(ui.getHost())).toBe(true)

    // Unmount custom container (e.g. layout transition to a page without that container)
    customContainer.remove()
    expect(document.contains(customContainer)).toBe(false)
    expect(document.contains(ui.getHost())).toBe(false)

    // Calling ensureHostAttached falls back to document.body
    ui.ensureHostAttached()
    expect(document.contains(ui.getHost())).toBe(true)
    expect(document.body.contains(ui.getHost())).toBe(true)

    ui.destroy()
  })

  it('DrDebugCockpit React helper executes cleanly in browser and SSR environments', () => {
    // In SSR (no window)
    const ssrResult = DrDebugCockpit({ enableUI: true })
    expect(ssrResult).toBeNull()

    // In client environment
    const clientResult = DrDebugReact({ enableUI: true })
    expect(clientResult).toBeNull()
  })
})
