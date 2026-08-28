import { DebugController } from '@dr-debug/controller';
import { DrDebugCore } from '@dr-debug/core';
import { LiteRTClient, OpenAIClient } from '@dr-debug/llms';
import { DrDebugUI } from '@dr-debug/ui';
export class DrDebug {
    controller;
    core;
    llmClient;
    ui;
    options;
    isAutoInvestigating = false;
    syncInterval;
    constructor(options = {}) {
        this.options = options;
        // 1. Substrate Controller
        this.controller = new DebugController();
        this.controller.init();
        // 2. LLM Client Resolution
        if (options.llmClient) {
            this.llmClient = options.llmClient;
        }
        else if (options.liteRT || (options.model && options.model.toLowerCase().includes('litert'))) {
            this.llmClient = new LiteRTClient(options.liteRT || { modelName: options.model });
        }
        else if (options.apiKey || options.baseURL || options.model) {
            this.llmClient = new OpenAIClient({
                apiKey: options.apiKey || '',
                baseURL: options.baseURL,
                model: options.model || 'gpt-4o'
            });
        }
        else {
            // Default to on-device LiteRT client
            this.llmClient = new LiteRTClient(options.liteRT);
        }
        // 3. Core Diagnostic Loop
        this.core = new DrDebugCore(this.controller, this.llmClient);
        // 4. Shadow DOM UI Cockpit
        const shouldEnableUI = options.enableUI !== false && typeof document !== 'undefined';
        if (shouldEnableUI) {
            this.ui = new DrDebugUI({
                onInvestigate: async (goal) => {
                    await this.investigate(goal);
                }
            });
            this.syncUIStatus();
            // Real-time telemetry sync for badge and triage drawer
            if (typeof window !== 'undefined') {
                this.syncInterval = setInterval(() => {
                    this.syncUIStatus();
                }, 800);
            }
        }
        // 5. Auto-investigate on uncaught errors if configured
        if (options.autoInvestigate && typeof window !== 'undefined') {
            window.addEventListener('error', () => this.handleAutoTrigger());
            window.addEventListener('unhandledrejection', () => this.handleAutoTrigger());
        }
    }
    getController() {
        return this.controller;
    }
    getCore() {
        return this.core;
    }
    getUI() {
        return this.ui;
    }
    async investigate(goal, options = {}) {
        const activeGoal = goal || 'Diagnose all active browser errors, network failures, and performance bottlenecks.';
        this.ui?.updatePillStatus(this.controller.getConsoleEntries().filter((e) => e.level === 'error').length, this.controller.getNetworkRecords().filter((r) => r.isFailed).length, this.controller.getNetworkRecords().filter((r) => r.isSlow && !r.isFailed).length, true);
        let currentHypothesis = 'Evaluating telemetry...';
        let currentStepNumber = 1;
        try {
            const result = await this.core.investigate(activeGoal, {
                maxSteps: options.maxSteps ?? this.options.maxSteps ?? 5,
                signal: options.signal,
                onStepStart: (stepNumber) => {
                    currentStepNumber = stepNumber;
                    options.onStepStart?.(stepNumber);
                },
                onReflection: (reflection) => {
                    currentHypothesis = reflection.working_hypothesis;
                    options.onReflection?.(reflection);
                },
                onToolResult: (toolName, toolResult) => {
                    this.ui?.addTimelineStep({
                        stepNumber: currentStepNumber,
                        hypothesis: currentHypothesis,
                        toolName,
                        toolOutput: toolResult
                    });
                    options.onToolResult?.(toolName, toolResult);
                },
                onDone: (res) => {
                    options.onDone?.(res);
                }
            });
            if (this.ui) {
                this.ui.showPrescription({
                    diagnosis: result.diagnosis,
                    rootCause: result.rootCause,
                    fix: result.fix || '',
                    confidence: result.confidence,
                    filesToModify: result.filesToModify
                });
            }
            return result;
        }
        finally {
            this.syncUIStatus();
        }
    }
    syncUIStatus() {
        if (!this.ui)
            return;
        const errors = this.controller.getConsoleEntries().filter((e) => e.level === 'error');
        const failedNet = this.controller.getNetworkRecords().filter((r) => r.isFailed);
        const slowNet = this.controller.getNetworkRecords().filter((r) => r.isSlow && !r.isFailed);
        const allProblemNet = this.controller.getNetworkRecords().filter((r) => r.isFailed || r.isSlow);
        const memory = this.controller.getMemorySnapshot();
        this.ui.updatePillStatus(errors.length, failedNet.length, slowNet.length, false);
        this.ui.updateTriage({
            errors: errors.map((e) => e.message),
            slowRequests: allProblemNet.map((r) => `${r.method} ${r.url} ${r.status ? `[${r.status}]` : ''} (${Math.round(r.duration || 0)}ms)`),
            memory: memory
                ? {
                    usedMB: Math.round((memory.usedJSHeapSize || 0) / (1024 * 1024)),
                    totalMB: Math.round((memory.totalJSHeapSize || 0) / (1024 * 1024))
                }
                : undefined
        });
        // Sync full-stack causal topology graph
        const graph = this.controller.getCausalGraph();
        this.ui.updateCausalGraph(graph);
    }
    async handleAutoTrigger() {
        if (this.isAutoInvestigating)
            return;
        this.isAutoInvestigating = true;
        try {
            await this.investigate('Autonomous diagnosis triggered by uncaught runtime exception.');
        }
        finally {
            this.isAutoInvestigating = false;
        }
    }
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = undefined;
        }
        this.controller.destroy();
        this.ui?.destroy();
    }
}
// Auto-bootstrap via <script> tag attributes (when explicitly configured)
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.dataset) {
        const dataset = currentScript.dataset;
        if (dataset.autoInit === 'true' || dataset.drDebug !== undefined || (dataset.model && dataset.autoInit !== 'false')) {
            const instance = new DrDebug({
                model: dataset.model,
                apiKey: dataset.apiKey,
                baseURL: dataset.baseUrl,
                autoInvestigate: dataset.autoInvestigate === 'true',
                language: dataset.lang || 'en-US'
            });
            window.drDebug = instance;
        }
    }
}
//# sourceMappingURL=DrDebug.js.map