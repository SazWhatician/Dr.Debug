"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // packages/controller/src/interceptors/console.ts
  var ConsoleInterceptor = class {
    ringBuffer = [];
    maxEntries;
    isInstalled = false;
    originalConsole = {};
    errorHandler;
    rejectionHandler;
    constructor(maxEntries = 100) {
      this.maxEntries = maxEntries;
    }
    init() {
      if (this.isInstalled || typeof window === "undefined") return;
      this.errorHandler = (event) => {
        const parsed = this.parseStack(event.error?.stack || "");
        this.push({
          id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: "uncaught_error",
          level: "error",
          timestamp: Date.now(),
          message: event.message || "Uncaught Error",
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
      };
      window.addEventListener("error", this.errorHandler);
      this.rejectionHandler = (event) => {
        const reason = event.reason;
        const message = typeof reason === "object" && reason !== null ? reason.message || reason.toString() : String(reason || "Unhandled Promise Rejection");
        const stack = typeof reason === "object" && reason !== null ? reason.stack : void 0;
        const parsed = stack ? this.parseStack(stack) : [];
        this.push({
          id: `rej_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          type: "unhandled_rejection",
          level: "error",
          timestamp: Date.now(),
          message: `Unhandled Rejection: ${message}`,
          stack,
          parsedStack: parsed,
          count: 1,
          firstSeen: Date.now(),
          lastSeen: Date.now()
        });
      };
      window.addEventListener("unhandledrejection", this.rejectionHandler);
      const levels = ["error", "warn", "info", "log"];
      levels.forEach((level) => {
        if (typeof console !== "undefined" && console[level]) {
          this.originalConsole[level] = console[level].bind(console);
          const typeMap = {
            error: "console_error",
            warn: "console_warn",
            info: "console_info",
            log: "console_log"
          };
          console[level] = (...args) => {
            this.captureConsoleLog(level, typeMap[level], args);
            this.originalConsole[level]?.(...args);
          };
        }
      });
      this.isInstalled = true;
    }
    captureConsoleLog(level, type, args) {
      const message = args.map((arg) => {
        if (typeof arg === "string") return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}
${arg.stack || ""}`;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }).join(" ");
      let stack;
      if (level === "error" || level === "warn") {
        const err = args.find((a) => a instanceof Error);
        stack = err ? err.stack : new Error().stack;
      }
      const parsed = stack ? this.parseStack(stack) : [];
      this.push({
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        level,
        timestamp: Date.now(),
        message,
        args: args.length > 1 ? args : void 0,
        stack,
        parsedStack: parsed,
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now()
      });
    }
    push(entry) {
      const last = this.ringBuffer[this.ringBuffer.length - 1];
      if (last && last.message === entry.message && last.level === entry.level && entry.timestamp - last.lastSeen < 1e4) {
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
      if (!stack) return [];
      const lines = stack.split("\n");
      const frames = [];
      const v8Regex = /^\s*at\s+(?:([^\s(]+)\s+\((.+):(\d+):(\d+)\)|(.+):(\d+):(\d+))\s*$/;
      const ffRegex = /^\s*(?:([^@]+)@)?(.+):(\d+):(\d+)\s*$/;
      for (const line of lines) {
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
          } else {
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
            functionName: ffMatch[1] || "<anonymous>",
            filename: ffMatch[2],
            lineno: parseInt(ffMatch[3], 10),
            colno: parseInt(ffMatch[4], 10),
            raw: line.trim()
          });
        }
      }
      return frames;
    }
    getEntries() {
      return [...this.ringBuffer];
    }
    getErrors() {
      return this.ringBuffer.filter((e) => e.level === "error");
    }
    getWarnings() {
      return this.ringBuffer.filter((e) => e.level === "warn");
    }
    clear() {
      this.ringBuffer = [];
    }
    destroy() {
      if (!this.isInstalled) return;
      if (this.errorHandler && typeof window !== "undefined") {
        window.removeEventListener("error", this.errorHandler);
      }
      if (this.rejectionHandler && typeof window !== "undefined") {
        window.removeEventListener("unhandledrejection", this.rejectionHandler);
      }
      const levels = ["error", "warn", "info", "log"];
      levels.forEach((level) => {
        if (this.originalConsole[level] && typeof console !== "undefined") {
          console[level] = this.originalConsole[level];
        }
      });
      this.isInstalled = false;
    }
  };

  // packages/controller/src/interceptors/memory.ts
  var MemoryInterceptor = class {
    history = [];
    maxHistory = 20;
    sample() {
      if (typeof window === "undefined") return null;
      const memory = performance?.memory;
      const now = Date.now();
      let usedJSHeapSize;
      let totalJSHeapSize;
      let jsHeapSizeLimit;
      let heapUsagePercent;
      if (memory) {
        usedJSHeapSize = memory.usedJSHeapSize;
        totalJSHeapSize = memory.totalJSHeapSize;
        jsHeapSizeLimit = memory.jsHeapSizeLimit;
        if (usedJSHeapSize && totalJSHeapSize && totalJSHeapSize > 0) {
          heapUsagePercent = Math.round(usedJSHeapSize / totalJSHeapSize * 1e3) / 10;
        }
      }
      let detachedNodesCount;
      if (typeof document !== "undefined") {
        try {
          const totalElements = document.querySelectorAll("*").length;
          detachedNodesCount = totalElements;
        } catch {
        }
      }
      let trendMBPerMin;
      if (this.history.length > 0 && usedJSHeapSize) {
        const prev = this.history[this.history.length - 1];
        if (prev.usedJSHeapSize) {
          const deltaMB = (usedJSHeapSize - prev.usedJSHeapSize) / (1024 * 1024);
          const deltaMinutes = (now - prev.timestamp) / (1e3 * 60);
          if (deltaMinutes > 0) {
            trendMBPerMin = Math.round(deltaMB / deltaMinutes * 100) / 100;
          }
        }
      }
      const snapshot = {
        timestamp: now,
        usedJSHeapSize,
        totalJSHeapSize,
        jsHeapSizeLimit,
        heapUsagePercent,
        detachedNodesCount,
        trendMBPerMin
      };
      this.history.push(snapshot);
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }
      return snapshot;
    }
    getHistory() {
      return [...this.history];
    }
    clear() {
      this.history = [];
    }
  };

  // packages/controller/src/interceptors/network.ts
  var NetworkInterceptor = class {
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
      if (this.isInstalled) return;
      const fetchTarget = typeof globalThis !== "undefined" && typeof globalThis.fetch === "function" ? globalThis.fetch : typeof window !== "undefined" && typeof window.fetch === "function" ? window.fetch : void 0;
      if (fetchTarget) {
        this.originalFetch = fetchTarget;
        const wrappedFetch = async (...args) => {
          const startTime = Date.now();
          const perfStart = typeof performance !== "undefined" ? performance.now() : startTime;
          const { url, method, headers, bodyPreview } = this.parseFetchArgs(args);
          const record = {
            id: `req_${startTime}_${Math.random().toString(36).substring(2, 7)}`,
            method,
            url,
            startTime,
            requestHeaders: headers,
            requestBodyPreview: bodyPreview
          };
          this.pushRecord(record);
          try {
            const response = await this.originalFetch(...args);
            const duration = typeof performance !== "undefined" ? Math.round(performance.now() - perfStart) : Date.now() - startTime;
            record.endTime = Date.now();
            record.duration = duration;
            record.status = response.status;
            record.statusText = response.statusText;
            record.isFailed = response.status >= 400;
            record.isSlow = duration > 1500;
            const resHeaders = {};
            try {
              response.headers?.forEach((val, key) => {
                resHeaders[key] = val;
              });
            } catch {
            }
            record.responseHeaders = resHeaders;
            if (typeof response.clone === "function") {
              this.extractResponseBody(response.clone(), record);
            }
            return response;
          } catch (err) {
            const duration = typeof performance !== "undefined" ? Math.round(performance.now() - perfStart) : Date.now() - startTime;
            record.endTime = Date.now();
            record.duration = duration;
            record.status = 0;
            record.statusText = err?.message || "NetworkError";
            record.isFailed = true;
            record.isCORS = this.detectCORSError(err, record.url);
            record.error = err?.message || "Fetch failed";
            throw err;
          }
        };
        if (typeof globalThis !== "undefined") globalThis.fetch = wrappedFetch;
        if (typeof window !== "undefined") window.fetch = wrappedFetch;
      }
      if (typeof XMLHttpRequest !== "undefined") {
        this.hookXHR();
      }
      this.isInstalled = true;
    }
    parseFetchArgs(args) {
      let url = "";
      let method = "GET";
      let headers;
      let bodyPreview;
      const [input, init] = args;
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (typeof input === "object" && input !== null && "url" in input) {
        url = input.url;
        method = input.method || "GET";
      }
      if (init) {
        if (init.method) method = init.method.toUpperCase();
        if (init.headers) {
          headers = this.normalizeHeaders(init.headers);
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
      } else if (Array.isArray(headers)) {
        headers.forEach(([k, v]) => {
          result[k] = v;
        });
      } else if (typeof headers === "object" && headers !== null) {
        Object.assign(result, headers);
      }
      return result;
    }
    serializeBody(body) {
      if (!body) return void 0;
      if (typeof body === "string") return body.slice(0, 1024);
      if (body instanceof URLSearchParams) return body.toString().slice(0, 1024);
      try {
        return JSON.stringify(body).slice(0, 1024);
      } catch {
        return `[${typeof body} Object]`;
      }
    }
    async extractResponseBody(responseClone, record) {
      try {
        const contentType = responseClone.headers?.get("content-type") || "";
        if (contentType.includes("application/json") || contentType.includes("text/")) {
          const text = await responseClone.text();
          record.responseBodyPreview = text.slice(0, 2048);
        } else {
          record.responseBodyPreview = `[Binary / Stream content: ${contentType}]`;
        }
      } catch {
      }
    }
    detectCORSError(err, url) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("cors") || msg.includes("failed to fetch") || msg.includes("networkerror")) {
        if (typeof window !== "undefined" && window.location) {
          try {
            const targetOrigin = new URL(url, window.location.href).origin;
            if (targetOrigin !== window.location.origin) {
              return true;
            }
          } catch {
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
      const xhrStateMap = /* @__PURE__ */ new WeakMap();
      proto.open = function(...args) {
        const method = (args[0] || "GET").toUpperCase();
        const url = String(args[1] || "");
        const startTime = Date.now();
        const record = {
          id: `xhr_${startTime}_${Math.random().toString(36).substring(2, 7)}`,
          method,
          url,
          startTime
        };
        xhrStateMap.set(this, {
          record,
          perfStart: typeof performance !== "undefined" ? performance.now() : startTime,
          requestHeaders: {}
        });
        self.pushRecord(record);
        return self.originalXHROpen.apply(this, args);
      };
      proto.setRequestHeader = function(name, value) {
        const state = xhrStateMap.get(this);
        if (state) {
          state.requestHeaders[name] = value;
          state.record.requestHeaders = state.requestHeaders;
        }
        return self.originalXHRSetRequestHeader.apply(this, [name, value]);
      };
      proto.send = function(body) {
        const state = xhrStateMap.get(this);
        if (state) {
          state.perfStart = typeof performance !== "undefined" ? performance.now() : Date.now();
          if (body) {
            state.record.requestBodyPreview = self.serializeBody(body);
          }
          this.addEventListener("loadend", () => {
            const duration = typeof performance !== "undefined" ? Math.round(performance.now() - state.perfStart) : Date.now() - state.record.startTime;
            state.record.endTime = Date.now();
            state.record.duration = duration;
            state.record.status = this.status;
            state.record.statusText = this.statusText;
            state.record.isFailed = this.status === 0 || this.status >= 400;
            state.record.isSlow = duration > 1500;
            if (this.status === 0) {
              state.record.isCORS = self.detectCORSError(new Error("XHR Network Error"), state.record.url);
            }
            if (this.responseType === "" || this.responseType === "text") {
              state.record.responseBodyPreview = (this.responseText || "").slice(0, 2048);
            } else if (this.responseType === "json") {
              try {
                state.record.responseBodyPreview = JSON.stringify(this.response).slice(0, 2048);
              } catch {
                state.record.responseBodyPreview = "[JSON Response]";
              }
            }
          });
        }
        return self.originalXHRSend.apply(this, [body]);
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
      if (!this.isInstalled) return;
      if (this.originalFetch) {
        if (typeof globalThis !== "undefined") globalThis.fetch = this.originalFetch;
        if (typeof window !== "undefined") window.fetch = this.originalFetch;
      }
      if (typeof XMLHttpRequest !== "undefined") {
        if (this.originalXHROpen) XMLHttpRequest.prototype.open = this.originalXHROpen;
        if (this.originalXHRSend) XMLHttpRequest.prototype.send = this.originalXHRSend;
        if (this.originalXHRSetRequestHeader) {
          XMLHttpRequest.prototype.setRequestHeader = this.originalXHRSetRequestHeader;
        }
      }
      this.isInstalled = false;
    }
  };

  // packages/controller/src/interceptors/performance.ts
  var PerformanceInterceptor = class {
    longTasks = [];
    vitals = {};
    slowResources = [];
    observers = [];
    isInstalled = false;
    maxLongTasks = 50;
    init() {
      if (this.isInstalled || typeof window === "undefined" || typeof PerformanceObserver === "undefined") {
        return;
      }
      this.safeObserve("longtask", (list) => {
        for (const entry of list.getEntries()) {
          this.longTasks.push({
            startTime: Math.round(entry.startTime),
            duration: Math.round(entry.duration),
            name: entry.name,
            attribution: entry.attribution
          });
          if (this.longTasks.length > this.maxLongTasks) {
            this.longTasks.shift();
          }
        }
      });
      this.safeObserve("largest-contentful-paint", (list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const val = Math.round(lastEntry.startTime);
          this.vitals["LCP"] = {
            name: "LCP",
            value: val,
            rating: val <= 2500 ? "good" : val <= 4e3 ? "needs-improvement" : "poor",
            attribution: lastEntry.element?.tagName?.toLowerCase()
          };
        }
      });
      let clsValue = 0;
      this.safeObserve("layout-shift", (list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value || 0;
          }
        }
        const rounded = Math.round(clsValue * 1e3) / 1e3;
        this.vitals["CLS"] = {
          name: "CLS",
          value: rounded,
          rating: rounded <= 0.1 ? "good" : rounded <= 0.25 ? "needs-improvement" : "poor"
        };
      });
      this.safeObserve("resource", (list) => {
        for (const entry of list.getEntries()) {
          const resEntry = entry;
          const duration = Math.round(resEntry.duration);
          if (duration > 1500) {
            this.slowResources.push({
              name: resEntry.name,
              duration,
              size: resEntry.transferSize,
              initiatorType: resEntry.initiatorType
            });
            if (this.slowResources.length > 30) {
              this.slowResources.shift();
            }
          }
        }
      });
      this.isInstalled = true;
    }
    safeObserve(entryType, callback) {
      try {
        if (PerformanceObserver.supportedEntryTypes?.includes(entryType)) {
          const observer = new PerformanceObserver((list) => {
            callback(list);
          });
          observer.observe({ type: entryType, buffered: true });
          this.observers.push(observer);
        }
      } catch {
      }
    }
    recordCustomVital(vital) {
      this.vitals[vital.name] = vital;
    }
    getMetrics() {
      return {
        longTasks: [...this.longTasks],
        vitals: { ...this.vitals },
        slowResources: [...this.slowResources]
      };
    }
    clear() {
      this.longTasks = [];
      this.vitals = {};
      this.slowResources = [];
    }
    destroy() {
      this.observers.forEach((obs) => obs.disconnect());
      this.observers = [];
      this.isInstalled = false;
    }
  };

  // packages/controller/src/serializer.ts
  function computeCorrelations(state) {
    const correlations = [];
    const failedRequests = state.network.records.filter((r) => r.isFailed);
    const errorEntries = state.console.entries.filter((e) => e.level === "error");
    for (const req of failedRequests) {
      for (const err of errorEntries) {
        const timeDelta = err.timestamp - req.startTime;
        if (timeDelta >= 0 && timeDelta <= 4e3) {
          const reqSummary = `${req.method} ${req.url} (Status: ${req.status || 0}${req.isCORS ? " - CORS" : ""})`;
          const errSummary = `${err.type}: ${err.message.slice(0, 80)}`;
          correlations.push({
            id: `corr_${req.id}_${err.id}`,
            description: `Network failure [${req.method} ${req.url}] at ${formatTime(req.startTime)} preceded error [${err.message.slice(0, 60)}] at ${formatTime(err.timestamp)} (+${(timeDelta / 1e3).toFixed(1)}s)`,
            likelihood: timeDelta <= 2e3 ? "high" : "medium",
            sourceEvent: {
              type: "network",
              id: req.id,
              summary: reqSummary,
              timestamp: req.startTime
            },
            targetEvent: {
              type: "console",
              id: err.id,
              summary: errSummary,
              timestamp: err.timestamp
            },
            timeDeltaMs: timeDelta
          });
        }
      }
    }
    return correlations;
  }
  function formatTime(timestamp) {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
  }
  function formatMB(bytes) {
    if (!bytes) return "0MB";
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  function debugStateToString(state, options = {}) {
    const maxConsole = options.maxConsoleEntries ?? 15;
    const maxNetwork = options.maxNetworkEntries ?? 12;
    const lines = [];
    lines.push("<debug_state>");
    lines.push("");
    lines.push("<page_context>");
    lines.push(`  URL: ${state.pageContext.url || "http://localhost"}`);
    lines.push(`  Title: "${state.pageContext.title || "Web Application"}"`);
    lines.push(`  Uptime: ${state.pageContext.uptimeSeconds.toFixed(1)}s`);
    const statusEmoji = state.console.errorCount > 0 || state.network.failedCount > 0 ? "\u26A0\uFE0F" : "\u2705";
    lines.push(
      `  Status: ${statusEmoji} ${state.console.errorCount} Errors | ${state.network.failedCount} Failed Requests | ${state.network.slowCount} Slow Calls`
    );
    lines.push("</page_context>");
    lines.push("");
    const sortedConsole = [...state.console.entries].sort((a, b) => {
      const priority = (level) => level === "error" ? 3 : level === "warn" ? 2 : 1;
      return priority(b.level) - priority(a.level) || b.timestamp - a.timestamp;
    });
    const consoleToRender = sortedConsole.slice(0, maxConsole);
    lines.push(
      `<console_stream total="${state.console.total}" errors="${state.console.errorCount}" warnings="${state.console.warnCount}">`
    );
    if (consoleToRender.length === 0) {
      lines.push("  (No console entries recorded)");
    } else {
      consoleToRender.forEach((entry, idx) => {
        const levelTag = entry.level.toUpperCase().padEnd(5, " ");
        const timeStr = formatTime(entry.timestamp);
        const countTag = entry.count > 1 ? ` (Occurred ${entry.count}x)` : "";
        lines.push(`  [${idx}] ${levelTag} ${timeStr} [${entry.type}] ${entry.message.slice(0, 180)}${countTag}`);
        if (entry.parsedStack && entry.parsedStack.length > 0) {
          const topFrames = entry.parsedStack.slice(0, 2);
          topFrames.forEach((frame) => {
            lines.push(`      at ${frame.functionName || "<anonymous>"} (${frame.filename}:${frame.lineno}:${frame.colno})`);
          });
        }
      });
      if (state.console.total > maxConsole) {
        lines.push(`  ... (${state.console.total - maxConsole} older console messages omitted)`);
      }
    }
    lines.push("</console_stream>");
    lines.push("");
    const sortedNetwork = [...state.network.records].sort((a, b) => {
      const priority = (r) => r.isFailed ? 3 : r.isSlow ? 2 : 1;
      return priority(b) - priority(a) || b.startTime - a.startTime;
    });
    const networkToRender = sortedNetwork.slice(0, maxNetwork);
    lines.push(
      `<network_stream total="${state.network.total}" failed="${state.network.failedCount}" slow="${state.network.slowCount}">`
    );
    if (networkToRender.length === 0) {
      lines.push("  (No network calls recorded)");
    } else {
      networkToRender.forEach((req, idx) => {
        let statusTag = "OK";
        if (req.isFailed) {
          statusTag = req.isCORS ? "CORS_FAIL" : `FAIL(${req.status || 0})`;
        } else if (req.isSlow) {
          statusTag = `SLOW(${req.duration}ms)`;
        }
        const durStr = req.duration !== void 0 ? `${req.duration}ms` : "pending";
        lines.push(`  [${idx}] ${statusTag} [${req.method}] ${req.url} (${durStr})`);
        if (req.isFailed && req.error) {
          lines.push(`      Error: ${req.error}`);
        }
        if (req.responseBodyPreview) {
          const snippet = req.responseBodyPreview.replace(/\s+/g, " ").slice(0, 100);
          lines.push(`      Response Preview: ${snippet}`);
        }
      });
      if (state.network.total > maxNetwork) {
        lines.push(`  ... (${state.network.total - maxNetwork} successful requests omitted)`);
      }
    }
    lines.push("</network_stream>");
    lines.push("");
    lines.push("<performance_vitals>");
    const vitals = state.performance.vitals;
    const lcp = vitals["LCP"] ? `${(vitals["LCP"].value / 1e3).toFixed(2)}s (${vitals["LCP"].rating})` : "N/A";
    const cls = vitals["CLS"] ? `${vitals["CLS"].value} (${vitals["CLS"].rating})` : "N/A";
    const inp = vitals["INP"] ? `${vitals["INP"].value}ms (${vitals["INP"].rating})` : "N/A";
    lines.push(`  LCP: ${lcp}`);
    lines.push(`  CLS: ${cls}`);
    lines.push(`  INP: ${inp}`);
    if (state.performance.longTasks.length > 0) {
      const topTask = state.performance.longTasks[state.performance.longTasks.length - 1];
      lines.push(`  Long Tasks: ${state.performance.longTasks.length} detected (Latest: ${topTask.duration}ms)`);
    } else {
      lines.push("  Long Tasks: 0 detected (<50ms)");
    }
    lines.push("</performance_vitals>");
    lines.push("");
    if (state.memory) {
      lines.push("<memory_health>");
      const used = formatMB(state.memory.usedJSHeapSize);
      const total = formatMB(state.memory.totalJSHeapSize);
      const pct = state.memory.heapUsagePercent !== void 0 ? `${state.memory.heapUsagePercent}%` : "N/A";
      lines.push(`  Used Heap: ${used} / ${total} (${pct})`);
      if (state.memory.trendMBPerMin !== void 0) {
        const trendTag = state.memory.trendMBPerMin > 1 ? "\u26A0\uFE0F (Elevated Heap Growth)" : "\u2705 (Stable)";
        lines.push(`  Heap Trend: ${state.memory.trendMBPerMin > 0 ? "+" : ""}${state.memory.trendMBPerMin}MB/min ${trendTag}`);
      }
      if (state.memory.detachedNodesCount !== void 0) {
        lines.push(`  DOM Node Count: ${state.memory.detachedNodesCount} nodes`);
      }
      lines.push("</memory_health>");
      lines.push("");
    }
    const correlations = computeCorrelations(state);
    if (correlations.length > 0) {
      lines.push("<heuristic_correlations>");
      lines.push("  \u{1F4A1} Automated Correlation Insights:");
      correlations.forEach((corr, idx) => {
        lines.push(`  ${idx + 1}. [${corr.likelihood.toUpperCase()} LIKELIHOOD] ${corr.description}`);
      });
      lines.push("</heuristic_correlations>");
      lines.push("");
    }
    lines.push("</debug_state>");
    return lines.join("\n");
  }

  // packages/controller/src/DebugController.ts
  var DebugController = class {
    consoleInterceptor;
    networkInterceptor;
    performanceInterceptor;
    memoryInterceptor;
    startTime = Date.now();
    isRunning = false;
    constructor(maxBufferSize = 100) {
      this.consoleInterceptor = new ConsoleInterceptor(maxBufferSize);
      this.networkInterceptor = new NetworkInterceptor(maxBufferSize);
      this.performanceInterceptor = new PerformanceInterceptor();
      this.memoryInterceptor = new MemoryInterceptor();
    }
    init() {
      if (this.isRunning) return;
      this.startTime = Date.now();
      this.consoleInterceptor.init();
      this.networkInterceptor.init();
      this.performanceInterceptor.init();
      this.isRunning = true;
    }
    getSnapshot() {
      const consoleEntries = this.consoleInterceptor.getEntries();
      const networkRecords = this.networkInterceptor.getRecords();
      const performanceMetrics = this.performanceInterceptor.getMetrics();
      const memorySnapshot = this.memoryInterceptor.sample();
      const errors = consoleEntries.filter((e) => e.level === "error");
      const warns = consoleEntries.filter((e) => e.level === "warn");
      const failedNet = networkRecords.filter((r) => r.isFailed);
      const slowNet = networkRecords.filter((r) => r.isSlow);
      const pageContext = {
        url: typeof window !== "undefined" ? window.location?.href || "" : "",
        title: typeof document !== "undefined" ? document.title || "" : "",
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent || "" : "",
        uptimeSeconds: (Date.now() - this.startTime) / 1e3,
        timestamp: Date.now()
      };
      const state = {
        pageContext,
        console: {
          total: consoleEntries.length,
          errorCount: errors.length,
          warnCount: warns.length,
          entries: consoleEntries
        },
        network: {
          total: networkRecords.length,
          failedCount: failedNet.length,
          slowCount: slowNet.length,
          records: networkRecords
        },
        performance: performanceMetrics,
        memory: memorySnapshot,
        correlations: []
      };
      state.correlations = computeCorrelations(state);
      return state;
    }
    serialize(options) {
      const state = this.getSnapshot();
      return debugStateToString(state, options);
    }
    getConsoleEntries() {
      return this.consoleInterceptor.getEntries();
    }
    getNetworkRecords() {
      return this.networkInterceptor.getRecords();
    }
    getPerformanceMetrics() {
      return this.performanceInterceptor.getMetrics();
    }
    getMemorySnapshot() {
      return this.memoryInterceptor.sample();
    }
    getCorrelations() {
      const state = this.getSnapshot();
      return computeCorrelations(state);
    }
    clear() {
      this.consoleInterceptor.clear();
      this.networkInterceptor.clear();
      this.performanceInterceptor.clear();
      this.memoryInterceptor.clear();
    }
    destroy() {
      if (!this.isRunning) return;
      this.consoleInterceptor.destroy();
      this.networkInterceptor.destroy();
      this.performanceInterceptor.destroy();
      this.isRunning = false;
    }
  };

  // packages/core/src/prompts/system_prompt.ts
  function getSystemPrompt() {
    return `You are Dr. Debug, an expert AI software diagnostics engineer living directly inside a live web application.
Your mission is to autonomously investigate runtime errors, network anomalies, and performance bottlenecks, discover their exact root causes, and produce verified code fixes.

<investigation_methodology>
1. TRACE CAUSALITY, NOT SYMPTOMS:
   - A TypeError or undefined property access on line 42 is almost always a downstream casualty of a failed network request, missing initial state, or unhandled promise rejection.
   - Correlate console timestamps with network failures, layout shifts, and user actions.

2. EVIDENCE-BASED DIAGNOSTICS:
   - Do not guess variable values or server responses. Use tools (such as inspect_request, inspect_error, query_framework_state, execute_javascript) to inspect live state.
   - If a network request failed, inspect its headers and error payload.

3. FORCED REFLECTION BEFORE ACTION:
   - In every step, you must evaluate the previous step result, maintain a working hypothesis, update persistent memory, and state your next sub-goal before calling a tool.

4. DELIVER VERIFIED ACTIONABLE FIXES:
   - When calling the "done" tool, deliver:
     a) Plain-English diagnosis
     b) Definite root cause (with file names and line numbers)
     c) Concrete unified diff or code fix
     d) High confidence score backed by discovered evidence
</investigation_methodology>

Always output your response as valid JSON matching the reflection structure.`;
  }

  // packages/core/src/tools/check_storage.ts
  var checkStorageTool = {
    name: "check_storage",
    description: "Inspects LocalStorage, SessionStorage, and Cookie stores for missing keys, expired JWT tokens, or corrupted JSON.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["local", "session", "cookie", "all"],
          description: "Storage mechanism to inspect."
        },
        key: {
          type: "string",
          description: "Optional specific key to inspect."
        }
      },
      required: ["type"]
    },
    async execute(args, _context) {
      if (typeof window === "undefined") {
        return "Storage is not accessible in non-browser environments.";
      }
      const result = {};
      if (args.type === "local" || args.type === "all") {
        if (typeof localStorage !== "undefined") {
          if (args.key) {
            result.localStorage = { [args.key]: localStorage.getItem(args.key) };
          } else {
            result.localStorage = { ...localStorage };
          }
        }
      }
      if (args.type === "session" || args.type === "all") {
        if (typeof sessionStorage !== "undefined") {
          if (args.key) {
            result.sessionStorage = { [args.key]: sessionStorage.getItem(args.key) };
          } else {
            result.sessionStorage = { ...sessionStorage };
          }
        }
      }
      if (args.type === "cookie" || args.type === "all") {
        if (typeof document !== "undefined") {
          result.cookies = document.cookie || "(No cookies found)";
        }
      }
      return JSON.stringify(result, null, 2);
    }
  };

  // packages/core/src/tools/done.ts
  var doneTool = {
    name: "done",
    description: "Concludes the investigation and outputs the finalized diagnosis, verified root cause, confidence score, and suggested code fix.",
    parameters: {
      type: "object",
      properties: {
        diagnosis: {
          type: "string",
          description: "Clear, high-level summary of what broke in the web application."
        },
        rootCause: {
          type: "string",
          description: "Definite root cause identifying culprit files, line numbers, and causal sequence."
        },
        fix: {
          type: "string",
          description: "Actionable code fix or unified diff showing how to fix the issue."
        },
        confidence: {
          type: "number",
          description: "Confidence score from 0.0 to 1.0 backed by discovered evidence."
        },
        filesToModify: {
          type: "array",
          items: { type: "string" },
          description: "List of filenames that need to be edited to resolve the bug."
        }
      },
      required: ["diagnosis", "rootCause", "fix", "confidence"]
    },
    async execute(args, context) {
      context.memory["finalResult"] = args;
      return JSON.stringify(
        {
          status: "investigation_concluded",
          ...args
        },
        null,
        2
      );
    }
  };

  // packages/core/src/tools/execute_javascript.ts
  var executeJavascriptTool = {
    name: "execute_javascript",
    description: "Executes a diagnostic JavaScript snippet in the live page context with timeout protection and returns the formatted evaluation result or error.",
    parameters: {
      type: "object",
      properties: {
        script: {
          type: "string",
          description: `JavaScript expression or code block to evaluate (e.g. "document.title", "localStorage.getItem('token')").`
        }
      },
      required: ["script"]
    },
    async execute(args, _context) {
      if (typeof window === "undefined") {
        return "JavaScript execution is only supported in browser/DOM environments.";
      }
      try {
        const fn = new Function(`
        try {
          return (${args.script});
        } catch (e) {
          return { __dr_debug_error__: true, message: e.message, stack: e.stack };
        }
      `);
        const result = fn();
        if (result && typeof result === "object" && result.__dr_debug_error__) {
          return `Evaluation Exception: ${result.message}
${result.stack || ""}`;
        }
        if (result === void 0) return "undefined";
        if (result === null) return "null";
        if (typeof result === "string") return result;
        try {
          return JSON.stringify(result, null, 2);
        } catch {
          return String(result);
        }
      } catch (err) {
        return `Syntax or Evaluation Error: ${err.message}`;
      }
    }
  };

  // packages/core/src/tools/find_correlations.ts
  var findCorrelationsTool = {
    name: "find_correlations",
    description: "Analyzes temporal clustering of network failures, console exceptions, and long tasks across the timeline to detect causal chains.",
    parameters: {
      type: "object",
      properties: {
        timeframeMs: {
          type: "number",
          description: "Optional lookback window in milliseconds (default: 5000ms)."
        }
      }
    },
    async execute(_args, context) {
      const correlations = context.controller.getCorrelations();
      if (correlations.length === 0) {
        return "No strong temporal correlations detected between network requests and console errors.";
      }
      return JSON.stringify(correlations, null, 2);
    }
  };

  // packages/core/src/tools/inspect_element.ts
  var inspectElementTool = {
    name: "inspect_element",
    description: "Inspects a live DOM element using a CSS selector. Returns dimensions, visibility, computed styles, attributes, and text content.",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: 'CSS selector of the DOM element to inspect (e.g. "#checkout-btn", ".modal-error").'
        }
      },
      required: ["selector"]
    },
    async execute(args, _context) {
      if (typeof document === "undefined") {
        return "DOM document is not available in this environment.";
      }
      try {
        const el = document.querySelector(args.selector);
        if (!el) {
          return `Element matching selector "${args.selector}" was not found in the DOM.`;
        }
        const rect = el.getBoundingClientRect();
        const computed = typeof window !== "undefined" && window.getComputedStyle ? window.getComputedStyle(el) : null;
        const result = {
          tagName: el.tagName.toLowerCase(),
          id: el.id || void 0,
          className: el.className || void 0,
          isVisible: rect.width > 0 && rect.height > 0,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          styles: computed ? {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity,
            position: computed.position,
            zIndex: computed.zIndex
          } : void 0,
          textContent: (el.textContent || "").trim().slice(0, 300)
        };
        return JSON.stringify(result, null, 2);
      } catch (err) {
        return `Failed to inspect element "${args.selector}": ${err.message}`;
      }
    }
  };

  // packages/core/src/tools/inspect_error.ts
  var inspectErrorTool = {
    name: "inspect_error",
    description: "Inspects a specific console error or exception by its index in the console stream to retrieve full stack frames, file locations, line numbers, and frequency.",
    parameters: {
      type: "object",
      properties: {
        errorIndex: {
          type: "number",
          description: "The zero-based index of the error in the console stream (e.g. 0, 1)."
        }
      },
      required: ["errorIndex"]
    },
    async execute(args, context) {
      const entries = context.controller.getConsoleEntries();
      const errorEntries = entries.filter((e) => e.level === "error");
      if (errorEntries.length === 0) {
        return "No errors recorded in the console stream.";
      }
      const index = args.errorIndex ?? 0;
      const entry = errorEntries[index] || errorEntries[0];
      const result = {
        id: entry.id,
        type: entry.type,
        message: entry.message,
        occurrences: entry.count,
        timestamp: new Date(entry.timestamp).toISOString(),
        rawStack: entry.stack || "(No raw stack available)",
        parsedFrames: entry.parsedStack || []
      };
      return JSON.stringify(result, null, 2);
    }
  };

  // packages/core/src/tools/inspect_request.ts
  var inspectRequestTool = {
    name: "inspect_request",
    description: "Inspects a network request by its index in the network stream to retrieve full URL, method, status, duration, request/response headers, and response body previews.",
    parameters: {
      type: "object",
      properties: {
        requestIndex: {
          type: "number",
          description: "The zero-based index of the request in the network stream (e.g. 0, 1)."
        }
      },
      required: ["requestIndex"]
    },
    async execute(args, context) {
      const records = context.controller.getNetworkRecords();
      if (records.length === 0) {
        return "No network records available.";
      }
      const index = args.requestIndex ?? 0;
      const record = records[index] || records[0];
      const result = {
        id: record.id,
        method: record.method,
        url: record.url,
        status: record.status ?? 0,
        statusText: record.statusText ?? "Unknown",
        durationMs: record.duration,
        isCORS: record.isCORS ?? false,
        isFailed: record.isFailed ?? false,
        isSlow: record.isSlow ?? false,
        requestHeaders: record.requestHeaders || {},
        responseHeaders: record.responseHeaders || {},
        requestBody: record.requestBodyPreview || "(None)",
        responseBody: record.responseBodyPreview || "(None)",
        error: record.error
      };
      return JSON.stringify(result, null, 2);
    }
  };

  // packages/core/src/tools/query_framework_state.ts
  var queryFrameworkStateTool = {
    name: "query_framework_state",
    description: "Queries frontend framework runtime state, including React DevTools hooks, Redux/Zustand store snapshots, or global state objects.",
    parameters: {
      type: "object",
      properties: {
        framework: {
          type: "string",
          enum: ["react", "redux", "zustand", "global"],
          description: "The target framework or store to query."
        },
        path: {
          type: "string",
          description: 'Optional property path to inspect on window or store (e.g. "__STATE__.user").'
        }
      },
      required: ["framework"]
    },
    async execute(args, _context) {
      if (typeof window === "undefined") {
        return "Window object is not available in this environment.";
      }
      try {
        const win = window;
        const result = {
          framework: args.framework,
          detected: false
        };
        if (args.framework === "react") {
          if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
            result.detected = true;
            result.hasReactHook = true;
            result.renderers = Object.keys(win.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers || {});
          } else {
            result.detected = false;
            result.note = "React DevTools global hook not detected on window.";
          }
        } else if (args.framework === "redux") {
          if (win.__REDUX_DEVTOOLS_EXTENSION__) {
            result.detected = true;
            result.hasReduxHook = true;
          }
        }
        if (args.path) {
          const parts = args.path.split(".");
          let curr = win;
          for (const p of parts) {
            if (curr && typeof curr === "object" && p in curr) {
              curr = curr[p];
            } else {
              curr = void 0;
              break;
            }
          }
          result.pathValue = curr !== void 0 ? curr : `Property "${args.path}" was undefined on window.`;
        }
        return JSON.stringify(result, null, 2);
      } catch (err) {
        return `Failed to query framework state: ${err.message}`;
      }
    }
  };

  // packages/core/src/tools/replay_network_request.ts
  var replayNetworkRequestTool = {
    name: "replay_network_request",
    description: "Re-sends a previously recorded network request with optional header or parameter overrides to test if the failure is transient or deterministic.",
    parameters: {
      type: "object",
      properties: {
        requestIndex: {
          type: "number",
          description: "The index of the network request to replay."
        },
        overrideHeaders: {
          type: "object",
          description: "Optional headers to override on the replayed request."
        }
      },
      required: ["requestIndex"]
    },
    async execute(args, context) {
      const records = context.controller.getNetworkRecords();
      const index = args.requestIndex ?? 0;
      const record = records[index];
      if (!record) {
        return `Network request at index ${index} was not found.`;
      }
      if (typeof fetch === "undefined") {
        return "Fetch API is not available to replay requests.";
      }
      try {
        const headers = {
          ...record.requestHeaders || {},
          ...args.overrideHeaders || {}
        };
        const startTime = performance.now();
        const response = await fetch(record.url, {
          method: record.method,
          headers
        });
        const duration = Math.round(performance.now() - startTime);
        let preview = "";
        try {
          const text = await response.text();
          preview = text.slice(0, 1024);
        } catch {
          preview = "(Could not read body)";
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
      } catch (err) {
        return `Replay request failed: ${err.message}`;
      }
    }
  };

  // packages/core/src/tools/index.ts
  function createDefaultTools() {
    return [
      inspectErrorTool,
      inspectRequestTool,
      inspectElementTool,
      queryFrameworkStateTool,
      executeJavascriptTool,
      findCorrelationsTool,
      replayNetworkRequestTool,
      checkStorageTool,
      doneTool
    ];
  }

  // node_modules/zod/v3/external.js
  var external_exports = {};
  __export(external_exports, {
    BRAND: () => BRAND,
    DIRTY: () => DIRTY,
    EMPTY_PATH: () => EMPTY_PATH,
    INVALID: () => INVALID,
    NEVER: () => NEVER,
    OK: () => OK,
    ParseStatus: () => ParseStatus,
    Schema: () => ZodType,
    ZodAny: () => ZodAny,
    ZodArray: () => ZodArray,
    ZodBigInt: () => ZodBigInt,
    ZodBoolean: () => ZodBoolean,
    ZodBranded: () => ZodBranded,
    ZodCatch: () => ZodCatch,
    ZodDate: () => ZodDate,
    ZodDefault: () => ZodDefault,
    ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
    ZodEffects: () => ZodEffects,
    ZodEnum: () => ZodEnum,
    ZodError: () => ZodError,
    ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
    ZodFunction: () => ZodFunction,
    ZodIntersection: () => ZodIntersection,
    ZodIssueCode: () => ZodIssueCode,
    ZodLazy: () => ZodLazy,
    ZodLiteral: () => ZodLiteral,
    ZodMap: () => ZodMap,
    ZodNaN: () => ZodNaN,
    ZodNativeEnum: () => ZodNativeEnum,
    ZodNever: () => ZodNever,
    ZodNull: () => ZodNull,
    ZodNullable: () => ZodNullable,
    ZodNumber: () => ZodNumber,
    ZodObject: () => ZodObject,
    ZodOptional: () => ZodOptional,
    ZodParsedType: () => ZodParsedType,
    ZodPipeline: () => ZodPipeline,
    ZodPromise: () => ZodPromise,
    ZodReadonly: () => ZodReadonly,
    ZodRecord: () => ZodRecord,
    ZodSchema: () => ZodType,
    ZodSet: () => ZodSet,
    ZodString: () => ZodString,
    ZodSymbol: () => ZodSymbol,
    ZodTransformer: () => ZodEffects,
    ZodTuple: () => ZodTuple,
    ZodType: () => ZodType,
    ZodUndefined: () => ZodUndefined,
    ZodUnion: () => ZodUnion,
    ZodUnknown: () => ZodUnknown,
    ZodVoid: () => ZodVoid,
    addIssueToContext: () => addIssueToContext,
    any: () => anyType,
    array: () => arrayType,
    bigint: () => bigIntType,
    boolean: () => booleanType,
    coerce: () => coerce,
    custom: () => custom,
    date: () => dateType,
    datetimeRegex: () => datetimeRegex,
    defaultErrorMap: () => en_default,
    discriminatedUnion: () => discriminatedUnionType,
    effect: () => effectsType,
    enum: () => enumType,
    function: () => functionType,
    getErrorMap: () => getErrorMap,
    getParsedType: () => getParsedType,
    instanceof: () => instanceOfType,
    intersection: () => intersectionType,
    isAborted: () => isAborted,
    isAsync: () => isAsync,
    isDirty: () => isDirty,
    isValid: () => isValid,
    late: () => late,
    lazy: () => lazyType,
    literal: () => literalType,
    makeIssue: () => makeIssue,
    map: () => mapType,
    nan: () => nanType,
    nativeEnum: () => nativeEnumType,
    never: () => neverType,
    null: () => nullType,
    nullable: () => nullableType,
    number: () => numberType,
    object: () => objectType,
    objectUtil: () => objectUtil,
    oboolean: () => oboolean,
    onumber: () => onumber,
    optional: () => optionalType,
    ostring: () => ostring,
    pipeline: () => pipelineType,
    preprocess: () => preprocessType,
    promise: () => promiseType,
    quotelessJson: () => quotelessJson,
    record: () => recordType,
    set: () => setType,
    setErrorMap: () => setErrorMap,
    strictObject: () => strictObjectType,
    string: () => stringType,
    symbol: () => symbolType,
    transformer: () => effectsType,
    tuple: () => tupleType,
    undefined: () => undefinedType,
    union: () => unionType,
    unknown: () => unknownType,
    util: () => util,
    void: () => voidType
  });

  // node_modules/zod/v3/helpers/util.js
  var util;
  (function(util2) {
    util2.assertEqual = (_) => {
    };
    function assertIs(_arg) {
    }
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error();
    }
    util2.assertNever = assertNever;
    util2.arrayToEnum = (items) => {
      const obj = {};
      for (const item of items) {
        obj[item] = item;
      }
      return obj;
    };
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
      const filtered = {};
      for (const k of validKeys) {
        filtered[k] = obj[k];
      }
      return util2.objectValues(filtered);
    };
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function(e) {
        return obj[e];
      });
    };
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
      const keys = [];
      for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item))
          return item;
      }
      return void 0;
    };
    util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
      return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues;
    util2.jsonStringifyReplacer = (_, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
  })(util || (util = {}));
  var objectUtil;
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
        // second overwrites first
      };
    };
  })(objectUtil || (objectUtil = {}));
  var ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
  var getParsedType = (data) => {
    const t = typeof data;
    switch (t) {
      case "undefined":
        return ZodParsedType.undefined;
      case "string":
        return ZodParsedType.string;
      case "number":
        return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
      case "boolean":
        return ZodParsedType.boolean;
      case "function":
        return ZodParsedType.function;
      case "bigint":
        return ZodParsedType.bigint;
      case "symbol":
        return ZodParsedType.symbol;
      case "object":
        if (Array.isArray(data)) {
          return ZodParsedType.array;
        }
        if (data === null) {
          return ZodParsedType.null;
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return ZodParsedType.promise;
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return ZodParsedType.map;
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return ZodParsedType.set;
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return ZodParsedType.date;
        }
        return ZodParsedType.object;
      default:
        return ZodParsedType.unknown;
    }
  };

  // node_modules/zod/v3/ZodError.js
  var ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  var quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"([^"]+)":/g, "$1:");
  };
  var ZodError = class _ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super();
      this.issues = [];
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      };
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      const actualProto = new.target.prototype;
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto);
      } else {
        this.__proto__ = actualProto;
      }
      this.name = "ZodError";
      this.issues = issues;
    }
    format(_mapper) {
      const mapper = _mapper || function(issue) {
        return issue.message;
      };
      const fieldErrors = { _errors: [] };
      const processError = (error) => {
        for (const issue of error.issues) {
          if (issue.code === "invalid_union") {
            issue.unionErrors.map(processError);
          } else if (issue.code === "invalid_return_type") {
            processError(issue.returnTypeError);
          } else if (issue.code === "invalid_arguments") {
            processError(issue.argumentsError);
          } else if (issue.path.length === 0) {
            fieldErrors._errors.push(mapper(issue));
          } else {
            let curr = fieldErrors;
            let i = 0;
            while (i < issue.path.length) {
              const el = issue.path[i];
              const terminal = i === issue.path.length - 1;
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] };
              } else {
                curr[el] = curr[el] || { _errors: [] };
                curr[el]._errors.push(mapper(issue));
              }
              curr = curr[el];
              i++;
            }
          }
        }
      };
      processError(this);
      return fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof _ZodError)) {
        throw new Error(`Not a ZodError: ${value}`);
      }
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
      const fieldErrors = {};
      const formErrors = [];
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [];
          fieldErrors[firstEl].push(mapper(sub));
        } else {
          formErrors.push(mapper(sub));
        }
      }
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
  };

  // node_modules/zod/v3/locales/en.js
  var errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        if (issue.received === ZodParsedType.undefined) {
          message = "Required";
        } else {
          message = `Expected ${issue.expected}, received ${issue.received}`;
        }
        break;
      case ZodIssueCode.invalid_literal:
        message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
        break;
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
        break;
      case ZodIssueCode.invalid_union:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_union_discriminator:
        message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
        break;
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
        break;
      case ZodIssueCode.invalid_arguments:
        message = `Invalid function arguments`;
        break;
      case ZodIssueCode.invalid_return_type:
        message = `Invalid function return type`;
        break;
      case ZodIssueCode.invalid_date:
        message = `Invalid date`;
        break;
      case ZodIssueCode.invalid_string:
        if (typeof issue.validation === "object") {
          if ("includes" in issue.validation) {
            message = `Invalid input: must include "${issue.validation.includes}"`;
            if (typeof issue.validation.position === "number") {
              message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
            }
          } else if ("startsWith" in issue.validation) {
            message = `Invalid input: must start with "${issue.validation.startsWith}"`;
          } else if ("endsWith" in issue.validation) {
            message = `Invalid input: must end with "${issue.validation.endsWith}"`;
          } else {
            util.assertNever(issue.validation);
          }
        } else if (issue.validation !== "regex") {
          message = `Invalid ${issue.validation}`;
        } else {
          message = "Invalid";
        }
        break;
      case ZodIssueCode.too_small:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "bigint")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.too_big:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "bigint")
          message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.custom:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = `Intersection results could not be merged`;
        break;
      case ZodIssueCode.not_multiple_of:
        message = `Number must be a multiple of ${issue.multipleOf}`;
        break;
      case ZodIssueCode.not_finite:
        message = "Number must be finite";
        break;
      default:
        message = _ctx.defaultError;
        util.assertNever(issue);
    }
    return { message };
  };
  var en_default = errorMap;

  // node_modules/zod/v3/errors.js
  var overrideErrorMap = en_default;
  function setErrorMap(map) {
    overrideErrorMap = map;
  }
  function getErrorMap() {
    return overrideErrorMap;
  }

  // node_modules/zod/v3/helpers/parseUtil.js
  var makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...issueData.path || []];
    const fullIssue = {
      ...issueData,
      path: fullPath
    };
    if (issueData.message !== void 0) {
      return {
        ...issueData,
        path: fullPath,
        message: issueData.message
      };
    }
    let errorMessage = "";
    const maps = errorMaps.filter((m) => !!m).slice().reverse();
    for (const map of maps) {
      errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
      ...issueData,
      path: fullPath,
      message: errorMessage
    };
  };
  var EMPTY_PATH = [];
  function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue = makeIssue({
      issueData,
      data: ctx.data,
      path: ctx.path,
      errorMaps: [
        ctx.common.contextualErrorMap,
        // contextual error map is first priority
        ctx.schemaErrorMap,
        // then schema-bound map if available
        overrideMap,
        // then global override map
        overrideMap === en_default ? void 0 : en_default
        // then global default map
      ].filter((x) => !!x)
    });
    ctx.common.issues.push(issue);
  }
  var ParseStatus = class _ParseStatus {
    constructor() {
      this.value = "valid";
    }
    dirty() {
      if (this.value === "valid")
        this.value = "dirty";
    }
    abort() {
      if (this.value !== "aborted")
        this.value = "aborted";
    }
    static mergeArray(status, results) {
      const arrayValue = [];
      for (const s of results) {
        if (s.status === "aborted")
          return INVALID;
        if (s.status === "dirty")
          status.dirty();
        arrayValue.push(s.value);
      }
      return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
      const syncPairs = [];
      for (const pair of pairs) {
        const key = await pair.key;
        const value = await pair.value;
        syncPairs.push({
          key,
          value
        });
      }
      return _ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
      const finalObject = {};
      for (const pair of pairs) {
        const { key, value } = pair;
        if (key.status === "aborted")
          return INVALID;
        if (value.status === "aborted")
          return INVALID;
        if (key.status === "dirty")
          status.dirty();
        if (value.status === "dirty")
          status.dirty();
        if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
          finalObject[key.value] = value.value;
        }
      }
      return { status: status.value, value: finalObject };
    }
  };
  var INVALID = Object.freeze({
    status: "aborted"
  });
  var DIRTY = (value) => ({ status: "dirty", value });
  var OK = (value) => ({ status: "valid", value });
  var isAborted = (x) => x.status === "aborted";
  var isDirty = (x) => x.status === "dirty";
  var isValid = (x) => x.status === "valid";
  var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

  // node_modules/zod/v3/helpers/errorUtil.js
  var errorUtil;
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));

  // node_modules/zod/v3/types.js
  var ParseInputLazyPath = class {
    constructor(parent, value, path, key) {
      this._cachedPath = [];
      this.parent = parent;
      this.data = value;
      this._path = path;
      this._key = key;
    }
    get path() {
      if (!this._cachedPath.length) {
        if (Array.isArray(this._key)) {
          this._cachedPath.push(...this._path, ...this._key);
        } else {
          this._cachedPath.push(...this._path, this._key);
        }
      }
      return this._cachedPath;
    }
  };
  var handleResult = (ctx, result) => {
    if (isValid(result)) {
      return { success: true, data: result.value };
    } else {
      if (!ctx.common.issues.length) {
        throw new Error("Validation failed but no issues detected.");
      }
      return {
        success: false,
        get error() {
          if (this._error)
            return this._error;
          const error = new ZodError(ctx.common.issues);
          this._error = error;
          return this._error;
        }
      };
    }
  };
  function processCreateParams(params) {
    if (!params)
      return {};
    const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
    if (errorMap2 && (invalid_type_error || required_error)) {
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap2)
      return { errorMap: errorMap2, description };
    const customMap = (iss, ctx) => {
      const { message } = params;
      if (iss.code === "invalid_enum_value") {
        return { message: message ?? ctx.defaultError };
      }
      if (typeof ctx.data === "undefined") {
        return { message: message ?? required_error ?? ctx.defaultError };
      }
      if (iss.code !== "invalid_type")
        return { message: ctx.defaultError };
      return { message: message ?? invalid_type_error ?? ctx.defaultError };
    };
    return { errorMap: customMap, description };
  }
  var ZodType = class {
    get description() {
      return this._def.description;
    }
    _getType(input) {
      return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
      return ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      };
    }
    _processInputParams(input) {
      return {
        status: new ParseStatus(),
        ctx: {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        }
      };
    }
    _parseSync(input) {
      const result = this._parse(input);
      if (isAsync(result)) {
        throw new Error("Synchronous parse encountered promise.");
      }
      return result;
    }
    _parseAsync(input) {
      const result = this._parse(input);
      return Promise.resolve(result);
    }
    parse(data, params) {
      const result = this.safeParse(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    safeParse(data, params) {
      const ctx = {
        common: {
          issues: [],
          async: params?.async ?? false,
          contextualErrorMap: params?.errorMap
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const result = this._parseSync({ data, path: ctx.path, parent: ctx });
      return handleResult(ctx, result);
    }
    "~validate"(data) {
      const ctx = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      if (!this["~standard"].async) {
        try {
          const result = this._parseSync({ data, path: [], parent: ctx });
          return isValid(result) ? {
            value: result.value
          } : {
            issues: ctx.common.issues
          };
        } catch (err) {
          if (err?.message?.toLowerCase()?.includes("encountered")) {
            this["~standard"].async = true;
          }
          ctx.common = {
            issues: [],
            async: true
          };
        }
      }
      return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
        value: result.value
      } : {
        issues: ctx.common.issues
      });
    }
    async parseAsync(data, params) {
      const result = await this.safeParseAsync(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    async safeParseAsync(data, params) {
      const ctx = {
        common: {
          issues: [],
          contextualErrorMap: params?.errorMap,
          async: true
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
      const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
      return handleResult(ctx, result);
    }
    refine(check, message) {
      const getIssueProperties = (val) => {
        if (typeof message === "string" || typeof message === "undefined") {
          return { message };
        } else if (typeof message === "function") {
          return message(val);
        } else {
          return message;
        }
      };
      return this._refinement((val, ctx) => {
        const result = check(val);
        const setError = () => ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val)
        });
        if (typeof Promise !== "undefined" && result instanceof Promise) {
          return result.then((data) => {
            if (!data) {
              setError();
              return false;
            } else {
              return true;
            }
          });
        }
        if (!result) {
          setError();
          return false;
        } else {
          return true;
        }
      });
    }
    refinement(check, refinementData) {
      return this._refinement((val, ctx) => {
        if (!check(val)) {
          ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
          return false;
        } else {
          return true;
        }
      });
    }
    _refinement(refinement) {
      return new ZodEffects({
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "refinement", refinement }
      });
    }
    superRefine(refinement) {
      return this._refinement(refinement);
    }
    constructor(def) {
      this.spa = this.safeParseAsync;
      this._def = def;
      this.parse = this.parse.bind(this);
      this.safeParse = this.safeParse.bind(this);
      this.parseAsync = this.parseAsync.bind(this);
      this.safeParseAsync = this.safeParseAsync.bind(this);
      this.spa = this.spa.bind(this);
      this.refine = this.refine.bind(this);
      this.refinement = this.refinement.bind(this);
      this.superRefine = this.superRefine.bind(this);
      this.optional = this.optional.bind(this);
      this.nullable = this.nullable.bind(this);
      this.nullish = this.nullish.bind(this);
      this.array = this.array.bind(this);
      this.promise = this.promise.bind(this);
      this.or = this.or.bind(this);
      this.and = this.and.bind(this);
      this.transform = this.transform.bind(this);
      this.brand = this.brand.bind(this);
      this.default = this.default.bind(this);
      this.catch = this.catch.bind(this);
      this.describe = this.describe.bind(this);
      this.pipe = this.pipe.bind(this);
      this.readonly = this.readonly.bind(this);
      this.isNullable = this.isNullable.bind(this);
      this.isOptional = this.isOptional.bind(this);
      this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: (data) => this["~validate"](data)
      };
    }
    optional() {
      return ZodOptional.create(this, this._def);
    }
    nullable() {
      return ZodNullable.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return ZodArray.create(this);
    }
    promise() {
      return ZodPromise.create(this, this._def);
    }
    or(option) {
      return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
      return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
      return new ZodEffects({
        ...processCreateParams(this._def),
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "transform", transform }
      });
    }
    default(def) {
      const defaultValueFunc = typeof def === "function" ? def : () => def;
      return new ZodDefault({
        ...processCreateParams(this._def),
        innerType: this,
        defaultValue: defaultValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodDefault
      });
    }
    brand() {
      return new ZodBranded({
        typeName: ZodFirstPartyTypeKind.ZodBranded,
        type: this,
        ...processCreateParams(this._def)
      });
    }
    catch(def) {
      const catchValueFunc = typeof def === "function" ? def : () => def;
      return new ZodCatch({
        ...processCreateParams(this._def),
        innerType: this,
        catchValue: catchValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodCatch
      });
    }
    describe(description) {
      const This = this.constructor;
      return new This({
        ...this._def,
        description
      });
    }
    pipe(target) {
      return ZodPipeline.create(this, target);
    }
    readonly() {
      return ZodReadonly.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  var cuidRegex = /^c[^\s-]{8,}$/i;
  var cuid2Regex = /^[0-9a-z]+$/;
  var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  var nanoidRegex = /^[a-z0-9_-]{21}$/i;
  var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  var emojiRegex;
  var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
  var dateRegex = new RegExp(`^${dateRegexSource}$`);
  function timeRegexSource(args) {
    let secondsRegexSource = `[0-5]\\d`;
    if (args.precision) {
      secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
    } else if (args.precision == null) {
      secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
    }
    const secondsQuantifier = args.precision ? "+" : "?";
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
  }
  function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
  }
  function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
      opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
  }
  function isValidIP(ip, version) {
    if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
      return true;
    }
    return false;
  }
  function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
      return false;
    try {
      const [header] = jwt.split(".");
      if (!header)
        return false;
      const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
      const decoded = JSON.parse(atob(base64));
      if (typeof decoded !== "object" || decoded === null)
        return false;
      if ("typ" in decoded && decoded?.typ !== "JWT")
        return false;
      if (!decoded.alg)
        return false;
      if (alg && decoded.alg !== alg)
        return false;
      return true;
    } catch {
      return false;
    }
  }
  function isValidCidr(ip, version) {
    if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
      return true;
    }
    return false;
  }
  var ZodString = class _ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "length") {
          const tooBig = input.data.length > check.value;
          const tooSmall = input.data.length < check.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            }
            status.dirty();
          }
        } else if (check.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "emoji") {
          if (!emojiRegex) {
            emojiRegex = new RegExp(_emojiRegex, "u");
          }
          if (!emojiRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "url") {
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "regex") {
          check.regex.lastIndex = 0;
          const testResult = check.regex.test(input.data);
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "trim") {
          input.data = input.data.trim();
        } else if (check.kind === "includes") {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "toLowerCase") {
          input.data = input.data.toLowerCase();
        } else if (check.kind === "toUpperCase") {
          input.data = input.data.toUpperCase();
        } else if (check.kind === "startsWith") {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "endsWith") {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "datetime") {
          const regex = datetimeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "date") {
          const regex = dateRegex;
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "time") {
          const regex = timeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ip") {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "jwt") {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cidr") {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check) {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options
        });
      }
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options
        });
      }
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxLength() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  var ZodNumber = class _ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max = null;
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
          return true;
        } else if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        } else if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  };
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodBigInt = class _ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input);
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  var ZodBoolean = class extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodDate = class _ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check) {
      return new _ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max != null ? new Date(max) : null;
    }
  };
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams(params)
    });
  };
  var ZodSymbol = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams(params)
    });
  };
  var ZodUndefined = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams(params)
    });
  };
  var ZodNull = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams(params)
    });
  };
  var ZodAny = class extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams(params)
    });
  };
  var ZodUnknown = class extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams(params)
    });
  };
  var ZodNever = class extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      });
      return INVALID;
    }
  };
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams(params)
    });
  };
  var ZodVoid = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams(params)
    });
  };
  var ZodArray = class _ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input);
      const def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        const tooBig = ctx.data.length > def.exactLength.value;
        const tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : void 0,
            maximum: tooBig ? def.exactLength.value : void 0,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message
          });
          status.dirty();
        }
      }
      if (ctx.common.async) {
        return Promise.all([...ctx.data].map((item, i) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
        })).then((result2) => {
          return ParseStatus.mergeArray(status, result2);
        });
      }
      const result = [...ctx.data].map((item, i) => {
        return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      });
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new _ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new _ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new _ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams(params)
    });
  };
  function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
      const newShape = {};
      for (const key in schema.shape) {
        const fieldSchema = schema.shape[key];
        newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
      }
      return new ZodObject({
        ...schema._def,
        shape: () => newShape
      });
    } else if (schema instanceof ZodArray) {
      return new ZodArray({
        ...schema._def,
        type: deepPartialify(schema.element)
      });
    } else if (schema instanceof ZodOptional) {
      return ZodOptional.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodNullable) {
      return ZodNullable.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodTuple) {
      return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    } else {
      return schema;
    }
  }
  var ZodObject = class _ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      const shape = this._def.shape();
      const keys = util.objectKeys(shape);
      this._cached = { shape, keys };
      return this._cached;
    }
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const { status, ctx } = this._processInputParams(input);
      const { shape, keys: shapeKeys } = this._getCached();
      const extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key);
          }
        }
      }
      const pairs = [];
      for (const key of shapeKeys) {
        const keyValidator = shape[key];
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough") {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
          }
        } else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip") {
        } else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
        }
      } else {
        const catchall = this._def.catchall;
        for (const key of extraKeys) {
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(
              new ParseInputLazyPath(ctx, value, ctx.path, key)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: key in ctx.data
          });
        }
      }
      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet
            });
          }
          return syncPairs;
        }).then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== void 0 ? {
          errorMap: (issue, ctx) => {
            const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
            if (issue.code === "unrecognized_keys")
              return {
                message: errorUtil.errToObj(message).message ?? defaultError
              };
            return {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
      return new _ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
      const merged = new _ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
      return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
      return new _ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      const shape = {};
      for (const key of util.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      const shape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key];
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema;
        } else {
          newShape[key] = fieldSchema.optional();
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key];
        } else {
          const fieldSchema = this.shape[key];
          let newField = fieldSchema;
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType;
          }
          newShape[key] = newField;
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  var ZodUnion = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const options = this._def.options;
      function handleResults(results) {
        for (const result of results) {
          if (result.result.status === "valid") {
            return result.result;
          }
        }
        for (const result of results) {
          if (result.result.status === "dirty") {
            ctx.common.issues.push(...result.ctx.common.issues);
            return result.result;
          }
        }
        const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return Promise.all(options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      } else {
        let dirty = void 0;
        const issues = [];
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          const result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result.status === "valid") {
            return result;
          } else if (result.status === "dirty" && !dirty) {
            dirty = { result, ctx: childCtx };
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues);
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ZodUnion.create = (types, params) => {
    return new ZodUnion({
      options: types,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams(params)
    });
  };
  var getDiscriminator = (type) => {
    if (type instanceof ZodLazy) {
      return getDiscriminator(type.schema);
    } else if (type instanceof ZodEffects) {
      return getDiscriminator(type.innerType());
    } else if (type instanceof ZodLiteral) {
      return [type.value];
    } else if (type instanceof ZodEnum) {
      return type.options;
    } else if (type instanceof ZodNativeEnum) {
      return util.objectValues(type.enum);
    } else if (type instanceof ZodDefault) {
      return getDiscriminator(type._def.innerType);
    } else if (type instanceof ZodUndefined) {
      return [void 0];
    } else if (type instanceof ZodNull) {
      return [null];
    } else if (type instanceof ZodOptional) {
      return [void 0, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodNullable) {
      return [null, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodBranded) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodReadonly) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodCatch) {
      return getDiscriminator(type._def.innerType);
    } else {
      return [];
    }
  };
  var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const discriminator = this.discriminator;
      const discriminatorValue = ctx.data[discriminator];
      const option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator]
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      }
    }
    get discriminator() {
      return this._def.discriminator;
    }
    get options() {
      return this._def.options;
    }
    get optionsMap() {
      return this._def.optionsMap;
    }
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator, options, params) {
      const optionsMap = /* @__PURE__ */ new Map();
      for (const type of options) {
        const discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length) {
          throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
          }
          optionsMap.set(value, type);
        }
      }
      return new _ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  };
  function mergeValues(a, b) {
    const aType = getParsedType(a);
    const bType = getParsedType(b);
    if (a === b) {
      return { valid: true, data: a };
    } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
      const bKeys = util.objectKeys(b);
      const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a, ...b };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a[key], b[key]);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
      if (a.length !== b.length) {
        return { valid: false };
      }
      const newArray = [];
      for (let index = 0; index < a.length; index++) {
        const itemA = a[index];
        const itemB = b[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
      return { valid: true, data: a };
    } else {
      return { valid: false };
    }
  }
  var ZodIntersection = class extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID;
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty();
        }
        return { status: status.value, value: merged.data };
      };
      if (ctx.common.async) {
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        ]).then(([left, right]) => handleParsed(left, right));
      } else {
        return handleParsed(this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }), this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }));
      }
    }
  };
  ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
      left,
      right,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams(params)
    });
  };
  var ZodTuple = class _ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        return INVALID;
      }
      const rest = this._def.rest;
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        status.dirty();
      }
      const items = [...ctx.data].map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema)
          return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      }).filter((x) => !!x);
      if (ctx.common.async) {
        return Promise.all(items).then((results) => {
          return ParseStatus.mergeArray(status, results);
        });
      } else {
        return ParseStatus.mergeArray(status, items);
      }
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new _ZodTuple({
        ...this._def,
        rest
      });
    }
  };
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  var ZodRecord = class _ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const pairs = [];
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs);
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new _ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(third)
        });
      }
      return new _ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  };
  var ZodMap = class extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
        };
      });
      if (ctx.common.async) {
        const finalMap = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        const finalMap = /* @__PURE__ */ new Map();
        for (const pair of pairs) {
          const key = pair.key;
          const value = pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  };
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams(params)
    });
  };
  var ZodSet = class _ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message
          });
          status.dirty();
        }
      }
      const valueType = this._def.valueType;
      function finalizeSet(elements2) {
        const parsedSet = /* @__PURE__ */ new Set();
        for (const element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          if (element.status === "dirty")
            status.dirty();
          parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2));
      } else {
        return finalizeSet(elements);
      }
    }
    min(minSize, message) {
      return new _ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new _ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams(params)
    });
  };
  var ZodFunction = class _ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      const params = { errorMap: ctx.common.contextualErrorMap };
      const fn = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        const me = this;
        return OK(async function(...args) {
          const error = new ZodError([]);
          const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
            error.addIssue(makeArgsIssue(args, e));
            throw error;
          });
          const result = await Reflect.apply(fn, this, parsedArgs);
          const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
            error.addIssue(makeReturnsIssue(result, e));
            throw error;
          });
          return parsedReturns;
        });
      } else {
        const me = this;
        return OK(function(...args) {
          const parsedArgs = me._def.args.safeParse(args, params);
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          }
          const result = Reflect.apply(fn, this, parsedArgs.data);
          const parsedReturns = me._def.returns.safeParse(result, params);
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          }
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new _ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new _ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    static create(args, returns, params) {
      return new _ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  };
  var ZodLazy = class extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const lazySchema = this._def.getter();
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  };
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams(params)
    });
  };
  var ZodLiteral = class extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  };
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams(params)
    });
  };
  function createZodEnum(values, params) {
    return new ZodEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodEnum,
      ...processCreateParams(params)
    });
  }
  var ZodEnum = class _ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values);
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Values() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return _ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  };
  ZodEnum.create = createZodEnum;
  var ZodNativeEnum = class extends ZodType {
    _parse(input) {
      const nativeEnumValues = util.getValidEnumValues(this._def.values);
      const ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(util.getValidEnumValues(this._def.values));
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams(params)
    });
  };
  var ZodPromise = class extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap
        });
      }));
    }
  };
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams(params)
    });
  };
  var ZodEffects = class extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const effect = this._def.effect || null;
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) {
            status.abort();
          } else {
            status.dirty();
          }
        },
        get path() {
          return ctx.path;
        }
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect.type === "preprocess") {
        const processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            const result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          });
        } else {
          if (status.value === "aborted")
            return INVALID;
          const result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        }
      }
      if (effect.type === "refinement") {
        const executeRefinement = (acc) => {
          const result = effect.refinement(acc, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(result);
          }
          if (result instanceof Promise) {
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          }
          return acc;
        };
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          executeRefinement(inner.value);
          return { status: status.value, value: inner.value };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
        }
      }
      if (effect.type === "transform") {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          const result = effect.transform(base.value, checkCtx);
          if (result instanceof Promise) {
            throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
          }
          return { status: status.value, value: result };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base))
              return INVALID;
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result
            }));
          });
        }
      }
      util.assertNever(effect);
    }
  };
  ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect,
      ...processCreateParams(params)
    });
  };
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: "preprocess", transform: preprocess },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams(params)
    });
  };
  var ZodOptional = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.undefined) {
        return OK(void 0);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodOptional.create = (type, params) => {
    return new ZodOptional({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams(params)
    });
  };
  var ZodNullable = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.null) {
        return OK(null);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodNullable.create = (type, params) => {
    return new ZodNullable({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams(params)
    });
  };
  var ZodDefault = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) {
        data = this._def.defaultValue();
      }
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  ZodDefault.create = (type, params) => {
    return new ZodDefault({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params)
    });
  };
  var ZodCatch = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      };
      const result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      if (isAsync(result)) {
        return result.then((result2) => {
          return {
            status: "valid",
            value: result2.status === "valid" ? result2.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        });
      } else {
        return {
          status: "valid",
          value: result.status === "valid" ? result.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      }
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ZodCatch.create = (type, params) => {
    return new ZodCatch({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params)
    });
  };
  var ZodNaN = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
  };
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams(params)
    });
  };
  var BRAND = Symbol("zod_brand");
  var ZodBranded = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  var ZodPipeline = class _ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        };
        return handleAsync();
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value
          };
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }
    }
    static create(a, b) {
      return new _ZodPipeline({
        in: a,
        out: b,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  };
  var ZodReadonly = class extends ZodType {
    _parse(input) {
      const result = this._def.innerType._parse(input);
      const freeze = (data) => {
        if (isValid(data)) {
          data.value = Object.freeze(data.value);
        }
        return data;
      };
      return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams(params)
    });
  };
  function cleanParams(params, data) {
    const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
    const p2 = typeof p === "string" ? { message: p } : p;
    return p2;
  }
  function custom(check, _params = {}, fatal) {
    if (check)
      return ZodAny.create().superRefine((data, ctx) => {
        const r = check(data);
        if (r instanceof Promise) {
          return r.then((r2) => {
            if (!r2) {
              const params = cleanParams(_params, data);
              const _fatal = params.fatal ?? fatal ?? true;
              ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
            }
          });
        }
        if (!r) {
          const params = cleanParams(_params, data);
          const _fatal = params.fatal ?? fatal ?? true;
          ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
        }
        return;
      });
    return ZodAny.create();
  }
  var late = {
    object: ZodObject.lazycreate
  };
  var ZodFirstPartyTypeKind;
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  var instanceOfType = (cls, params = {
    message: `Input not instance of ${cls.name}`
  }) => custom((data) => data instanceof cls, params);
  var stringType = ZodString.create;
  var numberType = ZodNumber.create;
  var nanType = ZodNaN.create;
  var bigIntType = ZodBigInt.create;
  var booleanType = ZodBoolean.create;
  var dateType = ZodDate.create;
  var symbolType = ZodSymbol.create;
  var undefinedType = ZodUndefined.create;
  var nullType = ZodNull.create;
  var anyType = ZodAny.create;
  var unknownType = ZodUnknown.create;
  var neverType = ZodNever.create;
  var voidType = ZodVoid.create;
  var arrayType = ZodArray.create;
  var objectType = ZodObject.create;
  var strictObjectType = ZodObject.strictCreate;
  var unionType = ZodUnion.create;
  var discriminatedUnionType = ZodDiscriminatedUnion.create;
  var intersectionType = ZodIntersection.create;
  var tupleType = ZodTuple.create;
  var recordType = ZodRecord.create;
  var mapType = ZodMap.create;
  var setType = ZodSet.create;
  var functionType = ZodFunction.create;
  var lazyType = ZodLazy.create;
  var literalType = ZodLiteral.create;
  var enumType = ZodEnum.create;
  var nativeEnumType = ZodNativeEnum.create;
  var promiseType = ZodPromise.create;
  var effectsType = ZodEffects.create;
  var optionalType = ZodOptional.create;
  var nullableType = ZodNullable.create;
  var preprocessType = ZodEffects.createWithPreprocess;
  var pipelineType = ZodPipeline.create;
  var ostring = () => stringType().optional();
  var onumber = () => numberType().optional();
  var oboolean = () => booleanType().optional();
  var coerce = {
    string: (arg) => ZodString.create({ ...arg, coerce: true }),
    number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
    boolean: (arg) => ZodBoolean.create({
      ...arg,
      coerce: true
    }),
    bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
    date: (arg) => ZodDate.create({ ...arg, coerce: true })
  };
  var NEVER = INVALID;

  // packages/core/src/types.ts
  var ToolActionSchema = external_exports.object({
    name: external_exports.string().describe("The name of the diagnostic tool to execute."),
    arguments: external_exports.record(external_exports.any()).describe("The key-value arguments for the chosen tool.")
  });
  var DebugReflectionSchema = external_exports.object({
    evaluation_previous_goal: external_exports.string().describe(
      "Evaluation of the last diagnostic step result. State whether the previous hypothesis was confirmed, refuted, or yielded unexpected clues."
    ),
    working_hypothesis: external_exports.string().describe(
      'Current working causal theory of the root cause (e.g. "Network 401 error caused token expiration, cascading into undefined state in UserProfile").'
    ),
    memory: external_exports.string().describe(
      "Cumulative persistent discoveries and confirmed facts retained across investigation steps."
    ),
    next_goal: external_exports.string().describe(
      "The immediate sub-goal for this step to verify or advance the hypothesis."
    ),
    action: ToolActionSchema.describe("The single diagnostic tool action to dispatch.")
  });

  // packages/core/src/DrDebugCore.ts
  var DrDebugCore = class {
    controller;
    llmClient;
    tools = /* @__PURE__ */ new Map();
    constructor(controller, llmClient, customTools) {
      this.controller = controller;
      this.llmClient = llmClient;
      const toolsToRegister = customTools || createDefaultTools();
      toolsToRegister.forEach((tool) => {
        this.tools.set(tool.name, tool);
      });
    }
    registerTool(tool) {
      this.tools.set(tool.name, tool);
    }
    getRegisteredTools() {
      return Array.from(this.tools.values());
    }
    normalizeToolName(name) {
      const cleaned = (name || "").trim().toLowerCase();
      if (this.tools.has(cleaned)) return cleaned;
      const aliases = {
        inspect_network_request: "inspect_request",
        inspect_network: "inspect_request",
        inspect_errors: "inspect_error",
        inspect_exception: "inspect_error",
        inspect_dom: "inspect_element",
        eval_js: "execute_javascript",
        eval_javascript: "execute_javascript",
        run_javascript: "execute_javascript",
        get_storage: "check_storage",
        inspect_storage: "check_storage",
        finish: "done",
        complete: "done",
        conclude: "done"
      };
      return aliases[cleaned] || cleaned;
    }
    async investigate(goal, options = {}) {
      const startTime = Date.now();
      const maxSteps = options.maxSteps ?? 8;
      const steps = [];
      const memoryStore = {};
      let cumulativeMemory = "No findings yet.";
      const toolContext = {
        controller: this.controller,
        memory: memoryStore,
        signal: options.signal
      };
      const initialDebugState = this.controller.serialize();
      const messages = [
        {
          role: "system",
          content: getSystemPrompt()
        },
        {
          role: "user",
          content: `Investigation Goal: "${goal}"

Current Browser State:
${initialDebugState}

Please analyze the telemetry, formulate your working hypothesis, and choose the first diagnostic action.`
        }
      ];
      const toolDefs = Array.from(this.tools.values()).map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }));
      for (let stepNumber = 1; stepNumber <= maxSteps; stepNumber++) {
        if (options.signal?.aborted) {
          return {
            goal,
            status: "aborted",
            diagnosis: "Investigation was aborted by user signal.",
            rootCause: "Aborted",
            confidence: 0,
            steps,
            durationMs: Date.now() - startTime,
            finalMemory: cumulativeMemory
          };
        }
        options.onStepStart?.(stepNumber);
        const response = await this.llmClient.chat(messages, toolDefs, options.signal);
        const rawContent = response.content || "";
        let reflection = null;
        try {
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            const validated = DebugReflectionSchema.safeParse(parsed);
            if (validated.success) {
              reflection = validated.data;
            }
          }
        } catch {
        }
        if (!reflection && response.toolCalls && response.toolCalls.length > 0) {
          const firstCall = response.toolCalls[0];
          let toolArgs = {};
          try {
            toolArgs = JSON.parse(firstCall.function.arguments || "{}");
          } catch {
          }
          if (toolArgs && typeof toolArgs === "object" && toolArgs.action && toolArgs.action.name) {
            reflection = {
              evaluation_previous_goal: toolArgs.evaluation_previous_goal || "Direct tool dispatch from function call.",
              working_hypothesis: toolArgs.working_hypothesis || "Evaluating diagnostic action.",
              memory: toolArgs.memory || cumulativeMemory,
              next_goal: toolArgs.next_goal || `Execute ${toolArgs.action.name}`,
              action: {
                name: toolArgs.action.name,
                arguments: toolArgs.action.arguments || toolArgs.action.parameters || {}
              }
            };
          } else {
            reflection = {
              evaluation_previous_goal: "Direct tool dispatch from model function calling.",
              working_hypothesis: "Evaluating selected diagnostic tool.",
              memory: cumulativeMemory,
              next_goal: `Execute ${firstCall.function.name}`,
              action: {
                name: firstCall.function.name,
                arguments: toolArgs
              }
            };
          }
        }
        if (!reflection) {
          reflection = {
            evaluation_previous_goal: "Parsed raw text output.",
            working_hypothesis: "Analyzing console & network anomalies.",
            memory: cumulativeMemory,
            next_goal: "Inspect initial errors",
            action: {
              name: "inspect_error",
              arguments: { errorIndex: 0 }
            }
          };
        }
        cumulativeMemory = reflection.memory || cumulativeMemory;
        options.onReflection?.(reflection);
        const actionName = this.normalizeToolName(reflection.action.name);
        const actionArgs = reflection.action.arguments || {};
        const targetTool = this.tools.get(actionName);
        options.onToolExecute?.(actionName, actionArgs);
        let toolResult = "";
        if (!targetTool) {
          toolResult = `Error: Tool "${actionName}" does not exist in registry. Available tools: ${Array.from(this.tools.keys()).join(", ")}`;
        } else {
          try {
            toolResult = await targetTool.execute(actionArgs, toolContext);
          } catch (err) {
            toolResult = `Tool execution error: ${err.message}`;
          }
        }
        options.onToolResult?.(actionName, toolResult);
        const agentStep = {
          stepNumber,
          reflection,
          toolCall: {
            name: actionName,
            arguments: actionArgs
          },
          toolResult,
          timestamp: Date.now()
        };
        steps.push(agentStep);
        if (actionName === "done") {
          const finalData = memoryStore["finalResult"] || actionArgs;
          const result = {
            goal,
            status: "resolved",
            diagnosis: finalData.diagnosis || "Root cause identified.",
            rootCause: finalData.rootCause || "Diagnostic conclusion reached.",
            fix: finalData.fix,
            confidence: finalData.confidence ?? 0.9,
            filesToModify: finalData.filesToModify,
            steps,
            durationMs: Date.now() - startTime,
            finalMemory: cumulativeMemory
          };
          options.onDone?.(result);
          return result;
        }
        messages.push({
          role: "assistant",
          content: JSON.stringify(reflection, null, 2)
        });
        messages.push({
          role: "user",
          content: `Tool Result for [${actionName}]:
${toolResult}

Evaluate this evidence and proceed to the next step.`
        });
      }
      const unresolvedResult = {
        goal,
        status: "max_steps_exceeded",
        diagnosis: "Investigation exceeded maximum diagnostic steps without reaching a verified conclusion.",
        rootCause: steps[steps.length - 1]?.reflection.working_hypothesis || "Inconclusive",
        confidence: 0.3,
        steps,
        durationMs: Date.now() - startTime,
        finalMemory: cumulativeMemory
      };
      options.onDone?.(unresolvedResult);
      return unresolvedResult;
    }
  };

  // packages/llms/src/LiteRTClient.ts
  var LiteRTClient = class {
    modelPath;
    modelName;
    device;
    temperature;
    maxTokens;
    engine;
    isInitialized = false;
    constructor(config = {}) {
      this.modelPath = config.modelPath || "models/gemma-2b-it.litertlm";
      this.modelName = config.modelName || "gemma-2b-it";
      this.device = config.device || "webgpu";
      this.temperature = config.temperature ?? 0.1;
      this.maxTokens = config.maxTokens ?? 2048;
      this.engine = config.engine;
    }
    async init() {
      if (this.isInitialized) return;
      if (this.engine?.init) {
        await this.engine.init();
      }
      this.isInitialized = true;
    }
    async chat(messages, tools, signal) {
      await this.init();
      if (signal?.aborted) {
        throw new DOMException("Operation aborted", "AbortError");
      }
      const prompt = this.formatPrompt(messages, tools);
      let rawText = "";
      if (this.engine?.generate) {
        rawText = await this.engine.generate(prompt, {
          maxTokens: this.maxTokens,
          temperature: this.temperature,
          signal
        });
      } else {
        rawText = this.fallbackInference(messages, tools);
      }
      return this.parseResponse(rawText);
    }
    formatPrompt(messages, tools) {
      let prompt = "";
      let toolInstructions = "";
      if (tools && tools.length > 0) {
        toolInstructions = `
You have access to the following diagnostic tools:
`;
        for (const t of tools) {
          toolInstructions += `
- ${t.function.name}: ${t.function.description}
  Schema: ${JSON.stringify(t.function.parameters)}
`;
        }
        toolInstructions += `
To call a tool, respond with a JSON object wrapped in <tool_call> tags:
<tool_call>{"name": "tool_name", "arguments": { ... }}</tool_call>
`;
      }
      for (const msg of messages) {
        if (msg.role === "system") {
          prompt += `<start_of_turn>system
${msg.content}${toolInstructions}<end_of_turn>
`;
        } else if (msg.role === "user") {
          prompt += `<start_of_turn>user
${msg.content}<end_of_turn>
`;
        } else if (msg.role === "assistant") {
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            const toolCallStr = msg.tool_calls.map((tc) => `<tool_call>{"name":"${tc.function.name}","arguments":${tc.function.arguments}}</tool_call>`).join("\n");
            prompt += `<start_of_turn>model
${msg.content ? `${msg.content}
` : ""}${toolCallStr}<end_of_turn>
`;
          } else {
            prompt += `<start_of_turn>model
${msg.content}<end_of_turn>
`;
          }
        } else if (msg.role === "tool") {
          prompt += `<start_of_turn>tool
[Result for ${msg.name || "tool"}]: ${msg.content}<end_of_turn>
`;
        }
      }
      prompt += `<start_of_turn>model
`;
      return prompt;
    }
    parseResponse(text) {
      const trimmed = text.trim();
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
              type: "function",
              function: {
                name: parsed.name,
                arguments: typeof parsed.arguments === "string" ? parsed.arguments : JSON.stringify(parsed.arguments || {})
              }
            });
          }
        } catch {
        }
      }
      if (toolCalls.length === 0 && trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.name && (parsed.arguments || parsed.parameters)) {
            toolCalls.push({
              id: `litert_call_${Date.now()}_0`,
              type: "function",
              function: {
                name: parsed.name,
                arguments: JSON.stringify(parsed.arguments || parsed.parameters || {})
              }
            });
            cleanContent = "";
          }
        } catch {
        }
      }
      if (toolCalls.length > 0) {
        cleanContent = cleanContent.replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "").trim();
      }
      const estimatedTokens = Math.ceil(text.length / 4);
      return {
        content: cleanContent || (toolCalls.length > 0 ? null : text),
        toolCalls: toolCalls.length > 0 ? toolCalls : void 0,
        usage: {
          promptTokens: 0,
          completionTokens: estimatedTokens,
          totalTokens: estimatedTokens
        },
        finishReason: toolCalls.length > 0 ? "tool_calls" : "stop"
      };
    }
    fallbackInference(messages, tools) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "user" && tools && tools.length > 0) {
        return `<tool_call>{"name": "${tools[0].function.name}", "arguments": {}}</tool_call>`;
      }
      return "Dr. Debug LiteRT engine ready. No active anomaly detected.";
    }
  };

  // packages/llms/src/OpenAIClient.ts
  var OpenAIClient = class {
    apiKey;
    baseURL;
    model;
    temperature;
    maxTokens;
    headers;
    constructor(config) {
      this.apiKey = config.apiKey || "";
      this.baseURL = (config.baseURL || "https://api.openai.com/v1").replace(/\/+$/, "");
      this.model = config.model || "gpt-4o";
      this.temperature = config.temperature ?? 0.1;
      this.maxTokens = config.maxTokens ?? 2048;
      this.headers = config.headers || {};
    }
    async chat(messages, tools, signal) {
      const url = `${this.baseURL}/chat/completions`;
      const body = {
        model: this.model,
        messages: messages.map((m) => {
          const msg = {
            role: m.role,
            content: m.content
          };
          if (m.name) msg.name = m.name;
          if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
          if (m.tool_calls) msg.tool_calls = m.tool_calls;
          return msg;
        }),
        temperature: this.temperature,
        max_tokens: this.maxTokens
      };
      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = "auto";
      }
      let maxRetries = 3;
      let delay = 1e3;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            ...this.headers
          },
          body: JSON.stringify(body),
          signal
        });
        if (response.status === 429 && attempt < maxRetries) {
          let waitMs = delay;
          try {
            const errJson = await response.clone().json();
            const match = errJson?.error?.message?.match(/try again in ([\d\.]+)s/);
            if (match) {
              waitMs = Math.ceil(parseFloat(match[1]) * 1e3) + 200;
            }
          } catch {
          }
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          delay *= 2;
          continue;
        }
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
        }
        const data = await response.json();
        const choice = data.choices?.[0];
        return {
          content: choice?.message?.content ?? null,
          toolCalls: choice?.message?.tool_calls,
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens
          } : void 0,
          finishReason: choice?.finish_reason
        };
      }
      throw new Error("OpenAI API request failed: Max retries exceeded");
    }
  };

  // packages/ui/src/components/CockpitPanel.ts
  var CockpitPanel = class {
    constructor(onClose, onInvestigate) {
      this.onClose = onClose;
      this.onInvestigate = onInvestigate;
      this.element = document.createElement("div");
      this.element.className = "dr-debug-modal hidden";
      const header = document.createElement("div");
      header.className = "dr-debug-header";
      const title = document.createElement("div");
      title.className = "dr-debug-title";
      title.innerHTML = "<span>\u{1FA7A}</span> <span>Dr. Debug Cockpit</span>";
      const closeBtn = document.createElement("button");
      closeBtn.className = "dr-debug-close-btn";
      closeBtn.innerHTML = "\u2715";
      closeBtn.title = "Close Cockpit";
      closeBtn.addEventListener("click", () => this.onClose());
      header.appendChild(title);
      header.appendChild(closeBtn);
      const tabs = document.createElement("div");
      tabs.className = "dr-debug-tabs";
      this.tabTimeline = document.createElement("button");
      this.tabTimeline.className = "dr-debug-tab active";
      this.tabTimeline.textContent = "Diagnostic Timeline";
      this.tabTimeline.addEventListener("click", () => this.switchTab("timeline"));
      this.tabTriage = document.createElement("button");
      this.tabTriage.className = "dr-debug-tab";
      this.tabTriage.textContent = "Triage Stream";
      this.tabTriage.addEventListener("click", () => this.switchTab("triage"));
      tabs.appendChild(this.tabTimeline);
      tabs.appendChild(this.tabTriage);
      const body = document.createElement("div");
      body.className = "dr-debug-body";
      this.timelineContainer = document.createElement("div");
      this.timelineContainer.style.display = "flex";
      this.timelineContainer.style.flexDirection = "column";
      this.timelineContainer.style.gap = "10px";
      this.triageContainer = document.createElement("div");
      this.triageContainer.style.display = "none";
      this.triageContainer.style.flexDirection = "column";
      this.triageContainer.style.gap = "10px";
      body.appendChild(this.timelineContainer);
      body.appendChild(this.triageContainer);
      const queryBox = document.createElement("div");
      queryBox.className = "dr-debug-query-box";
      this.queryInput = document.createElement("input");
      this.queryInput.className = "dr-debug-input";
      this.queryInput.placeholder = "Ask Dr. Debug to investigate (e.g. Why did checkout fail?)...";
      this.queryInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.triggerInvestigate();
      });
      this.queryButton = document.createElement("button");
      this.queryButton.className = "dr-debug-btn";
      this.queryButton.textContent = "Diagnose";
      this.queryButton.addEventListener("click", () => this.triggerInvestigate());
      queryBox.appendChild(this.queryInput);
      queryBox.appendChild(this.queryButton);
      this.element.appendChild(header);
      this.element.appendChild(tabs);
      this.element.appendChild(body);
      this.element.appendChild(queryBox);
      this.renderEmptyTimeline();
    }
    element;
    timelineContainer;
    triageContainer;
    queryInput;
    queryButton;
    tabTimeline;
    tabTriage;
    activeTab = "timeline";
    steps = [];
    getElement() {
      return this.element;
    }
    show() {
      this.element.classList.remove("hidden");
    }
    hide() {
      this.element.classList.add("hidden");
    }
    toggle() {
      this.element.classList.toggle("hidden");
    }
    isVisible() {
      return !this.element.classList.contains("hidden");
    }
    setBusy(busy) {
      this.queryInput.disabled = busy;
      this.queryButton.disabled = busy;
      this.queryButton.textContent = busy ? "Diagnosing..." : "Diagnose";
    }
    switchTab(tab) {
      this.activeTab = tab;
      if (tab === "timeline") {
        this.tabTimeline.classList.add("active");
        this.tabTriage.classList.remove("active");
        this.timelineContainer.style.display = "flex";
        this.triageContainer.style.display = "none";
      } else {
        this.tabTriage.classList.add("active");
        this.tabTimeline.classList.remove("active");
        this.triageContainer.style.display = "flex";
        this.timelineContainer.style.display = "none";
      }
    }
    clearTimeline() {
      this.steps = [];
      this.timelineContainer.innerHTML = "";
    }
    renderEmptyTimeline() {
      this.timelineContainer.innerHTML = `
      <div style="color: #8b949e; text-align: center; padding: 40px 10px; font-size: 12px;">
        <div style="font-size: 28px; margin-bottom: 8px;">\u{1FA7A}</div>
        <strong>Dr. Debug is observing runtime telemetry.</strong>
        <p style="margin-top: 4px; color: #6e7681;">Click "Diagnose" or trigger an anomaly to begin autonomous Re-Act investigation.</p>
      </div>
    `;
    }
    addStep(step) {
      if (this.steps.length === 0) {
        this.timelineContainer.innerHTML = "";
      }
      this.steps.push(step);
      const stepCard = document.createElement("div");
      stepCard.className = "dr-debug-step-card";
      const header = document.createElement("div");
      header.className = "dr-debug-step-header";
      const numSpan = document.createElement("span");
      numSpan.className = "dr-debug-step-num";
      numSpan.textContent = `Step ${step.stepNumber}`;
      const toolBadge = document.createElement("span");
      toolBadge.className = "dr-debug-step-tool";
      toolBadge.textContent = step.toolName;
      header.appendChild(numSpan);
      header.appendChild(toolBadge);
      const thought = document.createElement("div");
      thought.className = "dr-debug-step-thought";
      thought.textContent = `\u{1F4A1} Hypothesis: ${step.hypothesis}`;
      stepCard.appendChild(header);
      stepCard.appendChild(thought);
      if (step.toolOutput) {
        const output = document.createElement("div");
        output.className = "dr-debug-step-output";
        output.textContent = step.toolOutput;
        stepCard.appendChild(output);
      }
      this.timelineContainer.appendChild(stepCard);
      this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight;
    }
    showPrescription(prescription) {
      const card = document.createElement("div");
      card.className = "dr-debug-prescription-card";
      const title = document.createElement("div");
      title.className = "dr-debug-prescription-title";
      title.innerHTML = `<span>\u2705 Root Cause Diagnosis</span> <span style="font-size: 11px; color: #8b949e;">(${Math.round((prescription.confidence ?? 0.95) * 100)}% Confidence)</span>`;
      const diagnosisText = document.createElement("div");
      diagnosisText.style.color = "#f0f6fc";
      diagnosisText.style.fontSize = "12px";
      diagnosisText.innerHTML = `<strong>Finding:</strong> ${this.escapeHtml(prescription.diagnosis)}`;
      const rootCauseText = document.createElement("div");
      rootCauseText.style.color = "#8b949e";
      rootCauseText.style.fontSize = "12px";
      rootCauseText.innerHTML = `<strong>Root Cause:</strong> ${this.escapeHtml(prescription.rootCause)}`;
      card.appendChild(title);
      card.appendChild(diagnosisText);
      card.appendChild(rootCauseText);
      if (prescription.filesToModify && prescription.filesToModify.length > 0) {
        const filesDiv = document.createElement("div");
        filesDiv.style.fontSize = "11px";
        filesDiv.style.color = "#58a6ff";
        filesDiv.textContent = `Target Files: ${prescription.filesToModify.join(", ")}`;
        card.appendChild(filesDiv);
      }
      if (prescription.fix) {
        const diffContainer = document.createElement("div");
        diffContainer.className = "dr-debug-prescription-diff";
        diffContainer.innerHTML = this.formatDiffHtml(prescription.fix);
        const copyBtn = document.createElement("button");
        copyBtn.className = "dr-debug-copy-btn";
        copyBtn.textContent = "\u{1F4CB} Copy Patch";
        copyBtn.addEventListener("click", () => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(prescription.fix);
            copyBtn.textContent = "\u2705 Copied!";
            setTimeout(() => {
              copyBtn.textContent = "\u{1F4CB} Copy Patch";
            }, 2e3);
          }
        });
        card.appendChild(diffContainer);
        card.appendChild(copyBtn);
      }
      this.timelineContainer.appendChild(card);
      this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight;
    }
    updateTriage(telemetry) {
      this.triageContainer.innerHTML = "";
      if (telemetry.errors.length > 0) {
        for (const err of telemetry.errors) {
          const item = document.createElement("div");
          item.className = "dr-debug-telemetry-item error";
          item.innerHTML = `<strong>Console / Runtime Error:</strong><span>${this.escapeHtml(err)}</span>`;
          this.triageContainer.appendChild(item);
        }
      }
      if (telemetry.slowRequests.length > 0) {
        for (const req of telemetry.slowRequests) {
          const item = document.createElement("div");
          item.className = "dr-debug-telemetry-item warn";
          item.innerHTML = `<strong>Slow Network Call:</strong><span>${this.escapeHtml(req)}</span>`;
          this.triageContainer.appendChild(item);
        }
      }
      if (telemetry.memory) {
        const item = document.createElement("div");
        item.className = "dr-debug-telemetry-item ok";
        item.innerHTML = `<strong>Memory Health:</strong><span>Heap: ${telemetry.memory.usedMB || 0}MB / ${telemetry.memory.totalMB || 0}MB</span>`;
        this.triageContainer.appendChild(item);
      }
      if (this.triageContainer.children.length === 0) {
        this.triageContainer.innerHTML = `
        <div style="color: #3fb950; text-align: center; padding: 30px; font-size: 12px;">
          \u2705 No active errors, network delays, or heap leaks detected.
        </div>
      `;
      }
    }
    triggerInvestigate() {
      const query = this.queryInput.value.trim();
      if (!query) return;
      this.setBusy(true);
      this.switchTab("timeline");
      this.onInvestigate(query);
    }
    formatDiffHtml(diff) {
      return diff.split("\n").map((line) => {
        if (line.startsWith("+++") || line.startsWith("---")) {
          return `<div style="color: #8b949e;">${this.escapeHtml(line)}</div>`;
        }
        if (line.startsWith("+")) return `<div class="dr-debug-diff-add">${this.escapeHtml(line)}</div>`;
        if (line.startsWith("-")) return `<div class="dr-debug-diff-del">${this.escapeHtml(line)}</div>`;
        return `<div>${this.escapeHtml(line)}</div>`;
      }).join("");
    }
    escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
  };

  // packages/ui/src/components/FloatingPill.ts
  var FloatingPill = class {
    element;
    badgeText;
    pulseDot;
    isDragging = false;
    startX = 0;
    startY = 0;
    initialX = 0;
    initialY = 0;
    hasMoved = false;
    constructor(onClick) {
      this.element = document.createElement("div");
      this.element.className = "dr-debug-pill";
      this.element.title = "Dr. Debug - Click to open Cockpit";
      this.pulseDot = document.createElement("span");
      this.pulseDot.className = "dr-debug-pulse";
      const icon = document.createElement("span");
      icon.className = "dr-debug-pill-icon";
      icon.textContent = "\u{1FA7A}";
      this.badgeText = document.createElement("span");
      this.badgeText.className = "dr-debug-pill-badge";
      this.badgeText.textContent = "Dr. Debug";
      this.element.appendChild(this.pulseDot);
      this.element.appendChild(icon);
      this.element.appendChild(this.badgeText);
      this.element.addEventListener("click", (e) => {
        if (!this.hasMoved) {
          onClick();
        }
      });
      this.initDraggable();
    }
    getElement() {
      return this.element;
    }
    updateStatus(errorCount, slowNetCount, isRunning = false) {
      if (isRunning) {
        this.pulseDot.className = "dr-debug-pulse running";
        this.badgeText.textContent = "Diagnosing...";
        return;
      }
      if (errorCount > 0 || slowNetCount > 0) {
        this.pulseDot.className = "dr-debug-pulse error";
        const parts = [];
        if (errorCount > 0) parts.push(`${errorCount} Error${errorCount > 1 ? "s" : ""}`);
        if (slowNetCount > 0) parts.push(`${slowNetCount} Slow`);
        this.badgeText.textContent = `\u26A0\uFE0F ${parts.join(" | ")}`;
      } else {
        this.pulseDot.className = "dr-debug-pulse";
        this.badgeText.textContent = "Dr. Debug \u2705";
      }
    }
    initDraggable() {
      const onMouseDown = (e) => {
        this.isDragging = true;
        this.hasMoved = false;
        this.startX = e.clientX;
        this.startY = e.clientY;
        const rect = this.element.getBoundingClientRect();
        this.initialX = rect.left;
        this.initialY = rect.top;
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      };
      const onMouseMove = (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.startX;
        const dy = e.clientY - this.startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          this.hasMoved = true;
          this.element.style.left = `${this.initialX + dx}px`;
          this.element.style.top = `${this.initialY + dy}px`;
          this.element.style.right = "auto";
          this.element.style.bottom = "auto";
        }
      };
      const onMouseUp = () => {
        this.isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      this.element.addEventListener("mousedown", onMouseDown);
    }
  };

  // packages/ui/src/styles.ts
  var shadowStyles = `
:host {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  color: #e6edf3;
  z-index: 2147483647;
  position: fixed;
  pointer-events: none;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.dr-debug-pill {
  pointer-events: auto;
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(13, 17, 23, 0.92);
  border: 1px solid rgba(48, 54, 61, 0.8);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(12px);
  padding: 8px 14px;
  border-radius: 9999px;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-pill:hover {
  background: rgba(22, 27, 34, 0.98);
  border-color: #58a6ff;
  transform: translateY(-2px);
}

.dr-debug-pill-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
}

.dr-debug-pill-badge {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.2px;
  color: #f0f6fc;
}

.dr-debug-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3fb950;
}

.dr-debug-pulse.error {
  background: #f85149;
  box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.7);
  animation: pulse-red 1.6s infinite;
}

.dr-debug-pulse.running {
  background: #a371f7;
  box-shadow: 0 0 0 0 rgba(163, 113, 247, 0.7);
  animation: pulse-purple 1.2s infinite;
}

@keyframes pulse-red {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(248, 81, 73, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(248, 81, 73, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(248, 81, 73, 0); }
}

@keyframes pulse-purple {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(163, 113, 247, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(163, 113, 247, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(163, 113, 247, 0); }
}

/* Main Cockpit Drawer */
.dr-debug-modal {
  pointer-events: auto;
  position: fixed;
  bottom: 80px;
  right: 24px;
  width: 480px;
  max-width: calc(100vw - 48px);
  max-height: 680px;
  height: 600px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-modal.hidden {
  display: none;
}

@keyframes modal-fade-in {
  from { opacity: 0; transform: translateY(12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Header */
.dr-debug-header {
  padding: 12px 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dr-debug-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 14px;
  color: #58a6ff;
}

.dr-debug-close-btn {
  background: transparent;
  border: none;
  color: #8b949e;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.15s;
}

.dr-debug-close-btn:hover {
  color: #f0f6fc;
  background: #21262d;
}

/* Navigation Tabs */
.dr-debug-tabs {
  display: flex;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 0 8px;
}

.dr-debug-tab {
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: #8b949e;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
}

.dr-debug-tab.active {
  color: #58a6ff;
  border-bottom-color: #58a6ff;
}

.dr-debug-tab:hover:not(.active) {
  color: #c9d1d9;
}

/* Body Content */
.dr-debug-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Search / Prompt Query Bar */
.dr-debug-query-box {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: #161b22;
  border-top: 1px solid #30363d;
}

.dr-debug-input {
  flex: 1;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 8px 12px;
  color: #f0f6fc;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.dr-debug-input:focus {
  border-color: #58a6ff;
}

.dr-debug-btn {
  background: #238636;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 8px 14px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.dr-debug-btn:hover {
  background: #2ea043;
}

.dr-debug-btn:disabled {
  background: #21262d;
  color: #6e7681;
  cursor: not-allowed;
}

/* Step Card & Timeline */
.dr-debug-step-card {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
}

.dr-debug-step-num {
  font-weight: 700;
  color: #a371f7;
}

.dr-debug-step-tool {
  background: #21262d;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: #58a6ff;
}

.dr-debug-step-thought {
  color: #8b949e;
  font-style: italic;
  font-size: 12px;
}

.dr-debug-step-output {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 6px;
  padding: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  color: #c9d1d9;
}

/* Final Diagnosis / Prescription Card */
.dr-debug-prescription-card {
  background: #1c2128;
  border: 1px solid #3fb950;
  border-radius: 8px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dr-debug-prescription-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #3fb950;
  font-size: 13px;
}

.dr-debug-prescription-diff {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 6px;
  padding: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre;
}

.dr-debug-diff-add {
  color: #3fb950;
  background: rgba(63, 185, 80, 0.15);
}

.dr-debug-diff-del {
  color: #f85149;
  background: rgba(248, 81, 73, 0.15);
}

.dr-debug-copy-btn {
  align-self: flex-end;
  background: #21262d;
  color: #c9d1d9;
  border: 1px solid #30363d;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.dr-debug-copy-btn:hover {
  background: #30363d;
  color: #f0f6fc;
}

/* Telemetry Items */
.dr-debug-telemetry-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: #161b22;
  border: 1px solid #21262d;
  border-radius: 6px;
  font-size: 12px;
}

.dr-debug-telemetry-item.error {
  border-left: 3px solid #f85149;
}

.dr-debug-telemetry-item.warn {
  border-left: 3px solid #d29922;
}

.dr-debug-telemetry-item.ok {
  border-left: 3px solid #3fb950;
}
`;

  // packages/ui/src/DrDebugUI.ts
  var DrDebugUI = class {
    host;
    shadowRoot;
    pill;
    cockpit;
    constructor(options = {}) {
      const parent = options.container || document.body || document.documentElement;
      let host = document.getElementById("dr-debug-root");
      if (!host) {
        host = document.createElement("div");
        host.id = "dr-debug-root";
        parent.appendChild(host);
      }
      this.host = host;
      this.shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = "";
      const styleEl = document.createElement("style");
      styleEl.textContent = shadowStyles;
      this.shadowRoot.appendChild(styleEl);
      this.cockpit = new CockpitPanel(
        () => this.cockpit.hide(),
        async (query) => {
          if (options.onInvestigate) {
            try {
              await options.onInvestigate(query);
            } finally {
              this.cockpit.setBusy(false);
            }
          } else {
            this.cockpit.setBusy(false);
          }
        }
      );
      this.pill = new FloatingPill(() => {
        this.cockpit.toggle();
      });
      this.shadowRoot.appendChild(this.pill.getElement());
      this.shadowRoot.appendChild(this.cockpit.getElement());
    }
    getShadowRoot() {
      return this.shadowRoot;
    }
    getHost() {
      return this.host;
    }
    updatePillStatus(errorCount, slowNetCount, isRunning = false) {
      this.pill.updateStatus(errorCount, slowNetCount, isRunning);
    }
    addTimelineStep(step) {
      this.cockpit.addStep(step);
    }
    showPrescription(prescription) {
      this.cockpit.showPrescription(prescription);
      this.cockpit.setBusy(false);
    }
    updateTriage(telemetry) {
      this.cockpit.updateTriage(telemetry);
    }
    clearTimeline() {
      this.cockpit.clearTimeline();
    }
    toggleCockpit() {
      this.cockpit.toggle();
    }
    openCockpit() {
      this.cockpit.show();
    }
    closeCockpit() {
      this.cockpit.hide();
    }
    destroy() {
      if (this.host.parentNode) {
        this.host.parentNode.removeChild(this.host);
      }
    }
  };

  // packages/dr-debug/src/DrDebug.ts
  var DrDebug = class {
    controller;
    core;
    llmClient;
    ui;
    options;
    isAutoInvestigating = false;
    constructor(options = {}) {
      this.options = options;
      this.controller = new DebugController();
      this.controller.init();
      if (options.llmClient) {
        this.llmClient = options.llmClient;
      } else if (options.liteRT || options.model && options.model.toLowerCase().includes("litert")) {
        this.llmClient = new LiteRTClient(options.liteRT || { modelName: options.model });
      } else if (options.apiKey || options.baseURL || options.model) {
        this.llmClient = new OpenAIClient({
          apiKey: options.apiKey || "",
          baseURL: options.baseURL,
          model: options.model || "gpt-4o"
        });
      } else {
        this.llmClient = new LiteRTClient(options.liteRT);
      }
      this.core = new DrDebugCore(this.controller, this.llmClient);
      const shouldEnableUI = options.enableUI !== false && typeof document !== "undefined";
      if (shouldEnableUI) {
        this.ui = new DrDebugUI({
          onInvestigate: async (goal) => {
            await this.investigate(goal);
          }
        });
        this.syncUIStatus();
      }
      if (options.autoInvestigate && typeof window !== "undefined") {
        window.addEventListener("error", () => this.handleAutoTrigger());
        window.addEventListener("unhandledrejection", () => this.handleAutoTrigger());
      }
    }
    getController() {
      return this.controller;
    }
    getCore() {
      return this.core;
    }
    getUI() {
      return this.ui;
    }
    async investigate(goal, options = {}) {
      const activeGoal = goal || "Diagnose all active browser errors, network failures, and performance bottlenecks.";
      this.ui?.updatePillStatus(
        this.controller.getConsoleEntries().filter((e) => e.level === "error").length,
        this.controller.getNetworkRecords().filter((r) => r.isSlow || r.isFailed).length,
        true
      );
      let currentHypothesis = "Evaluating telemetry...";
      let currentStepNumber = 1;
      try {
        const result = await this.core.investigate(activeGoal, {
          maxSteps: options.maxSteps ?? this.options.maxSteps ?? 5,
          signal: options.signal,
          onStepStart: (stepNumber) => {
            currentStepNumber = stepNumber;
            options.onStepStart?.(stepNumber);
          },
          onReflection: (reflection) => {
            currentHypothesis = reflection.working_hypothesis;
            options.onReflection?.(reflection);
          },
          onToolResult: (toolName, toolResult) => {
            this.ui?.addTimelineStep({
              stepNumber: currentStepNumber,
              hypothesis: currentHypothesis,
              toolName,
              toolOutput: toolResult
            });
            options.onToolResult?.(toolName, toolResult);
          },
          onDone: (res) => {
            options.onDone?.(res);
          }
        });
        if (this.ui) {
          this.ui.showPrescription({
            diagnosis: result.diagnosis,
            rootCause: result.rootCause,
            fix: result.fix || "",
            confidence: result.confidence,
            filesToModify: result.filesToModify
          });
        }
        return result;
      } finally {
        this.syncUIStatus();
      }
    }
    syncUIStatus() {
      if (!this.ui) return;
      const errors = this.controller.getConsoleEntries().filter((e) => e.level === "error");
      const slowNet = this.controller.getNetworkRecords().filter((r) => r.isSlow || r.isFailed);
      const memory = this.controller.getMemorySnapshot();
      this.ui.updatePillStatus(errors.length, slowNet.length, false);
      this.ui.updateTriage({
        errors: errors.map((e) => e.message),
        slowRequests: slowNet.map((r) => `${r.method} ${r.url} (${Math.round(r.duration || 0)}ms)`),
        memory: memory ? {
          usedMB: Math.round((memory.usedJSHeapSize || 0) / (1024 * 1024)),
          totalMB: Math.round((memory.totalJSHeapSize || 0) / (1024 * 1024))
        } : void 0
      });
    }
    async handleAutoTrigger() {
      if (this.isAutoInvestigating) return;
      this.isAutoInvestigating = true;
      try {
        await this.investigate("Investigate recent runtime error");
      } catch {
      } finally {
        this.isAutoInvestigating = false;
      }
    }
    destroy() {
      this.controller.destroy();
      this.ui?.destroy();
    }
  };
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.dataset) {
      const dataset = currentScript.dataset;
      if (dataset.model || dataset.apiKey || dataset.autoInit !== "false") {
        const instance = new DrDebug({
          model: dataset.model,
          apiKey: dataset.apiKey,
          baseURL: dataset.baseUrl,
          autoInvestigate: dataset.autoInvestigate === "true",
          language: dataset.lang || "en-US"
        });
        window.drDebug = instance;
      }
    }
  }

  // packages/extension/src/content.ts
  var ContentScriptBridge = class {
    instance;
    init() {
      if (typeof window === "undefined") return;
      this.instance = new DrDebug({
        enableUI: true,
        autoInvestigate: false
      });
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message.type === "DR_DEBUG_TRIGGER_INVESTIGATION") {
            this.instance?.investigate(message.goal).then((result) => {
              sendResponse({ status: "success", result });
            }).catch((err) => {
              sendResponse({ status: "error", error: err.message });
            });
            return true;
          }
          if (message.type === "DR_DEBUG_GET_LIVE_TELEMETRY") {
            const controller = this.instance?.getController();
            sendResponse({
              snapshot: controller?.getSnapshot()
            });
            return false;
          }
        });
      }
    }
    getInstance() {
      return this.instance;
    }
    destroy() {
      this.instance?.destroy();
    }
  };
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const bridge = new ContentScriptBridge();
    bridge.init();
    window.__DR_DEBUG_BRIDGE__ = bridge;
  }
})();
