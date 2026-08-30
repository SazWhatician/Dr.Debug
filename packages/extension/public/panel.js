let lastRCA = null
let lastGraph = null
let currentSnapshot = null

function updateStreams() {
  if (typeof chrome === 'undefined' || !chrome.devtools?.inspectedWindow) return
  const tabId = chrome.devtools.inspectedWindow.tabId
  chrome.tabs.sendMessage(tabId, { type: 'DR_DEBUG_GET_LIVE_TELEMETRY' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.snapshot) return
    const snapshot = response.snapshot
    currentSnapshot = snapshot

    // 1. Docker Stream
    const dockerEl = document.getElementById('docker-stream')
    const dockerCount = document.getElementById('docker-count')
    const dockerLogs = snapshot.docker?.logs || snapshot.telemetry?.docker || []
    if (dockerEl) {
      if (dockerLogs.length > 0) {
        dockerEl.textContent = dockerLogs
          .slice(-30)
          .map((d) => {
            const level = (d.level || 'INFO').toUpperCase()
            const container = d.containerName || 'default'
            return `[${container}] [${level}] ${d.message}`
          })
          .join('\n')
      } else {
        dockerEl.textContent = 'No Docker container logs recorded.'
      }
    }
    if (dockerCount) {
      const containerCount = snapshot.docker?.containers?.length || 0
      const errorCount = snapshot.docker?.errorCount || 0
      dockerCount.textContent = `${containerCount} Containers / ${errorCount} Errors`
    }

    // 2. Network Stream
    const networkEl = document.getElementById('network-stream')
    const networkCount = document.getElementById('network-count')
    const networkRecords = snapshot.network?.records || snapshot.telemetry?.network || []
    if (networkEl) {
      if (networkRecords.length > 0) {
        networkEl.textContent = networkRecords
          .slice(-30)
          .map((n) => {
            const status = n.status ? `[${n.status}]` : 'pending'
            const dur = n.duration !== undefined ? `${n.duration}ms` : ''
            const flag = n.isFailed ? ' ❌' : n.isSlow ? ' ⚠️' : ' ✅'
            return `[${n.method}] ${n.url} ${status} ${dur}${flag}`
          })
          .join('\n')
      } else {
        networkEl.textContent = 'No network events recorded.'
      }
    }
    if (networkCount && snapshot.network) {
      networkCount.textContent = `${snapshot.network.failedCount || 0} Failed / ${snapshot.network.slowCount || 0} Slow`
    }

    // 3. Console Stream
    const consoleEl = document.getElementById('console-stream')
    const consoleCount = document.getElementById('console-count')
    const consoleEntries = snapshot.console?.entries || snapshot.telemetry?.console || []
    if (consoleEl) {
      if (consoleEntries.length > 0) {
        consoleEl.textContent = consoleEntries
          .slice(-30)
          .map((c) => {
            const level = (c.level || c.type || 'LOG').toUpperCase()
            const msg = c.message || (c.args ? c.args.join(' ') : '')
            return `[${level}] ${msg}`
          })
          .join('\n')
      } else {
        consoleEl.textContent = 'No console events recorded.'
      }
    }
    if (consoleCount && snapshot.console) {
      consoleCount.textContent = `${snapshot.console.errorCount || 0} Errors / ${snapshot.console.warnCount || 0} Warnings`
    }

    // 4. Errors & Diagnostics Matrix (with 1-Click Claude / Antigravity copy)
    renderErrorMatrix(snapshot)

    // 5. Causal Error Graph
    const graphContainer = document.getElementById('causal-graph-container')
    const graphMeta = document.getElementById('graph-meta')
    if (snapshot.causalGraph) {
      lastGraph = snapshot.causalGraph
      const { nodes, edges, rootCauseNodeId } = snapshot.causalGraph
      if (graphMeta) {
        graphMeta.textContent = `${nodes.length} Nodes / ${edges.length} Causal Links`
      }
      if (graphContainer) {
        if (nodes.length === 0) {
          graphContainer.innerHTML = `<div style="font-size: 12px; color: #34d399;">🟢 Healthy: No error nodes or causal links detected.</div>`
        } else {
          let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`
          if (rootCauseNodeId) {
            const root = nodes.find((n) => n.id === rootCauseNodeId)
            if (root) {
              html += `<div style="padding: 6px 10px; background: rgba(244,63,94,0.15); border: 1px solid #f43f5e; border-radius: 6px; font-size: 12px; color: #ffe4e6;"><strong>🎯 Primary Root Cause:</strong> [${root.layer.toUpperCase()}] ${root.label} - <em>${root.summary}</em></div>`
            }
          }
          if (edges.length > 0) {
            html += `<div style="font-size: 11.5px; color: #94a3b8; font-weight: 600; margin-top: 4px;">Detected Causal Chains:</div>`
            edges.forEach((e, idx) => {
              const src = nodes.find((n) => n.id === e.source)
              const tgt = nodes.find((n) => n.id === e.target)
              html += `<div style="font-family: 'Fira Code', monospace; font-size: 11px; color: #cbd5e1; background: rgba(15,23,42,0.8); padding: 4px 8px; border-radius: 4px; border-left: 2px solid #00f0ff;">${idx + 1}. [${src?.layer || 'source'}] ${src?.label || e.source} ➔ [${tgt?.layer || 'target'}] ${tgt?.label || e.target} <span style="color:#00f0ff">(${e.label})</span></div>`
            })
          } else {
            html += `<div style="font-size: 11.5px; color: #94a3b8;">(${nodes.length} isolated error events recorded without direct causal cascade)</div>`
          }
          html += `</div>`
          graphContainer.innerHTML = html
        }
      }
    }
  })
}

function generateExtensionCurl(req) {
  const parts = ['curl']
  const method = (req.method || 'GET').toUpperCase()
  if (method !== 'GET') parts.push(`-X ${method}`)
  parts.push(`'${req.url}'`)
  if (req.requestHeaders) {
    for (const [key, val] of Object.entries(req.requestHeaders)) {
      if (key.toLowerCase() === 'host') continue
      parts.push(`-H '${key}: ${String(val).replace(/'/g, "'\\''")}'`)
    }
  }
  if (req.requestBodyPreview && method !== 'GET' && method !== 'HEAD') {
    parts.push(`--data-raw '${req.requestBodyPreview.replace(/'/g, "'\\''")}'`)
  }
  return parts.join(' \\\n  ')
}

