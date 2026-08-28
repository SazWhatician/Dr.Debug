export const queryFrameworkStateTool = {
    name: 'query_framework_state',
    description: 'Queries frontend framework runtime state, including React DevTools hooks, Redux/Zustand store snapshots, or global state objects.',
    parameters: {
        type: 'object',
        properties: {
            framework: {
                type: 'string',
                enum: ['react', 'redux', 'zustand', 'global'],
                description: 'The target framework or store to query.'
            },
            path: {
                type: 'string',
                description: 'Optional property path to inspect on window or store (e.g. "__STATE__.user").'
            }
        },
        required: ['framework']
    },
    async execute(args, _context) {
        if (typeof window === 'undefined') {
            return 'Window object is not available in this environment.';
        }
        try {
            const win = window;
            const result = {
                framework: args.framework,
                detected: false
            };
            if (args.framework === 'react') {
                if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    result.detected = true;
                    result.hasReactHook = true;
                    result.renderers = Object.keys(win.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers || {});
                }
                else {
                    result.detected = false;
                    result.note = 'React DevTools global hook not detected on window.';
                }
            }
            else if (args.framework === 'redux') {
                if (win.__REDUX_DEVTOOLS_EXTENSION__) {
                    result.detected = true;
                    result.hasReduxHook = true;
                }
            }
            if (args.path) {
                const parts = args.path.split('.');
                let curr = win;
                for (const p of parts) {
                    if (curr && typeof curr === 'object' && p in curr) {
                        curr = curr[p];
                    }
                    else {
                        curr = undefined;
                        break;
                    }
                }
                result.pathValue = curr !== undefined ? curr : `Property "${args.path}" was undefined on window.`;
            }
            return JSON.stringify(result, null, 2);
        }
        catch (err) {
            return `Failed to query framework state: ${err.message}`;
        }
    }
};
//# sourceMappingURL=query_framework_state.js.map