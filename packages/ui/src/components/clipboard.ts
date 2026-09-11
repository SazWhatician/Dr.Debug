/**
 * Resilient cross-browser clipboard utility for Shadow DOM and extension environments.
 * Handles un-focused document rejections by falling back to execCommand.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof text !== 'string') return false

  // 1. Primary path: Modern Async Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // Document may not be focused or permission denied in Shadow DOM/extension
    }
  }

  // 2. Resilient fallback: Hidden textarea with execCommand
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      textarea.style.top = '-9999px'
      textarea.style.opacity = '0'
      textarea.style.pointerEvents = 'none'
      textarea.setAttribute('aria-hidden', 'true')
      textarea.setAttribute('tabindex', '-1')

      const host = document.body || document.documentElement
      host.appendChild(textarea)

      // Focus and select range
      textarea.focus({ preventScroll: true })
      textarea.select()
      textarea.setSelectionRange(0, text.length)

      const success = document.execCommand('copy')
      host.removeChild(textarea)
      if (success) return true
    } catch {
      // Fallback failed
    }
  }

  return false
}

export interface BindCopyOptions {
  successText?: string
  durationMs?: number
}

/**
 * Wires a copy button with guaranteed execution and instant visual feedback.
 */
export function bindCopyButton(
  button: HTMLElement,
  getText: () => string | Promise<string>,
  options: BindCopyOptions = {}
): () => void {
  const duration = options.durationMs ?? 2000
  let isBusy = false

  const handler = async (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    if (isBusy) return
    isBusy = true

    try {
      const text = await Promise.resolve(getText())
      const ok = await copyToClipboard(text)

      if (ok) {
        const originalText = button.textContent || ''
        const originalHtml = button.innerHTML
        const successLabel = options.successText || 'Copied!'

        button.classList.add('copied')
        if (button.querySelector('span')) {
          const span = button.querySelector('span')!
          span.textContent = successLabel
        } else {
          button.textContent = successLabel
        }

        setTimeout(() => {
          button.classList.remove('copied')
          button.innerHTML = originalHtml
          if (!button.querySelector('span') && originalText) {
            button.textContent = originalText
          }
          isBusy = false
        }, duration)
      } else {
        isBusy = false
      }
    } catch {
      isBusy = false
    }
  }

  button.addEventListener('click', handler)
  return () => button.removeEventListener('click', handler)
}
