export class MockLLMClient {
    responses = [];
    customHandler;
    callHistory = [];
    constructor(responses, customHandler) {
        if (responses)
            this.responses = [...responses];
        this.customHandler = customHandler;
    }
    enqueue(response) {
        this.responses.push(response);
    }
    setHandler(handler) {
        this.customHandler = handler;
    }
    async chat(messages, tools, _signal) {
        this.callHistory.push({ messages: [...messages], tools: tools ? [...tools] : undefined });
        if (this.customHandler) {
            return await this.customHandler(messages, tools);
        }
        if (this.responses.length > 0) {
            return this.responses.shift();
        }
        return {
            content: 'Mock response: No more queued responses.',
            finishReason: 'stop'
        };
    }
    clear() {
        this.responses = [];
        this.callHistory = [];
        this.customHandler = undefined;
    }
}
//# sourceMappingURL=MockLLMClient.js.map