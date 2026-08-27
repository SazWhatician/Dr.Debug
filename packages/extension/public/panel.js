let lastRCA = null

function updateStreams() {
  const tabId = chrome.devtools.inspectedWindow.tabId
  chrome.tabs.sendMessage(tabId, { type: 'DR_DEBUG_GET_LIVE_TELEMETRY' }, (response) => {
    if (!response || !response.snapshot) return
    const { telemetry } = response.snapshot

    const consoleEl = document.getElementById('console-stream')
    if (consoleEl && telemetry.console) {
      consoleEl.textContent = telemetry.console
        .map((c) => `[${c.type.toUpperCase()}] ${c.args.join(' ')}`)
        .join('\n') || 'No console events recorded.'
    }

    const networkEl = document.getElementById('network-stream')
    if (networkEl && telemetry.network) {
      networkEl.textContent = telemetry.network
        .map((n) => `[${n.method}] ${n.url} (${n.status || 'pending'}${n.isFailed ? ' ❌' : ''})`)
        .join('\n') || 'No network events recorded.'
    }
  })
}

document.getElementById('btn-refresh')?.addEventListener('click', updateStreams)
setInterval(updateStreams, 1500)

document.getElementById('btn-diagnose')?.addEventListener('click', () => {
  const tabId = chrome.devtools.inspectedWindow.tabId
  const goal = document.getElementById('goal-input')?.value || 'Diagnose error'
  const btn = document.getElementById('btn-diagnose')
  const rcaResult = document.getElementById('rca-result')
  const rcaContent = document.getElementById('rca-content')

  if (btn) btn.textContent = '⏳ Investigating...'

  chrome.tabs.sendMessage(tabId, { type: 'DR_DEBUG_TRIGGER_INVESTIGATION', goal }, (response) => {
    if (btn) btn.textContent = '🩺 Start Autonomous Investigation'
    if (response && response.result) {
      lastRCA = response.result
      if (rcaResult && rcaContent) {
        rcaResult.style.display = 'block'
        rcaContent.innerHTML = `
          <strong>Status:</strong> ${response.result.status}<br/>
          <strong>Diagnosis:</strong> ${response.result.diagnosis}<br/>
          <strong>Root Cause:</strong> ${response.result.rootCause}<br/>
          ${response.result.fix ? `<br/><strong>Prescribed Fix:</strong><pre style="background:#111;padding:8px;margin-top:4px;">${response.result.fix}</pre>` : ''}
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
  const md = `# 🩺 Dr. Debug RCA Report\n\n**Diagnosis:** ${lastRCA.diagnosis}\n\n**Root Cause:** ${lastRCA.rootCause}\n\n${lastRCA.fix ? `\`\`\`diff\n${lastRCA.fix}\n\`\`\`` : ''}`
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
  const json = JSON.stringify(lastRCA, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `dr-debug-rca-${Date.now()}.json`
  a.click()
})
