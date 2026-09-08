declare const chrome: any

export type DrDebugTheme = 'dr-debug' | 'minimal-glass' | 'monotone-skeuomorphic'

export interface SettingsData {
  provider: 'groq' | 'openai' | 'gemini' | 'litert'
  apiKey?: string
  baseURL?: string
  model?: string
  theme?: DrDebugTheme
  enableUI?: boolean
  autoInvestigate?: boolean
}

export interface SettingsModalOptions {
  onSave: (settings: SettingsData) => void
  onTestConnection: (settings: SettingsData) => Promise<{ success: boolean; message: string }>
  onThemeChange?: (theme: DrDebugTheme) => void
  initialSettings?: SettingsData
}

export class SettingsModal {
  private element: HTMLElement
  private themeSelect!: HTMLSelectElement
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

  public setTheme(theme: DrDebugTheme): void {
    if (this.themeSelect && this.themeSelect.value !== theme) {
      this.themeSelect.value = theme
    }
  }

  public getTheme(): DrDebugTheme {
    return (this.themeSelect?.value as DrDebugTheme) || 'dr-debug'
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="dr-debug-settings-modal">
        <div class="dr-debug-settings-header">
          <div class="dr-debug-settings-title">
            <span>Dr. Debug · AI Engine Settings</span>
          </div>
          <button class="dr-debug-close-btn" id="dr-debug-settings-close">✕</button>
        </div>

        <div class="dr-debug-settings-body">
          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Cockpit Theme</label>
            <select class="dr-debug-form-select" id="dr-debug-theme">
              <option value="dr-debug" selected>Dr.Debug (original)</option>
              <option value="minimal-glass">Minimalistic glassmorphism (light theme)</option>
              <option value="monotone-skeuomorphic">Monotone skeuomorphism (darker theme)</option>
            </select>
          </div>

          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Model Provider</label>
            <select class="dr-debug-form-select" id="dr-debug-provider">
              <option value="groq" selected>Groq LPU (Ultra-Fast · openai/gpt-oss-120b)</option>
              <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="gemini">Gemini Flash (gemini-flash-latest)</option>
              <option value="litert">LiteRT / Local (On-Device)</option>
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
            <input type="text" class="dr-debug-form-input" id="dr-debug-model" value="openai/gpt-oss-120b" />
          </div>

          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Base URL (Optional override)</label>
            <input type="text" class="dr-debug-form-input" id="dr-debug-base-url" placeholder="https://api.groq.com/openai/v1" />
          </div>

          <div id="dr-debug-settings-status" class="dr-debug-settings-status"></div>

          <div class="dr-debug-settings-actions">
            <button id="dr-debug-btn-test-conn" class="dr-debug-btn-outline">
              <span>Test Connection</span>
            </button>
            <button id="dr-debug-btn-save-settings" class="dr-debug-btn">
              <span>Save Settings</span>
            </button>
          </div>

          <div class="dr-debug-settings-update-banner">
            <div class="dr-debug-update-meta">
              <span class="dr-debug-update-tag">OFFICIAL RELEASE</span>
              <span class="dr-debug-update-version">Dr. Debug v0.1.5</span>
            </div>
            <button type="button" id="dr-debug-btn-check-update" class="dr-debug-btn-update">
              <span>Check for Updates</span>
              <span class="dr-debug-update-arrow">↗</span>
            </button>
          </div>

          <div style="text-align:center; font-size:11px; color:#64748b; margin-top:14px; border-top:1px solid rgba(148,163,184,0.15); padding-top:10px;">
            Created by <a href="https://github.com/SazWhatician" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:none; font-weight:700;">Saswat Mohanty (@SazWhatician)</a> · <a href="https://www.linkedin.com/in/saswat-mohanty-0a4549331/" target="_blank" rel="noopener noreferrer" style="color:#818cf8; text-decoration:none;">LinkedIn</a>
          </div>
        </div>
      </div>
    `

    this.themeSelect = this.element.querySelector('#dr-debug-theme')!
    this.themeSelect.addEventListener('change', () => {
      const theme = (this.themeSelect.value as DrDebugTheme) || 'dr-debug'
      this.options.onThemeChange?.(theme)
    })

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

    const checkUpdateBtn = this.element.querySelector('#dr-debug-btn-check-update')
    checkUpdateBtn?.addEventListener('click', () => {
      const url = 'https://dr-debug.vercel.app/'
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
        chrome.tabs.create({ url })
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    })
  }

  private handleProviderChange(): void {
    const provider = this.providerSelect.value
    if (provider === 'groq') {
      this.apiKeyGroup.style.display = 'block'
      this.modelInput.value = 'openai/gpt-oss-120b'
      this.baseURLInput.value = 'https://api.groq.com/openai/v1'
    } else if (provider === 'openai') {
      this.apiKeyGroup.style.display = 'block'
      this.modelInput.value = 'gpt-4o'
      this.baseURLInput.value = ''
    } else if (provider === 'gemini') {
      this.apiKeyGroup.style.display = 'block'
      this.modelInput.value = 'gemini-flash-latest'
      this.baseURLInput.value = 'https://generativelanguage.googleapis.com/v1beta/openai/'
    } else if (provider === 'litert') {
      this.apiKeyGroup.style.display = 'none'
      this.modelInput.value = 'litert'
      this.baseURLInput.value = ''
    }
  }

  private async handleTestConnection(): Promise<void> {
    this.testBtn.disabled = true
    this.testBtn.textContent = 'Testing...'
    this.statusMessage.textContent = 'Testing connection with LLM endpoint...'
    this.statusMessage.style.color = '#38bdf8'

    const settings = this.getFormValues()
    try {
      const result = await this.options.onTestConnection(settings)
      if (result.success) {
        this.statusMessage.textContent = result.message
        this.statusMessage.style.color = '#34d399'
      } else {
        this.statusMessage.textContent = result.message
        this.statusMessage.style.color = '#fb7185'
      }
    } catch (err: any) {
      this.statusMessage.textContent = `Error: ${err.message}`
      this.statusMessage.style.color = '#fb7185'
    } finally {
      this.testBtn.disabled = false
      this.testBtn.textContent = 'Test Connection'
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
    this.statusMessage.textContent = 'Settings saved & active!'
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
    const theme = (this.themeSelect?.value as DrDebugTheme) || 'dr-debug'

    return {
      provider,
      apiKey: apiKey || undefined,
      model,
      baseURL,
      theme,
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
      if (loaded.theme && this.themeSelect) {
        this.themeSelect.value = loaded.theme
        this.options.onThemeChange?.(loaded.theme)
      } else {
        try {
          const savedTheme = localStorage.getItem('dr_debug_theme') as DrDebugTheme
          if (savedTheme && this.themeSelect) {
            this.themeSelect.value = savedTheme
            this.options.onThemeChange?.(savedTheme)
          }
        } catch {
          // ignore
        }
      }
      if (loaded.provider) this.providerSelect.value = loaded.provider
      if (loaded.apiKey) this.apiKeyInput.value = loaded.apiKey
      if (loaded.model) this.modelInput.value = loaded.model
      if (loaded.baseURL) this.baseURLInput.value = loaded.baseURL
      this.handleProviderChange()
      if (loaded.apiKey) this.apiKeyInput.value = loaded.apiKey
    } else {
      try {
        const savedTheme = localStorage.getItem('dr_debug_theme') as DrDebugTheme
        if (savedTheme && this.themeSelect) {
          this.themeSelect.value = savedTheme
          this.options.onThemeChange?.(savedTheme)
        }
      } catch {
        // ignore
      }
    }
  }
}
