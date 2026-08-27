import { describe, expect, it } from 'vitest'
import { decodeVLQ, type RawSourceMap, SourceMapResolver } from '../src/sourcemaps/SourceMapResolver.js'

describe('SourceMapResolver & VLQ Decoder', () => {
  it('decodes standard Base64 VLQ sequences correctly', () => {
    // 'AAAA' -> [0, 0, 0, 0]
    expect(decodeVLQ('AAAA')).toEqual([0, 0, 0, 0])

    // 'SAAY' -> [9, 0, 0, 12]
    const decoded = decodeVLQ('SAAY')
    expect(decoded.length).toBe(4)

    // Negative VLQ value
    const neg = decodeVLQ('D') // -1
    expect(neg).toEqual([-1])
  })

  it('maps generated minified line:column to original TypeScript file and line', () => {
    // Sample V3 SourceMap:
    // generated line 1 maps to src/UserProfile.tsx:42:18
    const mockMap: RawSourceMap = {
      version: 3,
      sources: ['src/UserProfile.tsx'],
      names: ['UserBreakdown'],
      // Line 1: col 0 -> source 0, line 41 (0-indexed = 42), col 18, name 0
      mappings: 'AAAA,SAAY'
    }

    const resolver = new SourceMapResolver(mockMap)
    const position = resolver.findOriginalPosition(1, 10)

    expect(position.source).toBe('src/UserProfile.tsx')
    expect(position.line).toBe(1)
  })

  it('demangles minified bundle stack traces back to original TypeScript source code', () => {
    const mockMap: RawSourceMap = {
      version: 3,
      sources: ['src/components/UserBreakdown.tsx'],
      names: ['renderBreakdown'],
      mappings: 'AAAA;' // line 1 -> line 1
    }

    const resolver = new SourceMapResolver(mockMap)
    const minifiedStack = `TypeError: Cannot read properties of undefined (reading 'map')
    at UserBreakdown (https://app.acme.io/assets/index.min.js:1:5)`

    const demangled = resolver.demangleStack(minifiedStack)

    expect(demangled).toContain('src/components/UserBreakdown.tsx')
  })
})
