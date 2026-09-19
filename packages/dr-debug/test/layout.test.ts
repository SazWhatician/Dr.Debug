import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { DrDebug, initDrDebug } from '../src/index.js'

describe('DrDebug Layout & Singleton Persistence', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"><h1>Home Page</h1></div>'
  })

  afterEach(() => {
    const instance = DrDebug.getInstance()
    if (instance) {
      instance.destroy()
    }
    const root = document.getElementById('dr-debug-root')
    if (root?.parentNode) {
      root.parentNode.removeChild(root)
    }
  })

  it('DrDebug.init() reuses global instance across layout re-renders', () => {
    const dr1 = DrDebug.init({ enableUI: true, enableMCP: false, enableDocker: false })
    expect(dr1).toBeDefined()
    expect(DrDebug.getInstance()).toBe(dr1)
    expect(document.getElementById('dr-debug-root')).toBeDefined()

    // Second layout mount on route change
    const dr2 = DrDebug.init({ enableUI: true, enableMCP: false, enableDocker: false })
    expect(dr2).toBe(dr1)
    expect(DrDebug.getInstance()).toBe(dr1)

    dr1.destroy()
    expect(DrDebug.getInstance()).toBeUndefined()
  })

  it('initDrDebug helper returns singleton instance', () => {
    const instance1 = initDrDebug({ enableUI: true, enableMCP: false, enableDocker: false })
    const instance2 = initDrDebug({ enableUI: true, enableMCP: false, enableDocker: false })

    expect(instance1).toBe(instance2)
    instance1.destroy()
  })

  it('syncUIStatus re-attaches HUD after page route transition', () => {
    const debug = new DrDebug({ enableUI: true, enableMCP: false, enableDocker: false })
    expect(document.getElementById('dr-debug-root')).toBeDefined()

    // Simulate page route wipe
    document.body.innerHTML = '<div id="root"><h1>Settings Page</h1></div>'
    expect(document.getElementById('dr-debug-root')).toBeNull()

    debug.syncUIStatus()
    expect(document.getElementById('dr-debug-root')).toBeDefined()

    debug.destroy()
  })

  it('drDebug.recenter() resets HUD pill to original home position', () => {
    const debug = new DrDebug({ enableUI: true, enableMCP: false, enableDocker: false })
    const ui = debug.getUI()
    expect(ui).toBeDefined()

    const pillEl = ui?.getShadowRoot().querySelector('.dr-debug-pill') as HTMLElement
    expect(pillEl).toBeTruthy()

    pillEl.style.left = '30px'
    pillEl.style.top = '40px'
    pillEl.style.right = 'auto'
    pillEl.style.bottom = 'auto'

    debug.recenter()

    expect(pillEl.style.left).toBe('')
    expect(pillEl.style.top).toBe('')
    expect(pillEl.style.right).toBe('24px')
    expect(pillEl.style.bottom).toBe('24px')

    debug.destroy()
  })
})
