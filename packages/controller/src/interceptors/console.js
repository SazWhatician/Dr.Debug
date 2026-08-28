export class ConsoleInterceptor {
    ringBuffer = [];
    maxEntries;
    isInstalled = false;
    isCapturing = false;
    originalConsole = {};
    errorHandler;
    rejectionHandler;
    constructor(maxEntries = 100) {
        this.maxEntries = maxEntries;
    }
    init() {
        if (this.isInstalled || typeof window === 'undefined')
            return;
        // 1. Uncaught Runtime Errors (capture phase to beat framework error boundaries)
        this.errorHandler = (event) => {
            if (this.isCapturing)
                return;
            this.isCapturing = true;
            try {
                const message = event.message || (event.error ? event.error.message : 'Uncaught Error');
                if (message.includes('Maximum call stack size exceeded') &&
                    (event.filename?.includes('chrome-extension') || event.filename?.includes('installHook'))) {
                    return;
                }
                const parsed = this.parseStack(event.error?.stack || '');
                this.push({
                    id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    type: 'uncaught_error',
                    level: 'error',
                    timestamp: Date.now(),
                    message,
                    stack: event.error?.stack,
                    parsedStack: parsed.length ? parsed : [
                        {
                            filename: event.filename,
                            lineno: event.lineno,
                            colno: event.colno,
                            raw: `${event.filename}:${event.lineno}:${event.colno}`
                        }
                    ],
                    count: 1,
                    firstSeen: Date.now(),
                    lastSeen: Date.now()
                });
            }
            finally {
                this.isCapturing = false;
            }
        };
        window.addEventListener('error', this.errorHandler, true);
        // 2. Unhandled Promise Rejections (capture phase)
        this.rejectionHandler = (event) => {
            if (this.isCapturing)
                return;
            this.isCapturing = true;
            try {
                const reason = event.reason;
                const message = typeof reason === 'object' && reason !== null
                    ? reason.message || reason.toString()
                    : String(reason || 'Unhandled Promise Rejection');
                const stack = typeof reason === 'object' && reason !== null ? reason.stack : undefined;
                const parsed = stack ? this.parseStack(stack) : [];
                this.push({
                    id: `rej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    type: 'unhandled_rejection',
                    level: 'error',
                    timestamp: Date.now(),
                    message: `Unhandled Rejection: ${message}`,
                    stack,
                    parsedStack: parsed,
                    count: 1,
                    firstSeen: Date.now(),
                    lastSeen: Date.now()
                });
            }
            finally {
                this.isCapturing = false;
            }
        };
        window.addEventListener('unhandledrejection', this.rejectionHandler, true);
        // 3. Resilient Interception for console.error, warn, info, log
        const levels = ['error', 'warn', 'info', 'log'];
        levels.forEach((level) => {
            if (typeof console !== 'undefined' && console[level]) {
                const originalFn = console[level];
                this.originalConsole[level] = originalFn;
                const typeMap = {
                    error: 'console_error',
                    warn: 'console_warn',
                    info: 'console_info',
                    log: 'console_log'
                };
                const wrapped = (...args) => {
                    if (!this.isCapturing) {
                        this.isCapturing = true;
                        try {
                            this.captureConsoleLog(level, typeMap[level], args);
                        }
                        catch {
                            // Protect host application
                        }
                        finally {
                            this.isCapturing = false;
                        }
                    }
                    return originalFn.apply(console, args);
                };
                try {
                    console[level] = wrapped;
                }
                catch {
                    // Ignore if console property is non-writable
                }
            }
        });
        this.isInstalled = true;
    }
    captureConsoleLog(level, type, args) {
        const message = args
            .map((arg) => {
            if (typeof arg === 'string')
                return arg;
            if (arg instanceof Error)
                return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
            if (typeof arg === 'object' && arg !== null) {
                try {
                    if (typeof Element !== 'undefined' && arg instanceof Element) {
                        return `<${arg.tagName.toLowerCase()}${arg.id ? ` id="${arg.id}"` : ''}${arg.className ? ` class="${arg.className}"` : ''}>`;
                    }
                    const seen = new WeakSet();
                    return JSON.stringify(arg, (_key, value) => {
                        if (typeof value === 'object' && value !== null) {
                            if (seen.has(value))
                                return '[Circular]';
                            seen.add(value);
                        }
                        return value;
                    }).slice(0, 1024);
                }
                catch {
                    return Object.prototype.toString.call(arg);
                }
            }
            return String(arg);
        })
            .join(' ');
        let stack;
        if (level === 'error') {
            const err = args.find((a) => a instanceof Error);
            if (err) {
                stack = err.stack;
            }
        }
        const parsed = stack ? this.parseStack(stack) : [];
        this.push({
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type,
            level,
            timestamp: Date.now(),
            message,
            args: args.length > 1 ? args : undefined,
            stack,
            parsedStack: parsed,
            count: 1,
            firstSeen: Date.now(),
            lastSeen: Date.now()
        });
    }
    push(entry) {
        // Check for deduplication against the most recent entry if identical within 10 seconds
        const last = this.ringBuffer[this.ringBuffer.length - 1];
        if (last &&
            last.message === entry.message &&
            last.level === entry.level &&
            entry.timestamp - last.lastSeen < 10000) {
            last.count += 1;
            last.lastSeen = entry.timestamp;
            return;
        }
        this.ringBuffer.push(entry);
        if (this.ringBuffer.length > this.maxEntries) {
            this.ringBuffer.shift();
        }
    }
    parseStack(stack) {
        if (!stack || typeof stack !== 'string')
            return [];
        const frames = [];
        const lines = stack.split('\n').slice(0, 25);
        const v8Regex = /^\s*at\s+(?:([^\s(]+)\s+\((.+):(\d+):(\d+)\)|(.+):(\d+):(\d+))\s*$/;
        const ffRegex = /^\s*(?:([^@]+)@)?(.+):(\d+):(\d+)\s*$/;
        for (const line of lines) {
            try {
                const v8Match = line.match(v8Regex);
                if (v8Match) {
                    if (v8Match[1]) {
                        frames.push({
                            functionName: v8Match[1],
                            filename: v8Match[2],
                            lineno: parseInt(v8Match[3], 10),
                            colno: parseInt(v8Match[4], 10),
                            raw: line.trim()
                        });
                    }
                    else {
                        frames.push({
                            filename: v8Match[5],
                            lineno: parseInt(v8Match[6], 10),
                            colno: parseInt(v8Match[7], 10),
                            raw: line.trim()
                        });
                    }
                    continue;
                }
                const ffMatch = line.match(ffRegex);
                if (ffMatch) {
                    frames.push({
                        functionName: ffMatch[1] || '<anonymous>',
                        filename: ffMatch[2],
                        lineno: parseInt(ffMatch[3], 10),
                        colno: parseInt(ffMatch[4], 10),
                        raw: line.trim()
                    });
                }
            }
            catch {
                // Ignore single frame parsing error
            }
        }
        return frames;
    }
    getEntries() {
        return [...this.ringBuffer];
    }
    getErrors() {
        return this.ringBuffer.filter((e) => e.level === 'error');
    }
    getWarnings() {
        return this.ringBuffer.filter((e) => e.level === 'warn');
    }
    clear() {
        this.ringBuffer = [];
    }
    destroy() {
        if (!this.isInstalled)
            return;
        if (this.errorHandler && typeof window !== 'undefined') {
            window.removeEventListener('error', this.errorHandler, true);
        }
        if (this.rejectionHandler && typeof window !== 'undefined') {
            window.removeEventListener('unhandledrejection', this.rejectionHandler, true);
        }
        const levels = ['error', 'warn', 'info', 'log'];
        levels.forEach((level) => {
            if (this.originalConsole[level] && typeof console !== 'undefined') {
                try {
                    console[level] = this.originalConsole[level];
                }
                catch {
                    // Ignore
                }
            }
        });
        this.isInstalled = false;
    }
}
//# sourceMappingURL=console.js.map