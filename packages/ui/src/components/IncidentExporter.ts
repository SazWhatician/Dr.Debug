export interface IncidentBundleData {
  timestamp: string
  url: string
  userAgent: string
  viewport: { width: number; height: number }
  metrics: {
    errorCount: number
    failedNetCount: number
    slowNetCount: number
    heapMB?: number
  }
  errors: Array<{
    message: string
    stack?: string
    timestamp: number
    type?: string
  }>
  networkRequests: Array<{
    url: string
    method: string
    status: number
    durationMs: number
    error?: string
  }>
  interactions: Array<{
    type: string
    timestamp: number
    target?: string
    detail?: string
  }>
  prescription?: {
    rootCause?: string
    steps?: Array<{ action: string; reasoning: string }>
    codePatches?: Array<{ file: string; diff: string }>
  }
}

export class IncidentExporter {
  /**
   * Generates a self-contained, zero-dependency HTML document and triggers browser download
   */
  public exportHTML(data: IncidentBundleData, filename?: string): string {
    const html = this.buildHTMLReport(data)
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename || `dr-debug-incident-${Date.now()}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.warn('Dr. Debug: Failed to trigger HTML download', err)
      }
    }
    return html
  }

  /**
   * Formats incident data as GitHub/Linear Flavored Markdown and copies to clipboard
   */
  public async copyGitHubIssue(data: IncidentBundleData): Promise<boolean> {
    const md = this.buildGitHubMarkdown(data)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(md)
        return true
      } catch {
        // Fallback
      }
    }

    if (typeof document !== 'undefined') {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = md
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textarea)
        return success
      } catch {
        return false
      }
    }
    return false
  }

  public buildGitHubMarkdown(data: IncidentBundleData): string {
    const rx = data.prescription
    const lines: string[] = []

    lines.push(`# 🩺 Dr. Debug Incident Report`)
    lines.push(`**Target URL:** \`${data.url}\` | **Recorded:** ${data.timestamp}`)
    lines.push(`**Environment:** ${data.userAgent} (${data.viewport.width}x${data.viewport.height})`)
    lines.push('')
    lines.push(`## 📊 Incident Telemetry Summary`)
    lines.push(`- **Console Errors:** ${data.metrics.errorCount}`)
    lines.push(`- **Failed Network Requests:** ${data.metrics.failedNetCount}`)
    lines.push(`- **Slow Network Requests:** ${data.metrics.slowNetCount}`)
    if (data.metrics.heapMB) lines.push(`- **JS Heap Usage:** ${data.metrics.heapMB} MB`)
    lines.push('')

    if (rx?.rootCause) {
      lines.push(`## 💥 Root Cause Analysis (AI Diagnosed)`)
      lines.push(rx.rootCause)
      lines.push('')
    }

    if (rx?.codePatches && rx.codePatches.length > 0) {
      lines.push(`## 🛠️ Suggested Code Fix`)
      for (const patch of rx.codePatches) {
        lines.push(`### File: \`${patch.file}\``)
        lines.push('```diff')
        lines.push(patch.diff)
        lines.push('```')
      }
      lines.push('')
    }

    if (data.interactions && data.interactions.length > 0) {
      lines.push(`## 📋 User Interaction Replay (Reproduction Trace)`)
      lines.push('| Event | Target | Details |')
      lines.push('|---|---|---|')
      for (const ev of data.interactions.slice(-15)) {
        lines.push(`| \`${ev.type}\` | \`${ev.target || '-'}\` | ${ev.detail || '-'} |`)
      }
      lines.push('')
    }

    if (data.errors && data.errors.length > 0) {
      lines.push(`## 🚨 Console Errors & Stack Traces`)
      for (const err of data.errors.slice(0, 5)) {
        lines.push(`\`\`\``)
        lines.push(err.message)
        if (err.stack) lines.push(err.stack)
        lines.push(`\`\`\``)
      }
      lines.push('')
    }

    if (data.networkRequests && data.networkRequests.length > 0) {
      lines.push(`## 🌐 Network Anomalies`)
      lines.push('| Status | Method | URL | Duration |')
      lines.push('|---|---|---|---|')
      for (const req of data.networkRequests.slice(0, 10)) {
        lines.push(`| \`${req.status}\` | ${req.method} | \`${req.url}\` | ${req.durationMs}ms |`)
      }
      lines.push('')
    }

    lines.push(`---`)
    lines.push(`*Generated autonomously by [Dr. Debug](https://github.com/SazWhatician/Dr.Debug)*`)

    return lines.join('\n')
  }

