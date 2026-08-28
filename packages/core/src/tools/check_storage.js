export const checkStorageTool = {
    name: 'check_storage',
    description: 'Inspects LocalStorage, SessionStorage, and Cookie stores for missing keys, expired JWT tokens, or corrupted JSON.',
    parameters: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: ['local', 'session', 'cookie', 'all'],
                description: 'Storage mechanism to inspect.'
            },
            key: {
                type: 'string',
                description: 'Optional specific key to inspect.'
            }
        },
        required: ['type']
    },
    async execute(args, _context) {
        if (typeof window === 'undefined') {
            return 'Storage is not accessible in non-browser environments.';
        }
        const result = {};
        if (args.type === 'local' || args.type === 'all') {
            if (typeof localStorage !== 'undefined') {
                if (args.key) {
                    result.localStorage = { [args.key]: localStorage.getItem(args.key) };
                }
                else {
                    result.localStorage = { ...localStorage };
                }
            }
        }
        if (args.type === 'session' || args.type === 'all') {
            if (typeof sessionStorage !== 'undefined') {
                if (args.key) {
                    result.sessionStorage = { [args.key]: sessionStorage.getItem(args.key) };
                }
                else {
                    result.sessionStorage = { ...sessionStorage };
                }
            }
        }
        if (args.type === 'cookie' || args.type === 'all') {
            if (typeof document !== 'undefined') {
                result.cookies = document.cookie || '(No cookies found)';
            }
        }
        return JSON.stringify(result, null, 2);
    }
};
//# sourceMappingURL=check_storage.js.map