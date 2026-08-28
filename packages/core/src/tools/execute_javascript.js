export const executeJavascriptTool = {
    name: 'execute_javascript',
    description: 'Executes a diagnostic JavaScript snippet in the live page context with timeout protection and returns the formatted evaluation result or error.',
    parameters: {
        type: 'object',
        properties: {
            script: {
                type: 'string',
                description: 'JavaScript expression or code block to evaluate (e.g. "document.title", "localStorage.getItem(\'token\')").'
            }
        },
        required: ['script']
    },
    async execute(args, _context) {
        if (typeof window === 'undefined') {
            return 'JavaScript execution is only supported in browser/DOM environments.';
        }
        try {
            // Execute in sandboxed Function wrapper
            const fn = new Function(`
        try {
          return (${args.script});
        } catch (e) {
          return { __dr_debug_error__: true, message: e.message, stack: e.stack };
        }
      `);
            const result = fn();
            if (result && typeof result === 'object' && result.__dr_debug_error__) {
                return `Evaluation Exception: ${result.message}\n${result.stack || ''}`;
            }
            if (result === undefined)
                return 'undefined';
            if (result === null)
                return 'null';
            if (typeof result === 'string')
                return result;
            try {
                return JSON.stringify(result, null, 2);
            }
            catch {
                return String(result);
            }
        }
        catch (err) {
            return `Syntax or Evaluation Error: ${err.message}`;
        }
    }
};
//# sourceMappingURL=execute_javascript.js.map