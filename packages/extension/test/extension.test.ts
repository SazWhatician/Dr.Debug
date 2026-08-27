import { describe, expect, it } from 'vitest'
import {
  BackgroundWorker,
  ContentScriptBridge,
  generateJsonRCA,
  generateMarkdownRCA,
  type RCAReport
} from '../src/index.js'

describe('Extension Core & DevTools Integration', () => {
  it('generates a clean, structured Markdown RCA Report', () => {
    const report: RCAReport = {
      goal: 'Why did checkout crash on payment submit?',
      diagnosis: 'Payment form crashed with TypeError on Stripe token callback.',
      rootCause: 'Frontend received 403 Forbidden due to expired publishable key.',
      fix: '--- a/stripeClient.ts\n+++ b/stripeClient.ts\n- key = OLD_KEY\n+ key = NEW_KEY',
      confidence: 0.99,
      filesToModify: ['src/stripeClient.ts'],
      durationMs: 3200,
      timestamp: 1724750000000,
      steps: [
        {
          stepNumber: 1,
          hypothesis: 'Network call to /v1/tokens failed',
          toolName: 'inspect_request',
          toolOutput: '{"status": 403, "error": "Invalid API Key"}'
        }
      ]
    }

    const md = generateMarkdownRCA(report)

    expect(md).toContain('# 🩺 Dr. Debug — Root Cause Analysis (RCA) Report')
    expect(md).toContain('Why did checkout crash on payment submit?')
    expect(md).toContain('Payment form crashed with TypeError')
    expect(md).toContain('src/stripeClient.ts')
    expect(md).toContain('+ key = NEW_KEY')
    expect(md).toContain('Step 1: `inspect_request`')
    expect(md).toContain('99%')
  })

  it('generates a valid JSON RCA export', () => {
    const report: RCAReport = {
      goal: 'Investigate memory leak',
      diagnosis: 'Heap increased by 12MB in 2 minutes',
      rootCause: 'Detached DOM nodes in LiveFeed poller',
      confidence: 0.95,
      steps: []
    }

    const jsonStr = generateJsonRCA(report)
    const parsed = JSON.parse(jsonStr)

    expect(parsed.generator).toBe('dr-debug-extension')
    expect(parsed.report.diagnosis).toContain('Heap increased by 12MB')
  })

  it('BackgroundWorker processes extension messages and responds', () => {
    const worker = new BackgroundWorker()
    let response: any = null

    worker.handleMessage(
      { type: 'DR_DEBUG_CONNECT_TAB', tabId: 101 },
      { tab: { id: 101 } },
      (res) => {
        response = res
      }
    )

    expect(response).toEqual({ status: 'connected', tabId: 101 })
  })

  it('ContentScriptBridge mounts in-page DrDebug instance and cleans up', () => {
    const bridge = new ContentScriptBridge()
    bridge.init()

    expect(bridge.getInstance()).toBeDefined()

    bridge.destroy()
  })
})
