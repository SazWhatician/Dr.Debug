declare const chrome: any

export interface SettingsData {
  provider: 'groq' | 'openai' | 'gemini' | 'litert'
  apiKey?: string
  baseURL?: string
  model?: string
  enableUI?: boolean
  autoInvestigate?: boolean
}


export interface SettingsModalOptions {
  onSave: (settings: SettingsData) => void
  onTestConnection: (settings: SettingsData) => Promise<{ success: boolean; message: string }>
  initialSettings?: SettingsData
}

export class SettingsModal {
  private element: HTMLElement
  private providerSelect!: HTMLSelectElement
  private apiKeyInput!: HTMLInputElement
  private apiKeyGroup!: HTMLElement
  private baseURLInput!: HTMLInputElement
  private modelInput!: HTMLInputElement
  private statusMessage!: HTMLElement
  private testBtn!: HTMLButtonElement
  private saveBtn!: HTMLButtonElement
  private isVisible = false

  constructor(private options: SettingsModalOptions) {
    this.element = document.createElement('div')
    this.element.className = 'dr-debug-settings-overlay'
    this.element.style.display = 'none'

    this.render()
    this.loadInitialSettings(options.initialSettings)
  }

  public getElement(): HTMLElement {
    return this.element
  }

  public show(): void {
    this.isVisible = true
    this.element.style.display = 'flex'
  }

  public hide(): void {
    this.isVisible = false
    this.element.style.display = 'none'
  }

