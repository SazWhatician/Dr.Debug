export class NetworkInterceptor {
    records = [];
    maxRecords;
    isInstalled = false;
    originalFetch;
    originalXHROpen;
    originalXHRSend;
    originalXHRSetRequestHeader;
    constructor(maxRecords = 100) {
        this.maxRecords = maxRecords;
    }
    init() {
        if (this.isInstalled)
            return;
        // 1. Hook globalThis.fetch / window.fetch
        const fetchTarget = typeof window !== 'undefined' && typeof window.fetch === 'function'
            ? window.fetch
            : typeof globalThis !== 'undefined' && typeof globalThis.fetch === 'function'
                ? globalThis.fetch
                : undefined;
        if (fetchTarget) {
            this.originalFetch = fetchTarget;
            const self = this;
            const originalFetch = this.originalFetch;
            const wrappedFetch = async function (...args) {
                const startTime = Date.now();
                const perfStart = typeof performance !== 'undefined' ? performance.now() : startTime;
                let url = '';
                let method = 'GET';
                let headers;
                let bodyPreview;
                try {
                    const parsed = self.parseFetchArgs(args);
                    url = parsed.url;
                    method = parsed.method;
                    headers = parsed.headers;
                    bodyPreview = parsed.bodyPreview;
                }
                catch {
                    // Guard against parameter inspection errors
                }
                const record = {
                    id: `req_${startTime}_${Math.random().toString(36).substring(2, 7)}`,
                    method,
                    url,
                    startTime,
                    requestHeaders: headers,
                    requestBodyPreview: bodyPreview
                };
                try {
                    self.pushRecord(record);
                }
                catch {
                    // Protect telemetry recording
                }
                try {
                    const response = await originalFetch.apply(this || globalThis, args);
                    const duration = typeof performance !== 'undefined'
                        ? Math.round(performance.now() - perfStart)
                        : Date.now() - startTime;
                    record.endTime = Date.now();
                    record.duration = duration;
                    record.status = response.status;
                    record.statusText = response.statusText;
                    record.isFailed = response.status >= 400;
                    record.isSlow = duration > 1500;
                    try {
                        const resHeaders = {};
                        response.headers?.forEach((val, key) => {
                            resHeaders[key] = val;
                        });
                        record.responseHeaders = resHeaders;
                    }
                    catch {
                        // Ignore header iteration failure
                    }
                    // Safe, non-destructive body inspection (strictly skip streams, SSE, opaque, or consumed bodies)
                    if (response &&
                        response.type !== 'opaque' &&
                        !response.bodyUsed &&
                        typeof response.clone === 'function') {
                        const contentType = (response.headers?.get('content-type') || '').toLowerCase();
                        const isStreaming = contentType.includes('event-stream') ||
                            contentType.includes('stream') ||
                            contentType.includes('multipart/') ||
                            contentType.includes('octet-stream');
                        if (!isStreaming && (contentType.includes('application/json') || contentType.includes('text/'))) {
                            self.extractResponseBody(response, record);
                        }
                    }
                    return response;
                }
                catch (err) {
                    const duration = typeof performance !== 'undefined'
                        ? Math.round(performance.now() - perfStart)
                        : Date.now() - startTime;
                    record.endTime = Date.now();
                    record.duration = duration;
                    record.status = 0;
                    record.statusText = err?.message || 'NetworkError';
                    record.isFailed = true;
                    record.isCORS = self.detectCORSError(err, record.url);
                    record.error = err?.message || 'Fetch failed';
                    throw err;
                }
            };
            if (typeof window !== 'undefined' && window.fetch) {
                try {
                    window.fetch = wrappedFetch;
                }
                catch {
                    // Ignore
                }
            }
            if (typeof globalThis !== 'undefined' && globalThis.fetch && globalThis !== (typeof window !== 'undefined' ? window : null)) {
                try {
                    globalThis.fetch = wrappedFetch;
                }
                catch {
                    // Ignore
                }
            }
        }
        // 2. Hook XMLHttpRequest
        if (typeof XMLHttpRequest !== 'undefined') {
            this.hookXHR();
        }
        this.isInstalled = true;
    }
    parseFetchArgs(args) {
        let url = '';
        let method = 'GET';
        let headers;
        let bodyPreview;
        const [input, init] = args;
        if (typeof input === 'string') {
            url = input;
        }
        else if (input instanceof URL) {
            url = input.toString();
        }
        else if (typeof input === 'object' && input !== null && 'url' in input) {
            url = input.url;
            method = input.method || 'GET';
            if (input.headers && !init?.headers) {
                try {
                    headers = this.normalizeHeaders(input.headers);
                }
                catch {
                    // Ignore header parsing error
                }
            }
        }
        if (init) {
            if (init.method)
                method = init.method.toUpperCase();
            if (init.headers) {
                try {
                    headers = this.normalizeHeaders(init.headers);
                }
                catch {
                    // Ignore
                }
            }
            if (init.body) {
                bodyPreview = this.serializeBody(init.body);
            }
        }
        return { url, method, headers, bodyPreview };
    }
    normalizeHeaders(headers) {
        const result = {};
        if (headers instanceof Headers) {
            headers.forEach((v, k) => {
                result[k] = v;
            });
        }
        else if (Array.isArray(headers)) {
            headers.forEach(([k, v]) => {
                result[k] = v;
            });
        }
        else if (typeof headers === 'object' && headers !== null) {
            Object.assign(result, headers);
        }
        return result;
    }
    serializeBody(body) {
        if (!body)
            return undefined;
        if (typeof body === 'string')
            return body.slice(0, 1024);
        if (body instanceof URLSearchParams)
            return body.toString().slice(0, 1024);
        try {
            return JSON.stringify(body).slice(0, 1024);
        }
        catch {
            return `[${typeof body} Object]`;
        }
    }
    async extractResponseBody(response, record) {
        try {
            if (response.bodyUsed)
                return;
            const clone = response.clone();
            const text = await clone.text();
            record.responseBodyPreview = text.slice(0, 2048);
        }
        catch {
            // Clone stream could not be read; ignore safely
        }
    }
    detectCORSError(err, url) {
        const msg = (err?.message || '').toLowerCase();
        if (msg.includes('cors') || msg.includes('failed to fetch') || msg.includes('networkerror')) {
            if (typeof window !== 'undefined' && window.location) {
                try {
                    const targetOrigin = new URL(url, window.location.href).origin;
                    if (targetOrigin !== window.location.origin) {
                        return true;
                    }
                }
                catch {
                    return true;
                }
            }
        }
        return false;
    }
    hookXHR() {
        const self = this;
        const proto = XMLHttpRequest.prototype;
        this.originalXHROpen = proto.open;
        this.originalXHRSend = proto.send;
        this.originalXHRSetRequestHeader = proto.setRequestHeader;
        const xhrStateMap = new WeakMap();
        proto.open = function (...args) {
            try {
                const method = (args[0] || 'GET').toUpperCase();
                const url = String(args[1] || '');
                const startTime = Date.now();
                const record = {
                    id: `xhr_${startTime}_${Math.random().toString(36).substring(2, 7)}`,
                    method,
                    url,
                    startTime
                };
                xhrStateMap.set(this, {
                    record,
                    perfStart: typeof performance !== 'undefined' ? performance.now() : startTime,
                    requestHeaders: {}
                });
                self.pushRecord(record);
            }
            catch {
                // Safe telemetry capture
            }
            return self.originalXHROpen.apply(this, arguments);
        };
        proto.setRequestHeader = function (name, value) {
            try {
                const state = xhrStateMap.get(this);
                if (state) {
                    state.requestHeaders[name] = value;
                    state.record.requestHeaders = state.requestHeaders;
                }
            }
            catch {
                // Safe telemetry capture
            }
            return self.originalXHRSetRequestHeader.apply(this, arguments);
        };
        proto.send = function (body) {
            try {
                const state = xhrStateMap.get(this);
                if (state) {
                    state.perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
                    if (body) {
                        state.record.requestBodyPreview = self.serializeBody(body);
                    }
                    this.addEventListener('loadend', () => {
                        try {
                            const duration = typeof performance !== 'undefined'
                                ? Math.round(performance.now() - state.perfStart)
                                : Date.now() - state.record.startTime;
                            state.record.endTime = Date.now();
                            state.record.duration = duration;
                            state.record.status = this.status;
                            state.record.statusText = this.statusText;
                            state.record.isFailed = this.status === 0 || this.status >= 400;
                            state.record.isSlow = duration > 1500;
                            if (this.status === 0) {
                                state.record.isCORS = self.detectCORSError(new Error('XHR Network Error'), state.record.url);
                            }
                            if (this.responseType === '' || this.responseType === 'text') {
                                state.record.responseBodyPreview = (this.responseText || '').slice(0, 2048);
                            }
                            else if (this.responseType === 'json' && this.response) {
                                try {
                                    state.record.responseBodyPreview = typeof this.response === 'string'
                                        ? this.response.slice(0, 2048)
                                        : JSON.stringify(this.response).slice(0, 2048);
                                }
                                catch {
                                    state.record.responseBodyPreview = '[JSON Response]';
                                }
                            }
                        }
                        catch {
                            // Ignore any loadend telemetry error safely
                        }
                    });
                }
            }
            catch {
                // Safe telemetry capture
            }
            return self.originalXHRSend.apply(this, arguments);
        };
    }
    pushRecord(record) {
        this.records.push(record);
        if (this.records.length > this.maxRecords) {
            this.records.shift();
        }
    }
    getRecords() {
        return [...this.records];
    }
    getFailed() {
        return this.records.filter((r) => r.isFailed);
    }
    getSlow() {
        return this.records.filter((r) => r.isSlow);
    }
    clear() {
        this.records = [];
    }
    destroy() {
        if (!this.isInstalled)
            return;
        if (this.originalFetch) {
            if (typeof window !== 'undefined') {
                try {
                    window.fetch = this.originalFetch;
                }
                catch {
                    // Ignore
                }
            }
            if (typeof globalThis !== 'undefined') {
                try {
                    globalThis.fetch = this.originalFetch;
                }
                catch {
                    // Ignore
                }
            }
        }
        if (typeof XMLHttpRequest !== 'undefined') {
            if (this.originalXHROpen)
                XMLHttpRequest.prototype.open = this.originalXHROpen;
            if (this.originalXHRSend)
                XMLHttpRequest.prototype.send = this.originalXHRSend;
            if (this.originalXHRSetRequestHeader) {
                XMLHttpRequest.prototype.setRequestHeader = this.originalXHRSetRequestHeader;
            }
        }
        this.isInstalled = false;
    }
}
//# sourceMappingURL=network.js.map