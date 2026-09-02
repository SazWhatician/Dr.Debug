import { DebugController } from '@dr-debug/controller'
import {
  DrDebugCore,
  generateSessionDebugPrompt,
  HeuristicLLMClient,
  type InvestigationOptions,
  type InvestigationResult
} from '@dr-debug/core'
import {
  type ILLMClient,
  LiteRTClient,
  type LiteRTConfig,
  OpenAIClient
} from '@dr-debug/llms'
import { DrDebugUI } from '@dr-debug/ui'

export interface DrDebugOptions {
  model?: string
  apiKey?: string
  baseURL?: string
  liteRT?: LiteRTConfig
  llmClient?: ILLMClient
  maxSteps?: number
  language?: string
  enableUI?: boolean
  autoInvestigate?: boolean
  enableMCP?: boolean
  enableDocker?: boolean
  mcpPort?: number
}

export class DrDebug {
  private controller: DebugController
  private core: DrDebugCore
  private llmClient: ILLMClient
  private ui?: DrDebugUI
  private options: DrDebugOptions
  private isAutoInvestigating = false
  private mcpSocket?: WebSocket
  private syncInterval?: any
  private lastInvestigation: InvestigationResult | null = null

  constructor(options: DrDebugOptions = {}) {
    this.options = options

    // 1. Substrate Controller
    this.controller = new DebugController()
    this.controller.init()

    // 2. LLM Client Resolution
    if (options.llmClient) {
      this.llmClient = options.llmClient
    } else if (options.liteRT || (options.model && options.model.toLowerCase().includes('litert'))) {
      this.llmClient = new LiteRTClient(options.liteRT || { modelName: options.model })
    } else if (options.apiKey || options.baseURL || options.model) {
      this.llmClient = new OpenAIClient({
        apiKey: options.apiKey || '',
        baseURL: options.baseURL,
        model: options.model || 'gpt-4o'
      })
    } else {
      // No model configured: use the deterministic local engine rather than a
      // simulated one, so an unconfigured install still gives real answers.
      this.llmClient = new HeuristicLLMClient(this.controller)
    }

    // 3. Core Diagnostic Loop
    this.core = new DrDebugCore(this.controller, this.llmClient)

    // 4. Shadow DOM UI Cockpit
    const shouldEnableUI = options.enableUI !== false && typeof document !== 'undefined'
    if (shouldEnableUI) {
      this.ui = new DrDebugUI({
        onInvestigate: async (goal) => {
          await this.investigate(goal)
        },
        getController: () => this.controller,
        getSessionPrompt: () => this.getSessionDebugPrompt(),
        onSaveSettings: (settings) => {
          this.updateLLMConfig(settings)
        },
        onTestConnection: async (settings) => {
          return await this.testLLMConnection(settings)
        }
      })
      this.syncUIStatus()

      // Real-time telemetry sync for badge and triage drawer
      if (typeof window !== 'undefined') {
        this.syncInterval = setInterval(() => {
          this.syncUIStatus()
        }, 800)
      }
    }

    // 5. Auto-investigate on uncaught errors if configured
    if (options.autoInvestigate && typeof window !== 'undefined') {
      window.addEventListener('error', () => this.handleAutoTrigger())
      window.addEventListener('unhandledrejection', () => this.handleAutoTrigger())
    }

    // 6. Connect to local Dr. Debug MCP Daemon if enabled
    if (options.enableMCP && typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      this.connectToMCPBridge(options.mcpPort || 9229)
    }

    // 7. Connect to host Docker Bridge if enabled
    if (options.enableDocker !== false && typeof window !== 'undefined') {
      this.controller.connectDockerBridge(options.mcpPort || 9229)
    }
  }

  public updateLLMConfig(config: Partial<DrDebugOptions>): void {
    this.options = { ...this.options, ...config }

    if (config.llmClient) {
      this.llmClient = config.llmClient
    } else if (config.liteRT || (config.model && config.model.toLowerCase().includes('litert'))) {
      this.llmClient = new LiteRTClient(config.liteRT || { modelName: config.model })
    } else if (config.apiKey || config.baseURL || config.model) {
      this.llmClient = new OpenAIClient({
        apiKey: config.apiKey || '',
        baseURL: config.baseURL,
        model: config.model || 'llama-3.3-70b-versatile'
      })
    }
    this.core = new DrDebugCore(this.controller, this.llmClient)
  }