  public toggle(): void {
    if (this.isVisible) this.hide()
    else this.show()
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="dr-debug-settings-modal">
        <div class="dr-debug-settings-header">
          <div class="dr-debug-settings-title">
            <span>⚙️</span> <span>Dr. Debug · AI Engine Settings</span>
          </div>
          <button class="dr-debug-close-btn" id="dr-debug-settings-close">✕</button>
        </div>

        <div class="dr-debug-settings-body">
          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Model Provider</label>
            <select class="dr-debug-form-select" id="dr-debug-provider">
              <option value="groq" selected>⚡ Groq LPU (Ultra-Fast · llama-3.3-70b-versatile)</option>
              <option value="openai">🧠 OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="gemini">✨ Gemini Flash (gemini-1.5-flash)</option>
              <option value="litert">💻 LiteRT / Local (On-Device)</option>
            </select>
          </div>

          <div class="dr-debug-form-group" id="dr-debug-api-key-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label class="dr-debug-form-label" style="margin-bottom:0;">API Key</label>
              <span id="dr-debug-key-hint" style="font-size:10px; color:#38bdf8; cursor:pointer;">Show</span>
            </div>
            <input type="password" class="dr-debug-form-input" id="dr-debug-api-key" placeholder="gsk_... or sk-..." />
          </div>

          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Model Name</label>
            <input type="text" class="dr-debug-form-input" id="dr-debug-model" value="llama-3.3-70b-versatile" />
          </div>

          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Base URL (Optional override)</label>
            <input type="text" class="dr-debug-form-input" id="dr-debug-base-url" placeholder="https://api.groq.com/openai/v1" />
          </div>

          <div id="dr-debug-settings-status" class="dr-debug-settings-status"></div>

          <div class="dr-debug-settings-actions">
            <button id="dr-debug-btn-test-conn" class="dr-debug-btn-outline">
              <span>⚡</span> <span>Test Connection</span>
            </button>
            <button id="dr-debug-btn-save-settings" class="dr-debug-btn">
              <span>💾</span> <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    `

    this.providerSelect = this.element.querySelector('#dr-debug-provider')!
    this.apiKeyInput = this.element.querySelector('#dr-debug-api-key')!
    this.apiKeyGroup = this.element.querySelector('#dr-debug-api-key-group')!
    this.modelInput = this.element.querySelector('#dr-debug-model')!
    this.baseURLInput = this.element.querySelector('#dr-debug-base-url')!
    this.statusMessage = this.element.querySelector('#dr-debug-settings-status')!
    this.testBtn = this.element.querySelector('#dr-debug-btn-test-conn')!
    this.saveBtn = this.element.querySelector('#dr-debug-btn-save-settings')!

    const closeBtn = this.element.querySelector('#dr-debug-settings-close')!
    closeBtn.addEventListener('click', () => this.hide())

    const keyHint = this.element.querySelector('#dr-debug-key-hint')!
    keyHint.addEventListener('click', () => {
      if (this.apiKeyInput.type === 'password') {
        this.apiKeyInput.type = 'text'
        keyHint.textContent = 'Hide'
      } else {
        this.apiKeyInput.type = 'password'
        keyHint.textContent = 'Show'
      }
    })

    this.providerSelect.addEventListener('change', () => this.handleProviderChange())
    this.testBtn.addEventListener('click', () => this.handleTestConnection())
    this.saveBtn.addEventListener('click', () => this.handleSave())
  }

  private handleProviderChange(): void {
    const provider = this.providerSelect.value
    if (provider === 'groq') {
      this.apiKeyGroup.style.display = 'block'
      this.modelInput.value = 'llama-3.3-70b-versatile'
      this.baseURLInput.value = 'https://api.groq.com/openai/v1'
    } else if (provider === 'openai') {
      this.apiKeyGroup.style.display = 'block'
      this.modelInput.value = 'gpt-4o'
      this.baseURLInput.value = ''
    } else if (provider === 'gemini') {
      this.apiKeyGroup.style.display = 'block'
      this.modelInput.value = 'gemini-1.5-flash'
      this.baseURLInput.value = 'https://generativelanguage.googleapis.com/v1beta/openai/'
    } else if (provider === 'litert') {
      this.apiKeyGroup.style.display = 'none'
      this.modelInput.value = 'litert'
      this.baseURLInput.value = ''
    }
  }

  private async handleTestConnection(): Promise<void> {
    this.testBtn.disabled = true
    this.testBtn.innerHTML = `<span>⏳</span> <span>Testing...</span>`
    this.statusMessage.textContent = 'Testing connection with LLM endpoint...'
    this.statusMessage.style.color = '#38bdf8'

    const settings = this.getFormValues()
    try {
      const result = await this.options.onTestConnection(settings)
      if (result.success) {
        this.statusMessage.textContent = `✅ ${result.message}`
        this.statusMessage.style.color = '#34d399'
      } else {
        this.statusMessage.textContent = `❌ ${result.message}`
        this.statusMessage.style.color = '#fb7185'
      }
    } catch (err: any) {
      this.statusMessage.textContent = `❌ Error: ${err.message}`
      this.statusMessage.style.color = '#fb7185'
    } finally {
      this.testBtn.disabled = false
      this.testBtn.innerHTML = `<span>⚡</span> <span>Test Connection</span>`
    }
  }

  private handleSave(): void {
    const settings = this.getFormValues()

    // Persist to localStorage
    try {
      localStorage.setItem('dr_debug_settings', JSON.stringify(settings))
    } catch {
      // ignore
    }

    // Persist to chrome.storage.local if available
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set(settings)
    }

    this.options.onSave(settings)
    this.statusMessage.textContent = '✅ Settings saved & active!'
    this.statusMessage.style.color = '#34d399'

    setTimeout(() => {
      this.hide()
      this.statusMessage.textContent = ''
    }, 1200)
  }

  public getFormValues(): SettingsData {
    const provider = this.providerSelect.value as any
    const apiKey = this.apiKeyInput.value.trim()
    const model = this.modelInput.value.trim() || 'llama-3.3-70b-versatile'
    const baseURL = this.baseURLInput.value.trim() || undefined

    return {
      provider,
      apiKey: apiKey || undefined,
      model,
      baseURL,
      enableUI: true
    }
  }

  private loadInitialSettings(settings?: SettingsData): void {
    let loaded = settings

    if (!loaded) {
      try {
        const raw = localStorage.getItem('dr_debug_settings')
        if (raw) loaded = JSON.parse(raw)
      } catch {
        // ignore
      }
    }

    if (loaded) {
      if (loaded.provider) this.providerSelect.value = loaded.provider
      if (loaded.apiKey) this.apiKeyInput.value = loaded.apiKey
      if (loaded.model) this.modelInput.value = loaded.model
      if (loaded.baseURL) this.baseURLInput.value = loaded.baseURL
      this.handleProviderChange()
      if (loaded.apiKey) this.apiKeyInput.value = loaded.apiKey
    }
  }
}
