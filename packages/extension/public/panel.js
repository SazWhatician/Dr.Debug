let lastRCA = null
let lastGraph = null

function updateStreams() {
  if (typeof chrome === 'undefined' || !chrome.devtools?.inspectedWindow) return
  const tabId = chrome.devtools.inspectedWindow.tabId
  chrome.tabs.sendMessage(tabId, { type: 'DR_DEBUG_GET_LIVE_TELEMETRY' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.snapshot) return
    const snapshot = response.snapshot

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

    // 4. Causal Error Graph
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
