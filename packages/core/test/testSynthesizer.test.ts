import { describe, expect, it } from 'vitest'
import { TestSynthesizer } from '../src/patch/TestSynthesizer.js'
import type { InvestigationResult } from '../src/types.js'

describe('TestSynthesizer (Playwright Regression Test Synthesis)', () => {
  it('synthesizes executable Playwright test script from investigation and user actions', () => {
    const result: InvestigationResult = {
      goal: 'Fix checkout failure',
      status: 'resolved',
      diagnosis: 'Failed payment token creation',
      rootCause: 'Token timeout after 30s',
      confidence: 0.95,
      steps: [],
      durationMs: 300,
      finalMemory: ''
    }

    const interactions = [
      { type: 'click', timestamp: Date.now() - 2000, target: '#checkout-button', detail: 'Pay' },
      { type: 'input', timestamp: Date.now() - 1000, target: '#email-input', detail: 'value="test@acme.com"' }
    ]

    const script = TestSynthesizer.synthesizePlaywright(result, interactions)

    expect(script).toContain("import { test, expect } from '@playwright/test'")
    expect(script).toContain("await page.locator('#checkout-button').click()")
    expect(script).toContain("await page.locator('#email-input').fill('test@acme.com')")
    expect(script).toContain("await expect(page.locator('.error, [role=\"alert\"]')).not.toBeVisible()")
  })
})

