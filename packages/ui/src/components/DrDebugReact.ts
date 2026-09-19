/**
 * Dr. Debug React Layout Component & Universal SPA Initializer
 *
 * Provides a zero-friction drop-in component and singleton initializer
 * for Next.js App Router (app/layout.tsx), Pages Router (_app.tsx),
 * Remix (root.tsx), Vite React, and SPA layouts.
 */

export interface DrDebugReactProps {
  apiKey?: string
  model?: string
  baseURL?: string
  provider?: string
  enableUI?: boolean
  autoInvestigate?: boolean
  enableDocker?: boolean
  enableMCP?: boolean
  mcpPort?: number
  container?: HTMLElement
  [key: string]: any
}

/**
 * Universal React Component for Dr. Debug HUD.
 * Safe for SSR (Next.js server components / SSR frameworks).
 * Drop into layout.tsx or App.tsx:
 *
 * ```tsx
 * import { DrDebugCockpit } from 'dr-debug'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         {children}
 *         <DrDebugCockpit />
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function DrDebugCockpit(props: DrDebugReactProps = {}): null {
  if (typeof window === 'undefined') return null

  // Ensure singleton initialization on the client
  try {
    const win = window as any
    if (!win.__DR_DEBUG__) {
      if (typeof win.DrDebug === 'function') {
        win.__DR_DEBUG__ = new win.DrDebug(props)
      }
    } else if (win.__DR_DEBUG__.getUI) {
      // Re-verify host DOM attachment on component render / route transition
      win.__DR_DEBUG__.getUI()?.ensureHostAttached?.()
    }
  } catch {
    // Non-blocking fallback
  }

  return null
}

export const DrDebugReact = DrDebugCockpit
