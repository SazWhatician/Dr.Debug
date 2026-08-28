import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ConsoleInterceptor } from '../src/interceptors/console.js'

describe('ConsoleInterceptor', () => {
  let interceptor: ConsoleInterceptor

  beforeEach(() => {
    interceptor = new ConsoleInterceptor(5)
    interceptor.init()
  })

  afterEach(() => {
    interceptor.destroy()
  })

  it('captures console.error and console.warn', () => {
    console.error('Test error message', { code: 500 })
    console.warn('Test warning message')

    const entries = interceptor.getEntries()
    expect(entries.length).toBe(2)

    expect(entries[0].level).toBe('error')
    expect(entries[0].message).toContain('Test error message')
    expect(entries[0].type).toBe('console_error')

    expect(entries[1].level).toBe('warn')
    expect(entries[1].message).toContain('Test warning message')
  })

  it('captures uncaught window error events', () => {
    const errorEvent = new ErrorEvent('error', {
      message: 'Uncaught ReferenceError: foo is not defined',
      filename: 'http://localhost/app.js',
      lineno: 42,
      colno: 10,
      error: new Error('foo is not defined')
    })
    window.dispatchEvent(errorEvent)

    const errors = interceptor.getErrors()
    expect(errors.length).toBe(1)
    expect(errors[0].type).toBe('uncaught_error')
    expect(errors[0].message).toBe('Uncaught ReferenceError: foo is not defined')
    expect(errors[0].parsedStack).toBeDefined()
    expect(errors[0].parsedStack!.length).toBeGreaterThan(0)
  })

  it('captures unhandled promise rejections', () => {
    const rejectionEvent = new Event('unhandledrejection') as any
    rejectionEvent.reason = new Error('Database connection timed out')
    window.dispatchEvent(rejectionEvent)

    const entries = interceptor.getEntries()
    expect(entries.length).toBe(1)
    expect(entries[0].type).toBe('unhandled_rejection')
    expect(entries[0].message).toContain('Database connection timed out')
  })

  it('deduplicates repeated identical log bursts', () => {
    console.error('Repeating error')
    console.error('Repeating error')
    console.error('Repeating error')

    const entries = interceptor.getEntries()
    expect(entries.length).toBe(1)
    expect(entries[0].count).toBe(3)
    expect(entries[0].message).toBe('Repeating error')
  })

  it('evicts oldest entries when ring buffer exceeds capacity', () => {
    for (let i = 1; i <= 7; i++) {
      console.log(`Log message ${i}`)
    }

    const entries = interceptor.getEntries()
    expect(entries.length).toBe(5) // Max buffer capacity is 5
    expect(entries[0].message).toBe('Log message 3')
    expect(entries[4].message).toBe('Log message 7')
  })

  it('cleans up and restores native console on destroy()', () => {
    interceptor.destroy()
    console.error('Post destroy error')

    expect(interceptor.getEntries().length).toBe(0)
  })

  it('safely handles cyclic objects and complex DOM structures without throwing', () => {
    const cyclicObj: any = { name: 'cyclic' }
    cyclicObj.self = cyclicObj

    expect(() => {
      console.log('Testing cyclic object:', cyclicObj)
    }).not.toThrow()

    const entries = interceptor.getEntries()
    expect(entries.length).toBe(1)
    expect(entries[0].message).toContain('[Circular]')
  })

  it('allows external libraries to re-wrap console methods without recursion', () => {
    const prevWarn = console.warn
    let wrappedWarnCount = 0
    console.warn = function (...args: any[]) {
      wrappedWarnCount++
      prevWarn.apply(console, args)
    }

    console.warn('External wrapped warning')
    expect(wrappedWarnCount).toBe(1)

    const warnings = interceptor.getWarnings()
    expect(warnings.length).toBe(1)
    expect(warnings[0].message).toContain('External wrapped warning')
  })
})