function renderErrorMatrix(snapshot) {
  const container = document.getElementById('error-matrix-container')
  const countEl = document.getElementById('error-matrix-count')
  if (!container) return

  const errors = []

  // Failed network
  const failedNet = (snapshot.network?.records || []).filter((r) => r.isFailed || (r.status && r.status >= 400))
  failedNet.forEach((r) => {
    errors.push({
      id: r.id,
      type: r.status && r.status >= 500 ? '5xx' : '4xx',
      badge: `HTTP ${r.status || 'ERR'}`,
      title: `${r.method} ${r.url}`,
      subtitle: `Duration: ${r.duration || 0}ms · Status: ${r.status || 0} ${r.statusText || ''}`,
      payload: r.requestBodyPreview,
      reqHeaders: r.requestHeaders,
      resHeaders: r.responseHeaders,
      response: r.responseBodyPreview || r.error,
      raw: r
    })
  })

  // Console errors
  const consoleErrs = (snapshot.console?.entries || []).filter((e) => e.level === 'error')
  consoleErrs.forEach((e) => {
    errors.push({
      id: e.id,
      type: 'console',
      badge: e.type,
      title: e.message,
      subtitle: `Occurrences: ${e.count}`,
      stack: e.stack,
      raw: e
    })
  })

  // Docker errors
  const dockerErrs = (snapshot.docker?.logs || []).filter((d) => d.level === 'error')
  dockerErrs.forEach((d) => {
    errors.push({
      id: d.id,
      type: 'docker',
      badge: `Docker [${d.containerName}]`,
      title: d.message,
      subtitle: `Stream: ${d.stream}`,
      raw: d
    })
  })

  if (countEl) countEl.textContent = `${errors.length} Recorded Errors`

  if (errors.length === 0) {
    container.innerHTML = `<div style="font-size:12px; color:#34d399; text-align:center; padding:16px;">Zero errors recorded across Network, Console, and Docker.</div>`
    return
  }

  container.innerHTML = ''
  errors.forEach((err) => {
    const card = document.createElement('div')
    card.style.cssText = 'background:rgba(15,23,42,0.8); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px;'

    const badgeColor = err.type === '5xx' ? '#fb7185' : err.type === '4xx' ? '#fbbf24' : err.type === 'console' ? '#f472b6' : '#818cf8'

    const curlBtnHtml = (err.type === '5xx' || err.type === '4xx')
      ? `<button class="btn-copy-curl" style="padding:4px 8px; font-size:10.5px; background:linear-gradient(135deg,#059669,#10b981); color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:700;">Copy cURL</button>`
      : ''

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
        <span style="background:rgba(255,255,255,0.08); color:${badgeColor}; font-weight:700; font-size:10px; padding:2px 6px; border-radius:4px;">${err.badge}</span>
        <div style="display:flex; gap:4px;">
          ${curlBtnHtml}
          <button class="btn-copy-ai-prompt" style="padding:4px 8px; font-size:10.5px; background:linear-gradient(135deg,#0284c7,#06b6d4); color:#fff; border:none; border-radius:5px; cursor:pointer; font-weight:700;">Copy AI Report</button>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:11.5px; color:#f8fafc; font-weight:600; word-break:break-all;">${escapeHtml(err.title)}</div>
      <div style="font-size:10.5px; color:#94a3b8;">${escapeHtml(err.subtitle || '')}</div>
    `

    // Add expandable details
    if (err.payload || err.response || err.stack || err.reqHeaders) {
      const detailsBox = document.createElement('div')
      detailsBox.style.cssText = 'background:rgba(6,9,16,0.9); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; font-family:"JetBrains Mono",monospace; font-size:10.5px; color:#cbd5e1; max-height:100px; overflow-y:auto; white-space:pre-wrap; word-break:break-all;'
      
      let detailContent = ''
      if (err.reqHeaders) detailContent += `[Request Headers]:\n${JSON.stringify(err.reqHeaders, null, 2)}\n\n`
      if (err.payload) detailContent += `[Request Body]:\n${err.payload}\n\n`
      if (err.resHeaders) detailContent += `[Response Headers]:\n${JSON.stringify(err.resHeaders, null, 2)}\n\n`
      if (err.response) detailContent += `[Response Body/Error]:\n${err.response}\n\n`
      if (err.stack) detailContent += `[Stack Trace]:\n${err.stack}\n`

      detailsBox.textContent = detailContent.trim()
      card.appendChild(detailsBox)
    }

    // Attach cURL copy handler
    const curlBtn = card.querySelector('.btn-copy-curl')
    curlBtn?.addEventListener('click', () => {
      if (err.raw && navigator.clipboard) {
        const cmd = generateExtensionCurl(err.raw)
        navigator.clipboard.writeText(cmd)
        curlBtn.textContent = 'Copied cURL!'
        setTimeout(() => { curlBtn.textContent = 'Copy cURL' }, 2000)
      }
    })

    // Attach AI Prompt Copy handler
    const copyBtn = card.querySelector('.btn-copy-ai-prompt')
    copyBtn?.addEventListener('click', () => {
      const prompt = formatAIDebugPrompt(err, snapshot)
      if (navigator.clipboard) {
        navigator.clipboard.writeText(prompt)
        copyBtn.textContent = 'Copied Report!'
        setTimeout(() => { copyBtn.textContent = 'Copy AI Report' }, 2000)
      }
    })

    container.appendChild(card)
  })
}

function formatAIDebugPrompt(err, snapshot) {
  const lines = []
  lines.push('### 🚨 Dr. Debug Incident Report for AI Assistants (Claude Code / Antigravity)')
  lines.push('')
  lines.push(`**Issue Title:** \`${err.badge}: ${err.title}\``)
  lines.push(`**Timestamp:** ${new Date().toISOString()}`)
  lines.push(`**Page Context:** ${snapshot.pageContext?.url || 'Web Application'}`)
  lines.push('')

  if (err.type === '5xx' || err.type === '4xx') {
    lines.push('#### 🌐 HTTP Network Transaction:')
    lines.push(`- **Request:** \`${err.title}\``)
    lines.push(`- **Status:** \`${err.badge}\``)
    lines.push('')

    if (err.raw) {
      lines.push('**Terminal Reproduction Command (cURL):**')
      lines.push('```bash')
      lines.push(generateExtensionCurl(err.raw))
      lines.push('```')
      lines.push('')
    }

    if (err.reqHeaders) {
      lines.push('**Request Headers:**')
      lines.push('```json')
      lines.push(JSON.stringify(err.reqHeaders, null, 2))
      lines.push('```')
      lines.push('')
    }
    if (err.payload) {
      lines.push('**Request Payload / Body:**')
      lines.push('```json')
      lines.push(err.payload)
      lines.push('```')
      lines.push('')
    }
    if (err.resHeaders) {
      lines.push('**Response Headers:**')
      lines.push('```json')
      lines.push(JSON.stringify(err.resHeaders, null, 2))
      lines.push('```')
      lines.push('')
    }
    if (err.response) {
      lines.push('**Response Body / Error Message:**')
      lines.push('```')
      lines.push(err.response)
      lines.push('```')
      lines.push('')
    }
  } else if (err.type === 'console') {
    lines.push('#### 🔴 Console & Runtime Diagnostics:')
    lines.push(`- **Error Message:** \`${err.title}\``)
    if (err.stack) {
      lines.push('**Stack Trace:**')
      lines.push('```')
      lines.push(err.stack)
      lines.push('```')
    }
    lines.push('')
  }

  lines.push('#### 🎯 Task for AI Coding Assistant (Claude Code / Antigravity):')
  lines.push('1. Analyze the exact failure mechanism across the request payload, headers, response, and runtime stack trace provided above.')
  lines.push('2. Identify the root cause file, function, and line number in the codebase.')
  lines.push('3. Provide the minimal, elegant, and verified code fix as a unified diff patch to resolve this issue.')

  return lines.join('\n')
}


function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}


