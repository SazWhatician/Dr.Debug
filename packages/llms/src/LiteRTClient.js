export class LiteRTClient {
    modelPath;
    modelName;
    device;
    temperature;
    maxTokens;
    engine;
    isInitialized = false;
    constructor(config = {}) {
        this.modelPath = config.modelPath || 'models/gemma-2b-it.litertlm';
        this.modelName = config.modelName || 'gemma-2b-it';
        this.device = config.device || 'webgpu';
        this.temperature = config.temperature ?? 0.1;
        this.maxTokens = config.maxTokens ?? 2048;
        this.engine = config.engine;
    }
    async init() {
        if (this.isInitialized)
            return;
        if (this.engine?.init) {
            await this.engine.init();
        }
        this.isInitialized = true;
    }
    async chat(messages, tools, signal) {
        await this.init();
        if (signal?.aborted) {
            throw new DOMException('Operation aborted', 'AbortError');
        }
        const prompt = this.formatPrompt(messages, tools);
        let rawText = '';
        if (this.engine?.generate) {
            rawText = await this.engine.generate(prompt, {
                maxTokens: this.maxTokens,
                temperature: this.temperature,
                signal
            });
        }
        else {
            // Fallback deterministic simulation when engine is not injected
            rawText = this.fallbackInference(messages, tools);
        }
        return this.parseResponse(rawText);
    }
    formatPrompt(messages, tools) {
        let prompt = '';
        // Tool calling system prompt if tools are available
        let toolInstructions = '';
        if (tools && tools.length > 0) {
            toolInstructions = `\nYou have access to the following diagnostic tools:\n`;
            for (const t of tools) {
                toolInstructions += `\n- ${t.function.name}: ${t.function.description}\n  Schema: ${JSON.stringify(t.function.parameters)}\n`;
            }
            toolInstructions += `\nTo call a tool, respond with a JSON object wrapped in <tool_call> tags:\n<tool_call>{"name": "tool_name", "arguments": { ... }}</tool_call>\n`;
        }
        for (const msg of messages) {
            if (msg.role === 'system') {
                prompt += `<start_of_turn>system\n${msg.content}${toolInstructions}<end_of_turn>\n`;
            }
            else if (msg.role === 'user') {
                prompt += `<start_of_turn>user\n${msg.content}<end_of_turn>\n`;
            }
            else if (msg.role === 'assistant') {
                if (msg.tool_calls && msg.tool_calls.length > 0) {
                    const toolCallStr = msg.tool_calls
                        .map((tc) => `<tool_call>{"name":"${tc.function.name}","arguments":${tc.function.arguments}}</tool_call>`)
                        .join('\n');
                    prompt += `<start_of_turn>model\n${msg.content ? `${msg.content}\n` : ''}${toolCallStr}<end_of_turn>\n`;
                }
                else {
                    prompt += `<start_of_turn>model\n${msg.content}<end_of_turn>\n`;
                }
            }
            else if (msg.role === 'tool') {
                prompt += `<start_of_turn>tool\n[Result for ${msg.name || 'tool'}]: ${msg.content}<end_of_turn>\n`;
            }
        }
        prompt += `<start_of_turn>model\n`;
        return prompt;
    }
    parseResponse(text) {
        const trimmed = text.trim();
        // 1. Check for <tool_call> tag pattern
        const toolCallRegex = /<tool_call>([\s\S]*?)<\/tool_call>/g;
        const toolCalls = [];
        let match;
        let cleanContent = trimmed;
        while ((match = toolCallRegex.exec(trimmed)) !== null) {
            try {
                const parsed = JSON.parse(match[1].trim());
                if (parsed.name) {
                    toolCalls.push({
                        id: `litert_call_${Date.now()}_${toolCalls.length}`,
                        type: 'function',
                        function: {
                            name: parsed.name,
                            arguments: typeof parsed.arguments === 'string' ? parsed.arguments : JSON.stringify(parsed.arguments || {})
                        }
                    });
                }
            }
            catch {
                // Continue if parse fails
            }
        }
        // 2. If no <tool_call> tag, check if entire response is a JSON object with name & arguments
        if (toolCalls.length === 0 && trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed.name && (parsed.arguments || parsed.parameters)) {
                    toolCalls.push({
                        id: `litert_call_${Date.now()}_0`,
                        type: 'function',
                        function: {
                            name: parsed.name,
                            arguments: JSON.stringify(parsed.arguments || parsed.parameters || {})
                        }
                    });
                    cleanContent = '';
                }
            }
            catch {
                // Plain text content
            }
        }
        if (toolCalls.length > 0) {
            cleanContent = cleanContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '').trim();
        }
        const estimatedTokens = Math.ceil(text.length / 4);
        return {
            content: cleanContent || (toolCalls.length > 0 ? null : text),
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            usage: {
                promptTokens: 0,
                completionTokens: estimatedTokens,
                totalTokens: estimatedTokens
            },
            finishReason: toolCalls.length > 0 ? 'tool_calls' : 'stop'
        };
    }
    fallbackInference(messages, tools) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === 'user' && tools && tools.length > 0) {
            return `<tool_call>{"name": "${tools[0].function.name}", "arguments": {}}</tool_call>`;
        }
        return 'Dr. Debug LiteRT engine ready. No active anomaly detected.';
    }
}
//# sourceMappingURL=LiteRTClient.js.map