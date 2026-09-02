/**
 * Dr. Debug Standalone In-Browser Distribution Bundle
 *
 * Created by Saswat Mohanty (@SazWhatician)
 * GitHub: https://github.com/SazWhatician
 * LinkedIn: https://www.linkedin.com/in/saswat-mohanty-0a4549331/
 */
import { DrDebug } from './DrDebug.js'

declare global {
  interface Window {
    DrDebug: typeof DrDebug
    __DR_DEBUG__?: DrDebug
  }
}

if (typeof window !== 'undefined') {
  window.DrDebug = DrDebug

  // Auto-initialize unless explicitly disabled via data-auto="false"
  const currentScript = document.currentScript
  const autoInit = !currentScript || currentScript.getAttribute('data-auto') !== 'false'

  if (autoInit && !window.__DR_DEBUG__) {
    const apiKey = currentScript?.getAttribute('data-api-key') || undefined
    const model = currentScript?.getAttribute('data-model') || undefined
    window.__DR_DEBUG__ = new DrDebug({
      apiKey,
      model,
      enableUI: true,
      enableMCP: true,
      enableDocker: true
    })
    console.log(
      '%c🩺 Dr. Debug Initialized %cby Saswat Mohanty (@SazWhatician) · https://github.com/SazWhatician',
      'background: #0284c7; color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-size: 11px;',
      'color: #38bdf8; font-size: 11px; font-weight: 500;'
    )
  }
}

export { DrDebug }
export default DrDebug