document.getElementById('btn-refresh')?.addEventListener('click', updateStreams)
setInterval(updateStreams, 1500)

document.getElementById('btn-copy-mermaid')?.addEventListener('click', () => {
  if (!lastGraph || !lastGraph.mermaidDiagram) {
    alert('No causal graph diagram generated yet.')
    return
  }
  navigator.clipboard?.writeText(lastGraph.mermaidDiagram)
  const btn = document.getElementById('btn-copy-mermaid')
  if (btn) {
    const orig = btn.innerHTML
    btn.innerHTML = '<span>✅</span> <span>Copied Mermaid!</span>'
    setTimeout(() => { btn.innerHTML = orig }, 1500)
  }
})

document.getElementById('btn-diagnose')?.addEventListener('click', () => {
  if (typeof chrome === 'undefined' || !chrome.devtools?.inspectedWindow) return
  const tabId = chrome.devtools.inspectedWindow.tabId
  const goal = document.getElementById('goal-input')?.value || 'Diagnose error'
  const btn = document.getElementById('btn-diagnose')
  const rcaResult = document.getElementById('rca-result')
  const rcaContent = document.getElementById('rca-content')

  if (btn) btn.textContent = '⏳ Autonomous AI Agent Diagnosing...'

  chrome.tabs.sendMessage(tabId, { type: 'DR_DEBUG_TRIGGER_INVESTIGATION', goal }, (response) => {
    if (btn) btn.textContent = '🩺 Launch Autonomous Investigation'
    if (chrome.runtime.lastError) {
      if (rcaResult && rcaContent) {
        rcaResult.style.display = 'block'
        rcaContent.innerHTML = `<span style="color:#f43f5e">Error: ${chrome.runtime.lastError.message || 'Failed to communicate with page.'}</span>`
      }
      return
    }

    if (response && response.result) {
      lastRCA = response.result
      if (rcaResult && rcaContent) {
        rcaResult.style.display = 'block'
        const statusBadge = response.result.status === 'diagnosed' || response.result.status === 'resolved' ? '🟢 Diagnosed' : '🟠 Incomplete'
        const confidencePct = Math.round((response.result.confidence ?? 0.95) * 100)
        
        let filesHtml = ''
        if (response.result.filesToModify && response.result.filesToModify.length > 0) {
          filesHtml = `<div style="margin-top:6px;"><strong>Files:</strong> ${response.result.filesToModify.map((f) => `<code style="background:rgba(255,255,255,0.1);padding:2px 5px;border-radius:4px;">${f}</code>`).join(' ')}</div>`
        }

        rcaContent.innerHTML = `
          <div style="margin-bottom:8px; display:flex; gap:12px; font-size:12px;">
            <span><strong>Status:</strong> ${statusBadge}</span>
            <span><strong>Confidence:</strong> ${confidencePct}%</span>
          </div>
          <div style="margin-bottom:6px;"><strong>Diagnosis:</strong> ${response.result.diagnosis}</div>
          <div style="margin-bottom:6px;"><strong>Root Cause:</strong> ${response.result.rootCause}</div>
          ${filesHtml}
          ${response.result.fix ? `<div style="margin-top:8px;"><strong>Prescribed Patch:</strong><pre style="background:#020617;padding:10px;margin-top:4px;border:1px solid rgba(56,189,248,0.2);border-radius:6px;color:#38bdf8;">${response.result.fix}</pre></div>` : ''}
        `
      }
    }
  })
})