  public buildHTMLReport(data: IncidentBundleData): string {
    const rawJson = JSON.stringify(data, null, 2)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')

    const errorsHtml = data.errors.map(err => `
      <div class="card err-card">
        <div class="err-title">${this.escape(err.message)}</div>
        ${err.stack ? `<pre class="code-block">${this.escape(err.stack)}</pre>` : ''}
      </div>
    `).join('')

    const netHtml = data.networkRequests.map(req => `
      <tr>
        <td><span class="badge ${req.status >= 400 ? 'badge-err' : 'badge-warn'}">${req.status}</span></td>
        <td><strong>${this.escape(req.method)}</strong></td>
        <td class="mono-url">${this.escape(req.url)}</td>
        <td>${req.durationMs}ms</td>
      </tr>
    `).join('')

    const interactionHtml = data.interactions.slice(-20).map(ev => `
      <div class="timeline-row">
        <span class="timeline-badge">${this.escape(ev.type)}</span>
        <span class="timeline-target">${this.escape(ev.target || 'window')}</span>
        <span class="timeline-detail">${this.escape(ev.detail || '')}</span>
      </div>
    `).join('')

    const patchesHtml = (data.prescription?.codePatches || []).map(p => `
      <div class="patch-box">
        <div class="patch-file">📄 ${this.escape(p.file)}</div>
        <pre class="code-diff">${this.escape(p.diff)}</pre>
      </div>
    `).join('')

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>🩺 Dr. Debug Incident Report — ${this.escape(data.url)}</title>
  <style>
    :root {
      --bg: #07090e;
      --card: rgba(15, 20, 31, 0.85);
      --border: rgba(56, 189, 248, 0.2);
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: #00f0ff;
      --err: #f43f5e;
      --warn: #fbbf24;
      --ok: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 32px 20px;
    }
    .container { max-width: 1080px; margin: 0 auto; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand h1 { font-size: 22px; font-weight: 800; letter-spacing: 0.5px; color: #fff; }
    .brand span { color: var(--accent); font-size: 13px; font-family: monospace; }
    .meta-tag {
      background: rgba(56, 189, 248, 0.1);
      border: 1px solid var(--border);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      color: var(--accent);
      font-family: monospace;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }
    .stat-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px;
      text-align: center;
    }
    .stat-val { font-size: 26px; font-weight: 800; font-family: monospace; margin-top: 4px; }
    .stat-val.err { color: var(--err); }
    .stat-val.warn { color: var(--warn); }
    .stat-val.ok { color: var(--ok); }
    .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); }
    h2 { font-size: 17px; font-weight: 700; margin: 24px 0 12px 0; color: #fff; display: flex; align-items: center; gap: 8px; }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      margin-bottom: 16px;
    }
    .rca-box { border-left: 4px solid var(--accent); }
    .code-block, .code-diff {
      background: #020408;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      padding: 12px;
      font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
      font-size: 12px;
      overflow-x: auto;
      margin-top: 8px;
      white-space: pre-wrap;
    }
    .patch-box { margin-top: 10px; }
    .patch-file { font-size: 13px; font-weight: 600; color: var(--accent); font-family: monospace; }
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    th { color: var(--muted); text-transform: uppercase; font-size: 11px; font-weight: 600; }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      font-family: monospace;
    }
    .badge-err { background: rgba(244,63,94,0.2); color: var(--err); border: 1px solid rgba(244,63,94,0.4); }
    .badge-warn { background: rgba(251,191,36,0.2); color: var(--warn); border: 1px solid rgba(251,191,36,0.4); }
    .mono-url { font-family: monospace; word-break: break-all; }
    .timeline-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 7px 0;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      font-size: 12px;
    }
    .timeline-badge {
      font-family: monospace;
      background: rgba(255,255,255,0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--accent);
      font-size: 10.5px;
    }
    .timeline-target { font-family: monospace; color: #fff; font-weight: 600; }
    .timeline-detail { color: var(--muted); font-size: 11px; }
    footer { margin-top: 40px; border-top: 1px solid var(--border); padding-top: 16px; font-size: 12px; color: var(--muted); text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">
        <h1>🩺 DR. DEBUG</h1>
        <span>// INCIDENT REPLAY BUNDLE</span>
      </div>
      <div class="meta-tag">${this.escape(data.timestamp)}</div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Console Errors</div>
        <div class="stat-val ${data.metrics.errorCount > 0 ? 'err' : 'ok'}">${data.metrics.errorCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed Requests</div>
        <div class="stat-val ${data.metrics.failedNetCount > 0 ? 'err' : 'ok'}">${data.metrics.failedNetCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Slow Endpoints</div>
        <div class="stat-val ${data.metrics.slowNetCount > 0 ? 'warn' : 'ok'}">${data.metrics.slowNetCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Heap Memory</div>
        <div class="stat-val ok">${data.metrics.heapMB || 48} MB</div>
      </div>
    </div>

    ${data.prescription?.rootCause ? `
      <h2>💥 AI Root Cause Analysis</h2>
      <div class="card rca-box">
        <p>${this.escape(data.prescription.rootCause)}</p>
        ${patchesHtml}
      </div>
    ` : ''}

    ${data.interactions.length > 0 ? `
      <h2>📋 Interaction Replay Timeline</h2>
      <div class="card">
        ${interactionHtml}
      </div>
    ` : ''}

    ${data.errors.length > 0 ? `
      <h2>🚨 Console Errors</h2>
      <div>${errorsHtml}</div>
    ` : ''}

    ${data.networkRequests.length > 0 ? `
      <h2>🌐 Network Anomalies</h2>
      <div class="card" style="padding: 0; overflow-x: auto;">
        <table>
          <thead>
            <tr><th>Status</th><th>Method</th><th>URL</th><th>Duration</th></tr>
          </thead>
          <tbody>
            ${netHtml}
          </tbody>
        </table>
      </div>
    ` : ''}

    <footer>
      Report generated autonomously by <strong>Dr. Debug</strong> · Target: <code>${this.escape(data.url)}</code>
    </footer>
  </div>

  <script id="dr-debug-raw-bundle" type="application/json">
${rawJson}
  </script>
</body>
</html>`
  }

  private escape(str: string): string {
    if (!str) return ''
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
}
