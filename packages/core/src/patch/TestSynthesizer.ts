import type { InteractionEvent, NetworkRecord } from '@dr-debug/controller'
import type { InvestigationResult } from '../types.js'

export class TestSynthesizer {
  static synthesizePlaywright(
    result: InvestigationResult,
    interactions: InteractionEvent[] = [],
    failedRequest?: NetworkRecord,
    targetUrl = 'http://localhost:3000'
  ): string {
    const lines: string[] = []
    lines.push(`import { test, expect } from '@playwright/test'`)
    lines.push('')
    lines.push(`/**`)
    lines.push(` * Automated Regression Test Synthesized by Dr. Debug`)
    lines.push(` * Diagnosis: ${result.diagnosis}`)
    lines.push(` * Root Cause: ${result.rootCause}`)
    lines.push(` */`)
    lines.push(`test('reproduce and verify fix: ${result.diagnosis.slice(0, 50).replace(/'/g, "\\'")}', async ({ page }) => {`)
    lines.push(`  // 1. Navigate to target application`)
    lines.push(`  await page.goto('${targetUrl}')`)
    lines.push('')

    if (failedRequest) {
      lines.push(`  // Listen for network failure response`)
      lines.push(`  const responsePromise = page.waitForResponse(response =>`)
      lines.push(`    response.url().includes('${failedRequest.url.split('?')[0].split('/').slice(-2).join('/')}')`)
      lines.push(`  )`)
      lines.push('')
    }

    if (interactions.length > 0) {
      lines.push(`  // 2. Execute user interaction reproduction sequence`)
      for (const ev of interactions) {
        if (ev.type === 'click' && ev.target) {
          lines.push(`  await page.locator('${ev.target}').click()`)
        } else if (ev.type === 'input' && ev.target) {
          const val = ev.detail?.match(/value="([^"]+)"/)?.[1] || 'test-value'
          if (val !== '[REDACTED]' && val !== '[PII_REDACTED]') {
            lines.push(`  await page.locator('${ev.target}').fill('${val}')`)
          }
        } else if (ev.type === 'scroll') {
          lines.push(`  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))`)
        }
      }
      lines.push('')
    }

    lines.push(`  // 3. Assertions checking system resilience`)
    if (failedRequest) {
      lines.push(`  const response = await responsePromise`)
      lines.push(`  expect(response.status()).toBeLessThan(400)`)
    }
    lines.push(`  // Ensure no unhandled exception modals or error toasts appear`)
    lines.push(`  await expect(page.locator('.error, [role="alert"]')).not.toBeVisible()`)
    lines.push(`})`)
    lines.push('')

    return lines.join('\n')
  }
}
