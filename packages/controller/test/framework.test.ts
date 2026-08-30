import { beforeEach, describe, expect, it } from 'vitest'
import { FrameworkInterceptor } from '../src/interceptors/framework.js'

describe('FrameworkInterceptor (React / Redux / Vue / Svelte)', () => {
  let interceptor: FrameworkInterceptor

  beforeEach(() => {
    interceptor = new FrameworkInterceptor()
  })

  it('detects React DevTools hook and captures commit events', () => {
    const mockHook = {
      renderers: { 1: { version: '18.2.0' } },
      onCommitFiberRoot: (id: any, fiber: any) => ({ id, fiber })
    }
    ;(globalThis as any).window = {
      __REACT_DEVTOOLS_GLOBAL_HOOK__: mockHook
    }

    interceptor.init()
    const state = interceptor.getFrameworkState()

    expect(state.hasReactHook).toBe(true)
    expect(state.detectedFramework).toBe('react')
    expect(state.renderers).toContain('1')

    // Simulate React commit
    mockHook.onCommitFiberRoot(1, { current: { tag: 1, type: { name: 'UserProfile' } } })
    const events = interceptor.getEvents()
    expect(events.length).toBe(1)
    expect(events[0].detail).toContain('UserProfile')

    interceptor.destroy()
  })

  it('detects Redux store and captures state mutations', () => {
    let subscriber: (() => void) | null = null
    let currentState = { count: 0, user: { name: 'Alice' } }

    ;(globalThis as any).window = {
      __REDUX_STORE__: {
        getState: () => currentState,
        subscribe: (fn: () => void) => {
          subscriber = fn
        }
      }
    }

    interceptor.init()
    const state = interceptor.getFrameworkState()
    expect(state.store?.type).toBe('redux')
    expect(state.store?.topLevelKeys).toContain('count')
    expect(state.store?.topLevelKeys).toContain('user')

    // Trigger state change
    currentState = { count: 1, user: { name: 'Alice' } }
    if (typeof subscriber === 'function') {
      ;(subscriber as any)()
    }

    const events = interceptor.getEvents()

    expect(events.length).toBe(1)
    expect(events[0].detail).toContain('count')

    interceptor.destroy()
  })
})
