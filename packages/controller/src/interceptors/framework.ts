import type {
  ComponentSnapshot,
  FrameworkEvent,
  FrameworkState,
  StoreSnapshot
} from '../types.js'

export class FrameworkInterceptor {
  private events: FrameworkEvent[] = []
  private maxBuffer: number
  private detectedFramework: string | null = null
  private isInitialized = false

  constructor(maxBuffer = 50) {
    this.maxBuffer = maxBuffer
  }

  public init(): void {
    if (this.isInitialized || typeof window === 'undefined') return
    this.isInitialized = true
    this.detectFrameworks()
  }

  private detectFrameworks(): void {
    const win = window as any

    // React DevTools Hook
    if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      this.detectedFramework = 'react'
      this.hookReact(win)
    }

    // Redux DevTools
    if (win.__REDUX_DEVTOOLS_EXTENSION__ || win.__REDUX_STORE__) {
      this.hookRedux(win)
    }

    // Vue 3
    if (win.__VUE__ || win.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      this.detectedFramework = this.detectedFramework || 'vue'
      this.hookVue(win)
    }

    // Svelte
    if (win.__svelte || win.__SVELTE_DEVTOOLS_GLOBAL_HOOK__) {
      this.detectedFramework = this.detectedFramework || 'svelte'
    }
  }

  private hookReact(win: any): void {
    const hook = win.__REACT_DEVTOOLS_GLOBAL_HOOK__
    if (!hook) return

    const originalOnCommitFiberRoot = hook.onCommitFiberRoot
    if (typeof originalOnCommitFiberRoot === 'function') {
      hook.onCommitFiberRoot = (id: any, fiber: any, ...rest: any[]) => {
        this.pushEvent({
          type: 'react_render',
          framework: 'react',
          timestamp: Date.now(),
          detail: this.extractReactFiberInfo(fiber)
        })
        return originalOnCommitFiberRoot.call(hook, id, fiber, ...rest)
      }
    }
  }

  private extractReactFiberInfo(fiber: any): string {
    try {
      const current = fiber?.current || fiber
      if (!current) return 'Fiber root committed'
      const tag = current.tag || 0
      const type = current.type
      const name =
        typeof type === 'function'
          ? type.displayName || type.name || 'Anonymous'
          : typeof type === 'object' && type
          ? type.displayName || type.name || 'Anonymous'
          : String(type || 'Root')
      return `Component <${name}> rendered (tag: ${tag})`
    } catch {
      return 'React fiber commit detected'
    }
  }

  private hookRedux(win: any): void {
    // Try to subscribe to Redux store if exposed
    const store = win.__REDUX_STORE__ || win.store
    if (store && typeof store.subscribe === 'function' && typeof store.getState === 'function') {
      let prevState = store.getState()
      store.subscribe(() => {
        const nextState = store.getState()
        const changedKeys = this.diffTopLevelKeys(prevState, nextState)
        this.pushEvent({
          type: 'redux_dispatch',
          framework: 'redux',
          timestamp: Date.now(),
          detail: `Store updated: [${changedKeys.join(', ')}] changed`
        })
        prevState = nextState
      })
    }
  }

  private hookVue(win: any): void {
    const vueHook = win.__VUE_DEVTOOLS_GLOBAL_HOOK__
    if (vueHook && typeof vueHook.on === 'function') {
      vueHook.on('component:updated', (component: any) => {
        const name = component?.$options?.name || component?.type?.name || 'Unknown'
        this.pushEvent({
          type: 'vue_update',
          framework: 'vue',
          timestamp: Date.now(),
          detail: `Vue component <${name}> updated`
        })
      })
    }
  }

  private diffTopLevelKeys(prev: any, next: any): string[] {
    if (!prev || !next || typeof prev !== 'object' || typeof next !== 'object') return ['root']
    const changed: string[] = []
    for (const key of Object.keys(next)) {
      if (prev[key] !== next[key]) changed.push(key)
    }
    return changed.length > 0 ? changed : ['(no diff)']
  }

  private pushEvent(event: FrameworkEvent): void {
    this.events.push(event)
    if (this.events.length > this.maxBuffer) {
      this.events.shift()
    }
  }

  public getFrameworkState(): FrameworkState {
    const win = typeof window !== 'undefined' ? (window as any) : ({} as any)
    const components = this.getReactComponents(win)
    const store = this.getStoreSnapshot(win)

    return {
      detectedFramework: this.detectedFramework,
      hasReactHook: !!win.__REACT_DEVTOOLS_GLOBAL_HOOK__,
      hasReduxHook: !!(win.__REDUX_DEVTOOLS_EXTENSION__ || win.__REDUX_STORE__),
      hasVueHook: !!(win.__VUE__ || win.__VUE_DEVTOOLS_GLOBAL_HOOK__),
      hasSvelteHook: !!(win.__svelte || win.__SVELTE_DEVTOOLS_GLOBAL_HOOK__),
      renderers: win.__REACT_DEVTOOLS_GLOBAL_HOOK__
        ? Object.keys(win.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers || {})
        : [],
      recentEvents: this.events.slice(-20),
      components,
      store
    }
  }

  private getReactComponents(win: any): ComponentSnapshot[] {
    const components: ComponentSnapshot[] = []
    const hook = win.__REACT_DEVTOOLS_GLOBAL_HOOK__
    if (!hook || !hook.renderers) return components

    try {
      for (const [, renderer] of Object.entries(hook.renderers) as any) {
        if (renderer?.getCurrentFiber) {
          const fiber = renderer.getCurrentFiber()
          if (fiber) {
            this.walkFiber(fiber, components, 0, 10)
          }
        }
      }
    } catch {
      // Silent fallback if fiber walking fails
    }
    return components.slice(0, 20)
  }

  private walkFiber(fiber: any, out: ComponentSnapshot[], depth: number, maxDepth: number): void {
    if (!fiber || depth > maxDepth) return
    const type = fiber.type
    if (typeof type === 'function' || typeof type === 'object') {
      const name = type?.displayName || type?.name || 'Anonymous'
      const props = fiber.memoizedProps ? Object.keys(fiber.memoizedProps).slice(0, 8) : []
      out.push({ name, depth, propKeys: props, hasState: !!fiber.memoizedState })
    }
    if (fiber.child) this.walkFiber(fiber.child, out, depth + 1, maxDepth)
    if (fiber.sibling) this.walkFiber(fiber.sibling, out, depth, maxDepth)
  }

  private getStoreSnapshot(win: any): StoreSnapshot | null {
    const store = win.__REDUX_STORE__ || win.store
    if (!store || typeof store.getState !== 'function') return null
    try {
      const state = store.getState()
      const keys = Object.keys(state || {})
      return {
        type: 'redux',
        topLevelKeys: keys.slice(0, 20),
        totalKeys: keys.length,
        preview: JSON.stringify(state, null, 2).slice(0, 500)
      }
    } catch {
      return null
    }
  }

  public getEvents(): FrameworkEvent[] {
    return [...this.events]
  }

  public clear(): void {
    this.events = []
  }

  public destroy(): void {
    this.events = []
    this.isInitialized = false
  }
}