  public async testLLMConnection(config?: Partial<DrDebugOptions>): Promise<{ success: boolean; message: string }> {
    const targetConfig = config ? { ...this.options, ...config } : this.options
    let client: ILLMClient

    if (targetConfig.liteRT || (targetConfig.model && targetConfig.model.toLowerCase().includes('litert'))) {
      client = new LiteRTClient(targetConfig.liteRT || { modelName: targetConfig.model })
    } else {
      client = new OpenAIClient({
        apiKey: targetConfig.apiKey || '',
        baseURL: targetConfig.baseURL,
        model: targetConfig.model || 'llama-3.3-70b-versatile'
      })
    }

    if (client instanceof OpenAIClient) {
      return await client.testConnection()
    }
    return { success: true, message: 'On-device engine ready' }
  }


  public getController(): DebugController {
    return this.controller
  }

  /**
   * The full paste-ready incident brief for an external coding agent
   * (Claude Code / Antigravity / Cursor). Composed from live telemetry, and
   * folds in the last agent investigation when one has run.
   */
  public getSessionDebugPrompt(): string {
    return generateSessionDebugPrompt(this.controller.getSnapshot(), {
      investigation: this.lastInvestigation
    })
  }

  public getLastInvestigation(): InvestigationResult | null {
    return this.lastInvestigation
  }

  public getCore(): DrDebugCore {
    return this.core
  }

  public getUI(): DrDebugUI | undefined {
    return this.ui
  }

  public async investigate(goal?: string, options: InvestigationOptions = {}): Promise<InvestigationResult> {
    const activeGoal = goal || 'Diagnose all active browser errors, network failures, and performance bottlenecks.'
    
    // Automatically prepare and show HUD cockpit
    this.ui?.clearTimeline()
    this.ui?.switchTab('timeline')
    this.ui?.openCockpit()

    this.ui?.updatePillStatus(
      this.controller.getConsoleEntries().filter((e) => e.level === 'error').length,
      this.controller.getNetworkRecords().filter((r) => r.isFailed).length,
      this.controller.getNetworkRecords().filter((r) => r.isSlow && !r.isFailed).length,
      true
    )

    let currentHypothesis = 'Reading telemetry buffers and forming initial hypothesis...'
    let currentStepNumber = 1

    this.ui?.showThinking(currentHypothesis)

    try {
      const result = await this.core.investigate(activeGoal, {
        maxSteps: options.maxSteps ?? this.options.maxSteps ?? 8,
        signal: options.signal,
        onStepStart: (stepNumber) => {
          currentStepNumber = stepNumber
          options.onStepStart?.(stepNumber)
        },
        onReflection: (reflection) => {
          currentHypothesis = reflection.working_hypothesis
          this.ui?.showThinking(reflection.working_hypothesis)
          options.onReflection?.(reflection)
        },
        onToolResult: (toolName, toolResult) => {
          this.ui?.addTimelineStep({
            stepNumber: currentStepNumber,
            hypothesis: currentHypothesis,
            toolName,
            toolOutput: toolResult
          })
          options.onToolResult?.(toolName, toolResult)
        },
        onDone: (res) => {
          options.onDone?.(res)
        }
      })

      // Retained so the "Copy for AI" brief can include the agent's conclusion.
      this.lastInvestigation = result

      if (this.ui) {
        this.ui.showPrescription({
          diagnosis: result.diagnosis,
          rootCause: result.rootCause,
          fix: result.fix || '',
          confidence: result.confidence,
          filesToModify: result.filesToModify
        })
      }
      return result
    } catch (err: any) {
      if (this.ui) {
        this.ui.showPrescription({
          diagnosis: `AI Investigation failed: ${err.message || 'Unknown error'}`,
          rootCause: err.message?.includes('API key') || err.message?.includes('401') || err.message?.includes('404')
            ? `LLM Authentication/Configuration error: ${err.message}. Check your API key or chosen model in the config bar.`
            : (err.message || 'Execution error during Re-Act investigation'),
          confidence: 0,
          fix: ''
        })
      }
      throw err
    } finally {
      this.syncUIStatus()
    }
  }

