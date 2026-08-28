export const findCorrelationsTool = {
    name: 'find_correlations',
    description: 'Analyzes temporal clustering of network failures, console exceptions, and long tasks across the timeline to detect causal chains.',
    parameters: {
        type: 'object',
        properties: {
            timeframeMs: {
                type: 'number',
                description: 'Optional lookback window in milliseconds (default: 5000ms).'
            }
        }
    },
    async execute(_args, context) {
        const correlations = context.controller.getCorrelations();
        if (correlations.length === 0) {
            return 'No strong temporal correlations detected between network requests and console errors.';
        }
        return JSON.stringify(correlations, null, 2);
    }
};
//# sourceMappingURL=find_correlations.js.map