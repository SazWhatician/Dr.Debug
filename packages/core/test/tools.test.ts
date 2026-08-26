import { DebugController } from '@dr-debug/controller'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  checkStorageTool,
  doneTool,
  executeJavascriptTool,
  findCorrelationsTool,
  inspectElementTool,
  inspectErrorTool,
  inspectRequestTool,
  queryFrameworkStateTool,
  replayNetworkRequestTool
} from '../src/tools/index.js'
import type { ToolContext } from '../src/types.js'

describe('Diagnostic Tools Registry', () => {
  let controller: DebugController
  let context: ToolContext
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    // Setup a mock fetch before controller initializes
    globalThis.fetch = async () =>
      new Response('{"error": "Forbidden"}', {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })

    controller = new DebugController(10)
    controller.init()
    context = {
      controller,
      memory: {}
    }
  })

  afterEach(() => {
    if (controller) controller.destroy()
    globalThis.fetch = originalFetch
  })

  it('inspect_error returns formatted stack frames for recorded error', async () => {
    console.error(new Error('Sample runtime failure'))

    const resultStr = await inspectErrorTool.execute({ errorIndex: 0 }, context)
    const result = JSON.parse(resultStr)

    expect(result.message).toContain('Sample runtime failure')
    expect(result.occurrences).toBe(1)
    expect(result.id).toBeDefined()
  })

  it('inspect_request returns network payload details', async () => {
    await window.fetch('https://api.acme.io/v2/metrics', { method: 'POST' })

    const resultStr = await inspectRequestTool.execute({ requestIndex: 0 }, context)
    const result = JSON.parse(resultStr)

    expect(result.method).toBe('POST')
    expect(result.status).toBe(403)
    expect(result.responseBody).toContain('Forbidden')
  })

  it('execute_javascript evaluates safe JS expressions in page context', async () => {
    const res1 = await executeJavascriptTool.execute({ script: '1 + 1' }, context)
    expect(res1).toBe('2')

    const res2 = await executeJavascriptTool.execute({ script: '({ a: 10, b: "hello" })' }, context)
    expect(res2).toContain('"a": 10')
  })

  it('inspect_element queries DOM element dimensions and styles', async () => {
    const div = document.createElement('div')
    div.id = 'target-btn'
    div.textContent = 'Submit Order'
    document.body.appendChild(div)

    const resultStr = await inspectElementTool.execute({ selector: '#target-btn' }, context)
    const result = JSON.parse(resultStr)

    expect(result.tagName).toBe('div')
    expect(result.id).toBe('target-btn')
    expect(result.textContent).toBe('Submit Order')

    document.body.removeChild(div)
  })

  it('check_storage inspects localStorage keys', async () => {
    localStorage.setItem('auth_token', 'jwt_secret_token_123')

    const resultStr = await checkStorageTool.execute({ type: 'local', key: 'auth_token' }, context)
    const result = JSON.parse(resultStr)

    expect(result.localStorage.auth_token).toBe('jwt_secret_token_123')
    localStorage.removeItem('auth_token')
  })

  it('done tool saves result into context memory', async () => {
    const doneArgs = {
      diagnosis: 'CORS header missing on backend endpoint.',
      rootCause: 'apiClient.ts calls cross-origin endpoint without CORS config.',
      fix: 'Add Access-Control-Allow-Origin: * header.',
      confidence: 0.95,
      filesToModify: ['src/apiClient.ts']
    }

    const resultStr = await doneTool.execute(doneArgs, context)
    const result = JSON.parse(resultStr)

    expect(result.status).toBe('investigation_concluded')
    expect(context.memory['finalResult']).toEqual(doneArgs)
  })
})
