import type { DiagnosticTool, ToolContext } from '../types.js'

export const inspectElementTool: DiagnosticTool = {
  name: 'inspect_element',
  description: 'Inspects a live DOM element using a CSS selector. Returns dimensions, visibility, computed styles, attributes, and text content.',
  parameters: {
    type: 'object',
    properties: {
      selector: {
        type: 'string',
        description: 'CSS selector of the DOM element to inspect (e.g. "#checkout-btn", ".modal-error").'
      }
    },
    required: ['selector']
  },
  async execute(args: { selector: string }, _context: ToolContext): Promise<string> {
    if (typeof document === 'undefined') {
      return 'DOM document is not available in this environment.'
    }

    try {
      const el = document.querySelector(args.selector)
      if (!el) {
        return `Element matching selector "${args.selector}" was not found in the DOM.`
      }

      const rect = el.getBoundingClientRect()
      const computed = typeof window !== 'undefined' && window.getComputedStyle ? window.getComputedStyle(el) : null

      const result = {
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        isVisible: rect.width > 0 && rect.height > 0,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        styles: computed
          ? {
              display: computed.display,
              visibility: computed.visibility,
              opacity: computed.opacity,
              position: computed.position,
              zIndex: computed.zIndex
            }
          : undefined,
        textContent: (el.textContent || '').trim().slice(0, 300)
      }

      return JSON.stringify(result, null, 2)
    } catch (err: any) {
      return `Failed to inspect element "${args.selector}": ${err.message}`
    }
  }
}
