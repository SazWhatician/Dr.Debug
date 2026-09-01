import { describe, expect, it } from 'vitest'
import { shadowStyles } from '../src/styles.js'

/**
 * An unclosed rule silently kills every rule after it — the browser aborts
 * parsing and reports no error. That once left the whole Error Matrix section
 * and the session hand-off buttons unstyled, so the balance is asserted here.
 */
describe('shadowStyles integrity', () => {
  const stripped = shadowStyles.replace(/\/\*[\s\S]*?\*\//g, '')

  it('has balanced braces', () => {
    const open = (stripped.match(/\{/g) || []).length
    const close = (stripped.match(/\}/g) || []).length
    expect(close).toBe(open)
  })

  it('never nests a plain rule inside another plain rule', () => {
    // Walk the stylesheet tracking depth. Only at-rules (@media, @keyframes,
    // @supports) may legitimately hold nested blocks.
    const lines = stripped.split('\n')
    let depth = 0
    const atRuleDepths: number[] = []
    const offenders: string[] = []

    lines.forEach((line, i) => {
      const isAtRule = /^\s*@(media|keyframes|supports|layer|container)/.test(line)
      for (const ch of line) {
        if (ch === '{') {
          // A block opening at depth D sits inside the block opened at D-1.
          // That parent must be an at-rule for the nesting to be legal.
          if (depth > 0 && !atRuleDepths.includes(depth - 1)) {
            offenders.push(`line ${i + 1}: ${line.trim().slice(0, 70)}`)
          }
          if (isAtRule) atRuleDepths.push(depth)
          depth++
        } else if (ch === '}') {
          depth--
          const idx = atRuleDepths.indexOf(depth)
          if (idx !== -1) atRuleDepths.splice(idx, 1)
        }
      }
    })

    expect(offenders).toEqual([])
    expect(depth).toBe(0)
  })

  it('defines the classes the components actually attach', () => {
    // These are applied in CockpitPanel; a missing rule renders a native button.
    for (const cls of [
      'dr-debug-export-btn',
      'dr-debug-handoff',
      'dr-debug-handoff-desc',
      'dr-debug-copy-btn',
      'dr-debug-copy-inline',
      'dr-debug-error-dashboard',
      'dr-debug-step-card'
    ]) {
      expect(shadowStyles, `missing .${cls}`).toContain(`.${cls}`)
    }
  })
})

/**
 * The Error Matrix is a column flex chain. Fixed rows that forget
 * `flex-shrink: 0` get squashed (the filter bar once collapsed to 4px), and a
 * `min-height` floor on the growing row pushes it past the panel bottom.
 */
describe('error matrix flex chain', () => {
  const block = (selector: string): string => {
    const i = shadowStyles.indexOf(selector + ' {')
    expect(i, `missing ${selector}`).toBeGreaterThan(-1)
    return shadowStyles.slice(i, shadowStyles.indexOf('}', i))
  }

  it('keeps fixed rows from shrinking', () => {
    for (const sel of [
      '.dr-debug-err-header',
      '.dr-debug-matrix-toolbar',
      '.dr-debug-2d-matrix',
      '.dr-debug-err-filter-bar'
    ]) {
      expect(block(sel), `${sel} must not shrink`).toMatch(/flex-shrink:\s*0/)
    }
  })

  it('gives the growing row no height floor to overflow with', () => {
    const main = block('.dr-debug-err-main-view')
    expect(main).toMatch(/min-height:\s*0/)
    expect(main).toMatch(/flex:\s*1 1 0/)
  })

  it('lets the scrollable panes actually shrink', () => {
    expect(block('.dr-debug-error-dashboard')).toMatch(/min-height:\s*0/)
    expect(block('.dr-debug-err-list')).toMatch(/min-width:\s*0/)
  })
})
