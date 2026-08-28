document.addEventListener('DOMContentLoaded', () => {
  const providerSelect = document.getElementById('provider-select')
  const apiKeyInput = document.getElementById('api-key-input')
  const apiKeyGroup = document.getElementById('api-key-group')
  const btnSave = document.getElementById('btn-save-settings')
  const btnToggleUI = document.getElementById('btn-toggle-ui')
  const btnDiagnose = document.getElementById('btn-diagnose')
  const statusMsg = document.getElementById('status-msg')

  // Load saved settings
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    chrome.storage.local.get(['provider', 'apiKey', 'model', 'baseURL'], (data) => {
      if (data.provider && providerSelect) {
        providerSelect.value = data.provider
      }
      if (data.apiKey && apiKeyInput) {
        apiKeyInput.value = data.apiKey
      }
      updateVisibility()
    })
  }

  function updateVisibility() {
    if (!providerSelect || !apiKeyGroup) return
    if (providerSelect.value === 'litert') {
      apiKeyGroup.style.display = 'none'
    } else {
      apiKeyGroup.style.display = 'block'
    }
  }

  providerSelect?.addEventListener('change', updateVisibility)

  // Toggle Cockpit in active tab
  btnToggleUI?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'DR_DEBUG_TOGGLE_UI' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            showStatus('Please refresh the page to inject Dr. Debug', true)
          } else {
            showStatus('Cockpit toggled!')
          }
        })
      }
    })
  })

  // Trigger AI Diagnosis in active tab
  btnDiagnose?.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { type: 'DR_DEBUG_TOGGLE_UI' })
        chrome.tabs.sendMessage(
          activeTab.id,
          {
            type: 'DR_DEBUG_TRIGGER_INVESTIGATION',
            goal: 'Diagnose all active browser errors, network failures, and performance bottlenecks.'
          },
          (response) => {
            if (chrome.runtime.lastError || !response) {
              showStatus('Please refresh the page first', true)
            } else {
              showStatus('AI Investigation started in page!')
            }
          }
        )
      }
    })
  })

  // Save Settings & Broadcast
  btnSave?.addEventListener('click', () => {
    const provider = providerSelect?.value || 'groq'
    const apiKey = apiKeyInput?.value?.trim() || ''

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
        showStatus('✅ Settings saved & applied!')

        // Notify active tab to reload settings
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const activeTab = tabs[0]
          if (activeTab?.id) {
            chrome.tabs.sendMessage(activeTab.id, {
              type: 'DR_DEBUG_UPDATE_SETTINGS',
              settings
            })
          }
        })
      })
    }
  })

  function showStatus(text, isError = false) {
    if (!statusMsg) return
    statusMsg.textContent = text
    statusMsg.style.color = isError ? '#f43f5e' : '#10b981'
    setTimeout(() => {
      statusMsg.textContent = ''
    }, 3000)
  }
})