document.getElementById('btn-export-md')?.addEventListener('click', () => {
  if (!lastRCA) {
    alert('Please run an investigation first to export the RCA report.')
    return
  }
  const mermaidBlock = lastGraph?.mermaidDiagram ? `\n\n## 🕸️ Causal Error Topology\n\`\`\`mermaid\n${lastGraph.mermaidDiagram}\n\`\`\`` : ''
  const md = `# 🩺 Dr. Debug RCA Report\n\n**Diagnosis:** ${lastRCA.diagnosis}\n\n**Root Cause:** ${lastRCA.rootCause}${mermaidBlock}\n\n${lastRCA.fix ? `\`\`\`diff\n${lastRCA.fix}\n\`\`\`` : ''}`
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dr-debug-rca-${Date.now()}.md`
  a.click()
})

document.getElementById('btn-export-json')?.addEventListener('click', () => {
  if (!lastRCA) {
    alert('Please run an investigation first to export the RCA report.')
    return
  }
  const exportPayload = {
    rca: lastRCA,
    causalGraph: lastGraph
  }
  const json = JSON.stringify(exportPayload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dr-debug-rca-${Date.now()}.json`
  a.click()
})

// DevTools AI Settings Bar Handlers
const dtProvider = document.getElementById('dt-provider')
const dtApiKey = document.getElementById('dt-apikey')
const btnDtTest = document.getElementById('btn-dt-test')
const btnDtSave = document.getElementById('btn-dt-save')
const dtStatusMsg = document.getElementById('dt-status-msg')

if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  chrome.storage.local.get(['provider', 'apiKey', 'model', 'baseURL'], (data) => {
    if (data.provider && dtProvider) dtProvider.value = data.provider
    if (data.apiKey && dtApiKey) dtApiKey.value = data.apiKey
  })
}

btnDtSave?.addEventListener('click', () => {
  const provider = dtProvider?.value || 'groq'
  const apiKey = dtApiKey?.value?.trim() || ''

  let baseURL = undefined
  let model = 'llama-3.3-70b-versatile'

  if (provider === 'groq') {
    baseURL = 'https://api.groq.com/openai/v1'
    model = 'llama-3.3-70b-versatile'
  } else if (provider === 'openai') {
    baseURL = undefined
    model = 'gpt-4o'
  } else if (provider === 'gemini') {
    baseURL = 'https://generativelanguage.googleapis.com/v1beta/openai/'
    model = 'gemini-1.5-flash'
  } else if (provider === 'litert') {
    model = 'litert'
  }

  const settings = { provider, apiKey, baseURL, model, enableUI: true }

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.set(settings, () => {
      if (dtStatusMsg) {
        dtStatusMsg.textContent = '✅ Settings saved!'
        dtStatusMsg.style.color = '#10b981'
        setTimeout(() => { dtStatusMsg.textContent = '' }, 3000)
      }

      if (chrome.devtools?.inspectedWindow) {
        chrome.tabs.sendMessage(chrome.devtools.inspectedWindow.tabId, {
          type: 'DR_DEBUG_UPDATE_SETTINGS',
          settings
        })
      }
    })
  }
})

btnDtTest?.addEventListener('click', async () => {
  const apiKey = dtApiKey?.value?.trim() || ''
  const provider = dtProvider?.value || 'groq'
  if (!apiKey && provider !== 'litert') {
    if (dtStatusMsg) {
      dtStatusMsg.textContent = '❌ Please enter an API key to test'
      dtStatusMsg.style.color = '#f43f5e'
    }
    return
  }

  if (btnDtTest) btnDtTest.textContent = '⏳ Testing...'
  if (dtStatusMsg) {
    dtStatusMsg.textContent = 'Contacting AI provider endpoint...'
    dtStatusMsg.style.color = '#38bdf8'
  }

  let testUrl = 'https://api.groq.com/openai/v1/chat/completions'
  let testModel = 'llama-3.3-70b-versatile'
  if (provider === 'openai') {
    testUrl = 'https://api.openai.com/v1/chat/completions'
    testModel = 'gpt-4o-mini'
  } else if (provider === 'gemini') {
    testUrl = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
    testModel = 'gemini-1.5-flash'
  }

  try {
    const res = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: testModel,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5
      })
    })

    if (btnDtTest) btnDtTest.innerHTML = '<span>⚡</span> <span>Test Key</span>'

    if (res.ok) {
      if (dtStatusMsg) {
        dtStatusMsg.textContent = `✅ Connected successfully to ${provider.toUpperCase()} (${testModel})!`
        dtStatusMsg.style.color = '#10b981'
      }
    } else {
      const err = await res.json().catch(() => ({}))
      if (dtStatusMsg) {
        dtStatusMsg.textContent = `❌ Authentication failed (${res.status}): ${err?.error?.message || res.statusText}`
        dtStatusMsg.style.color = '#f43f5e'
      }
    }
  } catch (err) {
    if (btnDtTest) btnDtTest.innerHTML = '<span>⚡</span> <span>Test Key</span>'
    if (dtStatusMsg) {
      dtStatusMsg.textContent = `❌ Network error: ${err.message}`
      dtStatusMsg.style.color = '#f43f5e'
    }
  }
})