  public syncUIStatus(): void {
    if (!this.ui) return

    const errors = this.controller.getConsoleEntries().filter((e) => e.level === 'error')
    const failedNet = this.controller.getNetworkRecords().filter((r) => r.isFailed)
    const slowNet = this.controller.getNetworkRecords().filter((r) => r.isSlow && !r.isFailed)
    const allProblemNet = this.controller.getNetworkRecords().filter((r) => r.isFailed || r.isSlow)
    const memory = this.controller.getMemorySnapshot()

    this.ui.updatePillStatus(errors.length, failedNet.length, slowNet.length, false)
    this.ui.updateTriage({
      errors: errors.map((e) => e.message),
      slowRequests: allProblemNet.map((r) => `${r.method} ${r.url} ${r.status ? `[${r.status}]` : ''} (${Math.round(r.duration || 0)}ms)`),
      memory: memory
        ? {
            usedMB: Math.round((memory.usedJSHeapSize || 0) / (1024 * 1024)),
            totalMB: Math.round((memory.totalJSHeapSize || 0) / (1024 * 1024))
          }
        : undefined
    })

    // Sync full-stack causal topology graph
    const graph = this.controller.getCausalGraph()
    this.ui.updateCausalGraph(graph)

    // Sync Errors Matrix & Histogram
    this.ui.updateErrors()

    // Sync Docker telemetry & live container logs
    this.ui.updateDocker()
  }

  private async handleAutoTrigger(): Promise<void> {
    if (this.isAutoInvestigating) return
    this.isAutoInvestigating = true

    try {
      await this.investigate('Autonomous diagnosis triggered by uncaught runtime exception.')
    } finally {
      this.isAutoInvestigating = false
    }
  }

  private connectToMCPBridge(port = 9229): void {
    try {
      const tabId = `tab_${Date.now()}`
      const ws = new WebSocket(`ws://localhost:${port}/browser?tabId=${tabId}`)
      this.mcpSocket = ws

      ws.onopen = () => {
        const state = this.controller.getSnapshot()
        ws.send(
          JSON.stringify({
            type: 'TELEMETRY_SYNC',
            state: {
              ...state,
              serializedXml: this.controller.serialize(),
              diagnosticMatrix: this.controller.getDiagnosticMatrix(),
              interactionsHuman: this.controller.getInteractionReplayHuman()
            }
          })
        )
      }

      ws.onmessage = async (evt) => {
        try {
          const msg = JSON.parse(evt.data)
          if (msg.type === 'EVAL_SCRIPT') {
            try {
              const res = window.eval(msg.expression)
              ws.send(JSON.stringify({ type: 'COMMAND_RESPONSE', commandId: msg.commandId, result: res }))
            } catch (err: any) {
              ws.send(JSON.stringify({ type: 'COMMAND_RESPONSE', commandId: msg.commandId, error: err.message }))
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      ws.onerror = () => {
        // Silently handle offline local daemon
      }
    } catch {
      // MCP bridge is optional
    }
  }

  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
    }
    if (this.mcpSocket) {
      this.mcpSocket.close()
      this.mcpSocket = undefined
    }
    this.controller.destroy()
    this.ui?.destroy()
  }
}

// Auto-bootstrap via <script> tag attributes (when explicitly configured)
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  const currentScript = document.currentScript as HTMLScriptElement | null
  if (currentScript && currentScript.dataset) {
    const dataset = currentScript.dataset
    if (dataset.autoInit === 'true' || dataset.drDebug !== undefined || (dataset.model && dataset.autoInit !== 'false')) {
      const instance = new DrDebug({
        model: dataset.model,
        apiKey: dataset.apiKey,
        baseURL: dataset.baseUrl,
        autoInvestigate: dataset.autoInvestigate === 'true',
        language: dataset.lang || 'en-US'
      })
      ;(window as any).drDebug = instance
    }
  }
}
