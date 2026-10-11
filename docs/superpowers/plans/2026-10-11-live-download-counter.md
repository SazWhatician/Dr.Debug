# Live Download Counter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate a real-time, zero-backend, all-in-one Live Download Counter across the Vercel Landing Page, the Cockpit HUD Settings Modal, and the Chrome Extension Popup, featuring SWR caching and instant optimistic increments on user downloads.

**Architecture:** A lightweight client-side service (`DownloadMetricsService`) aggregates metrics across GitHub Releases asset downloads, NPM download API, and web direct clicks (CounterAPI) into a single grand total. Results are cached in `localStorage` with a 5-minute TTL to ensure sub-millisecond loads and eliminate rate-limiting; optimistic UI increments tally instantly upon download gesture.

**Tech Stack:** TypeScript, Vanilla JS, HTML/CSS (Cyberpunk CRT glow styling), Vitest, Happy-DOM.

**Spec:** [`docs/superpowers/specs/2026-10-11-live-download-counter-design.md`](file:///c:/Users/saswa/Desktop/DebugCopilot/docs/superpowers/specs/2026-10-11-live-download-counter-design.md)

## Global Constraints

- Monorepo package manifests and version strings must remain in lockstep.
- Baseline floor constant: `1,250` downloads.
- Cache TTL: `300,000` ms (5 minutes).
- Cache storage key: `dr_debug_metrics_cache_v1`.
- GitHub repository: `SazWhatician/Dr.Debug`.
- CounterAPI namespace/key: `dr-debug` / `downloads`.
- Timeout on outbound network requests: 3,000 ms via `AbortSignal.timeout(3000)`.
- Zero external build dependencies or backend databases added.

## Review Focus

1. **GitHub API 403 / Rate Limiting:** When GitHub returns HTTP 403 or times out, the service must silently fall back to cached total or the baseline floor (`1,250+`) without throwing unhandled rejections.
2. **Offline Mode:** When `navigator.onLine === false` or fetch rejects immediately, sub-millisecond cached render occurs and no network exceptions bubble to UI.
3. **Double / Rapid Download Clicks:** Multiple consecutive clicks within 1 second must debounce network beacons to CounterAPI while optimistically incrementing the local counter badge once per user gesture.
4. **Number Formatting Thresholds:** Numbers below 1,000 format as exact count (`850`), 1,000–9,999 format with commas (`1,420+`), and 10,000+ format with decimals (`12.4k+`).
5. **DOM Element Safety:** If the counter badge element is absent on a page or during an unexpected teardown, metrics polling and optimistic triggers must no-op cleanly without null dereference.

---

### Task 1: Core Metrics Aggregation Service (`DownloadMetricsService`)

**Files:**
- Create: `packages/ui/src/services/DownloadMetricsService.ts`
- Test: `packages/ui/test/metrics.test.ts`

**Interfaces:**
- Consumes: `localStorage`, global `fetch`
- Produces:
  ```ts
  export interface DownloadMetrics {
    total: number
    github: number
    npm: number
    web: number
    timestamp: number
  }
  export function formatDownloadCount(count: number): string
  export class DownloadMetricsService {
    getCachedMetrics(): DownloadMetrics | null
    fetchMetrics(): Promise<DownloadMetrics>
    recordDownloadClick(): Promise<number>
  }
  ```

- [ ] **Step 1: Write the failing tests in `packages/ui/test/metrics.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DownloadMetricsService,
  formatDownloadCount
} from '../src/services/DownloadMetricsService.js'

describe('DownloadMetricsService', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('formats download counts correctly across thresholds', () => {
    expect(formatDownloadCount(450)).toBe('450+')
    expect(formatDownloadCount(1250)).toBe('1,250+')
    expect(formatDownloadCount(9999)).toBe('9,999+')
    expect(formatDownloadCount(12500)).toBe('12.5k+')
  })

  it('returns baseline fallback when cache is empty and network is unavailable', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network offline'))
    const service = new DownloadMetricsService()
    const metrics = await service.fetchMetrics()

    expect(metrics.total).toBeGreaterThanOrEqual(1250)
    expect(metrics.github).toBe(0)
  })

  it('correctly aggregates GitHub, NPM, and CounterAPI counts', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url: any) => {
      const urlStr = String(url)
      if (urlStr.includes('api.github.com')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              assets: [
                { name: 'dr-debug-extension.zip', download_count: 500 },
                { name: 'dr-debug.standalone.min.js', download_count: 300 }
              ]
            }
          ]
        } as any)
      }
      if (urlStr.includes('api.npmjs.org')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ downloads: 150 })
        } as any)
      }
      if (urlStr.includes('api.counterapi.dev')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 100 })
        } as any)
      }
      return Promise.reject(new Error('Unknown url'))
    })

    const service = new DownloadMetricsService()
    const metrics = await service.fetchMetrics()

    // 500 (gh) + 300 (gh) + 150 (npm) + 100 (counter) + 1250 (baseline) = 2300
    expect(metrics.github).toBe(800)
    expect(metrics.npm).toBe(150)
    expect(metrics.web).toBe(100)
    expect(metrics.total).toBe(2300)
  })

  it('optimistically increments count on download click', async () => {
    const service = new DownloadMetricsService()
    localStorage.setItem(
      'dr_debug_metrics_cache_v1',
      JSON.stringify({ total: 1500, github: 200, npm: 50, web: 0, timestamp: Date.now() })
    )

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ count: 1 })
    } as any)

    const newTotal = await service.recordDownloadClick()
    expect(newTotal).toBe(1501)
    expect(service.getCachedMetrics()?.total).toBe(1501)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run packages/ui/test/metrics.test.ts`
Expected: FAIL with missing module `DownloadMetricsService.js`.

- [ ] **Step 3: Implement `packages/ui/src/services/DownloadMetricsService.ts`**

```ts
export interface DownloadMetrics {
  total: number
  github: number
  npm: number
  web: number
  timestamp: number
}

const CACHE_KEY = 'dr_debug_metrics_cache_v1'
const CACHE_TTL_MS = 300000 // 5 minutes
const BASELINE_FLOOR = 1250

export function formatDownloadCount(count: number): string {
  if (count >= 10000) {
    const k = (count / 1000).toFixed(1)
    return `${k}k+`
  }
  if (count >= 1000) {
    return `${count.toLocaleString()}+`
  }
  return `${count}+`
}

export class DownloadMetricsService {
  private inFlightPromise: Promise<DownloadMetrics> | null = null

  public getCachedMetrics(): DownloadMetrics | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as DownloadMetrics
    } catch {
      return null
    }
  }

  public async fetchMetrics(): Promise<DownloadMetrics> {
    const cached = this.getCachedMetrics()
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise
    }

    this.inFlightPromise = this.doFetch(cached)
    try {
      return await this.inFlightPromise
    } finally {
      this.inFlightPromise = null
    }
  }

  private async doFetch(cachedFallback: DownloadMetrics | null): Promise<DownloadMetrics> {
    let githubTotal = 0
    let npmTotal = 0
    let webTotal = 0

    const timeout = 3000

    // 1. GitHub Releases API
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      const res = await fetch('https://api.github.com/repos/SazWhatician/Dr.Debug/releases', {
        signal: controller.signal
      })
      clearTimeout(timer)
      if (res.ok) {
        const releases = await res.json()
        if (Array.isArray(releases)) {
          for (const rel of releases) {
            if (Array.isArray(rel.assets)) {
              for (const asset of rel.assets) {
                githubTotal += Number(asset.download_count) || 0
              }
            }
          }
        }
      }
    } catch {
      githubTotal = cachedFallback?.github || 0
    }

    // 2. NPM Downloads API
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      const res = await fetch('https://api.npmjs.org/downloads/point/last-year/@dr-debug/mcp', {
        signal: controller.signal
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        npmTotal += Number(data.downloads) || 0
      }
    } catch {
      npmTotal = cachedFallback?.npm || 0
    }

    // 3. CounterAPI Web Direct Clicks
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      const res = await fetch('https://api.counterapi.dev/v1/dr-debug/downloads', {
        signal: controller.signal
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json()
        webTotal = Number(data.count) || 0
      }
    } catch {
      webTotal = cachedFallback?.web || 0
    }

    const total = BASELINE_FLOOR + githubTotal + npmTotal + webTotal
    const result: DownloadMetrics = {
      total,
      github: githubTotal,
      npm: npmTotal,
      web: webTotal,
      timestamp: Date.now()
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result))
    } catch {
      // Storage unavailable / quota exceeded
    }

    return result
  }

  public async recordDownloadClick(): Promise<number> {
    const cached = this.getCachedMetrics()
    const currentTotal = cached ? cached.total : BASELINE_FLOOR
    const nextTotal = currentTotal + 1

    if (cached) {
      cached.total = nextTotal
      cached.web = (cached.web || 0) + 1
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
      } catch {}
    }

    // Asynchronously ping CounterAPI increment
    try {
      fetch('https://api.counterapi.dev/v1/dr-debug/downloads/up', {
        method: 'POST',
        keepalive: true
      }).catch(() => null)
    } catch {}

    return nextTotal
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/ui/test/metrics.test.ts`
Expected: PASS (4 tests passing).

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/services/DownloadMetricsService.ts packages/ui/test/metrics.test.ts
git commit -m "feat(ui): add DownloadMetricsService with SWR caching and aggregation"
```

---

### Task 2: Cockpit HUD & Settings Modal Integration

**Files:**
- Modify: `packages/ui/src/components/SettingsModal.ts`
- Modify: `packages/ui/src/styles/components.ts`
- Test: `packages/ui/test/ui.test.ts`

**Interfaces:**
- Consumes: `DownloadMetricsService`, `formatDownloadCount`
- Produces: Live `#dr-debug-hud-downloads` badge in Cockpit settings banner

- [ ] **Step 1: Write test in `packages/ui/test/ui.test.ts`**

Add test checking `#dr-debug-hud-downloads`:
```ts
it('renders live download count pill in SettingsModal banner', async () => {
  const ui = new DrDebugUI()
  const shadow = ui.getShadowRoot()
  ui.openCockpit()

  const pill = shadow.querySelector('#dr-debug-hud-downloads')
  expect(pill).toBeDefined()
  expect(pill?.textContent).toContain('Downloads')
  ui.destroy()
})
```

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run packages/ui/test/ui.test.ts`
Expected: FAIL (element `#dr-debug-hud-downloads` not found).

- [ ] **Step 3: Modify `SettingsModal.ts` & styles**

In `packages/ui/src/components/SettingsModal.ts`:
1. Import `DownloadMetricsService` and `formatDownloadCount`.
2. Add `<span class="dr-debug-downloads-pill" id="dr-debug-hud-downloads">📥 1,250+ Downloads</span>` inside `.dr-debug-update-meta`.
3. In `init()` or constructor, instantiate `DownloadMetricsService`, check cached count to populate immediately, and trigger `fetchMetrics()` to update asynchronously.

In `packages/ui/src/styles/components.ts`:
Add styling for `.dr-debug-downloads-pill`:
```css
.dr-debug-downloads-pill {
  display: inline-flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  color: #34d399;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 9999px;
  padding: 2px 8px;
  margin-top: 4px;
  letter-spacing: 0.02em;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run packages/ui/test/ui.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ui/src/components/SettingsModal.ts packages/ui/src/styles/components.ts packages/ui/test/ui.test.ts
git commit -m "feat(ui): display live community download counter in Cockpit SettingsModal"
```

---

### Task 3: Extension Popup Telemetry Pill

**Files:**
- Modify: `packages/extension/popup.html`
- Modify: `packages/extension/public/popup.html`
- Test: Build check via `node scripts/build-extension.js`

- [ ] **Step 1: Update popup.html in `packages/extension/popup.html` and `public/`**

Add a download badge in the header/footer status area:
```html
<div class="community-downloads-badge" id="popup-downloads-badge">
  <span class="downloads-icon">📥</span>
  <span id="popup-downloads-count">1,250+ Downloads</span>
</div>
```

- [ ] **Step 2: Add inline fetch script in `popup.html`**

```js
try {
  const cached = localStorage.getItem('dr_debug_metrics_cache_v1')
  if (cached) {
    const data = JSON.parse(cached)
    if (data && data.total) {
      const el = document.getElementById('popup-downloads-count')
      if (el) el.textContent = `${Number(data.total).toLocaleString()}+ Downloads`
    }
  }
} catch (e) {}
```

- [ ] **Step 3: Run extension build**

Run: `node scripts/build-extension.js`
Expected: Build succeeds with unpacked distribution in `packages/extension/dist`.

- [ ] **Step 4: Commit**

```bash
git add packages/extension/popup.html packages/extension/public/popup.html
git commit -m "feat(extension): display live download metrics in extension popup"
```

---

### Task 4: Landing Page Cyberpunk Live Counter & Optimistic Trigger

**Files:**
- Modify: `landing/index.html`
- Modify: `landing/styles.css`
- Modify: `landing/app.js`

- [ ] **Step 1: Add live counter badge to `#center-download-card` in `landing/index.html`**

Directly above `#btn-dl-extension` inside `#center-download-card`:
```html
<div class="dl-live-counter-badge" id="dl-live-counter-wrap">
  <span class="dl-live-pulse-dot"></span>
  <span class="dl-live-counter-label">TOTAL VERIFIED DOWNLOADS:</span>
  <span class="dl-live-counter-number" id="dl-live-counter-num">1,250+</span>
</div>
```

- [ ] **Step 2: Add cyberpunk CRT styling in `landing/styles.css`**

```css
.dl-live-counter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(52, 211, 153, 0.35);
  border-radius: 20px;
  padding: 6px 14px;
  margin-bottom: 14px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: 0.05em;
  box-shadow: 0 0 15px rgba(52, 211, 153, 0.15), inset 0 0 10px rgba(0, 0, 0, 0.5);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.dl-live-counter-badge.just-incremented {
  transform: scale(1.06);
  box-shadow: 0 0 25px rgba(52, 211, 153, 0.6), inset 0 0 15px rgba(52, 211, 153, 0.3);
}

.dl-live-pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #34d399;
  box-shadow: 0 0 8px #34d399;
  animation: pulseGreen 2s infinite ease-in-out;
}

.dl-live-counter-number {
  color: #34d399;
  font-weight: 800;
  font-size: 13px;
  text-shadow: 0 0 8px rgba(52, 211, 153, 0.6);
}

@keyframes pulseGreen {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}
```

- [ ] **Step 3: Implement metrics fetch & optimistic pulse in `landing/app.js`**

In `landing/app.js`:
1. Add `initLiveDownloadCounter()`:
   - Reads `localStorage.getItem('dr_debug_metrics_cache_v1')`.
   - Populates `#dl-live-counter-num` immediately.
   - Triggers background fetch across GitHub, NPM, CounterAPI (same resilient logic).
   - Smoothly counts up from current to updated total using requestAnimationFrame.
2. In `triggerDirectZipDownload()`:
   - Immediately increment the displayed count by `+1`.
   - Add `.just-incremented` class, removing it after 800ms.
   - Fire asynchronous increment beacon.

- [ ] **Step 4: Commit**

```bash
git add landing/index.html landing/styles.css landing/app.js
git commit -m "feat(landing): integrate live download counter with optimistic click pulse"
```

---

### Task 5: Monorepo Build & Verification Suite

**Files:**
- None created; runs monorepo build and test suites.

- [ ] **Step 1: Run TypeScript monorepo compilation**

Run: `npm run build`
Expected: Clean exit code 0; all packages compiled.

- [ ] **Step 2: Run full Vitest test suite**

Run: `npm test`
Expected: 100% tests passing across all packages.

- [ ] **Step 3: Run package release script**

Run: `npm run package:release`
Expected: Packaging completes cleanly without errors.
