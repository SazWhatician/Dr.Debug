export const replayNetworkRequestTool = {
    name: 'replay_network_request',
    description: 'Re-sends a previously recorded network request with optional header or parameter overrides to test if the failure is transient or deterministic.',
    parameters: {
        type: 'object',
        properties: {
            requestIndex: {
                type: 'number',
                description: 'The index of the network request to replay.'
            },
            overrideHeaders: {
                type: 'object',
                description: 'Optional headers to override on the replayed request.'
            }
        },
        required: ['requestIndex']
    },
    async execute(args, context) {
        const records = context.controller.getNetworkRecords();
        const index = args.requestIndex ?? 0;
        const record = records[index];
        if (!record) {
            return `Network request at index ${index} was not found.`;
        }
        if (typeof fetch === 'undefined') {
            return 'Fetch API is not available to replay requests.';
        }
        try {
            const headers = {
                ...(record.requestHeaders || {}),
                ...(args.overrideHeaders || {})
            };
            const startTime = performance.now();
            const response = await fetch(record.url, {
                method: record.method,
                headers
            });
            const duration = Math.round(performance.now() - startTime);
            let preview = '';
            try {
                const text = await response.text();
                preview = text.slice(0, 1024);
            }
            catch {
                preview = '(Could not read body)';
            }
            const result = {
                status: response.status,
                statusText: response.statusText,
                durationMs: duration,
                isSuccess: response.ok,
                responseHeaders: Object.fromEntries(response.headers.entries()),
                responseBodyPreview: preview
            };
            return JSON.stringify(result, null, 2);
        }
        catch (err) {
            return `Replay request failed: ${err.message}`;
        }
    }
};
//# sourceMappingURL=replay_network_request.js.map