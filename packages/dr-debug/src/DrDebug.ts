import { DebugController } from '@dr-debug/controller'
import { DrDebugCore, type InvestigationOptions, type InvestigationResult } from '@dr-debug/core'
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
}

export class DrDebug {
  private controller: DebugController
  private core: DrDebugCore
  private llmClient: ILLMClient
  private ui?: DrDebugUI
  private options: DrDebugOptions
  private isAutoInvestigating = false

  private syncInterval?: any

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
      // Default to on-device LiteRT client
      this.llmClient = new LiteRTClient(options.liteRT)
    }

    // 3. Core Diagnostic Loop
    this.core = new DrDebugCore(this.controller, this.llmClient)

    // 4. Shadow DOM UI Cockpit
    const shouldEnableUI = options.enableUI !== false && typeof document !== 'undefined'
    if (shouldEnableUI) {
      this.ui = new DrDebugUI({
        onInvestigate: async (goal) => {
          await this.investigate(goal)
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
  }

  public getController(): DebugController {
    return this.controller
  }

  public getCore(): DrDebugCore {
    return this.core
  }

  public getUI(): DrDebugUI | undefined {
    return this.ui
  }

  public async investigate(goal?: string, options: InvestigationOptions = {}): Promise<InvestigationResult> {
    const activeGoal = goal || 'Diagnose all active browser errors, network failures, and performance bottlenecks.'
    
    this.ui?.updatePillStatus(
      this.controller.getConsoleEntries().filter((e) => e.level === 'error').length,
      this.controller.getNetworkRecords().filter((r) => r.isFailed).length,
      this.controller.getNetworkRecords().filter((r) => r.isSlow && !r.isFailed).length,
      true
    )

    let currentHypothesis = 'Evaluating telemetry...'
    let currentStepNumber = 1

    try {
      const result = await this.core.investigate(activeGoal, {
        maxSteps: options.maxSteps ?? this.options.maxSteps ?? 5,
        signal: options.signal,
        onStepStart: (stepNumber) => {
          currentStepNumber = stepNumber
          options.onStepStart?.(stepNumber)
        },
        onReflection: (reflection) => {
          currentHypothesis = reflection.working_hypothesis
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

  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = undefined
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
