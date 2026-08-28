export const inspectRequestTool = {
    name: 'inspect_request',
    description: 'Inspects a network request by its index in the network stream to retrieve full URL, method, status, duration, request/response headers, and response body previews.',
    parameters: {
        type: 'object',
        properties: {
            requestIndex: {
                type: 'number',
                description: 'The zero-based index of the request in the network stream (e.g. 0, 1).'
            }
        },
        required: ['requestIndex']
    },
    async execute(args, context) {
        const records = context.controller.getNetworkRecords();
        if (records.length === 0) {
            return 'No network records available.';
        }
        const index = args.requestIndex ?? 0;
        const record = records[index] || records[0];
        const result = {
            id: record.id,
            method: record.method,
            url: record.url,
            status: record.status ?? 0,
            statusText: record.statusText ?? 'Unknown',
            durationMs: record.duration,
            isCORS: record.isCORS ?? false,
            isFailed: record.isFailed ?? false,
            isSlow: record.isSlow ?? false,
            requestHeaders: record.requestHeaders || {},
            responseHeaders: record.responseHeaders || {},
            requestBody: record.requestBodyPreview || '(None)',
            responseBody: record.responseBodyPreview || '(None)',
            error: record.error
        };
        return JSON.stringify(result, null, 2);
    }
};
//# sourceMappingURL=inspect_request.js.map