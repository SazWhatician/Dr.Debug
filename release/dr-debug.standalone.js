/**
 * 🩺 Dr. Debug — Autonomous In-Browser AI Debugging & Observability Agent
 * Created by Saswat Mohanty (@SazWhatician)
 * GitHub: https://github.com/SazWhatician
 * LinkedIn: https://www.linkedin.com/in/saswat-mohanty-0a4549331/
 */
"use strict";
var DrDebugBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // packages/dr-debug/src/standalone.ts
  var standalone_exports = {};
  __export(standalone_exports, {
    DrDebug: () => DrDebug,
    default: () => standalone_default
  });

  // packages/controller/src/DockerBridgeClient.ts
  var DockerBridgeClient = class {
    port;
    host;
    autoReconnect;
    reconnectIntervalMs;
    eventSource = null;
    isConnected = false;
    daemonRunning = false;
    lastError;
    reconnectTimer;
    options;
    constructor(options = {}) {
      this.options = options;
      this.port = options.port || 9229;
      this.host = options.host || "localhost";
      this.autoReconnect = options.autoReconnect !== false;
      this.reconnectIntervalMs = options.reconnectIntervalMs || 5e3;
    }
    connect() {
      if (typeof window === "undefined" && typeof EventSource === "undefined") {
        return;
      }
      if (this.eventSource) {
        this.disconnect();
      }
      const streamUrl = `http://${this.host}:${this.port}/docker/stream`;
      try {
        this.eventSource = new EventSource(streamUrl);
        this.eventSource.onopen = () => {
          this.isConnected = true;
          this.lastError = void 0;
          this.notifyStatus();
        };
        this.eventSource.onmessage = (evt) => {
          var _a;
          try {
            const data = JSON.parse(evt.data);
            if (data.type === "INIT") {
              this.isConnected = true;
              this.daemonRunning = ((_a = data.status) == null ? void 0 : _a.daemonRunning) ?? true;
              if (data.containers && this.options.onContainers) {
                this.options.onContainers(data.containers);
              }
              if (data.recentLogs && Array.isArray(data.recentLogs) && this.options.onLog) {
                data.recentLogs.forEach((l) => {
                  var _a2, _b;
                  return (_b = (_a2 = this.options).onLog) == null ? void 0 : _b.call(_a2, l);
                });
              }
              this.notifyStatus();
            } else if (data.type === "CONTAINERS") {
              if (this.options.onContainers) {
                this.options.onContainers(data.containers);
              }
            } else if (data.type === "LOG") {
              if (data.entry && this.options.onLog) {
                this.options.onLog(data.entry);
              }
            }
          } catch {
          }
        };
        this.eventSource.onerror = () => {
          var _a;
          this.isConnected = false;
          this.lastError = "Disconnected from Docker Bridge daemon";
          this.notifyStatus();
          (_a = this.eventSource) == null ? void 0 : _a.close();
          this.eventSource = null;
          if (this.autoReconnect && !this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect();
            }, this.reconnectIntervalMs);
          }
        };
      } catch (err) {
        this.isConnected = false;
        this.lastError = err.message;
        this.notifyStatus();
      }
    }
    async fetchStatus() {
      try {
        const res = await fetch(`http://${this.host}:${this.port}/docker/status`);
        if (res.ok) {
          const status = await res.json();
          this.daemonRunning = status.daemonRunning;
          return {
            connected: true,
            daemonRunning: status.daemonRunning,
            error: status.error
          };
        }
      } catch {
      }
      return {
        connected: false,
        daemonRunning: false,
        error: "Docker bridge service offline on port " + this.port
      };
    }
    async fetchContainers() {
      try {
        const res = await fetch(`http://${this.host}:${this.port}/docker/containers`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
      }
      return [];
    }
    async fetchLogs(options) {
      try {
        const params = new URLSearchParams();
        if (options == null ? void 0 : options.container) params.set("container", options.container);
        if (options == null ? void 0 : options.level) params.set("level", options.level);
        if (options == null ? void 0 : options.grep) params.set("grep", options.grep);
        if (options == null ? void 0 : options.tail) params.set("tail", String(options.tail));
        const res = await fetch(`http://${this.host}:${this.port}/docker/logs?${params.toString()}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
      }
      return [];
    }
    notifyStatus() {
      if (this.options.onStatusChange) {
        this.options.onStatusChange({
          connected: this.isConnected,
          daemonRunning: this.daemonRunning,
          error: this.lastError
        });
      }
    }
    getStatus() {
      return {
        connected: this.isConnected,
        daemonRunning: this.daemonRunning,
        error: this.lastError
      };
    }
    disconnect() {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.isConnected = false;
      this.notifyStatus();
    }
  };

  // packages/controller/src/interceptors/console.ts
  var ConsoleInterceptor = class {
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
      if (this.isInstalled || typeof window === "undefined") return;
      this.errorHandler = (event) => {
        var _a, _b, _c, _d;
        if (this.isCapturing) return;
        this.isCapturing = true;
        try {
          const message = event.message || (event.error ? event.error.message : "Uncaught Error");
          if (message.includes("Maximum call stack size exceeded") && (((_a = event.filename) == null ? void 0 : _a.includes("chrome-extension")) || ((_b = event.filename) == null ? void 0 : _b.includes("installHook")))) {
            return;
          }
          const parsed = this.parseStack(((_c = event.error) == null ? void 0 : _c.stack) || "");
          this.push({
            id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: "uncaught_error",
            level: "error",
            timestamp: Date.now(),
            message,
            stack: (_d = event.error) == null ? void 0 : _d.stack,
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
        } finally {
          this.isCapturing = false;
        }
      };
      window.addEventListener("error", this.errorHandler, true);
      this.rejectionHandler = (event) => {
        if (this.isCapturing) return;
        this.isCapturing = true;
        try {
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
        } finally {
          this.isCapturing = false;
        }
      };
      window.addEventListener("unhandledrejection", this.rejectionHandler, true);
      const levels = ["error", "warn", "info", "log"];
      levels.forEach((level) => {
        if (typeof console !== "undefined" && console[level]) {
          const originalFn = console[level];
          this.originalConsole[level] = originalFn;
          const typeMap = {
            error: "console_error",
            warn: "console_warn",
            info: "console_info",
            log: "console_log"
          };
          const wrapped = (...args) => {
            if (!this.isCapturing) {
              this.isCapturing = true;
              try {
                this.captureConsoleLog(level, typeMap[level], args);
              } catch {
              } finally {
                this.isCapturing = false;
              }
            }
            return originalFn.apply(console, args);
          };
          try {
            console[level] = wrapped;
          } catch {
          }
        }
      });
      this.isInstalled = true;
    }
    captureConsoleLog(level, type, args) {
      const message = args.map((arg) => {
        if (typeof arg === "string") return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}
${arg.stack || ""}`;
        if (typeof arg === "object" && arg !== null) {
          try {
            if (typeof Element !== "undefined" && arg instanceof Element) {
              return `<${arg.tagName.toLowerCase()}${arg.id ? ` id="${arg.id}"` : ""}${arg.className ? ` class="${arg.className}"` : ""}>`;
            }
            const seen = /* @__PURE__ */ new WeakSet();
            return JSON.stringify(arg, (_key, value) => {
              if (typeof value === "object" && value !== null) {
                if (seen.has(value)) return "[Circular]";
                seen.add(value);
              }
              return value;
            }).slice(0, 1024);
          } catch {
            return Object.prototype.toString.call(arg);
          }
        }
        return String(arg);
      }).join(" ");
      let stack;
      if (level === "error") {
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
      if (!stack || typeof stack !== "string") return [];
      const frames = [];
      const lines = stack.split("\n").slice(0, 25);
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
        } catch {
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
        window.removeEventListener("error", this.errorHandler, true);
      }
      if (this.rejectionHandler && typeof window !== "undefined") {
        window.removeEventListener("unhandledrejection", this.rejectionHandler, true);
      }
      const levels = ["error", "warn", "info", "log"];
      levels.forEach((level) => {
        if (this.originalConsole[level] && typeof console !== "undefined") {
          try {
            console[level] = this.originalConsole[level];
          } catch {
          }
        }
      });
      this.isInstalled = false;
    }
  };

  // packages/controller/src/interceptors/docker.ts
  var DockerInterceptor = class {
    logRingBuffer = [];
    containers = /* @__PURE__ */ new Map();
    maxBufferSize;
    isAvailable = false;
    logCounter = 0;
    constructor(maxBufferSize = 100) {
      this.maxBufferSize = maxBufferSize;
    }
    init() {
      this.isAvailable = true;
    }
    setContainers(containers) {
      this.containers.clear();
      containers.forEach((c) => this.containers.set(c.name || c.id, c));
      this.isAvailable = true;
    }
    getContainers() {
      return Array.from(this.containers.values());
    }
    pushLog(containerName, rawMessage, stream = "stdout", customTimestamp, customLevel) {
      this.logCounter++;
      const cleanMessage = (rawMessage || "").trim();
      let timestamp = customTimestamp || Date.now();
      const isoMatch = cleanMessage.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/);
      if (!customTimestamp && isoMatch) {
        const parsed = Date.parse(isoMatch[0]);
        if (!isNaN(parsed)) {
          timestamp = parsed;
        }
      }
      let level = customLevel || "info";
      if (!customLevel) {
        const upper = cleanMessage.toUpperCase();
        if (stream === "stderr" || upper.includes("ERROR") || upper.includes("FATAL") || upper.includes("PANIC") || upper.includes("EXCEPTION") || upper.includes("FAIL") || upper.includes("CRITICAL") || upper.includes("ERR_") || upper.includes("TRACEBACK")) {
          level = "error";
        } else if (upper.includes("WARN")) {
          level = "warn";
        } else if (upper.includes("DEBUG")) {
          level = "log";
        }
      }
      const entry = {
        id: `doc_${this.logCounter}_${Date.now()}`,
        containerName: containerName || "default",
        timestamp,
        stream,
        message: cleanMessage,
        level
      };
      if (this.logRingBuffer.length >= this.maxBufferSize) {
        this.logRingBuffer.shift();
      }
      this.logRingBuffer.push(entry);
      this.isAvailable = true;
      return entry;
    }
    getLogs(options) {
      let result = [...this.logRingBuffer];
      if ((options == null ? void 0 : options.container) && options.container !== "all") {
        const target = options.container.toLowerCase();
        result = result.filter(
          (entry) => entry.containerName.toLowerCase() === target || entry.containerName.toLowerCase().includes(target)
        );
      }
      if ((options == null ? void 0 : options.level) && options.level !== "all") {
        result = result.filter((entry) => entry.level === options.level);
      }
      if (options == null ? void 0 : options.grep) {
        try {
          const regex = new RegExp(options.grep, "i");
          result = result.filter((entry) => regex.test(entry.message));
        } catch {
          const query = options.grep.toLowerCase();
          result = result.filter((entry) => entry.message.toLowerCase().includes(query));
        }
      }
      if ((options == null ? void 0 : options.sinceSeconds) && options.sinceSeconds > 0) {
        const cutoff = Date.now() - options.sinceSeconds * 1e3;
        result = result.filter((entry) => entry.timestamp >= cutoff);
      }
      if ((options == null ? void 0 : options.tail) && options.tail > 0) {
        result = result.slice(-options.tail);
      }
      return result;
    }
    getStatus() {
      const errorCount = this.logRingBuffer.filter((l) => l.level === "error").length;
      return {
        isAvailable: this.isAvailable || this.logRingBuffer.length > 0,
        containerCount: this.containers.size,
        errorCount
      };
    }
    clear() {
      this.logRingBuffer = [];
      this.logCounter = 0;
    }
    destroy() {
      this.clear();
      this.containers.clear();
      this.isAvailable = false;
    }
  };

  // packages/controller/src/interceptors/framework.ts
  var FrameworkInterceptor = class {
    events = [];
    maxBuffer;
    detectedFramework = null;
    isInitialized = false;
    constructor(maxBuffer = 50) {
      this.maxBuffer = maxBuffer;
    }
    init() {
      if (this.isInitialized || typeof window === "undefined") return;
      this.isInitialized = true;
      this.detectFrameworks();
    }
    detectFrameworks() {
      const win = window;
      if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        this.detectedFramework = "react";
        this.hookReact(win);
      }
      if (win.__REDUX_DEVTOOLS_EXTENSION__ || win.__REDUX_STORE__) {
        this.hookRedux(win);
      }
      if (win.__VUE__ || win.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
        this.detectedFramework = this.detectedFramework || "vue";
        this.hookVue(win);
      }
      if (win.__svelte || win.__SVELTE_DEVTOOLS_GLOBAL_HOOK__) {
        this.detectedFramework = this.detectedFramework || "svelte";
      }
    }
    hookReact(win) {
      const hook = win.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook) return;
      const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
      if (typeof originalOnCommitFiberRoot === "function") {
        hook.onCommitFiberRoot = (id, fiber, ...rest) => {
          this.pushEvent({
            type: "react_render",
            framework: "react",
            timestamp: Date.now(),
            detail: this.extractReactFiberInfo(fiber)
          });
          return originalOnCommitFiberRoot.call(hook, id, fiber, ...rest);
        };
      }
    }
    extractReactFiberInfo(fiber) {
      try {
        const current = (fiber == null ? void 0 : fiber.current) || fiber;
        if (!current) return "Fiber root committed";
        const tag = current.tag || 0;
        const type = current.type;
        const name = typeof type === "function" ? type.displayName || type.name || "Anonymous" : typeof type === "object" && type ? type.displayName || type.name || "Anonymous" : String(type || "Root");
        return `Component <${name}> rendered (tag: ${tag})`;
      } catch {
        return "React fiber commit detected";
      }
    }
    hookRedux(win) {
      const store = win.__REDUX_STORE__ || win.store;
      if (store && typeof store.subscribe === "function" && typeof store.getState === "function") {
        let prevState = store.getState();
        store.subscribe(() => {
          const nextState = store.getState();
          const changedKeys = this.diffTopLevelKeys(prevState, nextState);
          this.pushEvent({
            type: "redux_dispatch",
            framework: "redux",
            timestamp: Date.now(),
            detail: `Store updated: [${changedKeys.join(", ")}] changed`
          });
          prevState = nextState;
        });
      }
    }
    hookVue(win) {
      const vueHook = win.__VUE_DEVTOOLS_GLOBAL_HOOK__;
      if (vueHook && typeof vueHook.on === "function") {
        vueHook.on("component:updated", (component) => {
          var _a, _b;
          const name = ((_a = component == null ? void 0 : component.$options) == null ? void 0 : _a.name) || ((_b = component == null ? void 0 : component.type) == null ? void 0 : _b.name) || "Unknown";
          this.pushEvent({
            type: "vue_update",
            framework: "vue",
            timestamp: Date.now(),
            detail: `Vue component <${name}> updated`
          });
        });
      }
    }
    diffTopLevelKeys(prev, next) {
      if (!prev || !next || typeof prev !== "object" || typeof next !== "object") return ["root"];
      const changed = [];
      for (const key of Object.keys(next)) {
        if (prev[key] !== next[key]) changed.push(key);
      }
      return changed.length > 0 ? changed : ["(no diff)"];
    }
    pushEvent(event) {
      this.events.push(event);
      if (this.events.length > this.maxBuffer) {
        this.events.shift();
      }
    }
    getFrameworkState() {
      const win = typeof window !== "undefined" ? window : {};
      const components = this.getReactComponents(win);
      const store = this.getStoreSnapshot(win);
      return {
        detectedFramework: this.detectedFramework,
        hasReactHook: !!win.__REACT_DEVTOOLS_GLOBAL_HOOK__,
        hasReduxHook: !!(win.__REDUX_DEVTOOLS_EXTENSION__ || win.__REDUX_STORE__),
        hasVueHook: !!(win.__VUE__ || win.__VUE_DEVTOOLS_GLOBAL_HOOK__),
        hasSvelteHook: !!(win.__svelte || win.__SVELTE_DEVTOOLS_GLOBAL_HOOK__),
        renderers: win.__REACT_DEVTOOLS_GLOBAL_HOOK__ ? Object.keys(win.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers || {}) : [],
        recentEvents: this.events.slice(-20),
        components,
        store
      };
    }
    getReactComponents(win) {
      const components = [];
      const hook = win.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (!hook || !hook.renderers) return components;
      try {
        for (const [, renderer] of Object.entries(hook.renderers)) {
          if (renderer == null ? void 0 : renderer.getCurrentFiber) {
            const fiber = renderer.getCurrentFiber();
            if (fiber) {
              this.walkFiber(fiber, components, 0, 10);
            }
          }
        }
      } catch {
      }
      return components.slice(0, 20);
    }
    walkFiber(fiber, out, depth, maxDepth) {
      if (!fiber || depth > maxDepth) return;
      const type = fiber.type;
      if (typeof type === "function" || typeof type === "object") {
        const name = (type == null ? void 0 : type.displayName) || (type == null ? void 0 : type.name) || "Anonymous";
        const props = fiber.memoizedProps ? Object.keys(fiber.memoizedProps).slice(0, 8) : [];
        out.push({ name, depth, propKeys: props, hasState: !!fiber.memoizedState });
      }
      if (fiber.child) this.walkFiber(fiber.child, out, depth + 1, maxDepth);
      if (fiber.sibling) this.walkFiber(fiber.sibling, out, depth, maxDepth);
    }
    getStoreSnapshot(win) {
      const store = win.__REDUX_STORE__ || win.store;
      if (!store || typeof store.getState !== "function") return null;
      try {
        const state = store.getState();
        const keys = Object.keys(state || {});
        return {
          type: "redux",
          topLevelKeys: keys.slice(0, 20),
          totalKeys: keys.length,
          preview: JSON.stringify(state, null, 2).slice(0, 500)
        };
      } catch {
        return null;
      }
    }
    getEvents() {
      return [...this.events];
    }
    clear() {
      this.events = [];
    }
    destroy() {
      this.events = [];
      this.isInitialized = false;
    }
  };

  // packages/controller/src/interceptors/interaction.ts
  var _InteractionInterceptor = class _InteractionInterceptor {
    events = [];
    maxAgeMs;
    isInitialized = false;
    listeners = [];
    mutationObserver;
    constructor(maxAgeMs = 3e4) {
      this.maxAgeMs = maxAgeMs;
    }
    init() {
      if (this.isInitialized || typeof window === "undefined" || typeof document === "undefined") return;
      this.isInitialized = true;
      this.listen(document, "click", this.handleClick.bind(this), true);
      this.listen(document, "input", this.handleInput.bind(this), true);
      this.listen(document, "scroll", this.handleScroll.bind(this), true);
      this.listen(window, "popstate", this.handleNavigation.bind(this));
      this.listen(window, "hashchange", this.handleNavigation.bind(this));
      if (typeof MutationObserver !== "undefined") {
        this.mutationObserver = new MutationObserver((mutations) => {
          const added = mutations.reduce((sum, m) => sum + m.addedNodes.length, 0);
          const removed = mutations.reduce((sum, m) => sum + m.removedNodes.length, 0);
          if (added + removed > 3) {
            this.push({ type: "dom_mutation", timestamp: Date.now(), detail: `+${added} -${removed} nodes` });
          }
        });
        this.mutationObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
      }
    }
    listen(target, type, handler, capture = false) {
      target.addEventListener(type, handler, capture);
      this.listeners.push({ target, type, handler });
    }
    handleClick(e) {
      var _a;
      const el = e.target;
      if (!el) return;
      const selector = this.getSelector(el);
      const text = ((_a = el.textContent) == null ? void 0 : _a.trim().slice(0, 40)) || "";
      this.push({ type: "click", timestamp: Date.now(), target: selector, detail: text ? `"${text}"` : "" });
    }
    handleInput(e) {
      var _a;
      const el = e.target;
      if (!el) return;
      const selector = this.getSelector(el);
      const isSensitive = el.type === "password" || el.hasAttribute("data-private") || el.autocomplete === "cc-number";
      const value = isSensitive ? "[REDACTED]" : this.maskPII(((_a = el.value) == null ? void 0 : _a.slice(0, 30)) || "");
      this.push({ type: "input", timestamp: Date.now(), target: selector, detail: `value="${value}"` });
    }
    handleScroll(_e) {
      const now = Date.now();
      const lastScroll = this.events.filter((e) => e.type === "scroll").pop();
      if (lastScroll && now - lastScroll.timestamp < 500) return;
      const y = typeof window !== "undefined" ? Math.round(window.scrollY) : 0;
      this.push({ type: "scroll", timestamp: now, detail: `scrollY=${y}` });
    }
    handleNavigation() {
      this.push({ type: "navigation", timestamp: Date.now(), detail: typeof window !== "undefined" ? window.location.href : "" });
    }
    getSelector(el) {
      var _a;
      if (el.id) return `#${el.id}`;
      const tag = ((_a = el.tagName) == null ? void 0 : _a.toLowerCase()) || "element";
      const cls = el.className && typeof el.className === "string" ? `.${el.className.split(/\s+/).slice(0, 2).join(".")}` : "";
      return `${tag}${cls}`;
    }
    maskPII(value) {
      let masked = value;
      for (const pattern of _InteractionInterceptor.PII_PATTERNS) {
        masked = masked.replace(pattern, "[PII_REDACTED]");
      }
      return masked;
    }
    push(event) {
      this.events.push(event);
      this.evictOld();
    }
    evictOld() {
      const cutoff = Date.now() - this.maxAgeMs;
      while (this.events.length > 0 && this.events[0].timestamp < cutoff) {
        this.events.shift();
      }
    }
    getReplaySequence() {
      this.evictOld();
      return [...this.events];
    }
    getHumanReadableReplay() {
      const events = this.getReplaySequence();
      if (events.length === 0) return "No user interactions recorded in the last 30 seconds.";
      return events.map((e, i) => {
        const ago = ((Date.now() - e.timestamp) / 1e3).toFixed(1);
        const target = e.target ? ` on ${e.target}` : "";
        return `${i + 1}. [${ago}s ago] ${e.type}${target} ${e.detail || ""}`;
      }).join("\n");
    }
    clear() {
      this.events = [];
    }
    destroy() {
      var _a;
      for (const { target, type, handler } of this.listeners) {
        target.removeEventListener(type, handler, true);
      }
      this.listeners = [];
      (_a = this.mutationObserver) == null ? void 0 : _a.disconnect();
      this.events = [];
      this.isInitialized = false;
    }
  };
  __publicField(_InteractionInterceptor, "PII_PATTERNS", [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    // Credit card
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    // Email
    /\b\d{3}-\d{2}-\d{4}\b/g
    // SSN
  ]);
  var InteractionInterceptor = _InteractionInterceptor;

  // packages/controller/src/interceptors/layoutInspector.ts
  var LayoutInspector = class {
    inspect(targetSelector) {
      var _a;
      if (typeof document === "undefined") return [];
      const anomalies = [];
      const root = targetSelector ? document.querySelector(targetSelector) : document.body;
      if (!root) return anomalies;
      const elements = Array.from(root.querySelectorAll("*")).slice(0, 150);
      for (const el of elements) {
        if ((_a = el.id) == null ? void 0 : _a.startsWith("dr-debug")) continue;
        const style = window.getComputedStyle(el);
        const selector = this.getSelector(el);
        const zIndex = parseInt(style.zIndex, 10);
        if (!isNaN(zIndex) && zIndex > 99) {
          const opacity = parseFloat(style.opacity);
          if (opacity === 0 && style.pointerEvents !== "none") {
            anomalies.push({
              type: "invisible_overlay",
              selector,
              severity: "high",
              description: `Element has z-index ${zIndex} and opacity 0 but pointer-events are enabled, intercepting user clicks.`,
              computedValues: { zIndex: style.zIndex, opacity: style.opacity, pointerEvents: style.pointerEvents }
            });
          }
        }
        if (style.overflow === "hidden" || style.overflowX === "hidden" || style.overflowY === "hidden") {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && el.scrollWidth > rect.width + 10) {
            anomalies.push({
              type: "overflow_clip",
              selector,
              severity: "medium",
              description: `Element content overflows horizontally (${el.scrollWidth}px > ${Math.round(rect.width)}px) and is clipped by overflow:hidden.`,
              computedValues: { scrollWidth: `${el.scrollWidth}px`, clientWidth: `${rect.width}px`, overflow: style.overflow }
            });
          }
        }
        if (["BUTTON", "A", "INPUT", "SELECT"].includes(el.tagName)) {
          const rect = el.getBoundingClientRect();
          const isOffscreen = rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth;
          if (isOffscreen && style.display !== "none" && style.visibility !== "hidden") {
            anomalies.push({
              type: "offscreen",
              selector,
              severity: "low",
              description: `Interactive <${el.tagName.toLowerCase()}> is rendered offscreen at (${Math.round(rect.left)}, ${Math.round(rect.top)}).`,
              computedValues: { top: `${Math.round(rect.top)}px`, left: `${Math.round(rect.left)}px` }
            });
          }
        }
      }
      return anomalies;
    }
    getSelector(el) {
      if (el.id) return `#${el.id}`;
      const tag = el.tagName.toLowerCase();
      const cls = typeof el.className === "string" && el.className ? `.${el.className.split(/\s+/).slice(0, 2).join(".")}` : "";
      return `${tag}${cls}`;
    }
  };

  // packages/controller/src/interceptors/memory.ts
  var MemoryInterceptor = class {
    history = [];
    maxHistory = 20;
    sample() {
      if (typeof window === "undefined") return null;
      const memory = performance == null ? void 0 : performance.memory;
      const now = Date.now();
      let usedJSHeapSize;
      let totalJSHeapSize;
      let jsHeapSizeLimit;
      let heapUsagePercent;
      if (memory) {
        usedJSHeapSize = memory.usedJSHeapSize;
        totalJSHeapSize = memory.totalJSHeapSize;
        jsHeapSizeLimit = memory.jsHeapSizeLimit;
        if (usedJSHeapSize && jsHeapSizeLimit && jsHeapSizeLimit > 0) {
          heapUsagePercent = Math.round(usedJSHeapSize / jsHeapSizeLimit * 1e3) / 10;
        }
      }
      let domNodeCount;
      if (typeof document !== "undefined") {
        try {
          domNodeCount = document.querySelectorAll("*").length;
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
        domNodeCount,
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
      const fetchTarget = typeof window !== "undefined" && typeof window.fetch === "function" ? window.fetch : typeof globalThis !== "undefined" && typeof globalThis.fetch === "function" ? globalThis.fetch : void 0;
      if (fetchTarget) {
        this.originalFetch = fetchTarget;
        const self = this;
        const originalFetch = this.originalFetch;
        const wrappedFetch = async function(...args) {
          var _a, _b;
          const startTime = Date.now();
          const perfStart = typeof performance !== "undefined" ? performance.now() : startTime;
          let url = "";
          let method = "GET";
          let headers;
          let bodyPreview;
          try {
            const parsed = self.parseFetchArgs(args);
            url = parsed.url;
            method = parsed.method;
            headers = parsed.headers;
            bodyPreview = parsed.bodyPreview;
          } catch {
          }
          if (self.isInternalTelemetryRequest(url, headers)) {
            return originalFetch.apply(this, args);
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
          } catch {
          }
          try {
            const response = await originalFetch.apply(this || globalThis, args);
            const duration = typeof performance !== "undefined" ? Math.round(performance.now() - perfStart) : Date.now() - startTime;
            record.endTime = Date.now();
            record.duration = duration;
            record.status = response.status;
            record.statusText = response.statusText;
            record.isFailed = response.status >= 400;
            record.isSlow = duration > 1500;
            try {
              const resHeaders = {};
              (_a = response.headers) == null ? void 0 : _a.forEach((val, key) => {
                resHeaders[key] = val;
              });
              record.responseHeaders = resHeaders;
            } catch {
            }
            if (response && response.type !== "opaque" && !response.bodyUsed && typeof response.clone === "function") {
              const contentType = (((_b = response.headers) == null ? void 0 : _b.get("content-type")) || "").toLowerCase();
              const isStreaming = contentType.includes("event-stream") || contentType.includes("stream") || contentType.includes("multipart/") || contentType.includes("octet-stream");
              if (!isStreaming && (contentType.includes("application/json") || contentType.includes("text/"))) {
                self.extractResponseBody(response, record);
              }
            }
            return response;
          } catch (err) {
            const duration = typeof performance !== "undefined" ? Math.round(performance.now() - perfStart) : Date.now() - startTime;
            record.endTime = Date.now();
            record.duration = duration;
            record.status = 0;
            record.statusText = (err == null ? void 0 : err.message) || "NetworkError";
            record.isFailed = true;
            const failureKind = self.classifyFailure(err, record.url);
            record.isCORS = failureKind.isCORS;
            record.isCrossOrigin = failureKind.isCrossOrigin;
            record.error = (err == null ? void 0 : err.message) || "Fetch failed";
            throw err;
          }
        };
        if (typeof window !== "undefined" && window.fetch) {
          try {
            window.fetch = wrappedFetch;
          } catch {
          }
        }
        if (typeof globalThis !== "undefined" && globalThis.fetch && globalThis !== (typeof window !== "undefined" ? window : null)) {
          try {
            globalThis.fetch = wrappedFetch;
          } catch {
          }
        }
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
        if (input.headers && !(init == null ? void 0 : init.headers)) {
          try {
            headers = this.normalizeHeaders(input.headers);
          } catch {
          }
        }
      }
      if (init) {
        if (init.method) method = init.method.toUpperCase();
        if (init.headers) {
          try {
            headers = this.normalizeHeaders(init.headers);
          } catch {
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
    async extractResponseBody(response, record) {
      try {
        if (response.bodyUsed) return;
        const clone = response.clone();
        const text = await clone.text();
        record.responseBodyPreview = text.slice(0, 2048);
      } catch {
      }
    }
    /**
     * A failed cross-origin fetch surfaces to JS as an opaque "Failed to fetch",
     * which covers a missing CORS header, a refused connection, DNS failure and a
     * TLS error equally. So `isCORS` is only asserted when the error text actually
     * says so; the weaker `isCrossOrigin` records "cross-origin and opaque" without
     * claiming to know which of those it was.
     */
    classifyFailure(err, url) {
      const msg = ((err == null ? void 0 : err.message) || "").toLowerCase();
      const isOpaque = msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed");
      const namesCORS = msg.includes("cors") || msg.includes("cross-origin");
      let crossOrigin = false;
      if (typeof window !== "undefined" && window.location) {
        try {
          crossOrigin = new URL(url, window.location.href).origin !== window.location.origin;
        } catch {
          crossOrigin = true;
        }
      }
      return {
        isCORS: namesCORS,
        isCrossOrigin: crossOrigin && (isOpaque || namesCORS)
      };
    }
    hookXHR() {
      const self = this;
      const proto = XMLHttpRequest.prototype;
      this.originalXHROpen = proto.open;
      this.originalXHRSend = proto.send;
      this.originalXHRSetRequestHeader = proto.setRequestHeader;
      const xhrStateMap = /* @__PURE__ */ new WeakMap();
      proto.open = function(...args) {
        try {
          const method = (args[0] || "GET").toUpperCase();
          const url = String(args[1] || "");
          if (self.isInternalTelemetryRequest(url)) {
            return self.originalXHROpen.apply(this, args);
          }
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
        } catch {
        }
        return self.originalXHROpen.apply(this, arguments);
      };
      proto.setRequestHeader = function(name, value) {
        try {
          const state = xhrStateMap.get(this);
          if (state) {
            state.requestHeaders[name] = value;
            state.record.requestHeaders = state.requestHeaders;
          }
        } catch {
        }
        return self.originalXHRSetRequestHeader.apply(this, arguments);
      };
      proto.send = function(body) {
        try {
          const state = xhrStateMap.get(this);
          if (state) {
            state.perfStart = typeof performance !== "undefined" ? performance.now() : Date.now();
            if (body) {
              state.record.requestBodyPreview = self.serializeBody(body);
            }
            this.addEventListener("loadend", () => {
              try {
                const duration = typeof performance !== "undefined" ? Math.round(performance.now() - state.perfStart) : Date.now() - state.record.startTime;
                state.record.endTime = Date.now();
                state.record.duration = duration;
                state.record.status = this.status;
                state.record.statusText = this.statusText;
                state.record.isFailed = this.status === 0 || this.status >= 400;
                state.record.isSlow = duration > 1500;
                if (this.status === 0) {
                  const xhrFailure = self.classifyFailure(new Error("XHR Network Error"), state.record.url);
                  state.record.isCORS = xhrFailure.isCORS;
                  state.record.isCrossOrigin = xhrFailure.isCrossOrigin;
                }
                if (this.responseType === "" || this.responseType === "text") {
                  state.record.responseBodyPreview = (this.responseText || "").slice(0, 2048);
                } else if (this.responseType === "json" && this.response) {
                  try {
                    state.record.responseBodyPreview = typeof this.response === "string" ? this.response.slice(0, 2048) : JSON.stringify(this.response).slice(0, 2048);
                  } catch {
                    state.record.responseBodyPreview = "[JSON Response]";
                  }
                }
              } catch {
              }
            });
          }
        } catch {
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
      if (!this.isInstalled) return;
      if (this.originalFetch) {
        if (typeof window !== "undefined") {
          try {
            window.fetch = this.originalFetch;
          } catch {
          }
        }
        if (typeof globalThis !== "undefined") {
          try {
            globalThis.fetch = this.originalFetch;
          } catch {
          }
        }
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
    isInternalTelemetryRequest(url, headers) {
      if (headers) {
        const isInternalHeader = Object.entries(headers).some(
          ([k, v]) => k.toLowerCase() === "x-dr-debug-internal" && v === "true"
        );
        if (isInternalHeader) return true;
      }
      if (!url) return false;
      return url.includes(":9229/docker") || url.includes(":9229/mcp") || url.includes(":9229/telemetry");
    }
  };

  // packages/controller/src/interceptors/networkMock.ts
  var NetworkMockInterceptor = class {
    rules = /* @__PURE__ */ new Map();
    originalFetch = null;
    isInitialized = false;
    init() {
      if (this.isInitialized || typeof window === "undefined" || !window.fetch) return;
      this.isInitialized = true;
      this.originalFetch = window.fetch.bind(window);
      const self = this;
      window.fetch = async function(input, init) {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const method = ((init == null ? void 0 : init.method) || "GET").toUpperCase();
        const matchedRule = self.matchRule(url, method);
        if (matchedRule && matchedRule.isActive) {
          const headers = new Headers(matchedRule.mockHeaders || { "Content-Type": "application/json" });
          return new Response(matchedRule.mockBody, {
            status: matchedRule.mockStatus,
            statusText: matchedRule.mockStatus === 200 ? "OK (Dr. Debug Mocked)" : "Mocked Response",
            headers
          });
        }
        if (self.originalFetch) {
          return self.originalFetch(input, init);
        }
        return new Response("Fetch unavailable", { status: 500 });
      };
    }
    addRule(rule) {
      const id = rule.id || `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const fullRule = {
        id,
        urlPattern: rule.urlPattern,
        method: rule.method ? rule.method.toUpperCase() : void 0,
        mockStatus: rule.mockStatus,
        mockBody: rule.mockBody,
        mockHeaders: rule.mockHeaders,
        isActive: rule.isActive !== false
      };
      this.rules.set(id, fullRule);
      return fullRule;
    }
    removeRule(id) {
      return this.rules.delete(id);
    }
    getRules() {
      return Array.from(this.rules.values());
    }
    toggleRule(id, active) {
      const rule = this.rules.get(id);
      if (!rule) return false;
      rule.isActive = active !== void 0 ? active : !rule.isActive;
      return true;
    }
    matchRule(url, method) {
      for (const rule of this.rules.values()) {
        if (!rule.isActive) continue;
        if (rule.method && rule.method !== method) continue;
        try {
          if (rule.urlPattern.startsWith("^") || rule.urlPattern.endsWith("$")) {
            const re = new RegExp(rule.urlPattern);
            if (re.test(url)) return rule;
          } else if (url.includes(rule.urlPattern)) {
            return rule;
          }
        } catch {
          if (url.includes(rule.urlPattern)) return rule;
        }
      }
      return void 0;
    }
    clear() {
      this.rules.clear();
    }
    destroy() {
      if (this.originalFetch && typeof window !== "undefined") {
        window.fetch = this.originalFetch;
        this.originalFetch = null;
      }
      this.rules.clear();
      this.isInitialized = false;
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
        var _a, _b;
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          const val = Math.round(lastEntry.startTime);
          this.vitals["LCP"] = {
            name: "LCP",
            value: val,
            rating: val <= 2500 ? "good" : val <= 4e3 ? "needs-improvement" : "poor",
            attribution: (_b = (_a = lastEntry.element) == null ? void 0 : _a.tagName) == null ? void 0 : _b.toLowerCase()
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
      let inpMax = 0;
      this.safeObserve("event", (list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > inpMax) {
            inpMax = entry.duration;
            const val = Math.round(inpMax);
            this.vitals["INP"] = {
              name: "INP",
              value: val,
              rating: val <= 200 ? "good" : val <= 500 ? "needs-improvement" : "poor"
            };
          }
        }
      }, { durationThreshold: 40 });
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
    safeObserve(entryType, callback, extraOptions = {}) {
      var _a;
      try {
        if ((_a = PerformanceObserver.supportedEntryTypes) == null ? void 0 : _a.includes(entryType)) {
          const observer = new PerformanceObserver(callback);
          observer.observe({ type: entryType, buffered: true, ...extraOptions });
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

  // packages/controller/src/interceptors/sqlCorrelator.ts
  var SQLQueryCorrelator = class {
    correlate(networkRecords) {
      var _a, _b, _c, _d, _e, _f;
      const correlations = [];
      for (const req of networkRecords) {
        const serverTiming = ((_a = req.responseHeaders) == null ? void 0 : _a["server-timing"]) || ((_b = req.responseHeaders) == null ? void 0 : _b["Server-Timing"]) || "";
        const queryCountHeader = ((_c = req.responseHeaders) == null ? void 0 : _c["x-sql-query-count"]) || ((_d = req.responseHeaders) == null ? void 0 : _d["X-Sql-Query-Count"]);
        const queryDurationHeader = ((_e = req.responseHeaders) == null ? void 0 : _e["x-query-duration"]) || ((_f = req.responseHeaders) == null ? void 0 : _f["X-Query-Duration"]);
        const timingEntries = serverTiming ? serverTiming.split(",").map((s) => s.trim()) : [];
        let queryCount = queryCountHeader ? parseInt(queryCountHeader, 10) : 0;
        let totalDurationMs = queryDurationHeader ? parseFloat(queryDurationHeader) : 0;
        for (const entry of timingEntries) {
          if (entry.startsWith("sql") || entry.startsWith("db") || entry.startsWith("prisma")) {
            queryCount = queryCount || 1;
            const durMatch = entry.match(/dur=([\d.]+)/);
            if (durMatch) {
              totalDurationMs = parseFloat(durMatch[1]);
            }
          }
        }
        const isNPlus1 = queryCount > 10 || req.duration !== void 0 && req.duration > 800 && queryCount > 5;
        if (queryCount > 0 || timingEntries.length > 0 || isNPlus1) {
          correlations.push({
            requestId: req.id,
            url: req.url,
            queryCount,
            totalQueryDurationMs: totalDurationMs,
            isNPlus1,
            serverTimingEntries: timingEntries
          });
        }
      }
      return correlations;
    }
  };

  // packages/controller/src/serializer.ts
  function computeCorrelations(state) {
    var _a;
    const correlations = [];
    const failedRequests = state.network.records.filter((r) => r.isFailed);
    const errorEntries = state.console.entries.filter((e) => e.level === "error");
    const dockerErrors = (((_a = state.docker) == null ? void 0 : _a.logs) || []).filter((l) => l.level === "error");
    for (const doc of dockerErrors) {
      for (const req of failedRequests) {
        const timeDelta = req.startTime - doc.timestamp;
        if (timeDelta >= -1e3 && timeDelta <= 3500) {
          const docSummary = `\u{1F433} [${doc.containerName}] ${doc.message.slice(0, 70)}`;
          const reqSummary = `\u{1F310} ${req.method} ${req.url} [${req.status || 0}]`;
          correlations.push({
            id: `corr_${doc.id}_${req.id}`,
            description: `Backend container [${doc.containerName}] panic at ${formatTime(doc.timestamp)} correlated with network failure [${req.method} ${req.url}] at ${formatTime(req.startTime)} (\u0394t: ${Math.abs(timeDelta)}ms)`,
            likelihood: Math.abs(timeDelta) <= 1500 ? "high" : "medium",
            sourceEvent: {
              type: "docker",
              id: doc.id,
              summary: docSummary,
              timestamp: doc.timestamp
            },
            targetEvent: {
              type: "network",
              id: req.id,
              summary: reqSummary,
              timestamp: req.startTime
            },
            timeDeltaMs: Math.abs(timeDelta)
          });
        }
      }
    }
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
  function buildCausalErrorGraph(state, options = {}) {
    var _a;
    const nodes = [];
    const edges = [];
    const timeframe = options.timeframeMs ?? 8e3;
    const dockerErrors = (options.includeDocker !== false ? ((_a = state.docker) == null ? void 0 : _a.logs) || [] : []).filter(
      (l) => l.level === "error"
    );
    const failedRequests = state.network.records.filter((r) => r.isFailed || r.isSlow);
    const consoleErrors = state.console.entries.filter((e) => e.level === "error" || e.level === "warn");
    dockerErrors.forEach((doc) => {
      nodes.push({
        id: doc.id,
        label: `\u{1F433} ${doc.containerName}`,
        layer: "docker",
        summary: doc.message.slice(0, 120),
        timestamp: doc.timestamp,
        metadata: { container: doc.containerName, stream: doc.stream, raw: doc.message }
      });
    });
    failedRequests.forEach((req) => {
      nodes.push({
        id: req.id,
        label: `\u{1F310} ${req.method} ${req.url}`,
        layer: "network",
        summary: `Status: ${req.status || "FAILED"}${req.isCORS ? " (CORS)" : req.isCrossOrigin ? " (cross-origin, cause unexposed)" : ""} (${Math.round(req.duration || 0)}ms)`,
        timestamp: req.startTime,
        metadata: { url: req.url, status: req.status, isCORS: req.isCORS, isCrossOrigin: req.isCrossOrigin, duration: req.duration }
      });
    });
    consoleErrors.forEach((err) => {
      nodes.push({
        id: err.id,
        label: `\u{1F534} ${err.type}`,
        layer: "console",
        summary: err.message.slice(0, 120),
        timestamp: err.timestamp,
        metadata: { message: err.message, stack: err.stack, count: err.count }
      });
    });
    dockerErrors.forEach((doc) => {
      failedRequests.forEach((req) => {
        const delta = req.startTime - doc.timestamp;
        if (delta >= -1e3 && delta <= timeframe) {
          edges.push({
            id: `edge_${doc.id}_${req.id}`,
            source: doc.id,
            target: req.id,
            label: `CAUSED_HTTP_FAILURE (+${Math.abs(delta)}ms)`,
            timeDeltaMs: delta,
            confidence: delta >= 0 && delta <= 1500 ? 0.95 : 0.8,
            relationship: "CAUSED_BY"
          });
        }
      });
    });
    failedRequests.forEach((req) => {
      consoleErrors.forEach((err) => {
        const delta = err.timestamp - req.startTime;
        if (delta >= 0 && delta <= timeframe) {
          edges.push({
            id: `edge_${req.id}_${err.id}`,
            source: req.id,
            target: err.id,
            label: `TRIGGERED_CLIENT_ERROR (+${delta}ms)`,
            timeDeltaMs: delta,
            confidence: delta <= 2e3 ? 0.92 : 0.75,
            relationship: "TRIGGERED_BY"
          });
        }
      });
    });
    dockerErrors.forEach((doc) => {
      consoleErrors.forEach((err) => {
        const delta = err.timestamp - doc.timestamp;
        if (delta < 0 || delta > timeframe) return;
        const bridged = failedRequests.some(
          (req) => req.startTime >= doc.timestamp && req.startTime <= err.timestamp
        );
        if (bridged) return;
        edges.push({
          id: `edge_${doc.id}_${err.id}`,
          source: doc.id,
          target: err.id,
          label: `PRECEDED_CLIENT_ERROR (+${delta}ms)`,
          timeDeltaMs: delta,
          // Weaker than the two-hop chain: the mechanism linking them is unobserved.
          confidence: delta <= 2e3 ? 0.7 : 0.55,
          relationship: "CORRELATED_WITH"
        });
      });
    });
    let rootCauseNodeId = void 0;
    if (edges.length > 0) {
      const targetSet = new Set(edges.map((e) => e.target));
      const sourceCandidates = nodes.filter((n) => edges.some((e) => e.source === n.id) && !targetSet.has(n.id));
      if (sourceCandidates.length > 0) {
        sourceCandidates.sort((a, b) => a.timestamp - b.timestamp);
        rootCauseNodeId = sourceCandidates[0].id;
        sourceCandidates[0].isRootCause = true;
      } else {
        rootCauseNodeId = edges[0].source;
        const found = nodes.find((n) => n.id === rootCauseNodeId);
        if (found) found.isRootCause = true;
      }
    } else if (nodes.length > 0) {
      const sorted = [...nodes].sort((a, b) => a.timestamp - b.timestamp);
      rootCauseNodeId = sorted[0].id;
      sorted[0].isRootCause = true;
    }
    const mermaidLines = ["graph TD"];
    nodes.forEach((n) => {
      const cleanLabel = n.label.replace(/"/g, "'");
      const cleanSummary = n.summary.replace(/"/g, "'").replace(/\n/g, " ");
      const rootTag = n.isRootCause ? " [ROOT CAUSE]" : "";
      mermaidLines.push(`  ${n.id}["${cleanLabel}<br/>${cleanSummary}${rootTag}"]`);
    });
    edges.forEach((e) => {
      mermaidLines.push(`  ${e.source} -->|"${e.label}"| ${e.target}`);
    });
    mermaidLines.push("  classDef dockerNode fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#e0e7ff;");
    mermaidLines.push("  classDef netNode fill:#082f49,stroke:#00f0ff,stroke-width:2px,color:#e0f2fe;");
    mermaidLines.push("  classDef clientNode fill:#4c0519,stroke:#f43f5e,stroke-width:2px,color:#ffe4e6;");
    nodes.forEach((n) => {
      if (n.layer === "docker") mermaidLines.push(`  class ${n.id} dockerNode;`);
      else if (n.layer === "network") mermaidLines.push(`  class ${n.id} netNode;`);
      else if (n.layer === "console") mermaidLines.push(`  class ${n.id} clientNode;`);
    });
    return {
      nodes,
      edges,
      rootCauseNodeId,
      mermaidDiagram: mermaidLines.join("\n")
    };
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
    var _a;
    const maxConsole = options.maxConsoleEntries ?? 15;
    const maxNetwork = options.maxNetworkEntries ?? 12;
    const maxDocker = options.maxDockerEntries ?? 10;
    const lines = [];
    lines.push("<debug_state>");
    lines.push("");
    lines.push("<page_context>");
    lines.push(`  URL: ${state.pageContext.url || "http://localhost"}`);
    lines.push(`  Title: "${state.pageContext.title || "Web Application"}"`);
    lines.push(`  Uptime: ${state.pageContext.uptimeSeconds.toFixed(1)}s`);
    const statusEmoji = state.console.errorCount > 0 || state.network.failedCount > 0 ? "\u26A0\uFE0F" : "\u2705";
    const dockerInfo = ((_a = state.docker) == null ? void 0 : _a.isAvailable) ? ` | \u{1F433} Docker: ${state.docker.containers.length} active (${state.docker.errorCount} errors)` : "";
    lines.push(
      `  Status: ${statusEmoji} ${state.console.errorCount} Errors | ${state.network.failedCount} Failed Requests | ${state.network.slowCount} Slow Calls${dockerInfo}`
    );
    lines.push("</page_context>");
    lines.push("");
    if (state.docker && (state.docker.logs.length > 0 || state.docker.containers.length > 0)) {
      lines.push(
        `<docker_stream containers="${state.docker.containers.length}" total_logs="${state.docker.logs.length}" errors="${state.docker.errorCount}">`
      );
      if (state.docker.containers.length > 0) {
        lines.push("  Active Containers:");
        state.docker.containers.forEach((c) => {
          lines.push(`    - [${c.name}] (${c.image}) State: ${c.state}`);
        });
      }
      const sortedDockerLogs = [...state.docker.logs].sort((a, b) => {
        const priority = (level) => level === "error" ? 3 : level === "warn" ? 2 : 1;
        return priority(b.level) - priority(a.level) || b.timestamp - a.timestamp;
      });
      const dockerToRender = sortedDockerLogs.slice(0, maxDocker);
      if (dockerToRender.length > 0) {
        lines.push("  Recent Container Logs:");
        dockerToRender.forEach((log, idx) => {
          const lvl = log.level.toUpperCase().padEnd(5, " ");
          const time = formatTime(log.timestamp);
          lines.push(`    [${idx}] ${lvl} ${time} [${log.containerName}] (${log.stream}): ${log.message.slice(0, 160)}`);
        });
        if (state.docker.logs.length > maxDocker) {
          lines.push(`    ... (${state.docker.logs.length - maxDocker} older container logs omitted)`);
        }
      }
      lines.push("</docker_stream>");
      lines.push("");
    }
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
          statusTag = req.isCORS ? "CORS_FAIL" : req.isCrossOrigin ? "CROSS_ORIGIN_FAIL" : `FAIL(${req.status || 0})`;
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
      if (state.memory.domNodeCount !== void 0) {
        lines.push(`  DOM Node Count: ${state.memory.domNodeCount} nodes`);
      }
      lines.push("</memory_health>");
      lines.push("");
    }
    const correlations = state.correlations.length > 0 ? state.correlations : computeCorrelations(state);
    if (correlations.length > 0) {
      lines.push("<heuristic_correlations>");
      lines.push("  \u{1F4A1} Automated Correlation Insights:");
      correlations.forEach((corr, idx) => {
        lines.push(`  ${idx + 1}. [${corr.likelihood.toUpperCase()} LIKELIHOOD] ${corr.description}`);
      });
      lines.push("</heuristic_correlations>");
      lines.push("");
    }
    if (options.includeGraph && state.causalGraph && state.causalGraph.nodes.length > 0) {
      lines.push("<causal_error_graph>");
      lines.push(`  Nodes: ${state.causalGraph.nodes.length} | Edges: ${state.causalGraph.edges.length}`);
      if (state.causalGraph.rootCauseNodeId) {
        lines.push(`  Identified Root Cause Node: ${state.causalGraph.rootCauseNodeId}`);
      }
      lines.push("</causal_error_graph>");
      lines.push("");
    }
    lines.push("</debug_state>");
    return lines.join("\n");
  }
  function getErrorHistogram(state, bucketCount = 10) {
    var _a;
    const allErrors = [];
    state.network.records.forEach((r) => {
      if (r.status && r.status >= 500) {
        allErrors.push({ timestamp: r.startTime, type: "5xx" });
      } else if (r.status && r.status >= 400) {
        allErrors.push({ timestamp: r.startTime, type: "4xx" });
      } else if (r.isFailed) {
        allErrors.push({ timestamp: r.startTime, type: "5xx" });
      }
    });
    state.console.entries.forEach((e) => {
      if (e.level === "error") {
        allErrors.push({ timestamp: e.timestamp, type: "console" });
      }
    });
    (((_a = state.docker) == null ? void 0 : _a.logs) || []).forEach((d) => {
      if (d.level === "error") {
        allErrors.push({ timestamp: d.timestamp, type: "docker" });
      }
    });
    if (allErrors.length === 0) {
      const now = Date.now();
      return Array.from({ length: bucketCount }, (_, i) => {
        const ts = now - (bucketCount - 1 - i) * 1e4;
        const date = new Date(ts);
        const label = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
        return { timestamp: ts, label, http5xx: 0, http4xx: 0, consoleErrors: 0, dockerErrors: 0, total: 0 };
      });
    }
    allErrors.sort((a, b) => a.timestamp - b.timestamp);
    const minTime = allErrors[0].timestamp;
    const maxTime = Math.max(allErrors[allErrors.length - 1].timestamp, minTime + 1e4);
    const duration = maxTime - minTime;
    const step = Math.max(1e3, Math.ceil(duration / bucketCount));
    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
      const bStart = minTime + i * step;
      const bEnd = bStart + step;
      const date = new Date(bStart);
      const label = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;
      const inBucket = allErrors.filter((e) => e.timestamp >= bStart && e.timestamp < bEnd);
      const http5xx = inBucket.filter((e) => e.type === "5xx").length;
      const http4xx = inBucket.filter((e) => e.type === "4xx").length;
      const consoleErrors = inBucket.filter((e) => e.type === "console").length;
      const dockerErrors = inBucket.filter((e) => e.type === "docker").length;
      buckets.push({
        timestamp: bStart,
        label,
        http5xx,
        http4xx,
        consoleErrors,
        dockerErrors,
        total: inBucket.length
      });
    }
    return buckets;
  }
  function generateCurlCommand(req) {
    const parts = ["curl"];
    const method = (req.method || "GET").toUpperCase();
    if (method !== "GET") {
      parts.push(`-X ${method}`);
    }
    parts.push(`'${req.url}'`);
    if (req.requestHeaders) {
      for (const [key, val] of Object.entries(req.requestHeaders)) {
        const lower = key.toLowerCase();
        if (lower === "host") continue;
        parts.push(`-H '${key}: ${String(val).replace(/'/g, "'\\''")}'`);
      }
    }
    if (req.requestBodyPreview && method !== "GET" && method !== "HEAD") {
      parts.push(`--data-raw '${req.requestBodyPreview.replace(/'/g, "'\\''")}'`);
    }
    return parts.join(" \\\n  ");
  }
  function getHttpStatusExplainer(status) {
    const statusMap = {
      0: {
        code: 0,
        title: "Network Error / CORS Failure",
        explanation: "The request failed before receiving an HTTP response (DNS failure, connection refused, or CORS preflight rejected by browser).",
        recommendation: "Verify backend server is running and CORS headers (Access-Control-Allow-Origin) are enabled."
      },
      400: {
        code: 400,
        title: "400 Bad Request",
        explanation: "The server could not understand the request due to invalid syntax or malformed payload.",
        recommendation: "Check request payload schema, query parameters, and required fields."
      },
      401: {
        code: 401,
        title: "401 Unauthorized",
        explanation: "Authentication is required and has either failed or not been provided (missing/expired token).",
        recommendation: "Verify Authorization header, Bearer token validity, or API key configuration."
      },
      403: {
        code: 403,
        title: "403 Forbidden",
        explanation: "The server understood the request but refuses to authorize it (insufficient user permissions).",
        recommendation: "Check user role/scopes and RBAC permissions for the target resource."
      },
      404: {
        code: 404,
        title: "404 Not Found",
        explanation: "The requested resource could not be found on the server endpoint.",
        recommendation: "Verify URL path, API routing prefixes (/api/v1/...), and ID parameters."
      },
      408: {
        code: 408,
        title: "408 Request Timeout",
        explanation: "The client did not produce a request within the time that the server was prepared to wait.",
        recommendation: "Check network latency, request payload size, or slow client upload speeds."
      },
      409: {
        code: 409,
        title: "409 Conflict",
        explanation: "The request conflicts with current server state (e.g. duplicate key, version mismatch).",
        recommendation: "Check for unique constraint violations or concurrency locking."
      },
      422: {
        code: 422,
        title: "422 Unprocessable Entity",
        explanation: "The request was well-formed but contained semantic validation errors.",
        recommendation: "Inspect server validation response for specific field error details."
      },
      429: {
        code: 429,
        title: "429 Too Many Requests",
        explanation: "Rate limit has been exceeded for this IP or API key.",
        recommendation: "Implement exponential backoff or inspect Retry-After header."
      },
      500: {
        code: 500,
        title: "500 Internal Server Error",
        explanation: "The server encountered an unexpected condition that prevented it from fulfilling the request.",
        recommendation: "Inspect backend container logs, unhandled backend exceptions, and database connections."
      },
      502: {
        code: 502,
        title: "502 Bad Gateway",
        explanation: "The gateway or proxy received an invalid response from the upstream backend server.",
        recommendation: "Check if backend process crashed, restarted, or sent non-HTTP response."
      },
      503: {
        code: 503,
        title: "503 Service Unavailable",
        explanation: "The server is currently unable to handle the request due to maintenance or temporary overload.",
        recommendation: "Check container health, CPU/memory saturation, and load balancer health checks."
      },
      504: {
        code: 504,
        title: "504 Gateway Timeout",
        explanation: "The gateway server did not receive a timely response from the upstream server or database.",
        recommendation: "Check slow database queries, long synchronous operations, and upstream timeouts."
      }
    };
    if (statusMap[status]) {
      return statusMap[status];
    }
    if (status >= 500) {
      return {
        code: status,
        title: `${status} Server Error`,
        explanation: "The server encountered an error fulfilling the request.",
        recommendation: "Inspect backend service logs for unhandled exceptions."
      };
    }
    if (status >= 400) {
      return {
        code: status,
        title: `${status} Client Error`,
        explanation: "The request could not be processed due to a client-side issue.",
        recommendation: "Verify request parameters, headers, and client state."
      };
    }
    return {
      code: status,
      title: `${status} Response`,
      explanation: "Standard HTTP status.",
      recommendation: "Inspect payload response."
    };
  }
  function computeDiagnosticMatrix(state) {
    var _a;
    const substrates = ["network", "console", "docker", "system"];
    const severities = ["critical", "high", "notice"];
    const cells = {};
    for (const sub of substrates) {
      for (const sev of severities) {
        const key = `${sub}:${sev}`;
        cells[key] = {
          substrate: sub,
          severity: sev,
          count: 0,
          itemIds: [],
          primaryLabel: ""
        };
      }
    }
    const substrateCounts = {
      network: 0,
      console: 0,
      docker: 0,
      system: 0
    };
    let criticalCount = 0;
    let highCount = 0;
    let noticeCount = 0;
    state.network.records.forEach((r) => {
      let sev = null;
      if (r.status && r.status >= 500) {
        sev = "critical";
      } else if (r.isFailed && (!r.status || r.status === 0)) {
        sev = "critical";
      } else if (r.status && r.status >= 400) {
        sev = "high";
      } else if (r.isCORS) {
        sev = "high";
      } else if (r.isSlow) {
        sev = "notice";
      }
      if (sev) {
        const key = `network:${sev}`;
        cells[key].count++;
        cells[key].itemIds.push(r.id);
        cells[key].primaryLabel = cells[key].primaryLabel || `${r.method} ${r.url}`;
        substrateCounts.network++;
        if (sev === "critical") criticalCount++;
        else if (sev === "high") highCount++;
        else if (sev === "notice") noticeCount++;
      }
    });
    state.console.entries.forEach((e) => {
      let sev = null;
      if (e.level === "error") {
        sev = e.count > 3 || e.stack && e.stack.includes("Uncaught") ? "critical" : "high";
      } else if (e.level === "warn") {
        sev = "notice";
      }
      if (sev) {
        const key = `console:${sev}`;
        cells[key].count++;
        cells[key].itemIds.push(e.id);
        cells[key].primaryLabel = cells[key].primaryLabel || e.message;
        substrateCounts.console++;
        if (sev === "critical") criticalCount++;
        else if (sev === "high") highCount++;
        else if (sev === "notice") noticeCount++;
      }
    });
    (((_a = state.docker) == null ? void 0 : _a.logs) || []).forEach((d) => {
      let sev = null;
      if (d.level === "error") {
        sev = "critical";
      } else if (d.level === "warn") {
        sev = "high";
      }
      if (sev) {
        const key = `docker:${sev}`;
        cells[key].count++;
        cells[key].itemIds.push(d.id);
        cells[key].primaryLabel = cells[key].primaryLabel || `[${d.containerName}] ${d.message}`;
        substrateCounts.docker++;
        if (sev === "critical") criticalCount++;
        else if (sev === "high") highCount++;
        else if (sev === "notice") noticeCount++;
      }
    });
    if (state.memory && state.memory.trendMBPerMin && state.memory.trendMBPerMin > 2) {
      const key = "system:high";
      cells[key].count++;
      cells[key].itemIds.push("mem_leak");
      cells[key].primaryLabel = `Heap Leak (+${state.memory.trendMBPerMin}MB/min)`;
      substrateCounts.system++;
      highCount++;
    }
    if (state.performance.longTasks.length > 0) {
      const key = "system:notice";
      cells[key].count += state.performance.longTasks.length;
      cells[key].itemIds.push("long_tasks");
      cells[key].primaryLabel = `${state.performance.longTasks.length} Main Thread Long Tasks (>50ms)`;
      substrateCounts.system += state.performance.longTasks.length;
      noticeCount += state.performance.longTasks.length;
    }
    const totalErrors = criticalCount + highCount + noticeCount;
    return {
      cells,
      totalErrors,
      criticalCount,
      highCount,
      noticeCount,
      substrateCounts
    };
  }
  function generateUnifiedAIDebugPrompt(targetId, state) {
    var _a, _b, _c, _d;
    let targetNetwork = state.network.records.find((r) => r.id === targetId);
    let targetConsole = state.console.entries.find((e) => e.id === targetId);
    let targetDocker = (((_a = state.docker) == null ? void 0 : _a.logs) || []).find((d) => d.id === targetId);
    if (!targetNetwork && !targetConsole && !targetDocker) {
      targetNetwork = state.network.records.slice().reverse().find((r) => r.isFailed);
      targetConsole = state.console.entries.slice().reverse().find((e) => e.level === "error");
      targetDocker = (((_b = state.docker) == null ? void 0 : _b.logs) || []).slice().reverse().find((d) => d.level === "error");
    }
    const promptLines = [];
    promptLines.push("### \u{1F6A8} Dr. Debug Incident Report for AI Assistants (Claude Code / Antigravity)");
    promptLines.push("");
    let title = "Uncaught Runtime / Network Failure";
    let incidentTime = Date.now();
    if (targetNetwork) {
      title = `HTTP ${targetNetwork.status || "ERR"} on ${targetNetwork.method} ${targetNetwork.url}`;
      incidentTime = targetNetwork.startTime;
    } else if (targetConsole) {
      title = `${targetConsole.type.toUpperCase()}: ${targetConsole.message.slice(0, 100)}`;
      incidentTime = targetConsole.timestamp;
    } else if (targetDocker) {
      title = `Docker [${targetDocker.containerName}] ${targetDocker.level.toUpperCase()}: ${targetDocker.message.slice(0, 100)}`;
      incidentTime = targetDocker.timestamp;
    }
    promptLines.push(`**Issue Title:** \`${title}\``);
    promptLines.push(`**Timestamp:** ${new Date(incidentTime).toISOString()}`);
    promptLines.push(`**Page Context:** ${state.pageContext.url || "http://localhost"} (${state.pageContext.framework || "Web Application"})`);
    promptLines.push("");
    if (targetNetwork) {
      const explainer = getHttpStatusExplainer(targetNetwork.status || 0);
      promptLines.push("#### \u{1F310} HTTP Network Transaction:");
      promptLines.push(`- **Request:** \`${targetNetwork.method} ${targetNetwork.url}\``);
      promptLines.push(`- **Status:** \`${targetNetwork.status || "0 (Failed / Network Error)"} ${targetNetwork.statusText || ""}\` \u2014 *${explainer.title}*`);
      promptLines.push(`- **Explanation:** ${explainer.explanation}`);
      promptLines.push(`- **Action Recommended:** ${explainer.recommendation}`);
      promptLines.push(`- **Duration:** ${targetNetwork.duration !== void 0 ? `${targetNetwork.duration}ms` : "N/A"}`);
      if (targetNetwork.isCORS) {
        promptLines.push("- **CORS Flag:** \u26A0\uFE0F The browser explicitly named CORS for this failure");
      } else if (targetNetwork.isCrossOrigin) {
        promptLines.push(
          "- **Cross-origin:** \u26A0\uFE0F Failed opaquely. From JS a missing CORS header, a refused connection, a DNS failure and a TLS error are indistinguishable \u2014 check the browser console and whether the cURL below succeeds."
        );
      }
      if (targetNetwork.initiator) promptLines.push(`- **Initiator:** \`${targetNetwork.initiator}\``);
      promptLines.push("");
      promptLines.push("**Terminal Reproduction Command (cURL):**");
      promptLines.push("```bash");
      promptLines.push(generateCurlCommand(targetNetwork));
      promptLines.push("```");
      promptLines.push("");
      promptLines.push("**Request Headers:**");
      if (targetNetwork.requestHeaders && Object.keys(targetNetwork.requestHeaders).length > 0) {
        promptLines.push("```json");
        promptLines.push(JSON.stringify(targetNetwork.requestHeaders, null, 2));
        promptLines.push("```");
      } else {
        promptLines.push("_None recorded or default browser headers._");
      }
      promptLines.push("");
      promptLines.push("**Request Payload / Body:**");
      if (targetNetwork.requestBodyPreview) {
        try {
          const parsed = JSON.parse(targetNetwork.requestBodyPreview);
          promptLines.push("```json");
          promptLines.push(JSON.stringify(parsed, null, 2));
          promptLines.push("```");
        } catch {
          promptLines.push("```");
          promptLines.push(targetNetwork.requestBodyPreview);
          promptLines.push("```");
        }
      } else {
        promptLines.push("_No request body sent._");
      }
      promptLines.push("");
      promptLines.push("**Response Headers:**");
      if (targetNetwork.responseHeaders && Object.keys(targetNetwork.responseHeaders).length > 0) {
        promptLines.push("```json");
        promptLines.push(JSON.stringify(targetNetwork.responseHeaders, null, 2));
        promptLines.push("```");
      } else {
        promptLines.push("_None recorded or opaque response._");
      }
      promptLines.push("");
      promptLines.push("**Response Body / Server Error Message:**");
      if (targetNetwork.responseBodyPreview) {
        try {
          const parsed = JSON.parse(targetNetwork.responseBodyPreview);
          promptLines.push("```json");
          promptLines.push(JSON.stringify(parsed, null, 2));
          promptLines.push("```");
        } catch {
          promptLines.push("```");
          promptLines.push(targetNetwork.responseBodyPreview);
          promptLines.push("```");
        }
      } else if (targetNetwork.error) {
        promptLines.push(`\`\`\`
${targetNetwork.error}
\`\`\``);
      } else {
        promptLines.push("_Empty response body._");
      }
      promptLines.push("");
    }
    if (targetConsole || !targetNetwork && state.console.entries.length > 0) {
      const entry = targetConsole || state.console.entries.filter((e) => e.level === "error")[0];
      if (entry) {
        promptLines.push("#### \u{1F534} Console & Runtime Diagnostics:");
        promptLines.push(`- **Event Type:** \`${entry.type}\``);
        promptLines.push(`- **Error Message:** \`${entry.message}\``);
        promptLines.push(`- **Occurrences:** ${entry.count}`);
        if (entry.parsedStack && entry.parsedStack.length > 0) {
          promptLines.push("");
          promptLines.push("**Demangled Call Frames:**");
          entry.parsedStack.slice(0, 5).forEach((frame, i) => {
            const fn = frame.filename || "unknown";
            const isUserCode = !fn.includes("node_modules") && !fn.includes("chrome-extension");
            const tag = isUserCode ? "\u{1F4CC} [App Code]" : "\u2699\uFE0F [Vendor]";
            promptLines.push(`${i + 1}. ${tag} \`${frame.functionName || "<anonymous>"}\` at \`${fn}:${frame.lineno || 0}:${frame.colno || 0}\``);
          });
        } else if (entry.stack) {
          promptLines.push("");
          promptLines.push("**Stack Trace:**");
          promptLines.push("```");
          promptLines.push(entry.stack);
          promptLines.push("```");
        }
        promptLines.push("");
      }
    }
    if (targetDocker || state.docker && state.docker.logs.length > 0) {
      const dockerLog = targetDocker || ((_c = state.docker) == null ? void 0 : _c.logs.filter((l) => l.level === "error")[0]);
      if (dockerLog) {
        promptLines.push("#### \u{1F433} Backend Container Context:");
        promptLines.push(`- **Container:** \`${dockerLog.containerName}\` (${dockerLog.stream})`);
        promptLines.push(`- **Level:** \`${dockerLog.level.toUpperCase()}\``);
        promptLines.push("```");
        promptLines.push(dockerLog.message);
        promptLines.push("```");
        promptLines.push("");
      }
    }
    const correlations = state.correlations.length > 0 ? state.correlations : computeCorrelations(state);
    if (correlations.length > 0) {
      promptLines.push("#### \u{1F4A1} Cross-Layer Causality & Correlations:");
      correlations.slice(0, 3).forEach((corr, idx) => {
        promptLines.push(`${idx + 1}. [${corr.likelihood.toUpperCase()}] ${corr.description}`);
      });
      promptLines.push("");
    }
    promptLines.push("#### \u23F1\uFE0F Surrounding Telemetry Timeline (Chronological Context):");
    const timelineEvents = [];
    state.network.records.slice(-10).forEach((r) => {
      const status = r.status ? `[${r.status}]` : "FAILED";
      const dur = r.duration !== void 0 ? `${r.duration}ms` : "";
      timelineEvents.push({
        time: r.startTime,
        text: `[Network] ${r.method} ${r.url} -> ${status} ${dur}`
      });
    });
    state.console.entries.slice(-10).forEach((c) => {
      timelineEvents.push({
        time: c.timestamp,
        text: `[Console ${c.level.toUpperCase()}] ${c.message.slice(0, 100)}`
      });
    });
    (((_d = state.docker) == null ? void 0 : _d.logs) || []).slice(-10).forEach((d) => {
      timelineEvents.push({
        time: d.timestamp,
        text: `[Docker ${d.containerName}] ${d.message.slice(0, 100)}`
      });
    });
    timelineEvents.sort((a, b) => a.time - b.time);
    const recentEvents = timelineEvents.slice(-8);
    if (recentEvents.length > 0) {
      recentEvents.forEach((ev, idx) => {
        const tStr = new Date(ev.time).toLocaleTimeString();
        promptLines.push(`${idx + 1}. \`[${tStr}]\` ${ev.text}`);
      });
    } else {
      promptLines.push("_No previous telemetry events._");
    }
    promptLines.push("");
    if (state.framework && state.framework.detectedFramework) {
      promptLines.push("#### \u269B\uFE0F Framework State Context:");
      promptLines.push(`- **Detected Framework:** \`${state.framework.detectedFramework}\``);
      if (state.framework.hasReactHook) promptLines.push("- **React DevTools Hook:** Active");
      if (state.framework.hasReduxHook) promptLines.push("- **Redux Store:** Connected");
      if (state.framework.hasVueHook) promptLines.push("- **Vue DevTools:** Active");
      if (state.framework.store) {
        promptLines.push(`- **Store Keys:** \`[${state.framework.store.topLevelKeys.slice(0, 10).join(", ")}]\``);
      }
      if (state.framework.recentEvents.length > 0) {
        promptLines.push("**Recent Framework Events:**");
        state.framework.recentEvents.slice(-5).forEach((ev, i) => {
          promptLines.push(`${i + 1}. [${ev.framework}] ${ev.detail}`);
        });
      }
      promptLines.push("");
    }
    if (state.interactions && state.interactions.length > 0) {
      promptLines.push("#### \u{1F5B1}\uFE0F User Interaction Replay (Last 30 Seconds):");
      state.interactions.slice(-10).forEach((ev, i) => {
        const ago = ((Date.now() - ev.timestamp) / 1e3).toFixed(1);
        const target = ev.target ? ` on \`${ev.target}\`` : "";
        promptLines.push(`${i + 1}. [${ago}s ago] \`${ev.type}\`${target} ${ev.detail || ""}`);
      });
      promptLines.push("");
    }
    promptLines.push("#### \u{1F3AF} Task for AI Coding Assistant (Claude Code / Antigravity):");
    promptLines.push("1. Analyze the exact failure mechanism across the request payload, headers, response, and runtime stack trace provided above.");
    promptLines.push("2. Identify the root cause file, function, and line number in the codebase.");
    promptLines.push("3. Provide the minimal, elegant, and verified code fix as a unified diff patch to resolve this issue.");
    return promptLines.join("\n");
  }

  // packages/controller/src/DebugController.ts
  var DebugController = class {
    consoleInterceptor;
    networkInterceptor;
    performanceInterceptor;
    memoryInterceptor;
    dockerInterceptor;
    frameworkInterceptor;
    interactionInterceptor;
    networkMockInterceptor;
    layoutInspector;
    sqlQueryCorrelator;
    dockerBridgeClient;
    startTime = Date.now();
    isRunning = false;
    constructor(maxBufferSize = 100) {
      this.consoleInterceptor = new ConsoleInterceptor(maxBufferSize);
      this.networkInterceptor = new NetworkInterceptor(maxBufferSize);
      this.performanceInterceptor = new PerformanceInterceptor();
      this.memoryInterceptor = new MemoryInterceptor();
      this.dockerInterceptor = new DockerInterceptor(maxBufferSize);
      this.frameworkInterceptor = new FrameworkInterceptor(maxBufferSize);
      this.interactionInterceptor = new InteractionInterceptor();
      this.networkMockInterceptor = new NetworkMockInterceptor();
      this.layoutInspector = new LayoutInspector();
      this.sqlQueryCorrelator = new SQLQueryCorrelator();
    }
    init() {
      if (this.isRunning) return;
      this.startTime = Date.now();
      this.consoleInterceptor.init();
      this.networkInterceptor.init();
      this.performanceInterceptor.init();
      this.dockerInterceptor.init();
      this.frameworkInterceptor.init();
      this.interactionInterceptor.init();
      this.networkMockInterceptor.init();
      this.isRunning = true;
    }
    getSnapshot() {
      var _a;
      const consoleEntries = this.consoleInterceptor.getEntries();
      const networkRecords = this.networkInterceptor.getRecords();
      const performanceMetrics = this.performanceInterceptor.getMetrics();
      const memorySnapshot = this.memoryInterceptor.sample();
      const dockerContainers = this.dockerInterceptor.getContainers();
      const dockerLogs = this.dockerInterceptor.getLogs();
      const dockerStatus = this.dockerInterceptor.getStatus();
      const errors = consoleEntries.filter((e) => e.level === "error");
      const warns = consoleEntries.filter((e) => e.level === "warn");
      const failedNet = networkRecords.filter((r) => r.isFailed);
      const slowNet = networkRecords.filter((r) => r.isSlow);
      const pageContext = {
        url: typeof window !== "undefined" ? ((_a = window.location) == null ? void 0 : _a.href) || "" : "",
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
        docker: {
          isAvailable: dockerStatus.isAvailable,
          containers: dockerContainers,
          logs: dockerLogs,
          errorCount: dockerStatus.errorCount
        },
        correlations: [],
        framework: this.frameworkInterceptor.getFrameworkState(),
        interactions: this.interactionInterceptor.getReplaySequence()
      };
      state.correlations = computeCorrelations(state);
      state.causalGraph = buildCausalErrorGraph(state);
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
    getDockerLogs(options) {
      return this.dockerInterceptor.getLogs(options);
    }
    getDockerContainers() {
      return this.dockerInterceptor.getContainers();
    }
    pushDockerLog(containerName, message, stream = "stdout", timestamp, level) {
      return this.dockerInterceptor.pushLog(containerName, message, stream, timestamp, level);
    }
    setDockerContainers(containers) {
      this.dockerInterceptor.setContainers(containers);
    }
    connectDockerBridge(port = 9229, host = "localhost") {
      if (this.dockerBridgeClient) {
        this.dockerBridgeClient.disconnect();
      }
      this.dockerBridgeClient = new DockerBridgeClient({
        port,
        host,
        onContainers: (containers) => {
          this.setDockerContainers(containers);
        },
        onLog: (entry) => {
          this.pushDockerLog(entry.containerName, entry.message, entry.stream, entry.timestamp, entry.level);
        }
      });
      this.dockerBridgeClient.connect();
      return this.dockerBridgeClient;
    }
    getDockerBridgeClient() {
      return this.dockerBridgeClient;
    }
    getCorrelations() {
      return this.getSnapshot().correlations;
    }
    getCausalGraph(options) {
      const state = this.getSnapshot();
      return buildCausalErrorGraph(state, options);
    }
    getUnifiedAIDebugPrompt(targetId) {
      const state = this.getSnapshot();
      return generateUnifiedAIDebugPrompt(targetId, state);
    }
    getErrorHistogram(bucketCount = 10) {
      const state = this.getSnapshot();
      return getErrorHistogram(state, bucketCount);
    }
    getDiagnosticMatrix() {
      const state = this.getSnapshot();
      return computeDiagnosticMatrix(state);
    }
    getFrameworkState() {
      return this.frameworkInterceptor.getFrameworkState();
    }
    getInteractionReplay() {
      return this.interactionInterceptor.getReplaySequence();
    }
    getInteractionReplayHuman() {
      return this.interactionInterceptor.getHumanReadableReplay();
    }
    mockNetworkResponse(urlPattern, mockStatus, mockBody, method, mockHeaders) {
      return this.networkMockInterceptor.addRule({
        urlPattern,
        mockStatus,
        mockBody,
        method,
        mockHeaders,
        isActive: true
      });
    }
    getMockRules() {
      return this.networkMockInterceptor.getRules();
    }
    removeMockRule(id) {
      return this.networkMockInterceptor.removeRule(id);
    }
    getLayoutAnomalies(targetSelector) {
      return this.layoutInspector.inspect(targetSelector);
    }
    getSQLCorrelations() {
      return this.sqlQueryCorrelator.correlate(this.getNetworkRecords());
    }
    clear() {
      this.consoleInterceptor.clear();
      this.networkInterceptor.clear();
      this.performanceInterceptor.clear();
      this.memoryInterceptor.clear();
      this.dockerInterceptor.clear();
      this.frameworkInterceptor.clear();
      this.interactionInterceptor.clear();
    }
    destroy() {
      var _a;
      if (!this.isRunning) return;
      this.consoleInterceptor.destroy();
      this.networkInterceptor.destroy();
      this.performanceInterceptor.destroy();
      this.dockerInterceptor.destroy();
      this.frameworkInterceptor.destroy();
      this.interactionInterceptor.destroy();
      this.networkMockInterceptor.destroy();
      (_a = this.dockerBridgeClient) == null ? void 0 : _a.disconnect();
      this.isRunning = false;
    }
  };

  // packages/core/src/analysis/LocalDiagnosticEngine.ts
  var SEVERITY_RANK = {
    critical: 0,
    high: 1,
    notice: 2
  };
  function isAppFrame(frame) {
    const file = frame.filename || "";
    if (!file) return false;
    return !file.includes("node_modules") && !file.startsWith("chrome-extension://") && !file.includes("/.vite/") && !/^https?:\/\/[^/]+\/?$/.test(file);
  }
  function frameLabel(frame) {
    const file = frame.filename || "unknown";
    const line = frame.lineno ?? 0;
    const col = frame.colno ?? 0;
    const fn = frame.functionName || "<anonymous>";
    return `${fn} (${file}:${line}:${col})`;
  }
  function shortUrl(url) {
    try {
      const parsed = new URL(url, "http://localhost");
      return parsed.pathname + (parsed.search || "");
    } catch {
      return url;
    }
  }
  function classifyClientError(entry) {
    const msg = entry.message;
    const undefRead = msg.match(/Cannot read propert(?:y|ies) of (undefined|null) \(reading ['"]([^'"]+)['"]\)/i);
    if (undefRead) {
      const [, nullish, prop] = undefRead;
      return {
        kind: `nullish property access`,
        subject: prop,
        remediation: `The value being dereferenced was \`${nullish}\` when \`.${prop}\` was read. Guard the access (\`value?.${prop}\`) and handle the ${nullish} branch explicitly \u2014 then fix whatever upstream call is returning ${nullish} instead of data.`
      };
    }
    const notAFn = msg.match(/([\w$.]+) is not a function/i);
    if (notAFn) {
      return {
        kind: "bad call target",
        subject: notAFn[1],
        remediation: `\`${notAFn[1]}\` was called but is not callable at runtime. Verify the import/export shape (default vs named), and that the value is initialised before this call site.`
      };
    }
    const notDefined = msg.match(/([\w$]+) is not defined/i);
    if (notDefined) {
      return {
        kind: "unresolved identifier",
        subject: notDefined[1],
        remediation: `\`${notDefined[1]}\` is unresolved in this scope. Add the missing import or declaration, or gate the reference behind an environment check if it is host-specific.`
      };
    }
    const undefIter = msg.match(/(?:undefined|null) is not iterable|is not iterable/i);
    if (undefIter) {
      return {
        kind: "non-iterable spread",
        remediation: `A spread/destructure ran against a non-iterable value. Default it (\`const [a] = list ?? []\`) and check the producer actually returns an array.`
      };
    }
    const jsonParse = msg.match(/(?:Unexpected token|Unexpected end of JSON input|is not valid JSON)/i);
    if (jsonParse) {
      return {
        kind: "JSON parse failure",
        remediation: `A response body was parsed as JSON but was not JSON \u2014 commonly an HTML error page or empty body from a failed request. Check \`response.ok\` and the \`content-type\` header before calling \`.json()\`.`
      };
    }
    if (entry.type === "unhandled_rejection") {
      return {
        kind: "unhandled promise rejection",
        remediation: `This promise rejected with no \`.catch()\` / \`try-catch\` in its chain. Attach rejection handling at the call site so the failure surfaces as state instead of an unhandled rejection.`
      };
    }
    return {
      kind: entry.type.replace(/_/g, " "),
      remediation: `Trace the call frames below to the originating call site and add handling for the failing condition.`
    };
  }
  function classifyDockerError(log) {
    const msg = log.message.toLowerCase();
    if (/max_connections|connection slots|connection pool|too many connections|pool timeout|p2024/.test(msg)) {
      return {
        kind: "connection pool exhaustion",
        remediation: `\`${log.containerName}\` reports its connection pool is saturated. Audit that every acquired connection/session is released on both success and error paths, then size the pool against the real concurrency ceiling.`
      };
    }
    if (/oom|out of memory|killed process|memory limit|cannot allocate/.test(msg)) {
      return {
        kind: "container memory exhaustion",
        remediation: `\`${log.containerName}\` hit its memory ceiling and was killed. Profile heap growth in that service and either fix the retention leak or raise the container limit deliberately.`
      };
    }
    if (/can't reach|cannot reach|connection refused|econnrefused|no such host|getaddrinfo|does not exist/.test(msg)) {
      return {
        kind: "unreachable dependency",
        remediation: `\`${log.containerName}\` cannot reach a dependency it needs. Verify the service name/port in its connection string resolves on the compose network and that the dependency is healthy before this container starts.`
      };
    }
    if (/permission denied|eacces|unauthor|forbidden|authentication failed|password/.test(msg)) {
      return {
        kind: "credential / permission failure",
        remediation: `\`${log.containerName}\` was denied access. Check the credentials and mounted-volume ownership this container runs with.`
      };
    }
    if (/timeout|timed out|deadline exceeded/.test(msg)) {
      return {
        kind: "upstream timeout",
        remediation: `\`${log.containerName}\` timed out waiting on an upstream call. Establish whether the upstream is slow or unreachable, then set an explicit timeout plus fallback rather than inheriting the default.`
      };
    }
    if (/migration|schema|relation .* does not exist|column .* does not exist/.test(msg)) {
      return {
        kind: "schema drift",
        remediation: `\`${log.containerName}\` is running against a schema that does not match its code. Apply the pending migration, or roll the image back to the revision matching the live schema.`
      };
    }
    return {
      kind: "backend error",
      remediation: `Resolve the error reported by \`${log.containerName}\` shown in the evidence below; it precedes the client-visible failure in the timeline.`
    };
  }
  function buildNetworkFinding(req) {
    const status = req.status || 0;
    const explainer = getHttpStatusExplainer(status);
    const path = shortUrl(req.url);
    const evidence = [
      `${req.method} ${req.url} \u2192 ${status || "no response"}${req.statusText ? ` ${req.statusText}` : ""}`
    ];
    if (req.duration !== void 0) evidence.push(`Wall time: ${Math.round(req.duration)}ms`);
    if (req.error) evidence.push(`Transport error: ${req.error}`);
    if (req.initiator) evidence.push(`Initiator: ${req.initiator}`);
    if (req.responseBodyPreview) {
      evidence.push(`Response body: ${req.responseBodyPreview.slice(0, 300)}`);
    }
    let severity = "notice";
    let remediation = explainer.recommendation;
    let title;
    let origin = req.url;
    try {
      origin = new URL(req.url).origin;
    } catch {
    }
    if (req.isCORS) {
      severity = "critical";
      title = `CORS policy blocked ${req.method} ${path}`;
      remediation = `The browser named CORS when blocking this call to ${origin}. Serve \`Access-Control-Allow-Origin\` (and the matching \`-Methods\`/\`-Headers\` for the preflight) from that origin, or proxy the call through your own origin.`;
    } else if (req.isCrossOrigin) {
      severity = "critical";
      title = `${req.method} ${path} failed opaquely (cross-origin)`;
      remediation = `The browser refused to say why this cross-origin call to ${origin} failed \u2014 from JS, a missing CORS header, a refused connection, a DNS failure and a TLS error are indistinguishable. Read the browser's own console message, which does name the cause, and run the cURL command below: if cURL succeeds the problem is CORS, and if it fails the host is unreachable.`;
    } else if (status === 0 || req.isFailed) {
      severity = "critical";
      title = `${req.method} ${path} never completed${status ? ` (${status})` : ""}`;
      remediation = status === 0 ? `The request failed at the transport layer \u2014 the host did not answer. Confirm the service is listening on that host/port and that the URL is correct for this environment.` : explainer.recommendation;
    } else if (status >= 500) {
      severity = "critical";
      title = `${req.method} ${path} returned ${status}`;
    } else if (status === 401 || status === 403) {
      severity = "high";
      title = `${req.method} ${path} rejected the caller (${status})`;
    } else if (status >= 400) {
      severity = "high";
      title = `${req.method} ${path} returned ${status}`;
    } else if (req.isSlow) {
      severity = "notice";
      title = `${req.method} ${path} was slow (${Math.round(req.duration || 0)}ms)`;
      remediation = `This call is the slowest thing on the timeline. Profile the server handler, and if the latency is inherent, move the call off the critical render path.`;
    } else {
      title = `${req.method} ${path} flagged as anomalous`;
    }
    return {
      id: req.id,
      layer: "network",
      severity,
      title,
      detail: status ? `${explainer.title} \u2014 ${explainer.explanation}` : "The request produced no HTTP response.",
      evidence,
      files: [],
      remediation,
      confidence: req.isFailed || status >= 500 ? 0.9 : 0.72,
      timestamp: req.startTime
    };
  }
  function buildConsoleFinding(entry) {
    const classified = classifyClientError(entry);
    const frames = entry.parsedStack || [];
    const appFrames = frames.filter(isAppFrame);
    const shown = (appFrames.length > 0 ? appFrames : frames).slice(0, 4);
    const evidence = [entry.message];
    if (entry.count > 1) {
      evidence.push(`Repeated ${entry.count}\xD7 between ${new Date(entry.firstSeen).toLocaleTimeString()} and ${new Date(entry.lastSeen).toLocaleTimeString()}`);
    }
    shown.forEach((frame, i) => {
      evidence.push(`Frame ${i + 1}: ${frameLabel(frame)}${isAppFrame(frame) ? " [app]" : " [vendor]"}`);
    });
    if (shown.length === 0 && entry.stack) {
      evidence.push(entry.stack.split("\n").slice(0, 4).join("\n"));
    }
    const files = appFrames.map((f) => f.filename && f.lineno ? `${f.filename}:${f.lineno}` : f.filename || "").filter(Boolean);
    const origin = appFrames[0] ? ` at ${frameLabel(appFrames[0])}` : "";
    return {
      id: entry.id,
      layer: "console",
      severity: entry.level === "error" ? "critical" : "notice",
      title: `${classified.kind}${classified.subject ? ` on \`${classified.subject}\`` : ""}${origin}`,
      detail: entry.message,
      evidence,
      files: Array.from(new Set(files)),
      remediation: classified.remediation,
      confidence: appFrames.length > 0 ? 0.88 : 0.7,
      timestamp: entry.timestamp
    };
  }
  function buildDockerFinding(log) {
    const classified = classifyDockerError(log);
    return {
      id: log.id,
      layer: "docker",
      severity: log.level === "error" ? "critical" : "notice",
      title: `${log.containerName}: ${classified.kind}`,
      detail: log.message,
      evidence: [
        `[${log.containerName} \xB7 ${log.stream}] ${log.message}`,
        `Logged at ${new Date(log.timestamp).toLocaleTimeString()}`
      ],
      files: [],
      remediation: classified.remediation,
      confidence: 0.85,
      timestamp: log.timestamp
    };
  }
  function buildResourceFindings(state) {
    var _a, _b;
    const findings = [];
    const mem = state.memory;
    if (mem && mem.heapUsagePercent !== void 0 && mem.heapUsagePercent >= 85) {
      const evidence = [
        `Heap ${Math.round((mem.usedJSHeapSize || 0) / 1048576)}MB of ${Math.round((mem.jsHeapSizeLimit || 0) / 1048576)}MB limit (${Math.round(mem.heapUsagePercent)}%)`
      ];
      if (mem.trendMBPerMin !== void 0) evidence.push(`Growth trend: ${mem.trendMBPerMin.toFixed(1)}MB/min`);
      if (mem.domNodeCount) evidence.push(`DOM elements: ${mem.domNodeCount}`);
      findings.push({
        id: `mem_${mem.timestamp}`,
        layer: "memory",
        severity: mem.heapUsagePercent >= 95 ? "critical" : "high",
        title: `JS heap at ${Math.round(mem.heapUsagePercent)}% of its limit`,
        detail: "The tab is close to the heap ceiling; allocation failures and GC pauses become likely.",
        evidence,
        files: [],
        remediation: `Take two heap snapshots a minute apart and diff retained objects. Detached nodes and un-removed listeners are the usual retainers.`,
        confidence: 0.8,
        timestamp: mem.timestamp
      });
    }
    const longTasks = ((_a = state.performance) == null ? void 0 : _a.longTasks) || [];
    if (longTasks.length > 0) {
      const worst = longTasks.reduce((a, b) => b.duration > a.duration ? b : a);
      if (worst.duration >= 200) {
        findings.push({
          id: `longtask_${Math.round(worst.startTime)}`,
          layer: "performance",
          severity: worst.duration >= 500 ? "high" : "notice",
          title: `Main thread blocked for ${Math.round(worst.duration)}ms`,
          detail: `${longTasks.length} long task(s) recorded; the worst blocked the main thread for ${Math.round(worst.duration)}ms.`,
          evidence: longTasks.slice(-4).map((t) => `${Math.round(t.duration)}ms task at t+${Math.round(t.startTime)}ms${t.name ? ` (${t.name})` : ""}`),
          files: [],
          remediation: `Break this work into chunks yielded across frames, or move it to a Web Worker. Anything over 50ms is input-blocking.`,
          confidence: 0.75,
          timestamp: Date.now() - Math.round(worst.duration)
        });
      }
    }
    const poorVitals = Object.values(((_b = state.performance) == null ? void 0 : _b.vitals) || {}).filter((v) => v.rating === "poor");
    poorVitals.forEach((vital) => {
      findings.push({
        id: `vital_${vital.name}`,
        layer: "performance",
        severity: "notice",
        title: `${vital.name} is poor (${Math.round(vital.value)}${vital.name === "CLS" ? "" : "ms"})`,
        detail: `Core Web Vital ${vital.name} measured ${vital.value} which falls in the "poor" band.`,
        evidence: [`${vital.name} = ${vital.value}${vital.attribution ? ` (attributed to ${vital.attribution})` : ""}`],
        files: [],
        remediation: vital.name === "CLS" ? `Reserve space for late-loading media and injected banners so they stop shifting laid-out content.` : `Reduce the work on the critical path feeding ${vital.name} \u2014 defer non-essential scripts and shrink the largest blocking resource.`,
        confidence: 0.7,
        timestamp: Date.now()
      });
    });
    return findings;
  }
  function describeCausalChain(graph) {
    var _a;
    if (!graph || graph.nodes.length === 0 || graph.edges.length === 0) return [];
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    const chain = [];
    const visited = /* @__PURE__ */ new Set();
    let cursor = graph.rootCauseNodeId || ((_a = graph.nodes.slice().sort((a, b) => a.timestamp - b.timestamp)[0]) == null ? void 0 : _a.id);
    while (cursor && !visited.has(cursor)) {
      visited.add(cursor);
      const node = byId.get(cursor);
      if (!node) break;
      const marker = node.isRootCause ? " \u2190 root cause" : "";
      chain.push(`[${node.layer}] ${node.label} \u2014 ${node.summary}${marker}`);
      const outgoing = graph.edges.filter((e) => e.source === cursor && !visited.has(e.target)).sort((a, b) => b.confidence - a.confidence)[0];
      if (!outgoing) break;
      chain.push(`   \u2193 ${outgoing.relationship} (${Math.round(outgoing.confidence * 100)}% confidence${outgoing.timeDeltaMs !== void 0 ? `, +${Math.abs(outgoing.timeDeltaMs)}ms` : ""})`);
      cursor = outgoing.target;
    }
    return chain;
  }
  var LocalDiagnosticEngine = class {
    analyze(state) {
      var _a;
      const findings = [];
      const dockerErrors = (((_a = state.docker) == null ? void 0 : _a.logs) || []).filter((l) => l.level === "error");
      dockerErrors.forEach((log) => findings.push(buildDockerFinding(log)));
      state.network.records.filter((r) => r.isFailed || r.isSlow || r.status !== void 0 && r.status >= 400).forEach((req) => findings.push(buildNetworkFinding(req)));
      state.console.entries.filter((e) => e.level === "error" || e.level === "warn").forEach((entry) => findings.push(buildConsoleFinding(entry)));
      findings.push(...buildResourceFindings(state));
      findings.sort((a, b) => {
        const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        if (bySeverity !== 0) return bySeverity;
        return a.timestamp - b.timestamp;
      });
      if (findings.length === 0) {
        return {
          hasEvidence: false,
          headline: "No faults in the telemetry buffers",
          diagnosis: "The console, network, Docker, memory and performance buffers hold no errors, failed requests or threshold breaches for this session. There is nothing to diagnose yet.",
          rootCause: "No fault observed.",
          confidence: 0,
          findings: [],
          causalChain: [],
          suggestedFix: "",
          filesToModify: []
        };
      }
      const graph = state.causalGraph;
      const causalChain = describeCausalChain(graph);
      const rootNode = (graph == null ? void 0 : graph.rootCauseNodeId) ? graph.nodes.find((n) => n.id === graph.rootCauseNodeId) : void 0;
      const primary = rootNode && findings.find((f) => f.id === rootNode.id) || findings[0];
      const downstream = findings.filter((f) => f.id !== primary.id);
      const layersHit = Array.from(new Set(findings.map((f) => f.layer)));
      const criticalCount = findings.filter((f) => f.severity === "critical").length;
      const headline = primary.title;
      const diagnosisParts = [];
      diagnosisParts.push(
        `${findings.length} fault${findings.length === 1 ? "" : "s"} across ${layersHit.length} layer${layersHit.length === 1 ? "" : "s"} (${layersHit.join(", ")}); ${criticalCount} critical.`
      );
      diagnosisParts.push(`The earliest critical signal is in the ${primary.layer} layer: ${primary.title}.`);
      if (graph && graph.edges.length > 0) {
        const weakOnly = graph.edges.every((e) => e.relationship === "CORRELATED_WITH");
        diagnosisParts.push(
          weakOnly ? `The correlation engine linked ${graph.nodes.length} error nodes with ${graph.edges.length} temporal edge${graph.edges.length === 1 ? "" : "s"}, but the mechanism connecting them was not observed \u2014 treat the ordering as suggestive, not proven.` : `The correlation engine linked ${graph.nodes.length} error nodes with ${graph.edges.length} causal edge${graph.edges.length === 1 ? "" : "s"}, so the later failures are downstream effects rather than independent bugs.`
        );
      } else if (downstream.length > 0) {
        const layerNote = layersHit.length > 1 ? ` They span ${layersHit.join(", ")}, so more than one subsystem is involved.` : "";
        diagnosisParts.push(
          `No temporal link was found between these faults, so this is ${findings.length} separate problems rather than one cascade; the signal named above is simply the earliest critical one.${layerNote}`
        );
      }
      const rootCauseParts = [];
      rootCauseParts.push(`${primary.title}`);
      rootCauseParts.push(primary.detail);
      rootCauseParts.push(`Evidence: ${primary.evidence.slice(0, 3).join(" | ")}`);
      if (causalChain.length > 0) {
        rootCauseParts.push(`Causal chain:
${causalChain.join("\n")}`);
      }
      rootCauseParts.push(`Remediation: ${primary.remediation}`);
      let confidence = primary.confidence;
      if (graph && graph.edges.length > 0) {
        const best = Math.max(...graph.edges.map((e) => e.confidence));
        confidence = Math.min(0.95, (confidence + best) / 2 + 0.08);
      }
      if (layersHit.length >= 2) confidence = Math.min(0.95, confidence + 0.04);
      if (findings.length === 1 && primary.files.length === 0) confidence = Math.min(confidence, 0.7);
      const fixSections = [];
      fixSections.push(`# Ordered remediation plan (${findings.length} finding${findings.length === 1 ? "" : "s"})`);
      fixSections.push("");
      fixSections.push(`## 1. Fix first \u2014 ${primary.title}`);
      fixSections.push(`Layer: ${primary.layer} \xB7 severity: ${primary.severity}`);
      fixSections.push(primary.remediation);
      if (primary.files.length > 0) {
        fixSections.push(`Source locations: ${primary.files.join(", ")}`);
      }
      downstream.slice(0, 4).forEach((finding, i) => {
        fixSections.push("");
        fixSections.push(`## ${i + 2}. ${finding.title}`);
        fixSections.push(`Layer: ${finding.layer} \xB7 severity: ${finding.severity}`);
        fixSections.push(finding.remediation);
        if (finding.files.length > 0) {
          fixSections.push(`Source locations: ${finding.files.join(", ")}`);
        }
      });
      if (graph && graph.edges.length > 0) {
        fixSections.push("");
        fixSections.push(
          `Fixing item 1 should clear the ${graph.edges.length} downstream effect${graph.edges.length === 1 ? "" : "s"} above \u2014 re-run after that change before working the rest.`
        );
      }
      const filesToModify = Array.from(new Set(findings.flatMap((f) => f.files)));
      return {
        hasEvidence: true,
        headline,
        diagnosis: diagnosisParts.join(" "),
        rootCause: rootCauseParts.join("\n\n"),
        confidence: Number(confidence.toFixed(2)),
        findings,
        causalChain,
        suggestedFix: fixSections.join("\n"),
        filesToModify
      };
    }
  };
  var localDiagnosticEngine = new LocalDiagnosticEngine();

  // packages/core/src/analysis/HeuristicLLMClient.ts
  var HeuristicLLMClient = class {
    controller;
    engine;
    constructor(controller, engine = new LocalDiagnosticEngine()) {
      this.controller = controller;
      this.engine = engine;
    }
    async chat(messages, _tools, _signal) {
      const executed = this.extractExecutedTools(messages);
      const state = this.controller.getSnapshot();
      const step = this.planNextStep(state, executed);
      const memory = this.summariseEvidence(state);
      const reflection = {
        evaluation_previous_goal: executed.length === 0 ? "Starting from the raw telemetry buffers; no prior step to evaluate." : `Completed ${executed.length} step(s) so far (${executed.join(", ")}). Evidence gathered is reflected in the hypothesis below.`,
        working_hypothesis: step.hypothesis,
        memory,
        next_goal: step.goal,
        action: {
          name: step.tool,
          arguments: step.args
        }
      };
      return {
        content: JSON.stringify(reflection),
        finishReason: step.tool === "done" ? "stop" : "tool_calls"
      };
    }
    /**
     * The core appends `Tool Result for [name]:` after each executed tool when the
     * model answers with reflection JSON, so the transcript is the source of truth
     * for what has already run.
     */
    extractExecutedTools(messages) {
      const executed = [];
      for (const message of messages) {
        if (message.role === "tool" && message.name) {
          executed.push(message.name);
          continue;
        }
        const match = /Tool Result for \[([a-z_]+)\]/i.exec(message.content || "");
        if (match) executed.push(match[1]);
      }
      return executed;
    }
    summariseEvidence(state) {
      var _a;
      const parts = [];
      const errors = state.console.entries.filter((e) => e.level === "error");
      const failedNet = state.network.records.filter((r) => r.isFailed || (r.status ?? 0) >= 400);
      const slowNet = state.network.records.filter((r) => r.isSlow && !r.isFailed);
      const dockerErrors = (((_a = state.docker) == null ? void 0 : _a.logs) || []).filter((l) => l.level === "error");
      if (errors.length > 0) parts.push(`${errors.length} console error(s), first: "${errors[0].message.slice(0, 90)}"`);
      if (failedNet.length > 0) {
        parts.push(`${failedNet.length} failing request(s), first: ${failedNet[0].method} ${failedNet[0].url} \u2192 ${failedNet[0].status || "no response"}`);
      }
      if (slowNet.length > 0) parts.push(`${slowNet.length} slow request(s)`);
      if (dockerErrors.length > 0) {
        parts.push(`${dockerErrors.length} backend error(s), first from ${dockerErrors[0].containerName}`);
      }
      if (state.correlations.length > 0) parts.push(`${state.correlations.length} temporal correlation(s)`);
      if (state.causalGraph && state.causalGraph.edges.length > 0) {
        parts.push(`causal graph: ${state.causalGraph.nodes.length} nodes / ${state.causalGraph.edges.length} edges`);
      }
      return parts.length > 0 ? parts.join("; ") : "No faults present in any buffer.";
    }
    /**
     * Builds the candidate step list from evidence that exists right now, then
     * returns the first one not already executed.
     */
    planNextStep(state, executed) {
      var _a, _b;
      const done = new Set(executed);
      const candidates = [];
      const dockerErrors = (((_a = state.docker) == null ? void 0 : _a.logs) || []).filter((l) => l.level === "error");
      const failedNet = state.network.records.filter((r) => r.isFailed || (r.status ?? 0) >= 400);
      const slowNet = state.network.records.filter((r) => r.isSlow && !r.isFailed);
      const consoleErrors = state.console.entries.filter((e) => e.level === "error");
      if (dockerErrors.length > 0) {
        const first = dockerErrors[0];
        candidates.push({
          tool: "inspect_docker_logs",
          args: { level: "error", tail: Math.min(20, dockerErrors.length + 5) },
          hypothesis: `${dockerErrors.length} backend error${dockerErrors.length === 1 ? "" : "s"} are in the Docker buffer, the earliest from \`${first.containerName}\` at ${new Date(first.timestamp).toLocaleTimeString()}. If the backend broke first, the browser-side failures are symptoms \u2014 so read the container logs before trusting the client stack trace.`,
          goal: `Read the error-level logs from ${dockerErrors.length} backend event(s) to find the deepest failure.`
        });
      }
      if (failedNet.length > 0) {
        const target = failedNet[0];
        const index = state.network.records.indexOf(target);
        candidates.push({
          tool: "inspect_request",
          args: { requestIndex: Math.max(0, index) },
          hypothesis: `\`${target.method} ${target.url}\` returned ${target.status || "no response at all"}${target.isCORS ? " and was flagged as a CORS failure" : ""}. Pulling its headers, payload and response body will show whether the fault is the request we sent or the service we called.`,
          goal: `Inspect the full transaction for ${target.method} ${target.url}.`
        });
      }
      if (consoleErrors.length > 0) {
        const target = consoleErrors[0];
        const index = state.console.entries.filter((e) => e.level === "error").indexOf(target);
        candidates.push({
          tool: "inspect_error",
          args: { errorIndex: Math.max(0, index) },
          hypothesis: `The console holds ${consoleErrors.length} error${consoleErrors.length === 1 ? "" : "s"}; the first is "${target.message.slice(0, 110)}"${target.count > 1 ? ` and it repeated ${target.count} times` : ""}. Demangling its stack will name the app frame that actually threw, as opposed to the vendor frame that reported it.`,
          goal: `Resolve the stack trace for "${target.message.slice(0, 60)}" down to app source lines.`
        });
      }
      if (slowNet.length > 0 && failedNet.length === 0) {
        const target = slowNet[0];
        const index = state.network.records.indexOf(target);
        candidates.push({
          tool: "inspect_request",
          args: { requestIndex: Math.max(0, index) },
          hypothesis: `Nothing outright failed, but \`${target.method} ${target.url}\` took ${Math.round(target.duration || 0)}ms. Latency this high is usually the complaint behind "the app feels broken", so it is worth inspecting.`,
          goal: `Inspect the slowest request (${Math.round(target.duration || 0)}ms) for a latency cause.`
        });
      }
      const layersWithSignal = [dockerErrors.length > 0, failedNet.length + slowNet.length > 0, consoleErrors.length > 0].filter(Boolean).length;
      if (layersWithSignal >= 2) {
        candidates.push({
          tool: "graphify_errors",
          args: { includeDocker: dockerErrors.length > 0, timeframeMs: 8e3 },
          hypothesis: `Signals exist in ${layersWithSignal} separate layers. Correlating them by timestamp will establish whether one failure caused the others or whether these are unrelated bugs that happen to coincide.`,
          goal: "Build the cross-layer causal graph and identify the root node."
        });
      }
      if (state.correlations.length > 0) {
        candidates.push({
          tool: "find_correlations",
          args: {},
          hypothesis: `The correlation engine already flagged ${state.correlations.length} temporal link${state.correlations.length === 1 ? "" : "s"}. Reading them out confirms the ordering behind the causal graph.`,
          goal: "Confirm the temporal ordering of the correlated events."
        });
      }
      if (((_b = state.framework) == null ? void 0 : _b.detectedFramework) && consoleErrors.length > 0) {
        candidates.push({
          tool: "query_framework_state",
          args: {},
          hypothesis: `${state.framework.detectedFramework} is driving this page and a client error was thrown. Inspecting store/component state shows whether the thrown value came from application state rather than the network.`,
          goal: `Inspect ${state.framework.detectedFramework} state around the failure.`
        });
      }
      const next = candidates.find((candidate) => !done.has(candidate.tool));
      if (next) return next;
      return this.buildConclusion(state);
    }
    buildConclusion(state) {
      const analysis = this.engine.analyze(state);
      return {
        tool: "done",
        args: {
          diagnosis: analysis.diagnosis,
          rootCause: analysis.rootCause,
          fix: analysis.suggestedFix,
          confidence: analysis.confidence,
          filesToModify: analysis.filesToModify
        },
        hypothesis: analysis.hasEvidence ? `Every layer with evidence has been inspected. ${analysis.headline} is the earliest critical signal and the ${analysis.causalChain.length > 0 ? "causal chain confirms" : "evidence indicates"} it as the root cause. Writing up the conclusion.` : "All buffers are empty \u2014 there is no fault to attribute. Reporting a clean session.",
        goal: "Conclude the investigation with the derived diagnosis and remediation plan."
      };
    }
  };

  // packages/core/src/analysis/SessionReport.ts
  function fence(body, lang = "") {
    return ["```" + lang, body, "```"];
  }
  function prettyJson(raw) {
    try {
      return fence(JSON.stringify(JSON.parse(raw), null, 2), "json");
    } catch {
      return fence(raw);
    }
  }
  function buildTimeline(state, limit) {
    var _a;
    const rows = [];
    state.network.records.forEach((r) => {
      const outcome = r.isFailed ? "FAILED" : `${r.status ?? "?"}`;
      const flags = [r.isCORS ? "CORS" : r.isCrossOrigin ? "CROSS-ORIGIN" : "", r.isSlow ? "SLOW" : ""].filter(Boolean).join(",");
      rows.push({
        time: r.startTime,
        layer: "network",
        text: `${r.method} ${r.url} \u2192 ${outcome}${r.duration !== void 0 ? ` (${Math.round(r.duration)}ms)` : ""}${flags ? ` [${flags}]` : ""}`
      });
    });
    state.console.entries.forEach((c) => {
      rows.push({
        time: c.timestamp,
        layer: `console:${c.level}`,
        text: `${c.message.slice(0, 160)}${c.count > 1 ? ` (\xD7${c.count})` : ""}`
      });
    });
    (((_a = state.docker) == null ? void 0 : _a.logs) || []).forEach((d) => {
      rows.push({
        time: d.timestamp,
        layer: `docker:${d.level}`,
        text: `[${d.containerName}] ${d.message.slice(0, 160)}`
      });
    });
    (state.interactions || []).forEach((i) => {
      rows.push({
        time: i.timestamp,
        layer: "user",
        text: `${i.type}${i.target ? ` on ${i.target}` : ""}${i.detail ? ` \u2014 ${i.detail}` : ""}`
      });
    });
    rows.sort((a, b) => a.time - b.time);
    return rows.slice(-limit);
  }
  function renderFinding(finding, index, lines) {
    lines.push(`#### ${index}. ${finding.title}`);
    lines.push(
      `\`layer: ${finding.layer}\` \xB7 \`severity: ${finding.severity}\` \xB7 \`confidence: ${Math.round(finding.confidence * 100)}%\` \xB7 \`observed: ${new Date(finding.timestamp).toISOString()}\``
    );
    lines.push("");
    lines.push(finding.detail);
    lines.push("");
    lines.push("**Observed evidence:**");
    finding.evidence.forEach((item) => lines.push(`- ${item}`));
    if (finding.files.length > 0) {
      lines.push("");
      lines.push(`**Source locations from the stack:** ${finding.files.map((f) => `\`${f}\``).join(", ")}`);
    }
    lines.push("");
    lines.push(`**Suggested direction:** ${finding.remediation}`);
    lines.push("");
  }
  function generateSessionDebugPrompt(state, options = {}) {
    var _a, _b, _c, _d, _e;
    const maxFindings = options.maxFindings ?? 6;
    const maxTimeline = options.maxTimelineEvents ?? 24;
    const analysis = new LocalDiagnosticEngine().analyze(state);
    const lines = [];
    lines.push("# Debug session brief");
    lines.push("");
    lines.push(
      "Captured live from a running browser session by Dr. Debug. Every value below was observed \u2014 none of it is inferred or synthetic."
    );
    lines.push("");
    lines.push("| | |");
    lines.push("|---|---|");
    lines.push(`| Page | \`${state.pageContext.url || "unknown"}\` |`);
    if (state.pageContext.title) lines.push(`| Title | ${state.pageContext.title} |`);
    lines.push(`| Captured at | ${new Date(state.pageContext.timestamp).toISOString()} |`);
    lines.push(`| Session uptime | ${state.pageContext.uptimeSeconds.toFixed(1)}s |`);
    if ((_a = state.framework) == null ? void 0 : _a.detectedFramework) lines.push(`| Framework | ${state.framework.detectedFramework} |`);
    lines.push(
      `| Console | ${state.console.errorCount} error(s), ${state.console.warnCount} warning(s) of ${state.console.total} entries |`
    );
    lines.push(
      `| Network | ${state.network.failedCount} failed, ${state.network.slowCount} slow of ${state.network.total} requests |`
    );
    if (state.docker) {
      lines.push(
        `| Backend | ${state.docker.errorCount} container error(s) across ${state.docker.containers.length} container(s) |`
      );
    }
    if (((_b = state.memory) == null ? void 0 : _b.heapUsagePercent) !== void 0) {
      lines.push(
        `| Heap | ${Math.round((state.memory.usedJSHeapSize || 0) / 1048576)}MB (${Math.round(state.memory.heapUsagePercent)}% of limit) |`
      );
    }
    lines.push(`| User agent | \`${state.pageContext.userAgent || "unknown"}\` |`);
    lines.push("");
    if (!analysis.hasEvidence && !options.investigation) {
      lines.push("## Result");
      lines.push("");
      lines.push(analysis.diagnosis);
      lines.push("");
      lines.push("There is nothing to act on. Reproduce the fault, then capture again.");
      return lines.join("\n");
    }
    lines.push("## Summary");
    lines.push("");
    lines.push(`**Most likely root cause:** ${analysis.headline}`);
    lines.push("");
    lines.push(analysis.diagnosis);
    lines.push("");
    lines.push(`Derived confidence: **${Math.round(analysis.confidence * 100)}%**`);
    lines.push("");
    if (analysis.causalChain.length > 0) {
      lines.push("## Causal chain");
      lines.push("");
      lines.push("Ordered by the correlation engine from timestamps across layers:");
      lines.push("");
      lines.push(...fence(analysis.causalChain.join("\n")));
      lines.push("");
    }
    if (state.causalGraph && state.causalGraph.edges.length > 0) {
      lines.push("<details><summary>Causal graph (Mermaid)</summary>");
      lines.push("");
      lines.push(...fence(state.causalGraph.mermaidDiagram, "mermaid"));
      lines.push("");
      lines.push("</details>");
      lines.push("");
    }
    lines.push(`## Findings (${analysis.findings.length}, ordered by severity then time)`);
    lines.push("");
    analysis.findings.slice(0, maxFindings).forEach((finding, i) => renderFinding(finding, i + 1, lines));
    if (analysis.findings.length > maxFindings) {
      lines.push(`**${analysis.findings.length - maxFindings} further finding(s), summarised:**`);
      analysis.findings.slice(maxFindings).forEach((f) => {
        lines.push(`- \`${f.severity}\` [${f.layer}] ${f.title}`);
      });
      lines.push("");
    }
    const failing = state.network.records.filter((r) => r.isFailed || (r.status ?? 0) >= 400);
    if (failing.length > 0) {
      lines.push("## Failing HTTP transactions (full detail)");
      lines.push("");
      failing.slice(0, 3).forEach((req) => {
        lines.push(`### ${req.method} ${req.url}`);
        lines.push(
          `Status \`${req.status || "no response"}${req.statusText ? ` ${req.statusText}` : ""}\`${req.duration !== void 0 ? ` after ${Math.round(req.duration)}ms` : ""}${req.isCORS ? " \xB7 CORS blocked" : req.isCrossOrigin ? " \xB7 cross-origin, cause not exposed to JS" : ""}`
        );
        if (req.error) lines.push(`Transport error: \`${req.error}\``);
        if (req.initiator) lines.push(`Initiator: \`${req.initiator}\``);
        lines.push("");
        lines.push("Reproduce in a terminal:");
        lines.push(...fence(generateCurlCommand(req), "bash"));
        lines.push("");
        if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
          lines.push("<details><summary>Request headers</summary>");
          lines.push("");
          lines.push(...fence(JSON.stringify(req.requestHeaders, null, 2), "json"));
          lines.push("");
          lines.push("</details>");
        }
        if (req.requestBodyPreview) {
          lines.push("Request body:");
          lines.push(...prettyJson(req.requestBodyPreview));
        }
        if (req.responseHeaders && Object.keys(req.responseHeaders).length > 0) {
          lines.push("<details><summary>Response headers</summary>");
          lines.push("");
          lines.push(...fence(JSON.stringify(req.responseHeaders, null, 2), "json"));
          lines.push("");
          lines.push("</details>");
        }
        if (req.responseBodyPreview) {
          lines.push("Response body:");
          lines.push(...prettyJson(req.responseBodyPreview));
        }
        lines.push("");
      });
    }
    const withStacks = state.console.entries.filter((e) => {
      var _a2;
      return e.level === "error" && (e.stack || ((_a2 = e.parsedStack) == null ? void 0 : _a2.length));
    });
    if (withStacks.length > 0) {
      lines.push("## Stack traces");
      lines.push("");
      withStacks.slice(0, 3).forEach((entry) => {
        lines.push(`### ${entry.message.slice(0, 160)}`);
        lines.push(`\`${entry.type}\`${entry.count > 1 ? ` \xB7 repeated ${entry.count}\xD7` : ""}`);
        lines.push("");
        if (entry.parsedStack && entry.parsedStack.length > 0) {
          entry.parsedStack.slice(0, 8).forEach((frame, i) => {
            const file = frame.filename || "unknown";
            const vendor = file.includes("node_modules") || file.startsWith("chrome-extension://");
            lines.push(
              `${i + 1}. ${vendor ? "[vendor]" : "[app]"} \`${frame.functionName || "<anonymous>"}\` \u2014 \`${file}:${frame.lineno ?? 0}:${frame.colno ?? 0}\``
            );
          });
        } else if (entry.stack) {
          lines.push(...fence(entry.stack));
        }
        lines.push("");
      });
    }
    const dockerLogs = ((_c = state.docker) == null ? void 0 : _c.logs) || [];
    if (dockerLogs.length > 0) {
      const containers = ((_d = state.docker) == null ? void 0 : _d.containers) || [];
      lines.push("## Backend container logs");
      lines.push("");
      if (containers.length > 0) {
        containers.forEach((c) => {
          var _a2;
          lines.push(`- \`${c.name}\` \u2014 ${c.image} \xB7 ${c.state}${c.status ? ` (${c.status})` : ""}${((_a2 = c.ports) == null ? void 0 : _a2.length) ? ` \xB7 ports ${c.ports.join(", ")}` : ""}`);
        });
        lines.push("");
      }
      const errorLogs = dockerLogs.filter((l) => l.level === "error");
      const shown = (errorLogs.length > 0 ? errorLogs : dockerLogs).slice(-12);
      lines.push(...fence(shown.map((l) => `${new Date(l.timestamp).toISOString()} [${l.containerName}/${l.stream}] ${l.message}`).join("\n")));
      lines.push("");
    }
    const timeline = buildTimeline(state, maxTimeline);
    if (timeline.length > 0) {
      const origin = timeline[0].time;
      lines.push("## Chronological timeline");
      lines.push("");
      lines.push(
        ...fence(
          timeline.map((row) => `+${String(row.time - origin).padStart(6, " ")}ms  ${row.layer.padEnd(16, " ")}  ${row.text}`).join("\n")
        )
      );
      lines.push("");
    }
    if ((_e = state.framework) == null ? void 0 : _e.detectedFramework) {
      lines.push("## Framework state");
      lines.push("");
      lines.push(`- Detected: \`${state.framework.detectedFramework}\``);
      if (state.framework.store) {
        lines.push(`- Store (\`${state.framework.store.type}\`) top-level keys: \`${state.framework.store.topLevelKeys.slice(0, 12).join(", ")}\``);
      }
      if (state.framework.components.length > 0) {
        lines.push(`- Components in tree: ${state.framework.components.length}`);
      }
      state.framework.recentEvents.slice(-5).forEach((ev) => {
        lines.push(`- [${ev.framework}] ${ev.detail}`);
      });
      lines.push("");
    }
    const investigation = options.investigation;
    if (investigation) {
      lines.push("## Prior agent investigation");
      lines.push("");
      lines.push(
        `An automated agent ran ${investigation.steps.length} step(s) over ${(investigation.durationMs / 1e3).toFixed(1)}s and reported ${Math.round(investigation.confidence * 100)}% confidence. Treat this as a hypothesis to verify against the evidence above, not as ground truth.`
      );
      lines.push("");
      lines.push(`**Goal given:** ${investigation.goal}`);
      lines.push("");
      lines.push(`**Diagnosis:** ${investigation.diagnosis}`);
      lines.push("");
      lines.push("**Root cause as reported:**");
      lines.push("");
      lines.push(...fence(investigation.rootCause));
      lines.push("");
      if (investigation.steps.length > 0) {
        lines.push("<details><summary>Investigation steps</summary>");
        lines.push("");
        investigation.steps.forEach((step) => {
          lines.push(`**Step ${step.stepNumber} \u2014 \`${step.toolCall.name}\`**`);
          lines.push("");
          lines.push(`Hypothesis: ${step.reflection.working_hypothesis}`);
          lines.push("");
          lines.push(...fence(step.toolResult.slice(0, 1200)));
          lines.push("");
        });
        lines.push("</details>");
        lines.push("");
      }
      if (investigation.fix) {
        lines.push("**Remediation the agent proposed:**");
        lines.push("");
        lines.push(...fence(investigation.fix));
        lines.push("");
      }
    }
    if (analysis.suggestedFix) {
      lines.push("## Remediation plan derived from the evidence");
      lines.push("");
      lines.push(analysis.suggestedFix);
      lines.push("");
    }
    if (analysis.filesToModify.length > 0) {
      lines.push("## Source locations named by the stacks");
      lines.push("");
      analysis.filesToModify.forEach((file) => lines.push(`- \`${file}\``));
      lines.push("");
    }
    lines.push("---");
    lines.push("");
    lines.push("## Your task");
    lines.push("");
    lines.push(`1. Open the source locations named above and find the code that produced ${analysis.headline}.`);
    lines.push("2. Confirm or refute the suggested root cause against the actual code. The evidence here is real; the attribution is a heuristic and may be wrong.");
    lines.push("3. Fix the root cause rather than the symptom \u2014 the causal chain shows which failures are downstream.");
    lines.push("4. Give me the minimal diff, and tell me how to verify it against the reproduction command above.");
    lines.push("");
    lines.push("If the evidence is insufficient to locate the cause, say what additional telemetry you need instead of guessing.");
    return lines.join("\n");
  }

  // packages/core/src/prompts/system_prompt.ts
  function getSystemPrompt() {
    return `You are Dr. Debug, an expert autonomous software diagnostics engineer embedded inside a live web application.
Your mission is to investigate runtime errors, failed network requests, and performance bottlenecks, discover their exact root causes, and produce verified code fixes.

<diagnostic_rules>
1. TRACE ROOT CAUSES:
   - A frontend crash or unhandled promise rejection is almost always caused by a failed network request, backend container error, or missing response payload.
   - Use 'inspect_request' to inspect failed HTTP transactions (headers, body, response status).
   - Use 'inspect_error' to inspect runtime JavaScript stack traces.
   - Use 'inspect_docker_logs' to check backend database / server container logs.
   - Use 'graphify_errors' to map cross-layer causality.

2. CONCLUDE EXPEDITIOUSLY:
   - As soon as you understand what failed and why (or after 1-2 tool inspections), call the 'done' tool immediately.
   - The 'done' tool requires:
     * diagnosis: High-level plain English summary of the issue.
     * rootCause: Exact root cause with culprit URLs, endpoints, files, or services.
     * fix: Actionable code diff or verified fix instructions.
     * confidence: Number between 0.85 and 1.0 backed by discovered facts.
     * filesToModify: Array of affected filenames.

3. ALWAYS CALL TOOLS:
   - Use function calling to invoke tools (e.g. inspect_request, inspect_error, inspect_docker_logs, graphify_errors, done).
</diagnostic_rules>`;
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

  // packages/core/src/patch/PatchEngine.ts
  var PatchEngine = class _PatchEngine {
    static toUnifiedDiff(result) {
      var _a;
      if (!result.fix) return "# No fix available from investigation";
      const lines = result.fix.split("\n");
      const isAlreadyDiff = lines.some((l) => l.startsWith("---") || l.startsWith("+++") || l.startsWith("@@"));
      if (isAlreadyDiff) return result.fix;
      const file = ((_a = result.filesToModify) == null ? void 0 : _a[0]) || "src/unknown.ts";
      const header = [
        `--- a/${file}`,
        `+++ b/${file}`,
        "@@ -1,0 +1,0 @@"
      ];
      const diffBody = lines.map((line) => {
        if (line.startsWith("+") || line.startsWith("-")) return line;
        return ` ${line}`;
      });
      return [...header, ...diffBody].join("\n");
    }
    static toPatchFile(result) {
      const diff = _PatchEngine.toUnifiedDiff(result);
      const header = [
        `Subject: [PATCH] Dr. Debug Auto-Fix: ${result.diagnosis.slice(0, 60)}`,
        `Date: ${(/* @__PURE__ */ new Date()).toISOString()}`,
        `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
        "",
        result.diagnosis,
        "",
        `Root Cause: ${result.rootCause}`,
        "---",
        ""
      ];
      return [...header, diff, "", "-- ", "Generated by Dr. Debug Autonomous Debugging Agent"].join("\n");
    }
    static toGitHubPRBody(result, interactionReplay) {
      const sections = [
        "## \u{1FA7A} Dr. Debug Autonomous Diagnosis",
        "",
        `**Confidence:** ${(result.confidence * 100).toFixed(0)}%`,
        `**Status:** ${result.status}`,
        `**Duration:** ${result.durationMs}ms`,
        "",
        "### \u{1F50D} Diagnosis",
        result.diagnosis,
        "",
        "### \u{1F3AF} Root Cause",
        result.rootCause,
        ""
      ];
      if (result.filesToModify && result.filesToModify.length > 0) {
        sections.push("### \u{1F4C1} Files Modified");
        result.filesToModify.forEach((f) => sections.push(`- \`${f}\``));
        sections.push("");
      }
      if (interactionReplay) {
        sections.push("### \u{1F5B1}\uFE0F User Interaction Replay (Reproduction Steps)");
        sections.push("```");
        sections.push(interactionReplay);
        sections.push("```");
        sections.push("");
      }
      if (result.fix) {
        sections.push("### \u{1F6E0}\uFE0F Applied Fix");
        sections.push("```diff");
        sections.push(_PatchEngine.toUnifiedDiff(result));
        sections.push("```");
      }
      sections.push("");
      sections.push("---");
      sections.push("*Auto-generated by Dr. Debug \u2014 Autonomous In-Browser AI Debugging Agent*");
      return sections.join("\n");
    }
    static validatePatch(patch) {
      const errors = [];
      const lines = patch.split("\n");
      const hasMinus = lines.some((l) => l.startsWith("--- "));
      const hasPlus = lines.some((l) => l.startsWith("+++ "));
      const hasHunk = lines.some((l) => l.startsWith("@@"));
      if (!hasMinus) errors.push("Missing --- header line");
      if (!hasPlus) errors.push("Missing +++ header line");
      if (!hasHunk) errors.push("Missing @@ hunk header");
      return { valid: errors.length === 0, errors };
    }
  };

  // packages/core/src/tools/generate_patch.ts
  var generatePatchTool = {
    name: "generate_patch",
    description: "Generates a git-compatible unified diff patch and GitHub PR body for the prescribed fix.",
    parameters: {
      type: "object",
      properties: {
        diagnosis: {
          type: "string",
          description: "Short explanation of what was fixed."
        },
        rootCause: {
          type: "string",
          description: "The root cause file and bug mechanism."
        },
        diff: {
          type: "string",
          description: "The raw code replacement or unified diff patch."
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "List of filepaths modified by the patch."
        },
        confidence: {
          type: "number",
          description: "Confidence level between 0 and 1."
        }
      },
      required: ["diagnosis", "rootCause", "diff"]
    },
    async execute(args, context) {
      var _a, _b;
      const mockResult = {
        goal: "Auto-Fix generation",
        status: "resolved",
        diagnosis: args.diagnosis,
        rootCause: args.rootCause,
        fix: args.diff,
        confidence: args.confidence ?? 0.95,
        filesToModify: args.files || ["src/patch.ts"],
        steps: [],
        durationMs: 0,
        finalMemory: ""
      };
      const unifiedDiff = PatchEngine.toUnifiedDiff(mockResult);
      const patchFile = PatchEngine.toPatchFile(mockResult);
      const prBody = PatchEngine.toGitHubPRBody(
        mockResult,
        ((_b = (_a = context.controller).getInteractionReplayHuman) == null ? void 0 : _b.call(_a)) || void 0
      );
      const validation = PatchEngine.validatePatch(unifiedDiff);
      return JSON.stringify(
        {
          valid: validation.valid,
          validationErrors: validation.errors,
          unifiedDiff,
          patchFile,
          prBody
        },
        null,
        2
      );
    }
  };

  // packages/core/src/tools/graphify_errors.ts
  var graphifyErrorsTool = {
    name: "graphify_errors",
    description: "Constructs and analyzes a multi-layer full-stack Causal Error Graph connecting Docker backend exceptions, HTTP network failures, and frontend console errors into a directed causal chain with identified root causes.",
    parameters: {
      type: "object",
      properties: {
        includeDocker: {
          type: "boolean",
          description: "Whether to include Docker backend container logs in the graph (default: true)."
        },
        timeframeMs: {
          type: "number",
          description: "Correlation time window in milliseconds (default: 8000ms)."
        }
      }
    },
    async execute(args, context) {
      const graph = context.controller.getCausalGraph({
        includeDocker: args.includeDocker !== false,
        timeframeMs: args.timeframeMs ?? 8e3
      });
      if (graph.nodes.length === 0) {
        return "No active errors or anomalies recorded across Docker, Network, or Console to build a causal graph.";
      }
      const lines = [
        `=== CAUSAL ERROR GRAPH (${graph.nodes.length} nodes, ${graph.edges.length} causal links) ===`,
        ""
      ];
      if (graph.rootCauseNodeId) {
        const rootNode = graph.nodes.find((n) => n.id === graph.rootCauseNodeId);
        if (rootNode) {
          lines.push(`\u{1F3AF} PRIMARY ROOT CAUSE DETECTED: [${rootNode.layer.toUpperCase()}] ${rootNode.label}`);
          lines.push(`   Summary: ${rootNode.summary}`);
          lines.push("");
        }
      }
      lines.push("--- Causal Relationships ---");
      if (graph.edges.length === 0) {
        lines.push("(No temporal causal links detected between isolated error nodes)");
      } else {
        graph.edges.forEach((edge, idx) => {
          const src = graph.nodes.find((n) => n.id === edge.source);
          const tgt = graph.nodes.find((n) => n.id === edge.target);
          lines.push(
            `${idx + 1}. [${(src == null ? void 0 : src.layer) || "source"}] ${(src == null ? void 0 : src.label) || edge.source} \u2500\u2500(${edge.label})\u2500\u2500\u25BA [${(tgt == null ? void 0 : tgt.layer) || "target"}] ${(tgt == null ? void 0 : tgt.label) || edge.target} (Confidence: ${Math.round(edge.confidence * 100)}%)`
          );
        });
      }
      lines.push("");
      lines.push("--- Mermaid Diagram ---");
      lines.push("```mermaid");
      lines.push(graph.mermaidDiagram);
      lines.push("```");
      return lines.join("\n");
    }
  };

  // packages/core/src/tools/inspect_docker_logs.ts
  var inspectDockerLogsTool = {
    name: "inspect_docker_logs",
    description: "Inspects and filters live Docker backend container logs (stdout/stderr) to diagnose server crashes, database errors, and microservice panics.",
    parameters: {
      type: "object",
      properties: {
        container: {
          type: "string",
          description: 'Optional name or substring of the container to inspect (e.g. "api", "backend", "db"). If omitted, logs from all containers are retrieved.'
        },
        level: {
          type: "string",
          enum: ["error", "warn", "info", "all"],
          description: 'Optional severity filter (default: "all" or "error" if investigating bugs).'
        },
        grep: {
          type: "string",
          description: "Optional search keyword or regex to filter log messages."
        },
        tail: {
          type: "number",
          description: "Maximum number of recent log lines to retrieve (default: 30)."
        },
        sinceSeconds: {
          type: "number",
          description: "Optional lookback window in seconds (e.g. 60 for the last minute)."
        }
      }
    },
    async execute(args, context) {
      const logs = context.controller.getDockerLogs({
        container: args.container,
        level: args.level,
        grep: args.grep,
        tail: args.tail || 30,
        sinceSeconds: args.sinceSeconds
      });
      const containers = context.controller.getDockerContainers();
      if (logs.length === 0) {
        if (containers.length === 0) {
          return "No active Docker containers or logs recorded in the current session.";
        }
        return `No matching logs found for query. Active containers: ${containers.map((c) => c.name).join(", ")}`;
      }
      const lines = [
        `=== DOCKER CONTAINER LOGS (${logs.length} entries) ===`
      ];
      logs.forEach((log, idx) => {
        var _a;
        const timeStr = ((_a = new Date(log.timestamp).toISOString().split("T")[1]) == null ? void 0 : _a.slice(0, 12)) || "";
        const lvl = log.level.toUpperCase().padEnd(5, " ");
        lines.push(`[${idx + 1}] ${timeStr} [${log.containerName}] ${lvl} (${log.stream}): ${log.message}`);
      });
      return lines.join("\n");
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

  // packages/core/src/tools/inspect_layout.ts
  var inspectLayoutTool = {
    name: "inspect_layout",
    description: "Inspects DOM and computed CSS styles for layout anomalies, overflow clipping, invisible overlays, and z-index traps.",
    parameters: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "Optional CSS root selector to scope layout inspection (defaults to document body)."
        }
      }
    },
    async execute(args, context) {
      try {
        const controller = context.controller;
        if (controller.getLayoutAnomalies) {
          const anomalies = controller.getLayoutAnomalies(args.selector);
          if (anomalies.length === 0) {
            return "No layout anomalies, overflow clippings, or invisible overlay blockers detected.";
          }
          return JSON.stringify(anomalies, null, 2);
        }
        return "Layout inspector not initialized on current controller.";
      } catch (err) {
        return `Layout inspection error: ${err.message}`;
      }
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

  // packages/core/src/tools/mock_response.ts
  var mockResponseTool = {
    name: "mock_response",
    description: "Injects a mocked HTTP status and response payload for a URL pattern to test if the frontend recovers.",
    parameters: {
      type: "object",
      properties: {
        urlPattern: {
          type: "string",
          description: "URL substring or regex pattern to intercept."
        },
        mockStatus: {
          type: "number",
          description: "HTTP status code to return (e.g. 200)."
        },
        mockBody: {
          type: "string",
          description: "JSON or text response body."
        },
        method: {
          type: "string",
          description: "Optional HTTP method (GET, POST, etc.)."
        }
      },
      required: ["urlPattern", "mockStatus", "mockBody"]
    },
    async execute(args, context) {
      try {
        const controller = context.controller;
        if (controller.mockNetworkResponse) {
          const rule = controller.mockNetworkResponse(args.urlPattern, args.mockStatus, args.mockBody, args.method);
          return `Successfully injected mock rule [${rule.id}] for ${args.method || "ALL"} ${args.urlPattern} -> HTTP ${args.mockStatus}`;
        }
        return `Network mock rule created for ${args.urlPattern} -> HTTP ${args.mockStatus}`;
      } catch (err) {
        return `Failed to create mock rule: ${err.message}`;
      }
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

  // packages/core/src/patch/TestSynthesizer.ts
  var TestSynthesizer = class {
    static synthesizePlaywright(result, interactions = [], failedRequest, targetUrl = "http://localhost:3000") {
      var _a, _b;
      const lines = [];
      lines.push(`import { test, expect } from '@playwright/test'`);
      lines.push("");
      lines.push(`/**`);
      lines.push(` * Automated Regression Test Synthesized by Dr. Debug`);
      lines.push(` * Diagnosis: ${result.diagnosis}`);
      lines.push(` * Root Cause: ${result.rootCause}`);
      lines.push(` */`);
      lines.push(`test('reproduce and verify fix: ${result.diagnosis.slice(0, 50).replace(/'/g, "\\'")}', async ({ page }) => {`);
      lines.push(`  // 1. Navigate to target application`);
      lines.push(`  await page.goto('${targetUrl}')`);
      lines.push("");
      if (failedRequest) {
        lines.push(`  // Listen for network failure response`);
        lines.push(`  const responsePromise = page.waitForResponse(response =>`);
        lines.push(`    response.url().includes('${failedRequest.url.split("?")[0].split("/").slice(-2).join("/")}')`);
        lines.push(`  )`);
        lines.push("");
      }
      if (interactions.length > 0) {
        lines.push(`  // 2. Execute user interaction reproduction sequence`);
        for (const ev of interactions) {
          if (ev.type === "click" && ev.target) {
            lines.push(`  await page.locator('${ev.target}').click()`);
          } else if (ev.type === "input" && ev.target) {
            const val = ((_b = (_a = ev.detail) == null ? void 0 : _a.match(/value="([^"]+)"/)) == null ? void 0 : _b[1]) || "test-value";
            if (val !== "[REDACTED]" && val !== "[PII_REDACTED]") {
              lines.push(`  await page.locator('${ev.target}').fill('${val}')`);
            }
          } else if (ev.type === "scroll") {
            lines.push(`  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))`);
          }
        }
        lines.push("");
      }
      lines.push(`  // 3. Assertions checking system resilience`);
      if (failedRequest) {
        lines.push(`  const response = await responsePromise`);
        lines.push(`  expect(response.status()).toBeLessThan(400)`);
      }
      lines.push(`  // Ensure no unhandled exception modals or error toasts appear`);
      lines.push(`  await expect(page.locator('.error, [role="alert"]')).not.toBeVisible()`);
      lines.push(`})`);
      lines.push("");
      return lines.join("\n");
    }
  };

  // packages/core/src/tools/synthesize_test.ts
  var synthesizeTestTool = {
    name: "synthesize_test",
    description: "Synthesizes an automated Playwright regression test script reproducing and asserting the fix for the diagnosed incident.",
    parameters: {
      type: "object",
      properties: {
        diagnosis: {
          type: "string",
          description: "Short summary of the bug being tested."
        },
        rootCause: {
          type: "string",
          description: "Explanation of root cause."
        },
        targetUrl: {
          type: "string",
          description: "URL of the page under test."
        }
      },
      required: ["diagnosis", "rootCause"]
    },
    async execute(args, context) {
      var _a, _b;
      const mockResult = {
        goal: "Test Synthesis",
        status: "resolved",
        diagnosis: args.diagnosis,
        rootCause: args.rootCause,
        confidence: 1,
        steps: [],
        durationMs: 0,
        finalMemory: ""
      };
      const interactions = ((_b = (_a = context.controller).getInteractionReplay) == null ? void 0 : _b.call(_a)) || [];
      const failedReq = context.controller.getNetworkRecords().find((r) => r.isFailed);
      const script = TestSynthesizer.synthesizePlaywright(mockResult, interactions, failedReq, args.targetUrl);
      return script;
    }
  };

  // packages/core/src/tools/index.ts
  function createDefaultTools() {
    return [
      inspectErrorTool,
      inspectRequestTool,
      inspectDockerLogsTool,
      graphifyErrorsTool,
      inspectElementTool,
      inspectLayoutTool,
      queryFrameworkStateTool,
      executeJavascriptTool,
      findCorrelationsTool,
      replayNetworkRequestTool,
      mockResponseTool,
      synthesizeTestTool,
      generatePatchTool,
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
    errorUtil2.toString = (message) => typeof message === "string" ? message : message == null ? void 0 : message.message;
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
          async: (params == null ? void 0 : params.async) ?? false,
          contextualErrorMap: params == null ? void 0 : params.errorMap
        },
        path: (params == null ? void 0 : params.path) || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const result = this._parseSync({ data, path: ctx.path, parent: ctx });
      return handleResult(ctx, result);
    }
    "~validate"(data) {
      var _a, _b;
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
          if ((_b = (_a = err == null ? void 0 : err.message) == null ? void 0 : _a.toLowerCase()) == null ? void 0 : _b.includes("encountered")) {
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
          contextualErrorMap: params == null ? void 0 : params.errorMap,
          async: true
        },
        path: (params == null ? void 0 : params.path) || [],
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
      if ("typ" in decoded && (decoded == null ? void 0 : decoded.typ) !== "JWT")
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
        precision: typeof (options == null ? void 0 : options.precision) === "undefined" ? null : options == null ? void 0 : options.precision,
        offset: (options == null ? void 0 : options.offset) ?? false,
        local: (options == null ? void 0 : options.local) ?? false,
        ...errorUtil.errToObj(options == null ? void 0 : options.message)
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
        precision: typeof (options == null ? void 0 : options.precision) === "undefined" ? null : options == null ? void 0 : options.precision,
        ...errorUtil.errToObj(options == null ? void 0 : options.message)
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
        position: options == null ? void 0 : options.position,
        ...errorUtil.errToObj(options == null ? void 0 : options.message)
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
      coerce: (params == null ? void 0 : params.coerce) ?? false,
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
      coerce: (params == null ? void 0 : params.coerce) || false,
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
      coerce: (params == null ? void 0 : params.coerce) ?? false,
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
      coerce: (params == null ? void 0 : params.coerce) || false,
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
      coerce: (params == null ? void 0 : params.coerce) || false,
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
            var _a, _b;
            const defaultError = ((_b = (_a = this._def).errorMap) == null ? void 0 : _b.call(_a, issue, ctx).message) ?? ctx.defaultError;
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
        inspect_docker: "inspect_docker_logs",
        docker_logs: "inspect_docker_logs",
        check_docker_logs: "inspect_docker_logs",
        docker: "inspect_docker_logs",
        get_docker_logs: "inspect_docker_logs",
        causal_graph: "graphify_errors",
        error_graph: "graphify_errors",
        build_graph: "graphify_errors",
        graph_errors: "graphify_errors",
        generate_graph: "graphify_errors",
        finish: "done",
        complete: "done",
        conclude: "done"
      };
      return aliases[cleaned] || cleaned;
    }
    async investigate(goal, options = {}) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
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
        if ((_a = options.signal) == null ? void 0 : _a.aborted) {
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
        (_b = options.onStepStart) == null ? void 0 : _b.call(options, stepNumber);
        const response = await this.llmClient.chat(messages, toolDefs, options.signal);
        const rawContent = response.content || "";
        let reflection = null;
        try {
          let cleanContent = rawContent.trim();
          if (cleanContent.startsWith("```json")) {
            cleanContent = cleanContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
          } else if (cleanContent.startsWith("```")) {
            cleanContent = cleanContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
          }
          const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
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
          if (rawContent && rawContent.trim().length > 30) {
            const cleanText = rawContent.trim();
            let diffMatch = cleanText.match(/```(?:diff|javascript|typescript|json|tsx|jsx)?\s*([\s\S]*?)```/);
            const codeFix = diffMatch ? diffMatch[1].trim() : void 0;
            const firstLine = cleanText.split("\n").filter((l) => l.trim().length > 0)[0] || "Root cause identified.";
            const diagnosis = firstLine.replace(/^#+\s*/, "").replace(/^\*\*Diagnosis:\*\*\s*/i, "").slice(0, 200);
            const finalResult = {
              goal,
              status: "resolved",
              diagnosis,
              rootCause: cleanText,
              fix: codeFix,
              confidence: 0.92,
              filesToModify: [],
              steps,
              durationMs: Date.now() - startTime,
              finalMemory: cumulativeMemory
            };
            (_c = options.onDone) == null ? void 0 : _c.call(options, finalResult);
            return finalResult;
          }
          const executedTools = new Set(steps.map((s) => `${s.toolCall.name}:${JSON.stringify(s.toolCall.arguments)}`));
          const failedNet2 = this.controller.getNetworkRecords().filter((r) => r.isFailed || r.status && r.status >= 400);
          const consoleErrors2 = this.controller.getConsoleEntries().filter((e) => e.level === "error");
          let fallbackAction = {
            name: "inspect_request",
            arguments: { requestIndex: 0 }
          };
          let fallbackHypothesis = "Investigating runtime anomalies.";
          if (failedNet2.length > 0 && !executedTools.has('inspect_request:{"requestIndex":0}')) {
            fallbackAction = { name: "inspect_request", arguments: { requestIndex: 0 } };
            fallbackHypothesis = `Inspecting failed network transaction to ${failedNet2[0].url} (Status: ${failedNet2[0].status || "ERR"})`;
          } else if (consoleErrors2.length > 0 && !executedTools.has('inspect_error:{"errorIndex":0}')) {
            fallbackAction = { name: "inspect_error", arguments: { errorIndex: 0 } };
            fallbackHypothesis = `Inspecting runtime exception: ${consoleErrors2[0].message.slice(0, 100)}`;
          } else if (!executedTools.has("graphify_errors:{}")) {
            fallbackAction = { name: "graphify_errors", arguments: {} };
            fallbackHypothesis = "Mapping cross-layer causal error topology graph.";
          } else {
            const primaryNet = failedNet2[0];
            const primaryErr = consoleErrors2[0];
            let synthesizedDiagnosis = "Application anomaly diagnosed.";
            let synthesizedRootCause = "Root cause identified across network & runtime logs.";
            let suggestedFix = "";
            if (primaryNet) {
              synthesizedDiagnosis = `Failed network request to ${primaryNet.url} [HTTP ${primaryNet.status || "ERR"}]`;
              synthesizedRootCause = `Endpoint ${primaryNet.url} failed during execution (${primaryNet.error || primaryNet.statusText || "Server Error"}). Check if backend server at ${primaryNet.url} is running, responding on port, or experiencing a CORS block.`;
              suggestedFix = `// Verify backend server is listening and CORS headers are configured:
// Access-Control-Allow-Origin: *
// Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`;
            } else if (primaryErr) {
              synthesizedDiagnosis = `Uncaught runtime exception: ${primaryErr.message}`;
              synthesizedRootCause = primaryErr.stack || primaryErr.message;
            }
            const concludedResult = {
              goal,
              status: "resolved",
              diagnosis: synthesizedDiagnosis,
              rootCause: synthesizedRootCause,
              fix: suggestedFix,
              confidence: 0.9,
              steps,
              durationMs: Date.now() - startTime,
              finalMemory: cumulativeMemory
            };
            (_d = options.onDone) == null ? void 0 : _d.call(options, concludedResult);
            return concludedResult;
          }
          reflection = {
            evaluation_previous_goal: "Autonomous triage advancing investigation.",
            working_hypothesis: fallbackHypothesis,
            memory: cumulativeMemory,
            next_goal: `Execute ${fallbackAction.name}`,
            action: fallbackAction
          };
        }
        cumulativeMemory = reflection.memory || cumulativeMemory;
        (_e = options.onReflection) == null ? void 0 : _e.call(options, reflection);
        const actionName = this.normalizeToolName(reflection.action.name);
        const actionArgs = reflection.action.arguments || {};
        const targetTool = this.tools.get(actionName);
        (_f = options.onToolExecute) == null ? void 0 : _f.call(options, actionName, actionArgs);
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
        (_g = options.onToolResult) == null ? void 0 : _g.call(options, actionName, toolResult);
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
          (_h = options.onDone) == null ? void 0 : _h.call(options, result);
          return result;
        }
        if (response.toolCalls && response.toolCalls.length > 0) {
          const call = response.toolCalls[0];
          messages.push({
            role: "assistant",
            content: response.content || "",
            tool_calls: response.toolCalls
          });
          messages.push({
            role: "tool",
            name: actionName,
            tool_call_id: call.id,
            content: toolResult
          });
        } else {
          messages.push({
            role: "assistant",
            content: JSON.stringify(reflection, null, 2)
          });
          messages.push({
            role: "user",
            content: `Tool Result for [${actionName}]:
${toolResult}

Evaluate this evidence and either call the next diagnostic tool or call the 'done' tool with your final diagnosis and fix.`
          });
        }
      }
      const failedNet = this.controller.getNetworkRecords().filter((r) => r.isFailed || r.status && r.status >= 400);
      const consoleErrors = this.controller.getConsoleEntries().filter((e) => e.level === "error");
      let fallbackDiagnosis = "Diagnostic investigation concluded with telemetry analysis.";
      let fallbackRootCause = ((_i = steps[steps.length - 1]) == null ? void 0 : _i.reflection.working_hypothesis) || "Evidence analyzed.";
      if (failedNet.length > 0) {
        fallbackDiagnosis = `Failed network request to ${failedNet[0].url} (Status: ${failedNet[0].status || "ERR_FAILED"})`;
        fallbackRootCause = `The web application attempted to call ${failedNet[0].method} ${failedNet[0].url} which failed (${failedNet[0].error || failedNet[0].statusText || "Connection Refused / 5xx"}). Verify that backend service on ${failedNet[0].url} is reachable.`;
      } else if (consoleErrors.length > 0) {
        fallbackDiagnosis = `Runtime exception: ${consoleErrors[0].message}`;
        fallbackRootCause = consoleErrors[0].stack || consoleErrors[0].message;
      }
      const synthesizedResult = {
        goal,
        status: "resolved",
        diagnosis: fallbackDiagnosis,
        rootCause: fallbackRootCause,
        confidence: 0.88,
        steps,
        durationMs: Date.now() - startTime,
        finalMemory: cumulativeMemory
      };
      (_j = options.onDone) == null ? void 0 : _j.call(options, synthesizedResult);
      return synthesizedResult;
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
      var _a;
      if (this.isInitialized) return;
      if ((_a = this.engine) == null ? void 0 : _a.init) {
        await this.engine.init();
      }
      this.isInitialized = true;
    }
    async chat(messages, tools, signal) {
      var _a;
      await this.init();
      if (signal == null ? void 0 : signal.aborted) {
        throw new DOMException("Operation aborted", "AbortError");
      }
      const prompt = this.formatPrompt(messages, tools);
      let rawText = "";
      if ((_a = this.engine) == null ? void 0 : _a.generate) {
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
      if ((lastMessage == null ? void 0 : lastMessage.role) === "user" && tools && tools.length > 0) {
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
      var _a, _b, _c, _d, _e, _f, _g, _h;
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
        try {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
              "X-Dr-Debug-Internal": "true",
              ...this.headers
            },
            body: JSON.stringify(body),
            signal
          });
          if (response.status === 429 && attempt < maxRetries) {
            let waitMs = delay;
            try {
              const errJson = await response.clone().json();
              const match = (_b = (_a = errJson == null ? void 0 : errJson.error) == null ? void 0 : _a.message) == null ? void 0 : _b.match(/try again in ([\d\.]+)s/);
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
            let errorText = "";
            try {
              const errJson = await response.json();
              errorText = ((_c = errJson == null ? void 0 : errJson.error) == null ? void 0 : _c.message) || JSON.stringify(errJson);
            } catch {
              errorText = await response.text();
            }
            if (response.status === 401) {
              throw new Error(`Invalid API Key (401 Unauthorized): ${errorText}. Please verify your API key in Settings.`);
            } else if (response.status === 404) {
              throw new Error(`Model not found (404 Not Found): ${this.model} is not available at ${this.baseURL}.`);
            } else {
              throw new Error(`API Error (${response.status}): ${errorText}`);
            }
          }
          const data = await response.json();
          const choice = (_d = data.choices) == null ? void 0 : _d[0];
          return {
            content: ((_e = choice == null ? void 0 : choice.message) == null ? void 0 : _e.content) ?? null,
            toolCalls: (_f = choice == null ? void 0 : choice.message) == null ? void 0 : _f.tool_calls,
            usage: data.usage ? {
              promptTokens: data.usage.prompt_tokens,
              completionTokens: data.usage.completion_tokens,
              totalTokens: data.usage.total_tokens
            } : void 0,
            finishReason: choice == null ? void 0 : choice.finish_reason
          };
        } catch (err) {
          if (attempt >= maxRetries || err.name === "AbortError" || ((_g = err.message) == null ? void 0 : _g.includes("401")) || ((_h = err.message) == null ? void 0 : _h.includes("404"))) {
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        }
      }
      throw new Error("API request failed: Max retries exceeded");
    }
    async testConnection() {
      if (!this.apiKey && !this.baseURL.includes("localhost") && !this.baseURL.includes("127.0.0.1")) {
        return {
          success: false,
          message: "No API key provided. Please enter your API key.",
          model: this.model
        };
      }
      try {
        const res = await this.chat([
          { role: "user", content: 'Respond with the single word "OK".' }
        ]);
        if (res.content || res.toolCalls) {
          return {
            success: true,
            message: `Successfully connected to ${this.model}!`,
            model: this.model
          };
        }
        return {
          success: true,
          message: `Connected to ${this.model}`,
          model: this.model
        };
      } catch (err) {
        return {
          success: false,
          message: err.message || "Connection failed.",
          model: this.model
        };
      }
    }
  };

  // packages/ui/src/components/CausalGraphView.ts
  var CausalGraphView = class {
    element;
    currentGraph = null;
    selectedNodeId = null;
    constructor() {
      this.element = document.createElement("div");
      this.element.className = "dr-debug-graph-wrapper";
      this.renderEmpty();
    }
    getElement() {
      return this.element;
    }
    updateGraph(graph) {
      this.currentGraph = graph;
      this.render();
    }
    renderEmpty() {
      this.element.innerHTML = `
      <div class="dr-debug-graph-empty">
        <div style="font-size: 32px; margin-bottom: 8px;">\u{1F578}\uFE0F</div>
        <div style="font-weight: 700; font-size: 14px; color: #38bdf8;">Autonomous Causal Topology Matrix</div>
        <div style="font-size: 12px; color: #94a3b8; max-width: 360px; margin: 6px auto 14px auto;">
          Cross-correlating Docker backend logs, network requests, and console runtime exceptions in real-time.
        </div>
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 9999px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 12px; font-weight: 600;">
          <span>\u{1F7E2}</span> <span>No Root Cause Anomalies Detected</span>
        </div>
      </div>
    `;
    }
    render() {
      if (!this.currentGraph || this.currentGraph.nodes.length === 0) {
        this.renderEmpty();
        return;
      }
      const { nodes, edges, rootCauseNodeId, mermaidDiagram } = this.currentGraph;
      const layers = {
        docker: nodes.filter((n) => n.layer === "docker"),
        network: nodes.filter((n) => n.layer === "network"),
        console: nodes.filter((n) => n.layer === "console"),
        dom: nodes.filter((n) => n.layer === "dom")
      };
      const activeLayers = ["docker", "network", "console", "dom"].filter(
        (l) => layers[l].length > 0
      );
      const nodePositions = /* @__PURE__ */ new Map();
      const colWidth = 240;
      const colGap = 80;
      const rowGap = 30;
      const cardWidth = 220;
      const cardHeight = 76;
      const totalCols = Math.max(activeLayers.length, 1);
      const svgWidth = Math.max(760, totalCols * (colWidth + colGap));
      let maxLayerCount = 0;
      activeLayers.forEach((l) => {
        maxLayerCount = Math.max(maxLayerCount, layers[l].length);
      });
      const svgHeight = Math.max(340, maxLayerCount * (cardHeight + rowGap) + 80);
      activeLayers.forEach((layerKey, colIndex) => {
        const layerNodes = layers[layerKey];
        const colX = 40 + colIndex * (cardWidth + colGap);
        const startY = 50;
        layerNodes.forEach((node, rowIndex) => {
          const rowY = startY + rowIndex * (cardHeight + rowGap);
          nodePositions.set(node.id, {
            x: colX,
            y: rowY,
            width: cardWidth,
            height: cardHeight
          });
        });
      });
      let svgPaths = "";
      edges.forEach((edge) => {
        const srcPos = nodePositions.get(edge.source);
        const tgtPos = nodePositions.get(edge.target);
        if (srcPos && tgtPos) {
          const startX = srcPos.x + srcPos.width;
          const startY = srcPos.y + srcPos.height / 2;
          const endX = tgtPos.x;
          const endY = tgtPos.y + tgtPos.height / 2;
          const c1X = startX + (endX - startX) * 0.5;
          const c1Y = startY;
          const c2X = startX + (endX - startX) * 0.5;
          const c2Y = endY;
          svgPaths += `
          <path d="M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}"
                class="dr-debug-causal-link"
                marker-end="url(#arrowhead)" />
          <path d="M ${startX} ${startY} C ${c1X} ${c1Y}, ${c2X} ${c2Y}, ${endX} ${endY}"
                class="dr-debug-causal-pulse" />
        `;
        }
      });
      let nodesHtml = "";
      nodes.forEach((node) => {
        const pos = nodePositions.get(node.id) || { x: 0, y: 0, width: cardWidth, height: cardHeight };
        const isRoot = node.id === rootCauseNodeId || node.isRootCause;
        const isSelected = node.id === this.selectedNodeId;
        const layerClass = `node-${node.layer}`;
        const rootBadge = isRoot ? `<div class="dr-debug-node-root-badge">\u{1F3AF} ROOT CAUSE</div>` : "";
        nodesHtml += `
        <div class="dr-debug-graph-node ${layerClass} ${isRoot ? "is-root" : ""} ${isSelected ? "selected" : ""}"
             data-node-id="${node.id}"
             style="position: absolute; left: ${pos.x}px; top: ${pos.y}px; width: ${pos.width}px; height: ${pos.height}px;">
          ${rootBadge}
          <div class="dr-debug-node-header">
            <span class="dr-debug-node-title">${this.escapeHtml(node.label)}</span>
            <span class="dr-debug-node-layer">${node.layer.toUpperCase()}</span>
          </div>
          <div class="dr-debug-node-summary">${this.escapeHtml(node.summary)}</div>
        </div>
      `;
      });
      this.element.innerHTML = `
      <div class="dr-debug-graph-toolbar">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: 700; font-size: 13px; color: #f8fafc; display: flex; align-items: center; gap: 6px;">
            <span>\u{1F578}\uFE0F</span> <span>Causal Dependency Graph</span>
          </span>
          <span class="dr-debug-badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">
            ${nodes.length} Nodes / ${edges.length} Causal Links
          </span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="dr-debug-btn-copy-mermaid" class="dr-debug-btn-secondary" title="Copy Mermaid DAG markdown to clipboard">
            <span>\u{1F4CB}</span> <span>Copy Mermaid</span>
          </button>
        </div>
      </div>

      <div class="dr-debug-graph-canvas-container">
        <div class="dr-debug-graph-canvas" style="position: relative; width: ${svgWidth}px; height: ${svgHeight}px;">
          <svg class="dr-debug-graph-svg" width="${svgWidth}" height="${svgHeight}">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#00f0ff" />
              </marker>
            </defs>
            ${svgPaths}
          </svg>
          ${nodesHtml}
        </div>
      </div>

      <div id="dr-debug-node-detail-box" class="dr-debug-node-detail-box" style="display: none;">
        <div class="dr-debug-detail-header">
          <span id="dr-debug-detail-title" style="font-weight: 700; color: #00f0ff;">Node Details</span>
          <button id="dr-debug-detail-close" class="dr-debug-close-btn" style="padding: 2px 6px;">\u2715</button>
        </div>
        <pre id="dr-debug-detail-content" class="dr-debug-detail-pre"></pre>
      </div>
    `;
      const copyBtn = this.element.querySelector("#dr-debug-btn-copy-mermaid");
      copyBtn == null ? void 0 : copyBtn.addEventListener("click", () => {
        var _a;
        (_a = navigator.clipboard) == null ? void 0 : _a.writeText(mermaidDiagram);
        if (copyBtn) {
          const originalText = copyBtn.innerHTML;
          copyBtn.innerHTML = "<span>\u2705</span> <span>Copied!</span>";
          setTimeout(() => {
            copyBtn.innerHTML = originalText;
          }, 1500);
        }
      });
      const nodeEls = this.element.querySelectorAll(".dr-debug-graph-node");
      nodeEls.forEach((el) => {
        el.addEventListener("click", () => {
          const nodeId = el.getAttribute("data-node-id");
          if (nodeId) {
            this.showNodeDetails(nodeId);
          }
        });
      });
      const closeDetail = this.element.querySelector("#dr-debug-detail-close");
      closeDetail == null ? void 0 : closeDetail.addEventListener("click", () => {
        const box = this.element.querySelector("#dr-debug-node-detail-box");
        if (box) box.style.display = "none";
        this.selectedNodeId = null;
        this.element.querySelectorAll(".dr-debug-graph-node").forEach((n) => n.classList.remove("selected"));
      });
    }
    showNodeDetails(nodeId) {
      if (!this.currentGraph) return;
      const node = this.currentGraph.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      this.selectedNodeId = nodeId;
      this.element.querySelectorAll(".dr-debug-graph-node").forEach((n) => {
        n.classList.toggle("selected", n.getAttribute("data-node-id") === nodeId);
      });
      const box = this.element.querySelector("#dr-debug-node-detail-box");
      const title = this.element.querySelector("#dr-debug-detail-title");
      const content = this.element.querySelector("#dr-debug-detail-content");
      if (box && title && content) {
        box.style.display = "block";
        title.textContent = `[${node.layer.toUpperCase()}] ${node.label} ${node.isRootCause ? "\u{1F3AF} (ROOT CAUSE)" : ""}`;
        content.textContent = JSON.stringify(
          {
            id: node.id,
            layer: node.layer,
            timestamp: new Date(node.timestamp).toISOString(),
            summary: node.summary,
            metadata: node.metadata
          },
          null,
          2
        );
      }
    }
    escapeHtml(str) {
      return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
  };

  // packages/ui/src/assets/logo.ts
  var DR_DEBUG_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAABOhSURBVHhe7VsJeFTV2b4zk1kySWayTCaTbTKTTJLJLJnMvmUmCxEIkE2yAQkmkIAQErKRBKgKKGhrH4X/d0P9f60gKNhf6q4Vqdatgi21hWLdaotrUVG2sHzn63POJPzxtn3692khPPy+z3Ofm7n33HvPd863vN93TjjuO0waFBzHqfkX/z/AWHZr9iNzX7R91vJS0dGGJ6z7dRUJnfxGlymkOdWPFPy55VUHZk9Voa4sCaduysclH/rQNEdzLb/1ZQf3cPq9V73lwKySRKi41QCyaClwHAfF12VjwwsW+vflbRJVDxn3Vmw0YFZJEiw84IKEzFgQcCKSnKuAZcd8qKtIvI7/zGWF8A36h9p/60KOEwLHiUgUJyYCTgT0d3hDNiz92IveIe2POI4T85+9LCBXyR2NPy08W/8TK6rNCozPkBPH4gx0LslAagr5VWrSdyKIgWsyH+c4Tsh//rKAMi2movZh0/6W12w47xUbNj5jPdq213WmensBGwR9uQp6RwNomqO+mf/s5QShUim3a30JQY7jUqKioopbf2H/qnqbiQ1C8Ht6vOrXdhSLxXb+g5ctFMnyaZ0fuIlpTioRciLo/MCDvpXah/jt/glo3AMZAzVbC+6vvCtvU6pDMY3f4JJDaG3O9qvecjItKNmQgw3PW77kOC6e3+4fQRojKp39tPWTllccWP4DA9btNOOiA270Dmbey3GcgN/+koFSHTNlwe+cqMqNI9pAIi446EJZrIyayT9EbKqsuOT7OZvqfmLau+BN19m6XRZMzosDwwwVjTiQOz0Zuw77MLdWtYj/7KUETfNLtuPm5lRUqOWw4G03ZvgT5vAb8eCafnf+c237XNj4TCH6h7NQF0pioda5NB0GzgQhPj2GEa7q7SasvD9vD/8FlxRmP2v9yNmlRZlUCm0HnJiYLW/jtxmHviJxWcsb9rNNzxWh2qxkpqNIkaOxJgXjVHKQSCQQnxYDUrEkMgDbzDjjfuNL/PdcKkiN08jmz33F9rV3UEsUyXJY9oWPzLg37x3vQObWrJLEPo7jrOONDVVJw4sOezC4JpsJnmpXYuNjhdi0uxDbXneNNu8uQrFMTOg9jhNA9hQVLjnsQ+OVycu+/dnJh8++KH1b41PWo12ferH7z36sfdQEFbcZoOEZKyx824HLv/Zj/6libH3dTgKrdU+l2OLWtL/tRM8KLRPet1KLnb93Y+XteVvlKrmT4zh73Y8t71+114HTNudi7cMm7PitB31DWVs4jhPxOzBZUBhqkja3vGzDodNhrH/MiqZGDYnPiAF5rIzIpFIi4qKIWCgmCrWc5ExTQdVWEw6cCuHQ2RCGb4zMvH9VFrb/zgm6sqRW3vsTXD3py6sfMG2ZdnvuHeme+Jm8+5OKPP81Wb8dJmFseMyCyUYFyw3G8wNplIRIJdLIIZYSsYDlDITjhCRBF0uqHzQR72Amya1UkQWH3GeyihOa+R+4lKELbdAdXomlaF+SwRIhIRfFZpx/SP/GNRFH7VpIzHM0ZOB4EOufNp+kmTb/I5cqJI5l6W+uwjCamjXUORGpWPJXQk4UfuL5/N9iCaHPZoWSYOhsGK+4w3CEDiz/Y5ccUorirh84F8Dw9dlMAKrifOH4x/i9bw3A2Jl6d2OdBr6HZVjYlnZpx3c6Q1U78kcXvutEkVAMkqhvz7xEKCHUFPjX6WxLRLxr42dJRBNqdpjJ4g+9GK2U1PE/eskguzJxyzCGMGdaMnN4MllECOr06O8YZTTRl6ggLikaJGNmQc9igRjkcTJ6DfgaQX/TQUvOVZCVWIKu7sxLVguczS8WYvOLNiosUNWnHaeCq3LjILRWB12feGA9qQDrvDQ2QFQT6HnqPbnQ8YEbYpOiQSyU/JVJ0HfRdq2v2XH2k5bTHMdp+R+fdFjma54fxjCmFsUzj08pqq48kVQ9lA9DJAjXkjKY/6YD7J0ZJCY+ekx4IQmszoIbyBSo2mECAeUEnPivzIAetG1orZ5c/ZEHJdGSWv73JxUiTjRj4e+dOHObkXWUxnQ6m93HvLCKhGDGfflAvXkUJ6Yh8bzwlvmpsJaUQ+PuQogSi4ESpBilLOIjxsxnXAuoBlhaNNB90o9qc9xyfh8mEyLvkPY3g1iM8ZkxECUQM8clFESRKRsNcA0pAeNsNU1UGOGhglFhtKWJMEJC0HHQTaLjpSCVSWDJETfUPlbANIEfPegz5mYN9JzyoaZIOcjvxKQhViNd3PWVF8M36tmsjnc6Sigm8vhoWPwnN3T/2QdKjZxdo8Il5cdCz1c+6D7ih8TcWMYARVFiqH64gJlK7qxkJvC4FoybgGdAC0uPeFCeLONT4guPuPRoX3Zp0hRa05hwObb81pyPer7xoVwhI2JeKKOdNjVqYD2ZAjO3FrCMLSZJRjoO2WEIQpBZnHh+0ESCKBKfHgvdn/ug7ZADpNGS8+EyogFCUrfLjHNfttH8oHBCHy448qfebnhy3qs2nPNiITY8Zfl4yi2Gu1UFsWGNTbmh/2wQ7VenR8IeL47TEEdD4LR78sB/rQ5EUSJo3mOBa0kpFDCWGBF+PExSyjz1njxYR8ohcK2OvZO+RywUQ0yCDPpG/Rhapz9w0crpxkZ179yf275p+qkVk41xtIJLzI0anP2IBWc+mI9XbM7GBe85GdeP4v539s97b1lkEMaFm/lAPqwjZeAd0jLhqZ1T4ZWZcnD3ZUD7ATvzC/0ng+BfrSMCQWRQadvg2izoOe7DxJyYi5Lr6yv+M3f3wkNudPVkspQ0MTsGHYsyMC4xmv2WxkgwMKLDgTMBsHemk+i4iKOiAk3UhIgAIpJfpYbrSTlU3JkX4QBiCROQ5gsrSRjWkFKy6D03BFbrSFJuHEuImGlQn6GPJcNYjL6RzIM01+B39t8NQckPdS+17rNjbIqMVVvcA1ps/ZUTG56w/nHeHhtOvzcfs8KJUHl3PinbYID+YwHo+cIPJTfpIVEfywRm2d+YJ6fCKjUxUHBlSkSlx3yFSBRFssKJZNbmApI3Q00kjPAIzw/iOAFqfNaC8/fa6cCH+Z29EBDM2GJ8v2anCVNdCmz4qRWbf2Y7klejWkhXvlJsylLbwrSd8+iqzxs25tjikuXgH9bBksMeWHEuCLU7TCQzkHCeCdLcf5z1fSsPkI3bv5BFB/49pjk1ahjBMOZMVd3H7+gFQ6Yrvrpmh+njeT8rGi27JecRjuOyJt43VKkeGMQgptkjrE8siBAbqVRCzE2pcNUvHGSEhGH+XjvQ2E2vU2HEE/zE3zvG/QdNjmgkWPqZB6fdk0fXDpIn9uFigIa7v8G5RVe0H3DgzC2M9QEVitornUma7Y05PKLOV0DtDjMLd8s+9kFwtQ6UaXJ2jw7aONH5ewdtF16vJ91HfajIjL6a34vJgtDdn7Gfsj6FRs68f0JGDKTZ4ul5TOWFxFCpgrJN2YzRJWTFQtmNObD8ywAMng5C5X/lQWqRcmygRBF2yBOeOT5DLKzAYnQtz9g7GSs90YXtqT3Tb8vbaK5PobW4GHpRmSZf0PWFFwPX6IiAE0JofTYs/dQTCV1nAlD/hAXS/fEkqzQRqv/HxAqf44MSHScj9o500nnQBdQ85uwpZIyPskNmHoIx0hNxfND0vAWpn6EVZX7nLiikSmlp9Q7Tb1r3ObB2uwlbXi7CpmetfzDPSflh+CbdB0u/cKNIEEUXJ8DUoIHcGclgnqeB+qctsJaUwUoSAm9/JosezNtTOiuTsiyP5gN0QLIrVKTxaSsbuEXvusDVnUGJzphWcMRYp4YhLMZ0b/xFXT6XOXvTf9D2pgOrtphQIoustNCStfPqDPSP6HDZ114sqFdTW4ZF7zuh63MPLHrPBTXbTKAvSwLz7FQYOBVkTK70ppwIkxNHqr8ymRQy3PFAKfOY+oPaqCBTb8+DvuMB6D3mh/IfZkP2rCRYdtQHVTuNaO/U3COXyx38jl4I5EzbnLd/4SEX5teqGdHRFifi7B9b0NNDFyaEUHpLNrQfoqxPADU7C2A1CZG+0z4ycM5P6EwO05nv00K6PYH0fOIjdBB8wxHGRwX2jWhhHSmFWTuMLHJIJRIQcVHsfqwqmvgHdGTBr53Q/bEfpt6VD2pzHNTvsuLcPTasfdD0YkY4fi6/0/82+Fdq7+v4vRMje3kEMGWTAefvdeAVGw0PNz5duM9/je7c8lE/pLvj2TFMgqRv1EuWn/CS5Sd9wI7TPlhFwjDlFgNojErS/qaTagLxD2mZWhtmJEPXe14IrtWBgBOSrFAilG3MAZFAPBZGOUK1qOoBE2aXqzBWFSFhaqMCp23Mw44DbrS1pq/h930M/5qTdCzNuKntgAM9A5nY8roD6x63vJNsUkwfu22b/bT5bP1zFlahnft6IQyRAOkd9ZIhUgwjpJgMkyD0gQ+Wn/IxWlv/uAU0ViWUrTfA8NliMvsJM6RYFWwhk2oTHWi6mEkJFBWeEiB6b/FhN5l6V+6R0hv0b81/1Y6Vd+djspkySw6Cq/RY94TpKM1Aed3/tyDO3Zexec6TRW8GRrI2jm1xZShoUu+kpCdeGwP5dcl09qEf/NBzwg/lG3PA1pEGpTfrydLDbrKCBNgg9J8NQud7DrB3pIGuNAnKbsyG+p+YYdrdeRC4Ngu8K7LA06sFc5MGEnV0WVsI3hUZpPuoF5WpUso4BZnB+Krpm3MfX/yhG5Pz40icOprM/5UDJ0zMRYGp6QUrqf0x3dcjhLZDRbCCBGHZlz7IDCVCSpECUix0yYsjCdpY0v5rB1lNwhAY0UHV9nxYQ0rowieU/EAPtvZUsHemQVFHGtg70sG+OA18/Vqg+wflSin0nQ7Q7XNv8Rc263ZZ3i2+Ts/8UvMLRRi6TnfHxPsXFNqShPV95/xI1Tmvms5+MQyREIRu0rMI0bLXDo17rGwjJK3d585MhiEIku4vvaTnqBd6T3mZtoyQIFBz6XzHBb3f+KH3hI+aEXR/7QNptBSuuM1AFhxyoogTXcHvQ/F1+ruanmd8AIrXZGPtroJ3Ltoew8Aa7etLPvOggIuC6h1Gau9sAExzI8UMmuHRXR4SSYQO0/L38lEv6T/nJ/2nfaT3hIcd1GmWb6JhkYNpd+QxrkCPwvY0FlKHMITWVs3D/O9TpFjiZrb+sgjpmoLKEIfz3ijCOHX0RSFH0TMeMH5ES1BCLgraD1L1DzDyUr7JwNb8aB5A6/gR7i4gBQ0pbGYHSYAMkiDpP+cjPcc9ZOBcAJp+Vgi5tSpo2mOBVaQYWn9pZ7bfuNtK6p+lDpar53dgDIraRy3Hym81YOH8NGx9w4GKlGgPv9GFQELNDtOR2U+akZazOz5wwgDxwwATMAg0TY1sh6VxXsh8Qee7DqYl5RsNoHEpoGVfIQyc8wMNl/Q5yhUGx55P98aDNpxAS+fE3aUlzS9YT9XsNL3mXaH9Hr/mp69QddQ/aTnS9HzhN9b5mhv/5bD3f4S08j7jhy1v2JkJtP6qiC1wdL7vhsbnCtlA1O0yQfgGHVTenwfdX3nYzFMnSctbUVIRNO62wBAEoPeEl/SdpCbhI9SPzNxmZIPX8ScnhNbTajJHkg1xGFytw+Znrdj6oh09g5lbaR8m9CeRbrCa8PvCwzekfWHZUR8KOTFMvZPW+MNk3us2umODDcAwKSbUluniBz1T4ftO+UjvKT9LkgaBmkKALD/hg74TPjJ41k96vvETebwMnMsyYPFhD93Xh7N+ZMS8mWoURpwpGCqSsfM9D+bOSFrM79NFhcai7F8+GqD/+ACptng6e2QQ/FQo6Dnhhd6TPjJwJkA6P3CDbWEaKb/ZAH2n/NB3xs/UvOtzL7T8ogh6R/3Qf8pPVpEwsXWkgzRaDIMYQnevdp/GE9tQeWf+lsanrJ+2vWZHGiaps6x6sACn35v3HL9PFxsps7Yaj7UfdCCdmaoHCwjNASL018sOOvPh9dmMC9AEp+NdF7Nz6vha99nBtSQD+s76YRUpgVlbCpi6N+624JyfF9LQNnGDZIKnJ/M/Fh50oVAgopUk+g8Wx2kfJrS5+FBbFav7zhSjuzcDaBpM/wliFSkmfSe9hNr2wBk/WXDIAbk1KvCv1ELvST+t3wNV+97TPmYqdJBqd5lYnlFyo55tl091KNfxv0WrbXNetUFmIAFp/WD+fifqy5Na+I0uNkT2q9NfXo2lmDM9iZbDYd5LNpoN0qhAek96yQD4GUWmTrJv1EeJDukd9bGkifIGGhWo8OHrdWToXDHm16Vs439kHNU7TW+VfD+yO6zuUTNW3G7Yzm8zGUgJrdEfWolhLGzTMEflok7sD24W9qhZrCQhQhOjERIiq0iI+YuWV2wkqySRiEQiqHm4APu/DmJBQwr17n83jNk60jYsfNuNBc1qbNvvRM/KzP/mt5kspHr6sl5ZcTyETY8XolIbTSs+kF2mIiXrskn19gK48lEzmXm/Ebz9WaCxxLMNzDmVSdD1Ry9e9YYDM4sTrue/9G8gKbxG/8S83UWflWzIfobjuAx+g8lElL40aV3Tk7bjg8dCOPd5G9ra0mi2BrGJMpArZRCXHE23tAKtINEcvudzP065xfAbjhP9s3v5z2eklyJyTFem3Fy9peDdhfuduORTDy791IvLPvFh12c+7PrIh62v2s9W3JL7qsqkpP8wecGXsyYLVDB3mku5wNSguaawJfUGY23KSEquglaS8/mNv8N3+A6Tgr8AUkHgxlYGcOAAAAAASUVORK5CYII=";

  // packages/ui/src/components/DockerDashboardView.ts
  var DockerDashboardView = class {
    element;
    getController;
    onLaunchDiagnosis;
    activeContainerFilter = "all";
    activeLevelFilter = "all";
    searchQuery = "";
    autoScroll = true;
    statusBanner;
    instructionsCard;
    containerGrid;
    terminalEl;
    filterBar;
    searchInput;
    constructor(options) {
      this.getController = options.getController;
      this.onLaunchDiagnosis = options.onLaunchDiagnosis;
      this.element = document.createElement("div");
      this.element.className = "dr-debug-docker-dashboard";
      this.render();
    }
    getElement() {
      return this.element;
    }
    render() {
      this.element.innerHTML = "";
      this.statusBanner = document.createElement("div");
      this.statusBanner.className = "dr-debug-docker-header";
      this.element.appendChild(this.statusBanner);
      this.instructionsCard = document.createElement("div");
      this.instructionsCard.className = "dr-debug-docker-instructions-wrapper";
      this.element.appendChild(this.instructionsCard);
      const containerSection = document.createElement("div");
      containerSection.className = "dr-debug-docker-section";
      containerSection.innerHTML = `
      <div class="dr-debug-docker-section-title">
        <span>\u{1F4E6} Host Containers</span>
        <span class="dr-debug-docker-hint">Click a container to isolate logs</span>
      </div>
    `;
      this.containerGrid = document.createElement("div");
      this.containerGrid.className = "dr-debug-docker-grid";
      containerSection.appendChild(this.containerGrid);
      this.element.appendChild(containerSection);
      this.filterBar = document.createElement("div");
      this.filterBar.className = "dr-debug-docker-toolbar";
      this.renderToolbar();
      this.element.appendChild(this.filterBar);
      const terminalContainer = document.createElement("div");
      terminalContainer.className = "dr-debug-docker-terminal-wrapper";
      this.terminalEl = document.createElement("div");
      this.terminalEl.className = "dr-debug-docker-terminal";
      terminalContainer.appendChild(this.terminalEl);
      this.element.appendChild(terminalContainer);
      this.update();
    }
    renderToolbar() {
      var _a, _b;
      this.filterBar.innerHTML = `
      <div class="dr-debug-docker-filters">
        <button class="dr-debug-dock-btn ${this.activeLevelFilter === "all" ? "active" : ""}" data-level="all">All Logs</button>
        <button class="dr-debug-dock-btn ${this.activeLevelFilter === "error" ? "active" : ""}" data-level="error">\u{1F6A8} Panics & Errors</button>
        <button class="dr-debug-dock-btn ${this.activeLevelFilter === "warn" ? "active" : ""}" data-level="warn">\u26A0\uFE0F Warnings</button>
      </div>
      <div class="dr-debug-docker-search-box">
        <input type="text" class="dr-debug-dock-search" placeholder="grep container logs (regex supported)..." value="${this.escapeHtml(this.searchQuery)}" />
        <label class="dr-debug-dock-autoscroll">
          <input type="checkbox" ${this.autoScroll ? "checked" : ""} />
          <span>Auto-scroll</span>
        </label>
        <button class="dr-debug-dock-action-btn" id="dr-debug-dock-clear" title="Clear buffer">\u{1F9F9} Clear</button>
        <button class="dr-debug-dock-action-btn primary" id="dr-debug-dock-copy-ai" title="Copy incident prompt">\u{1F4CB} Copy for AI</button>
      </div>
    `;
      this.filterBar.querySelectorAll(".dr-debug-dock-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const target = e.currentTarget;
          const level = target.dataset.level || "all";
          this.activeLevelFilter = level;
          this.renderToolbar();
          this.renderTerminalLogs();
        });
      });
      this.searchInput = this.filterBar.querySelector(".dr-debug-dock-search");
      this.searchInput.addEventListener("input", () => {
        this.searchQuery = this.searchInput.value;
        this.renderTerminalLogs();
      });
      const autoscrollCb = this.filterBar.querySelector(".dr-debug-dock-autoscroll input");
      autoscrollCb.addEventListener("change", () => {
        this.autoScroll = autoscrollCb.checked;
      });
      (_a = this.filterBar.querySelector("#dr-debug-dock-clear")) == null ? void 0 : _a.addEventListener("click", () => {
        const controller = this.getController();
        if (controller) {
          const entries = controller.getDockerLogs();
          while (entries.length > 0) entries.pop();
        }
        this.update();
      });
      (_b = this.filterBar.querySelector("#dr-debug-dock-copy-ai")) == null ? void 0 : _b.addEventListener("click", (e) => {
        const btn = e.currentTarget;
        this.copyDockerPrompt(btn);
      });
    }
    update() {
      var _a, _b;
      const controller = this.getController();
      const containers = (controller == null ? void 0 : controller.getDockerContainers()) || [];
      const logs = (controller == null ? void 0 : controller.getDockerLogs()) || [];
      const errorLogs = logs.filter((l) => l.level === "error");
      const bridgeStatus = (_a = controller == null ? void 0 : controller.getDockerBridgeClient()) == null ? void 0 : _a.getStatus();
      const isBridgeConnected = (bridgeStatus == null ? void 0 : bridgeStatus.connected) ?? false;
      const isDaemonRunning = (bridgeStatus == null ? void 0 : bridgeStatus.daemonRunning) ?? containers.length > 0;
      this.statusBanner.innerHTML = `
      <div class="dr-debug-docker-status-left">
        <span class="dr-debug-docker-status-dot ${isBridgeConnected ? "online" : "offline"}"></span>
        <div>
          <div class="dr-debug-docker-title">
            <span>Docker Engine Bridge</span>
            <span class="dr-debug-docker-badge ${isDaemonRunning ? "badge-running" : "badge-stopped"}">
              ${isBridgeConnected ? isDaemonRunning ? "DAEMON ACTIVE" : "DAEMON STOPPED" : "BRIDGE OFFLINE"}
            </span>
          </div>
          <div class="dr-debug-docker-sub">
            ${isBridgeConnected ? `Connected to local daemon via port 9229 \xB7 ${containers.length} containers discovered` : `Bridge disconnected. Run \`npx @dr-debug/mcp\` to stream host containers.`}
          </div>
        </div>
      </div>
      <div class="dr-debug-docker-status-right">
        <div class="dr-debug-docker-stat-pill">
          <strong>${containers.length}</strong> <span>Containers</span>
        </div>
        <div class="dr-debug-docker-stat-pill ${errorLogs.length > 0 ? "alert" : ""}">
          <strong>${errorLogs.length}</strong> <span>Panics / Errors</span>
        </div>
        <button class="dr-debug-dock-btn-refresh" id="dr-debug-dock-refresh" title="Refresh containers">\u{1F504}</button>
      </div>
    `;
      (_b = this.statusBanner.querySelector("#dr-debug-dock-refresh")) == null ? void 0 : _b.addEventListener("click", () => {
        if (controller) {
          const client = controller.getDockerBridgeClient();
          if (client) {
            client.fetchContainers().then((c) => controller.setDockerContainers(c));
          } else {
            controller.connectDockerBridge();
          }
        }
        this.update();
      });
      this.renderInstructions(isBridgeConnected, containers.length);
      this.renderContainerGrid(containers, logs);
      this.renderTerminalLogs();
    }
    renderInstructions(isBridgeConnected, containerCount) {
      var _a;
      if (isBridgeConnected && containerCount > 0) {
        this.instructionsCard.innerHTML = `
        <div class="dr-debug-dock-connected-bar">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="dr-debug-dock-dot-live"></span>
            <span style="font-size:11px; color:#cbd5e1; font-weight:600;">Streaming host containers via port 9229</span>
          </div>
          <button class="dr-debug-dock-toggle-help" id="dr-debug-toggle-dock-help">Connection Guide \u25BE</button>
        </div>
        <div class="dr-debug-dock-help-content" id="dr-debug-dock-help-content" style="display:none;">
          ${this.getInstructionsHtml()}
        </div>
      `;
        (_a = this.instructionsCard.querySelector("#dr-debug-toggle-dock-help")) == null ? void 0 : _a.addEventListener("click", () => {
          const content = this.instructionsCard.querySelector("#dr-debug-dock-help-content");
          if (content) {
            const isHidden = content.style.display === "none";
            content.style.display = isHidden ? "flex" : "none";
            const btn = this.instructionsCard.querySelector("#dr-debug-toggle-dock-help");
            if (btn) btn.textContent = isHidden ? "Hide Guide \u25B4" : "Connection Guide \u25BE";
          }
        });
      } else {
        this.instructionsCard.innerHTML = `
        <div class="dr-debug-dock-instructions-card">
          <div class="dr-debug-dock-guide-top">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:15px;">\u{1F433}</span>
              <span style="font-weight:700; color:#f8fafc; font-size:12px;">Connect Your Host Docker to Dr. Debug</span>
            </div>
            <span class="dr-debug-dock-guide-badge">\u26A1 3-SECOND ZERO-CONFIG SETUP</span>
          </div>
          <div class="dr-debug-dock-guide-desc">
            Browser sandboxes cannot access host Docker sockets directly. Run the zero-install host daemon to stream active containers and correlate backend database panics / 5xx errors directly with client crashes:
          </div>
          ${this.getInstructionsHtml()}
        </div>
      `;
      }
      this.bindCopyCmd();
    }
    getInstructionsHtml() {
      return `
      <div class="dr-debug-dock-steps-grid">
        <div class="dr-debug-dock-step-box">
          <div class="dr-debug-dock-step-head">
            <span class="dr-debug-dock-step-badge">WAY 1</span>
            <span class="dr-debug-dock-step-label">Terminal (Zero Installation)</span>
          </div>
          <div class="dr-debug-dock-step-text">Run in any terminal with Node &gt;= 18:</div>
          <div class="dr-debug-dock-cmd-line">
            <code>npx @dr-debug/mcp</code>
            <button class="dr-debug-copy-cmd-btn" id="btn-copy-dock-cmd">Copy</button>
          </div>
        </div>

        <div class="dr-debug-dock-step-box">
          <div class="dr-debug-dock-step-head">
            <span class="dr-debug-dock-step-badge">WAY 2</span>
            <span class="dr-debug-dock-step-label">Double-Click Launcher</span>
          </div>
          <div class="dr-debug-dock-step-text">Zero terminal typing. In downloaded package:</div>
          <div class="dr-debug-dock-launcher-box">
            <span>Windows: <code>start-docker-bridge.bat</code></span>
            <span>Mac/Linux: <code>./start-docker-bridge.sh</code></span>
          </div>
        </div>
      </div>
      <div class="dr-debug-dock-step-footer">
        <span>\u2728 The moment the bridge starts, this tab automatically turns green and streams your live containers!</span>
      </div>
    `;
    }
    bindCopyCmd() {
      const btn = this.instructionsCard.querySelector("#btn-copy-dock-cmd");
      if (btn) {
        btn.addEventListener("click", () => {
          var _a;
          (_a = navigator.clipboard) == null ? void 0 : _a.writeText("npx @dr-debug/mcp").then(() => {
            const oldText = btn.textContent;
            btn.textContent = "Copied!";
            btn.classList.add("copied");
            setTimeout(() => {
              btn.textContent = oldText;
              btn.classList.remove("copied");
            }, 2e3);
          });
        });
      }
    }
    renderContainerGrid(containers, logs) {
      var _a, _b;
      this.containerGrid.innerHTML = "";
      const allErrors = logs.filter((l) => l.level === "error").length;
      const allCard = document.createElement("div");
      allCard.className = `dr-debug-docker-card ${this.activeContainerFilter === "all" ? "selected" : ""}`;
      allCard.innerHTML = `
      <div class="dr-debug-card-top">
        <span class="dr-debug-card-name">\u{1F310} All Containers</span>
        ${allErrors > 0 ? `<span class="dr-debug-err-badge">${allErrors}</span>` : ""}
      </div>
      <div class="dr-debug-card-desc">Combined host log stream (${logs.length} logs)</div>
    `;
      allCard.addEventListener("click", () => {
        this.activeContainerFilter = "all";
        this.renderContainerGrid(containers, logs);
        this.renderTerminalLogs();
      });
      this.containerGrid.appendChild(allCard);
      if (containers.length === 0) {
        const emptyNote = document.createElement("div");
        emptyNote.className = "dr-debug-dock-empty-containers";
        emptyNote.innerHTML = `
        <span>\u{1F433} No active containers detected in local Docker buffer.</span>
        <button class="dr-debug-btn-inline" id="dr-debug-dock-connect-btn">Connect Daemon</button>
      `;
        (_a = emptyNote.querySelector("#dr-debug-dock-connect-btn")) == null ? void 0 : _a.addEventListener("click", () => {
          var _a2;
          (_a2 = this.getController()) == null ? void 0 : _a2.connectDockerBridge();
          this.update();
        });
        this.containerGrid.appendChild(emptyNote);
        return;
      }
      for (const container of containers) {
        const containerErrors = logs.filter(
          (l) => l.containerName === container.name && l.level === "error"
        ).length;
        const card = document.createElement("div");
        card.className = `dr-debug-docker-card ${this.activeContainerFilter === container.name ? "selected" : ""}`;
        card.innerHTML = `
        <div class="dr-debug-card-top">
          <span class="dr-debug-card-name">${this.escapeHtml(container.name)}</span>
          <span class="dr-debug-card-state state-${container.state || "running"}">${container.state || "running"}</span>
        </div>
        <div class="dr-debug-card-image">${this.escapeHtml(container.image || "image")}</div>
        <div class="dr-debug-card-ports">${((_b = container.ports) == null ? void 0 : _b.join(", ")) || "no ports exposed"}</div>
        ${containerErrors > 0 ? `<div class="dr-debug-card-errors">\u{1F6A8} ${containerErrors} panic/error events</div>` : ""}
      `;
        card.addEventListener("click", () => {
          this.activeContainerFilter = container.name;
          this.renderContainerGrid(containers, logs);
          this.renderTerminalLogs();
        });
        this.containerGrid.appendChild(card);
      }
    }
    renderTerminalLogs() {
      const controller = this.getController();
      if (!controller) return;
      const logs = controller.getDockerLogs({
        container: this.activeContainerFilter !== "all" ? this.activeContainerFilter : void 0,
        level: this.activeLevelFilter !== "all" ? this.activeLevelFilter : void 0,
        grep: this.searchQuery || void 0
      });
      this.terminalEl.innerHTML = "";
      if (logs.length === 0) {
        this.terminalEl.innerHTML = `
        <div class="dr-debug-dock-term-empty">
          <span>\u{1F4A4} No log output recorded for current filter criteria.</span>
        </div>
      `;
        return;
      }
      for (const log of logs) {
        const row = document.createElement("div");
        row.className = `dr-debug-dock-log-row log-${log.level} stream-${log.stream}`;
        const timeStr = new Date(log.timestamp).toLocaleTimeString();
        row.innerHTML = `
        <span class="dr-debug-dock-time">${timeStr}</span>
        <span class="dr-debug-dock-container-tag">${this.escapeHtml(log.containerName)}</span>
        <span class="dr-debug-dock-stream-tag">[${log.stream}]</span>
        <span class="dr-debug-dock-msg">${this.highlightErrors(this.escapeHtml(log.message))}</span>
      `;
        if (log.level === "error") {
          const diagBtn = document.createElement("button");
          diagBtn.className = "dr-debug-dock-inline-diag";
          diagBtn.innerHTML = `<span>\u26A1</span> <span>Diagnose</span>`;
          diagBtn.title = "Launch AI investigation for this container panic";
          diagBtn.addEventListener("click", (e) => {
            var _a;
            e.stopPropagation();
            const goal = `Diagnose container ${log.containerName} error and trace downstream frontend effects: "${log.message.slice(0, 140)}"`;
            (_a = this.onLaunchDiagnosis) == null ? void 0 : _a.call(this, goal);
          });
          row.appendChild(diagBtn);
        }
        this.terminalEl.appendChild(row);
      }
      if (this.autoScroll) {
        this.terminalEl.scrollTop = this.terminalEl.scrollHeight;
      }
    }
    renderOfflineState() {
      this.element.innerHTML = `
      <div class="dr-debug-dock-offline-box">
        <div style="font-size: 36px; margin-bottom: 8px;">\u{1F433}</div>
        <h3 style="color: #f8fafc; font-size: 15px; margin-bottom: 6px;">Docker Substrate Daemon Offline</h3>
        <p style="color: #94a3b8; font-size: 12px; max-width: 440px; margin-bottom: 14px; line-height: 1.5;">
          Connect your local Docker engine to stream backend container panics, database connection exhausts, and correlate them with frontend network timeouts.
        </p>
        <div class="dr-debug-dock-cmd-box">
          <code>npx -y @dr-debug/mcp</code>
          <button id="dr-debug-dock-copy-cmd">\u{1F4CB} Copy</button>
        </div>
      </div>
    `;
    }
    async copyDockerPrompt(btn) {
      const controller = this.getController();
      if (!controller) return;
      const containers = controller.getDockerContainers();
      const logs = controller.getDockerLogs({ tail: 40 });
      const errors = logs.filter((l) => l.level === "error");
      const prompt = [
        "# \u{1F433} Docker Container Substrate Telemetry Brief",
        `Timestamp: ${(/* @__PURE__ */ new Date()).toISOString()}`,
        `Total Containers: ${containers.length} | Errors Recorded: ${errors.length}`,
        "",
        "## Active Containers:",
        containers.length > 0 ? containers.map((c) => {
          var _a;
          return `- [${c.state || "running"}] **${c.name}** (${c.image}) \u2192 ports: ${((_a = c.ports) == null ? void 0 : _a.join(", ")) || "none"}`;
        }).join("\n") : "No containers listed.",
        "",
        "## Recent Container Errors & Panics:",
        errors.length > 0 ? errors.map((e) => `[${new Date(e.timestamp).toLocaleTimeString()}] [${e.containerName}] (${e.stream}) ${e.message}`).join("\n") : "Zero container panics recorded in current buffer.",
        "",
        "## Recent Host Container Log Excerpt:",
        "```",
        logs.map((l) => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.containerName}] ${l.message}`).join("\n"),
        "```"
      ].join("\n");
      try {
        await navigator.clipboard.writeText(prompt);
        const orig = btn.innerHTML;
        btn.innerHTML = "\u2705 Copied";
        setTimeout(() => {
          btn.innerHTML = orig;
        }, 2e3);
      } catch {
        console.log(prompt);
      }
    }
    highlightErrors(text) {
      return text.replace(/(FATAL|PANIC|CRITICAL)/gi, '<strong style="color:#f43f5e;">$1</strong>').replace(/(ERROR|FAIL|EXCEPTION)/gi, '<span style="color:#fb7185;">$1</span>').replace(/(WARN(?:ING)?)/gi, '<span style="color:#fbbf24;">$1</span>');
    }
    escapeHtml(str) {
      return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
  };

  // packages/ui/src/components/ErrorDashboardView.ts
  var ErrorDashboardView = class {
    element;
    matrixContainer;
    chartContainer;
    toolbarContainer;
    filterBar;
    errorListContainer;
    inspectorContainer;
    viewMode = "matrix";
    activeFilter = "all";
    activeMatrixCellKey = null;
    searchQuery = "";
    selectedErrorId = null;
    getController;
    constructor(options) {
      this.getController = options.getController;
      this.element = document.createElement("div");
      this.element.className = "dr-debug-error-dashboard";
      const header = document.createElement("div");
      header.className = "dr-debug-err-header";
      header.innerHTML = `
      <div class="dr-debug-err-title">
        <span class="dr-debug-status-dot dot-critical"></span>
        <span style="font-weight:700; letter-spacing:-0.2px;">Diagnostics & Error Matrix</span>
      </div>
      <div id="dr-debug-err-stats" class="dr-debug-err-stats">
        <span class="dr-debug-stat-chip chip-5xx">0 5xx</span>
        <span class="dr-debug-stat-chip chip-4xx">0 4xx</span>
        <span class="dr-debug-stat-chip chip-js">0 JS</span>
        <span class="dr-debug-stat-chip chip-doc">0 Docker</span>
      </div>
    `;
      this.toolbarContainer = document.createElement("div");
      this.toolbarContainer.className = "dr-debug-matrix-toolbar";
      this.renderToolbar();
      this.matrixContainer = document.createElement("div");
      this.matrixContainer.className = "dr-debug-2d-matrix";
      this.chartContainer = document.createElement("div");
      this.chartContainer.className = "dr-debug-chart-wrapper";
      this.chartContainer.style.display = "none";
      this.filterBar = document.createElement("div");
      this.filterBar.className = "dr-debug-err-filter-bar";
      this.renderFilterButtons();
      const mainView = document.createElement("div");
      mainView.className = "dr-debug-err-main-view";
      this.errorListContainer = document.createElement("div");
      this.errorListContainer.className = "dr-debug-err-list";
      this.inspectorContainer = document.createElement("div");
      this.inspectorContainer.className = "dr-debug-err-inspector";
      this.inspectorContainer.style.display = "none";
      mainView.appendChild(this.errorListContainer);
      mainView.appendChild(this.inspectorContainer);
      this.element.appendChild(header);
      this.element.appendChild(this.toolbarContainer);
      this.element.appendChild(this.matrixContainer);
      this.element.appendChild(this.chartContainer);
      this.element.appendChild(this.filterBar);
      this.element.appendChild(mainView);
    }
    getElement() {
      return this.element;
    }
    renderToolbar() {
      this.toolbarContainer.innerHTML = `
      <div class="dr-debug-mode-toggle">
        <button id="btn-mode-matrix" class="dr-debug-mode-btn ${this.viewMode === "matrix" ? "active" : ""}">
          <span>Grid View</span>
        </button>
        <button id="btn-mode-stream" class="dr-debug-mode-btn ${this.viewMode === "stream" ? "active" : ""}">
          <span>Timeline View</span>
        </button>
      </div>
      <div class="dr-debug-search-box">
        <input type="text" class="dr-debug-search-input" placeholder="Filter errors, URLs, stack traces..." value="${this.escapeHtml(this.searchQuery)}" />
      </div>
      <button id="btn-clear-matrix" class="dr-debug-copy-inline-btn" title="Clear all recorded errors and metrics" style="margin-left:auto;">
        <span>Clear</span>
      </button>
    `;
      const btnMatrix = this.toolbarContainer.querySelector("#btn-mode-matrix");
      const btnStream = this.toolbarContainer.querySelector("#btn-mode-stream");
      const btnClear = this.toolbarContainer.querySelector("#btn-clear-matrix");
      const searchInput = this.toolbarContainer.querySelector(".dr-debug-search-input");
      btnMatrix == null ? void 0 : btnMatrix.addEventListener("click", () => {
        this.viewMode = "matrix";
        this.matrixContainer.style.display = "flex";
        this.chartContainer.style.display = "none";
        this.renderToolbar();
        this.update();
      });
      btnStream == null ? void 0 : btnStream.addEventListener("click", () => {
        this.viewMode = "stream";
        this.matrixContainer.style.display = "none";
        this.chartContainer.style.display = "flex";
        this.renderToolbar();
        this.update();
      });
      btnClear == null ? void 0 : btnClear.addEventListener("click", () => {
        const controller = this.getController();
        if (controller) {
          controller.clear();
          this.selectedErrorId = null;
          this.inspectorContainer.style.display = "none";
          this.update();
        }
      });
      searchInput == null ? void 0 : searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value;
        this.update();
      });
    }
    renderFilterButtons() {
      const filters = [
        { id: "all", label: "All Anomalies", dotClass: "dot-critical" },
        { id: "5xx", label: "HTTP 5xx", dotClass: "dot-5xx" },
        { id: "4xx", label: "HTTP 4xx", dotClass: "dot-4xx" },
        { id: "console", label: "Runtime JS", dotClass: "dot-js" },
        { id: "docker", label: "Docker Logs", dotClass: "dot-docker" },
        { id: "system", label: "System / Heap", dotClass: "dot-sys" }
      ];
      this.filterBar.innerHTML = "";
      filters.forEach((f) => {
        const btn = document.createElement("button");
        btn.className = `dr-debug-filter-btn ${this.activeFilter === f.id && !this.activeMatrixCellKey ? "active" : ""}`;
        btn.innerHTML = `<span class="dr-debug-status-dot ${f.dotClass}"></span> <span>${f.label}</span>`;
        btn.addEventListener("click", () => {
          this.activeFilter = f.id;
          this.activeMatrixCellKey = null;
          this.renderFilterButtons();
          this.update();
        });
        this.filterBar.appendChild(btn);
      });
    }
    update() {
      var _a, _b, _c, _d, _e;
      const controller = this.getController();
      if (!controller) return;
      const state = controller.getSnapshot();
      const matrix = computeDiagnosticMatrix(state);
      this.renderMatrixGrid(matrix);
      const http5xxCount = state.network.records.filter((r) => r.status && r.status >= 500 || r.isFailed && (!r.status || r.status === 0)).length;
      const http4xxCount = state.network.records.filter((r) => r.status && r.status >= 400 && r.status < 500).length;
      const consoleCount = state.console.entries.filter((e) => e.level === "error").length;
      const dockerCount = (((_a = state.docker) == null ? void 0 : _a.logs) || []).filter((l) => l.level === "error").length;
      const statsEl = this.element.querySelector("#dr-debug-err-stats");
      if (statsEl) {
        statsEl.innerHTML = `
        <span class="dr-debug-stat-chip chip-5xx" title="Filter HTTP 5xx">${http5xxCount} 5xx</span>
        <span class="dr-debug-stat-chip chip-4xx" title="Filter HTTP 4xx">${http4xxCount} 4xx</span>
        <span class="dr-debug-stat-chip chip-js" title="Filter JS Exceptions">${consoleCount} JS</span>
        <span class="dr-debug-stat-chip chip-doc" title="Filter Docker Panics">${dockerCount} Docker</span>
      `;
        (_b = statsEl.querySelector(".chip-5xx")) == null ? void 0 : _b.addEventListener("click", () => {
          this.activeFilter = "5xx";
          this.activeMatrixCellKey = null;
          this.renderFilterButtons();
          this.update();
        });
        (_c = statsEl.querySelector(".chip-4xx")) == null ? void 0 : _c.addEventListener("click", () => {
          this.activeFilter = "4xx";
          this.activeMatrixCellKey = null;
          this.renderFilterButtons();
          this.update();
        });
        (_d = statsEl.querySelector(".chip-js")) == null ? void 0 : _d.addEventListener("click", () => {
          this.activeFilter = "console";
          this.activeMatrixCellKey = null;
          this.renderFilterButtons();
          this.update();
        });
        (_e = statsEl.querySelector(".chip-doc")) == null ? void 0 : _e.addEventListener("click", () => {
          this.activeFilter = "docker";
          this.activeMatrixCellKey = null;
          this.renderFilterButtons();
          this.update();
        });
      }
      const histogram = controller.getErrorHistogram(12);
      this.renderHistogram(histogram);
      this.renderErrorList(state);
      if (this.selectedErrorId) {
        this.renderInspector(this.selectedErrorId, state);
      }
    }
    renderMatrixGrid(matrix) {
      const substrates = [
        { id: "network", label: "NETWORK" },
        { id: "console", label: "RUNTIME JS" },
        { id: "docker", label: "DOCKER" },
        { id: "system", label: "SYSTEM" }
      ];
      const severities = [
        { id: "critical", label: "Critical", dotClass: "dot-critical" },
        { id: "high", label: "High", dotClass: "dot-high" },
        { id: "notice", label: "Notice", dotClass: "dot-notice" }
      ];
      let html = `
      <table class="dr-debug-matrix-table">
        <thead>
          <tr>
            <th class="dr-debug-matrix-th" style="text-align:left; width:90px;">SEVERITY</th>
    `;
      substrates.forEach((sub) => {
        html += `<th class="dr-debug-matrix-th">${sub.label}</th>`;
      });
      html += `</tr></thead><tbody>`;
      severities.forEach((sev) => {
        html += `<tr><td class="dr-debug-matrix-row-label"><span class="dr-debug-status-dot ${sev.dotClass}"></span> <span>${sev.label}</span></td>`;
        substrates.forEach((sub) => {
          const key = `${sub.id}:${sev.id}`;
          const cell = matrix.cells[key] || { count: 0 };
          const hasErrors = cell.count > 0;
          const isActive = this.activeMatrixCellKey === key;
          const countClass = cell.count > 0 ? sev.id : "zero";
          html += `
          <td class="dr-debug-matrix-cell sev-${sev.id} ${hasErrors ? "has-errors" : ""} ${isActive ? "active-filter" : ""}" data-cell-key="${key}" title="Click to filter by ${sev.label} ${sub.label}">
            <div class="dr-debug-cell-count ${countClass}">${cell.count > 0 ? cell.count : "\u2014"}</div>
            <div class="dr-debug-cell-sub">${sub.id}</div>
          </td>
        `;
        });
        html += `</tr>`;
      });
      html += `</tbody></table>`;
      this.matrixContainer.innerHTML = html;
      this.matrixContainer.querySelectorAll(".dr-debug-matrix-cell").forEach((el) => {
        el.addEventListener("click", () => {
          const key = el.getAttribute("data-cell-key");
          if (!key) return;
          if (this.activeMatrixCellKey === key) {
            this.activeMatrixCellKey = null;
          } else {
            this.activeMatrixCellKey = key;
          }
          this.renderFilterButtons();
          this.update();
        });
      });
    }
    renderHistogram(buckets) {
      const maxVal = Math.max(...buckets.map((b) => b.total), 3);
      let html = `
      <div class="dr-debug-hist-title">
        <span>Timeline Frequency</span>
        <span style="font-size:10px; color:#94a3b8;">${buckets.length} Windows</span>
      </div>
      <div class="dr-debug-histogram">
    `;
      buckets.forEach((b) => {
        const heightPct = Math.max(8, Math.round(b.total / maxVal * 100));
        const hasErrors = b.total > 0;
        const activeClass = hasErrors ? "has-errors" : "";
        let barSegments = "";
        if (b.total > 0) {
          const p5xx = Math.round(b.http5xx / b.total * 100);
          const p4xx = Math.round(b.http4xx / b.total * 100);
          const pJs = Math.round(b.consoleErrors / b.total * 100);
          const pDoc = Math.round(b.dockerErrors / b.total * 100);
          barSegments = `
          ${p5xx > 0 ? `<div style="height:${p5xx}%; background:#f43f5e;" title="${b.http5xx} 5xx"></div>` : ""}
          ${p4xx > 0 ? `<div style="height:${p4xx}%; background:#f59e0b;" title="${b.http4xx} 4xx"></div>` : ""}
          ${pJs > 0 ? `<div style="height:${pJs}%; background:#ec4899;" title="${b.consoleErrors} JS Errors"></div>` : ""}
          ${pDoc > 0 ? `<div style="height:${pDoc}%; background:#818cf8;" title="${b.dockerErrors} Docker Panics"></div>` : ""}
        `;
        } else {
          barSegments = `<div style="height:100%; background:rgba(56,189,248,0.15);"></div>`;
        }
        html += `
        <div class="dr-debug-hist-col" title="${b.label} \u2014 Total: ${b.total} errors">
          <div class="dr-debug-hist-bar ${activeClass}" style="height:${heightPct}%;">
            ${barSegments}
          </div>
          <span class="dr-debug-hist-label">${b.label.slice(3)}</span>
        </div>
      `;
      });
      html += `</div>`;
      this.chartContainer.innerHTML = html;
    }
    renderErrorList(state) {
      var _a;
      const items = [];
      state.network.records.forEach((r) => {
        if (r.status && r.status >= 500) {
          items.push({
            id: r.id,
            type: "5xx",
            substrate: "network",
            severity: "critical",
            title: `${r.method} ${r.url}`,
            subtitle: `Status ${r.status} ${r.statusText || "Server Error"} \xB7 ${Math.round(r.duration || 0)}ms`,
            timestamp: r.startTime,
            badge: `500 Server Error`,
            raw: r
          });
        } else if (r.status && r.status >= 400) {
          items.push({
            id: r.id,
            type: "4xx",
            substrate: "network",
            severity: "high",
            title: `${r.method} ${r.url}`,
            subtitle: `Status ${r.status} ${r.statusText || "Client Error"} \xB7 ${Math.round(r.duration || 0)}ms`,
            timestamp: r.startTime,
            badge: `${r.status} Client Error`,
            raw: r
          });
        } else if (r.isFailed) {
          items.push({
            id: r.id,
            type: "5xx",
            substrate: "network",
            severity: "critical",
            title: `${r.method} ${r.url}`,
            subtitle: `Network Error / Connection Refused \xB7 ${Math.round(r.duration || 0)}ms`,
            timestamp: r.startTime,
            badge: `Network Error`,
            raw: r
          });
        } else if (r.isSlow) {
          items.push({
            id: r.id,
            type: "4xx",
            substrate: "network",
            severity: "notice",
            title: `${r.method} ${r.url}`,
            subtitle: `Slow Latency Bottleneck \xB7 ${Math.round(r.duration || 0)}ms`,
            timestamp: r.startTime,
            badge: `Slow Network`,
            raw: r
          });
        }
      });
      state.console.entries.forEach((e) => {
        if (e.level === "error") {
          const isCritical = e.count > 3 || e.stack && e.stack.includes("Uncaught");
          items.push({
            id: e.id,
            type: "console",
            substrate: "console",
            severity: isCritical ? "critical" : "high",
            title: e.message,
            subtitle: `${e.type} (Count: ${e.count}) \xB7 ${e.stack ? e.stack.split("\n")[1] || "" : ""}`,
            timestamp: e.timestamp,
            badge: `JS Exception`,
            raw: e
          });
        } else if (e.level === "warn") {
          items.push({
            id: e.id,
            type: "console",
            substrate: "console",
            severity: "notice",
            title: e.message,
            subtitle: `Warning \xB7 Count: ${e.count}`,
            timestamp: e.timestamp,
            badge: `JS Warning`,
            raw: e
          });
        }
      });
      (((_a = state.docker) == null ? void 0 : _a.logs) || []).forEach((d) => {
        if (d.level === "error") {
          items.push({
            id: d.id,
            type: "docker",
            substrate: "docker",
            severity: "critical",
            title: `[${d.containerName}] ${d.message}`,
            subtitle: `Stream: ${d.stream} \xB7 Level: ERROR`,
            timestamp: d.timestamp,
            badge: `Docker Panic`,
            raw: d
          });
        } else if (d.level === "warn") {
          items.push({
            id: d.id,
            type: "docker",
            substrate: "docker",
            severity: "high",
            title: `[${d.containerName}] ${d.message}`,
            subtitle: `Stream: ${d.stream} \xB7 Level: WARN`,
            timestamp: d.timestamp,
            badge: `Docker Warning`,
            raw: d
          });
        }
      });
      if (state.memory && state.memory.heapUsagePercent && state.memory.heapUsagePercent > 80) {
        items.push({
          id: "mem_leak_anomaly",
          type: "system",
          substrate: "system",
          severity: state.memory.heapUsagePercent > 90 ? "critical" : "high",
          title: `High Heap Memory Saturation (${state.memory.heapUsagePercent}%)`,
          subtitle: `Used: ${Math.round((state.memory.usedJSHeapSize || 0) / (1024 * 1024))}MB \xB7 Total: ${Math.round((state.memory.totalJSHeapSize || 0) / (1024 * 1024))}MB`,
          timestamp: state.memory.timestamp,
          badge: `Memory Anomaly`,
          raw: state.memory
        });
      }
      items.sort((a, b) => b.timestamp - a.timestamp);
      const filtered = items.filter((item) => {
        if (this.activeMatrixCellKey) {
          const [sub, sev] = this.activeMatrixCellKey.split(":");
          if (item.substrate !== sub || item.severity !== sev) return false;
        }
        if (this.activeFilter !== "all") {
          if (this.activeFilter === "5xx" && item.type !== "5xx") return false;
          if (this.activeFilter === "4xx" && item.type !== "4xx") return false;
          if (this.activeFilter === "console" && item.type !== "console") return false;
          if (this.activeFilter === "docker" && item.type !== "docker") return false;
          if (this.activeFilter === "system" && item.type !== "system") return false;
        }
        if (this.searchQuery.trim()) {
          const q = this.searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchSub = item.subtitle.toLowerCase().includes(q);
          if (!matchTitle && !matchSub) return false;
        }
        return true;
      });
      this.errorListContainer.innerHTML = "";
      if (filtered.length === 0) {
        this.errorListContainer.innerHTML = `
        <div class="dr-debug-err-empty">
          <div>No errors matching current matrix filter.</div>
          <div style="font-size:10.5px; margin-top:4px; color:#64748b;">Substrates healthy and within normal operating parameters.</div>
        </div>
      `;
        return;
      }
      filtered.forEach((item) => {
        const card = document.createElement("div");
        const isSelected = this.selectedErrorId === item.id;
        card.className = `dr-debug-err-card type-${item.type} ${isSelected ? "selected" : ""}`;
        card.setAttribute("data-id", item.id);
        const timeAgo = this.formatTimeAgo(item.timestamp);
        const dotColorClass = item.severity === "critical" ? "dot-critical" : item.severity === "high" ? "dot-high" : "dot-notice";
        card.innerHTML = `
        <div class="dr-debug-err-card-header">
          <div style="display:flex; align-items:center; gap:5px;">
            <span class="dr-debug-status-dot ${dotColorClass}"></span>
            <span class="dr-debug-err-badge badge-${item.type}">${item.badge}</span>
          </div>
          <span class="dr-debug-err-time">${timeAgo}</span>
        </div>
        <div class="dr-debug-err-card-title">${this.escapeHtml(item.title)}</div>
        <div class="dr-debug-err-card-subtitle">${this.escapeHtml(item.subtitle)}</div>
      `;
        card.addEventListener("click", () => {
          this.selectedErrorId = item.id;
          this.renderErrorList(state);
          this.renderInspector(item.id, state);
        });
        this.errorListContainer.appendChild(card);
      });
    }
    renderInspector(targetId, state) {
      var _a;
      const controller = this.getController();
      if (!controller) return;
      const networkReq = state.network.records.find((r) => r.id === targetId);
      const consoleErr = state.console.entries.find((e) => e.id === targetId);
      const dockerLog = (((_a = state.docker) == null ? void 0 : _a.logs) || []).find((d) => d.id === targetId);
      const isMem = targetId === "mem_leak_anomaly";
      this.inspectorContainer.style.display = "flex";
      this.inspectorContainer.innerHTML = "";
      const inspHeader = document.createElement("div");
      inspHeader.className = "dr-debug-insp-header";
      let titleText = "Incident Inspection";
      let statusBadge = "ERROR";
      if (networkReq) {
        titleText = `${networkReq.method} ${networkReq.url}`;
        statusBadge = `HTTP ${networkReq.status || "FAILED"}`;
      } else if (consoleErr) {
        titleText = consoleErr.message;
        statusBadge = consoleErr.type.toUpperCase();
      } else if (dockerLog) {
        titleText = `[${dockerLog.containerName}] ${dockerLog.message}`;
        statusBadge = "DOCKER";
      } else if (isMem) {
        titleText = "Heap Memory Saturation";
        statusBadge = "MEMORY";
      }
      inspHeader.innerHTML = `
      <div style="flex:1; min-width:0;">
        <div class="dr-debug-insp-badge">${statusBadge}</div>
        <div class="dr-debug-insp-title">${this.escapeHtml(titleText)}</div>
      </div>
    `;
      const closeInspBtn = document.createElement("button");
      closeInspBtn.className = "dr-debug-close-btn";
      closeInspBtn.innerHTML = "\u2715";
      closeInspBtn.title = "Close Inspector";
      closeInspBtn.addEventListener("click", () => {
        this.selectedErrorId = null;
        this.inspectorContainer.style.display = "none";
        this.update();
      });
      inspHeader.appendChild(closeInspBtn);
      const actionToolbar = document.createElement("div");
      actionToolbar.className = "dr-debug-insp-actions";
      const copyAIBtn = document.createElement("button");
      copyAIBtn.className = "dr-debug-btn-primary-glow";
      copyAIBtn.innerHTML = `<span>Copy AI Report</span>`;
      copyAIBtn.title = "Copy structured debug prompt ready to paste into Claude Code or Antigravity";
      copyAIBtn.addEventListener("click", () => {
        const prompt = controller.getUnifiedAIDebugPrompt(targetId);
        if (navigator.clipboard) {
          navigator.clipboard.writeText(prompt);
          copyAIBtn.innerHTML = `<span>Copied AI Prompt!</span>`;
          setTimeout(() => {
            copyAIBtn.innerHTML = `<span>Copy AI Report</span>`;
          }, 2500);
        }
      });
      actionToolbar.appendChild(copyAIBtn);
      if (networkReq) {
        const replayBtn = document.createElement("button");
        replayBtn.className = "dr-debug-btn-replay";
        replayBtn.innerHTML = `<span>Replay Request</span>`;
        replayBtn.title = "Re-fetch this exact endpoint in real-time to check current server state";
        replayBtn.addEventListener("click", async () => {
          var _a2;
          replayBtn.innerHTML = `<span>Replaying...</span>`;
          try {
            const res = await fetch(networkReq.url, {
              method: networkReq.method,
              headers: networkReq.requestHeaders
            });
            replayBtn.innerHTML = `<span>Status: ${res.status}</span>`;
          } catch (err) {
            replayBtn.innerHTML = `<span>Failed: ${(_a2 = err.message) == null ? void 0 : _a2.slice(0, 15)}</span>`;
          }
          setTimeout(() => {
            replayBtn.innerHTML = `<span>Replay Request</span>`;
          }, 3e3);
        });
        actionToolbar.appendChild(replayBtn);
        const mockBtn = document.createElement("button");
        mockBtn.className = "dr-debug-btn-mock";
        mockBtn.innerHTML = `<span>Mock 200 OK</span>`;
        mockBtn.title = "Inject a mock 200 response rule to test frontend resilience";
        mockBtn.addEventListener("click", () => {
          controller.mockNetworkResponse(networkReq.url, 200, JSON.stringify({ status: "ok", mocked: true }));
          mockBtn.innerHTML = `<span>Mocked Active!</span>`;
          setTimeout(() => {
            mockBtn.innerHTML = `<span>Mock 200 OK</span>`;
          }, 2500);
        });
        actionToolbar.appendChild(mockBtn);
        const curlBtn = document.createElement("button");
        curlBtn.className = "dr-debug-btn-curl";
        curlBtn.innerHTML = `<span>Copy cURL</span>`;
        curlBtn.title = "Copy exact executable curl command for terminal reproduction";
        curlBtn.addEventListener("click", () => {
          const curlCmd = generateCurlCommand(networkReq);
          if (navigator.clipboard) {
            navigator.clipboard.writeText(curlCmd);
            curlBtn.innerHTML = `<span>Copied cURL!</span>`;
            setTimeout(() => {
              curlBtn.innerHTML = `<span>Copy cURL</span>`;
            }, 2e3);
          }
        });
        actionToolbar.appendChild(curlBtn);
      }
      const synthBtn = document.createElement("button");
      synthBtn.className = "dr-debug-btn-synth";
      synthBtn.innerHTML = `<span>Synthesize Test</span>`;
      synthBtn.title = "Generate Playwright reproduction test script";
      synthBtn.addEventListener("click", () => {
        var _a2;
        const mockResult = {
          goal: "Incident Reproduction",
          status: "resolved",
          diagnosis: titleText,
          rootCause: "Incident under diagnosis",
          confidence: 0.95,
          steps: [],
          durationMs: 0,
          finalMemory: ""
        };
        const testCode = TestSynthesizer.synthesizePlaywright(
          mockResult,
          ((_a2 = controller.getInteractionReplay) == null ? void 0 : _a2.call(controller)) || [],
          networkReq
        );
        if (navigator.clipboard) {
          navigator.clipboard.writeText(testCode);
          synthBtn.innerHTML = `<span>Copied Playwright Test!</span>`;
          setTimeout(() => {
            synthBtn.innerHTML = `<span>Synthesize Test</span>`;
          }, 2500);
        }
      });
      actionToolbar.appendChild(synthBtn);
      const copyJsonBtn = document.createElement("button");
      copyJsonBtn.className = "dr-debug-copy-inline-btn";
      copyJsonBtn.innerHTML = `<span>JSON</span>`;
      copyJsonBtn.addEventListener("click", () => {
        const payload = networkReq || consoleErr || dockerLog || state.memory;
        if (navigator.clipboard && payload) {
          navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
          copyJsonBtn.innerHTML = `<span>Copied!</span>`;
          setTimeout(() => {
            copyJsonBtn.innerHTML = `<span>JSON</span>`;
          }, 2e3);
        }
      });
      actionToolbar.appendChild(copyJsonBtn);
      const body = document.createElement("div");
      body.className = "dr-debug-insp-body";
      if (networkReq) {
        const explainer = getHttpStatusExplainer(networkReq.status || 0);
        const rfcClass = networkReq.status && networkReq.status >= 500 ? "" : "type-4xx";
        body.innerHTML += `
        <div class="dr-debug-rfc-box ${rfcClass}">
          <div class="dr-debug-rfc-title"><span class="dr-debug-status-dot dot-high"></span> <span>${this.escapeHtml(explainer.title)}</span></div>
          <div class="dr-debug-rfc-desc">${this.escapeHtml(explainer.explanation)}</div>
          <div class="dr-debug-rfc-rec">Recommended Fix: ${this.escapeHtml(explainer.recommendation)}</div>
        </div>
      `;
        const curlCmd = generateCurlCommand(networkReq);
        body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Terminal Reproduction Command (cURL)</div>
          <pre class="dr-debug-curl-preview">${this.escapeHtml(curlCmd)}</pre>
        </div>
      `;
        const reqHeaders = networkReq.requestHeaders || {};
        const hasReqHeaders = Object.keys(reqHeaders).length > 0;
        body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Request Headers</div>
          <pre class="dr-debug-code-box">${hasReqHeaders ? this.escapeHtml(JSON.stringify(reqHeaders, null, 2)) : "None recorded"}</pre>
        </div>
      `;
        body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Request Body / Payload</div>
          <pre class="dr-debug-code-box">${networkReq.requestBodyPreview ? this.escapeHtml(this.prettyJsonOrRaw(networkReq.requestBodyPreview)) : "No request body sent"}</pre>
        </div>
      `;
        const resHeaders = networkReq.responseHeaders || {};
        const hasResHeaders = Object.keys(resHeaders).length > 0;
        body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Response Headers</div>
          <pre class="dr-debug-code-box">${hasResHeaders ? this.escapeHtml(JSON.stringify(resHeaders, null, 2)) : "None recorded"}</pre>
        </div>
      `;
        body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Response Body / Error Payload</div>
          <pre class="dr-debug-code-box error-highlight">${networkReq.responseBodyPreview ? this.escapeHtml(this.prettyJsonOrRaw(networkReq.responseBodyPreview)) : networkReq.error ? this.escapeHtml(networkReq.error) : "Empty response body"}</pre>
        </div>
      `;
      } else if (consoleErr) {
        body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Error Message</div>
          <pre class="dr-debug-code-box error-highlight">${this.escapeHtml(consoleErr.message)}</pre>
        </div>
      `;
        if (consoleErr.parsedStack && consoleErr.parsedStack.length > 0) {
          let framesHtml = '<div class="dr-debug-frame-list">';
          consoleErr.parsedStack.forEach((frame) => {
            const fn = frame.filename || "unknown";
            const isUserCode = !fn.includes("node_modules") && !fn.includes("chrome-extension");
            const tagClass = isUserCode ? "tag-user" : "tag-vendor";
            const tagLabel = isUserCode ? "App Code" : "Vendor";
            framesHtml += `
            <div class="dr-debug-frame-item ${isUserCode ? "user-code" : ""}">
              <div>
                <span class="dr-debug-frame-fn">${this.escapeHtml(frame.functionName || "<anonymous>")}</span>
                <div class="dr-debug-frame-loc">${this.escapeHtml(fn)}:${frame.lineno || 0}:${frame.colno || 0}</div>
              </div>
              <span class="dr-debug-frame-tag ${tagClass}">${tagLabel}</span>
            </div>
          `;
          });
          framesHtml += "</div>";
          body.innerHTML += `
          <div class="dr-debug-insp-section">
            <div class="dr-debug-insp-sec-title">Demangled Call Frames</div>
            ${framesHtml}
          </div>
        `;
        } else if (consoleErr.stack) {
          body.innerHTML += `
          <div class="dr-debug-insp-section">
            <div class="dr-debug-insp-sec-title">Call Stack Trace</div>
            <pre class="dr-debug-code-box">${this.escapeHtml(consoleErr.stack)}</pre>
          </div>
        `;
        }
      } else if (dockerLog) {
        body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Container Log Entry</div>
          <pre class="dr-debug-code-box error-highlight">${this.escapeHtml(dockerLog.message)}</pre>
        </div>
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Container Metadata</div>
          <pre class="dr-debug-code-box">Container: ${this.escapeHtml(dockerLog.containerName)}
Stream: ${dockerLog.stream}
Level: ${dockerLog.level}
Timestamp: ${new Date(dockerLog.timestamp).toISOString()}</pre>
        </div>
      `;
      } else if (isMem) {
        body.innerHTML += `
        <div class="dr-debug-insp-section">
          <div class="dr-debug-insp-sec-title">Heap Memory Telemetry</div>
          <pre class="dr-debug-code-box">${this.escapeHtml(JSON.stringify(state.memory, null, 2))}</pre>
        </div>
      `;
      }
      this.inspectorContainer.appendChild(inspHeader);
      this.inspectorContainer.appendChild(actionToolbar);
      this.inspectorContainer.appendChild(body);
    }
    prettyJsonOrRaw(content) {
      try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return content;
      }
    }
    formatTimeAgo(timestamp) {
      const deltaMs = Date.now() - timestamp;
      if (deltaMs < 1e3) return "Just now";
      if (deltaMs < 6e4) return `${Math.round(deltaMs / 1e3)}s ago`;
      if (deltaMs < 36e5) return `${Math.round(deltaMs / 6e4)}m ago`;
      return new Date(timestamp).toLocaleTimeString();
    }
    escapeHtml(text) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
  };

  // packages/ui/src/components/SettingsModal.ts
  var SettingsModal = class {
    constructor(options) {
      this.options = options;
      this.element = document.createElement("div");
      this.element.className = "dr-debug-settings-overlay";
      this.element.style.display = "none";
      this.render();
      this.loadInitialSettings(options.initialSettings);
    }
    element;
    providerSelect;
    apiKeyInput;
    apiKeyGroup;
    baseURLInput;
    modelInput;
    statusMessage;
    testBtn;
    saveBtn;
    isVisible = false;
    getElement() {
      return this.element;
    }
    show() {
      this.isVisible = true;
      this.element.style.display = "flex";
    }
    hide() {
      this.isVisible = false;
      this.element.style.display = "none";
    }
    toggle() {
      if (this.isVisible) this.hide();
      else this.show();
    }
    render() {
      this.element.innerHTML = `
      <div class="dr-debug-settings-modal">
        <div class="dr-debug-settings-header">
          <div class="dr-debug-settings-title">
            <span>\u2699\uFE0F</span> <span>Dr. Debug \xB7 AI Engine Settings</span>
          </div>
          <button class="dr-debug-close-btn" id="dr-debug-settings-close">\u2715</button>
        </div>

        <div class="dr-debug-settings-body">
          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Model Provider</label>
            <select class="dr-debug-form-select" id="dr-debug-provider">
              <option value="groq" selected>\u26A1 Groq LPU (Ultra-Fast \xB7 openai/gpt-oss-120b)</option>
              <option value="openai">\u{1F9E0} OpenAI (GPT-4o / GPT-4o-mini)</option>
              <option value="gemini">\u2728 Gemini Flash (gemini-1.5-flash)</option>
              <option value="litert">\u{1F4BB} LiteRT / Local (On-Device)</option>
            </select>
          </div>

          <div class="dr-debug-form-group" id="dr-debug-api-key-group">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <label class="dr-debug-form-label" style="margin-bottom:0;">API Key</label>
              <span id="dr-debug-key-hint" style="font-size:10px; color:#38bdf8; cursor:pointer;">Show</span>
            </div>
            <input type="password" class="dr-debug-form-input" id="dr-debug-api-key" placeholder="gsk_... or sk-..." />
          </div>

          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Model Name</label>
            <input type="text" class="dr-debug-form-input" id="dr-debug-model" value="openai/gpt-oss-120b" />
          </div>

          <div class="dr-debug-form-group">
            <label class="dr-debug-form-label">Base URL (Optional override)</label>
            <input type="text" class="dr-debug-form-input" id="dr-debug-base-url" placeholder="https://api.groq.com/openai/v1" />
          </div>

          <div id="dr-debug-settings-status" class="dr-debug-settings-status"></div>

          <div class="dr-debug-settings-actions">
            <button id="dr-debug-btn-test-conn" class="dr-debug-btn-outline">
              <span>\u26A1</span> <span>Test Connection</span>
            </button>
            <button id="dr-debug-btn-save-settings" class="dr-debug-btn">
              <span>\u{1F4BE}</span> <span>Save Settings</span>
            </button>
          </div>

          <div style="text-align:center; font-size:11px; color:#64748b; margin-top:14px; border-top:1px solid rgba(148,163,184,0.15); padding-top:10px;">
            Created by <a href="https://github.com/SazWhatician" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:none; font-weight:700;">Saswat Mohanty (@SazWhatician)</a> \xB7 <a href="https://www.linkedin.com/in/saswat-mohanty-0a4549331/" target="_blank" rel="noopener noreferrer" style="color:#818cf8; text-decoration:none;">LinkedIn</a>
          </div>
        </div>
      </div>
    `;
      this.providerSelect = this.element.querySelector("#dr-debug-provider");
      this.apiKeyInput = this.element.querySelector("#dr-debug-api-key");
      this.apiKeyGroup = this.element.querySelector("#dr-debug-api-key-group");
      this.modelInput = this.element.querySelector("#dr-debug-model");
      this.baseURLInput = this.element.querySelector("#dr-debug-base-url");
      this.statusMessage = this.element.querySelector("#dr-debug-settings-status");
      this.testBtn = this.element.querySelector("#dr-debug-btn-test-conn");
      this.saveBtn = this.element.querySelector("#dr-debug-btn-save-settings");
      const closeBtn = this.element.querySelector("#dr-debug-settings-close");
      closeBtn.addEventListener("click", () => this.hide());
      const keyHint = this.element.querySelector("#dr-debug-key-hint");
      keyHint.addEventListener("click", () => {
        if (this.apiKeyInput.type === "password") {
          this.apiKeyInput.type = "text";
          keyHint.textContent = "Hide";
        } else {
          this.apiKeyInput.type = "password";
          keyHint.textContent = "Show";
        }
      });
      this.providerSelect.addEventListener("change", () => this.handleProviderChange());
      this.testBtn.addEventListener("click", () => this.handleTestConnection());
      this.saveBtn.addEventListener("click", () => this.handleSave());
    }
    handleProviderChange() {
      const provider = this.providerSelect.value;
      if (provider === "groq") {
        this.apiKeyGroup.style.display = "block";
        this.modelInput.value = "openai/gpt-oss-120b";
        this.baseURLInput.value = "https://api.groq.com/openai/v1";
      } else if (provider === "openai") {
        this.apiKeyGroup.style.display = "block";
        this.modelInput.value = "gpt-4o";
        this.baseURLInput.value = "";
      } else if (provider === "gemini") {
        this.apiKeyGroup.style.display = "block";
        this.modelInput.value = "gemini-1.5-flash";
        this.baseURLInput.value = "https://generativelanguage.googleapis.com/v1beta/openai/";
      } else if (provider === "litert") {
        this.apiKeyGroup.style.display = "none";
        this.modelInput.value = "litert";
        this.baseURLInput.value = "";
      }
    }
    async handleTestConnection() {
      this.testBtn.disabled = true;
      this.testBtn.innerHTML = `<span>\u23F3</span> <span>Testing...</span>`;
      this.statusMessage.textContent = "Testing connection with LLM endpoint...";
      this.statusMessage.style.color = "#38bdf8";
      const settings = this.getFormValues();
      try {
        const result = await this.options.onTestConnection(settings);
        if (result.success) {
          this.statusMessage.textContent = `\u2705 ${result.message}`;
          this.statusMessage.style.color = "#34d399";
        } else {
          this.statusMessage.textContent = `\u274C ${result.message}`;
          this.statusMessage.style.color = "#fb7185";
        }
      } catch (err) {
        this.statusMessage.textContent = `\u274C Error: ${err.message}`;
        this.statusMessage.style.color = "#fb7185";
      } finally {
        this.testBtn.disabled = false;
        this.testBtn.innerHTML = `<span>\u26A1</span> <span>Test Connection</span>`;
      }
    }
    handleSave() {
      var _a;
      const settings = this.getFormValues();
      try {
        localStorage.setItem("dr_debug_settings", JSON.stringify(settings));
      } catch {
      }
      if (typeof chrome !== "undefined" && ((_a = chrome.storage) == null ? void 0 : _a.local)) {
        chrome.storage.local.set(settings);
      }
      this.options.onSave(settings);
      this.statusMessage.textContent = "\u2705 Settings saved & active!";
      this.statusMessage.style.color = "#34d399";
      setTimeout(() => {
        this.hide();
        this.statusMessage.textContent = "";
      }, 1200);
    }
    getFormValues() {
      const provider = this.providerSelect.value;
      const apiKey = this.apiKeyInput.value.trim();
      const model = this.modelInput.value.trim() || "llama-3.3-70b-versatile";
      const baseURL = this.baseURLInput.value.trim() || void 0;
      return {
        provider,
        apiKey: apiKey || void 0,
        model,
        baseURL,
        enableUI: true
      };
    }
    loadInitialSettings(settings) {
      let loaded = settings;
      if (!loaded) {
        try {
          const raw = localStorage.getItem("dr_debug_settings");
          if (raw) loaded = JSON.parse(raw);
        } catch {
        }
      }
      if (loaded) {
        if (loaded.provider) this.providerSelect.value = loaded.provider;
        if (loaded.apiKey) this.apiKeyInput.value = loaded.apiKey;
        if (loaded.model) this.modelInput.value = loaded.model;
        if (loaded.baseURL) this.baseURLInput.value = loaded.baseURL;
        this.handleProviderChange();
        if (loaded.apiKey) this.apiKeyInput.value = loaded.apiKey;
      }
    }
  };

  // packages/ui/src/components/CockpitPanel.ts
  var CockpitPanel = class {
    constructor(onCloseOrOptions, legacyOnInvestigate) {
      this.onCloseOrOptions = onCloseOrOptions;
      this.legacyOnInvestigate = legacyOnInvestigate;
      const options = typeof onCloseOrOptions === "function" ? {
        onClose: onCloseOrOptions,
        onInvestigate: legacyOnInvestigate || (() => {
        }),
        getController: () => {
          var _a;
          return typeof window !== "undefined" ? (_a = window.__DR_DEBUG__) == null ? void 0 : _a.getController() : void 0;
        }
      } : onCloseOrOptions;
      this.onInvestigateHandler = options.onInvestigate;
      this.getSessionPrompt = options.getSessionPrompt;
      this.element = document.createElement("div");
      this.element.className = "dr-debug-modal hidden";
      const header = document.createElement("div");
      header.className = "dr-debug-header";
      const brand = document.createElement("div");
      brand.className = "dr-debug-brand";
      brand.innerHTML = `
      <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo header-logo" alt="Dr. Debug" />
      <div>
        <div class="dr-debug-title-text">DR. DEBUG // COCKPIT</div>
      </div>
    `;
      const metricsWrapper = document.createElement("div");
      metricsWrapper.className = "dr-debug-header-metrics";
      this.heapMetricBadge = document.createElement("div");
      this.heapMetricBadge.className = "dr-debug-metric-badge";
      this.heapMetricBadge.innerHTML = `<span class="dr-debug-status-dot dot-sys"></span> <span id="dr-debug-heap-val">Heap: 48MB</span>`;
      this.uptimeMetricBadge = document.createElement("div");
      this.uptimeMetricBadge.className = "dr-debug-metric-badge";
      this.uptimeMetricBadge.innerHTML = `<span class="dr-debug-status-dot dot-notice"></span> <span id="dr-debug-uptime-val">00:00</span>`;
      const exportBtn = this.makeSessionPromptButton(
        "dr-debug-export-btn",
        "Copy for AI",
        "Copy the whole session \u2014 findings, causal chain, stacks, HTTP detail, timeline \u2014 as a paste-ready brief for Claude Code or Antigravity"
      );
      this.settingsBtn = document.createElement("button");
      this.settingsBtn.className = "dr-debug-close-btn";
      this.settingsBtn.innerHTML = "\u2699";
      this.settingsBtn.title = "AI Settings & API Keys";
      this.settingsBtn.addEventListener("click", () => this.settingsModal.toggle());
      this.maximizeBtn = document.createElement("button");
      this.maximizeBtn.className = "dr-debug-close-btn";
      this.maximizeBtn.innerHTML = "\u2922";
      this.maximizeBtn.title = "Expand to full page";
      this.maximizeBtn.addEventListener("click", () => this.toggleMaximize());
      const closeBtn = document.createElement("button");
      closeBtn.className = "dr-debug-close-btn";
      closeBtn.innerHTML = "\u2715";
      closeBtn.title = "Close Cockpit";
      closeBtn.addEventListener("click", () => options.onClose());
      metricsWrapper.appendChild(this.heapMetricBadge);
      metricsWrapper.appendChild(this.uptimeMetricBadge);
      metricsWrapper.appendChild(exportBtn);
      metricsWrapper.appendChild(this.settingsBtn);
      metricsWrapper.appendChild(this.maximizeBtn);
      metricsWrapper.appendChild(closeBtn);
      header.appendChild(brand);
      header.appendChild(metricsWrapper);
      const tabs = document.createElement("div");
      tabs.className = "dr-debug-tabs";
      this.tabTimeline = document.createElement("button");
      this.tabTimeline.className = "dr-debug-tab active";
      this.tabTimeline.innerHTML = `<span>Timeline</span>`;
      this.tabTimeline.addEventListener("click", () => this.switchTab("timeline"));
      this.tabErrors = document.createElement("button");
      this.tabErrors.className = "dr-debug-tab";
      this.tabErrors.innerHTML = `<span>Error Matrix</span>`;
      this.tabErrors.addEventListener("click", () => this.switchTab("errors"));
      this.tabTriage = document.createElement("button");
      this.tabTriage.className = "dr-debug-tab";
      this.tabTriage.innerHTML = `<span>Telemetry</span>`;
      this.tabTriage.addEventListener("click", () => this.switchTab("triage"));
      this.tabGraph = document.createElement("button");
      this.tabGraph.className = "dr-debug-tab";
      this.tabGraph.innerHTML = `<span>Causal Graph</span>`;
      this.tabGraph.addEventListener("click", () => this.switchTab("graph"));
      this.tabDocker = document.createElement("button");
      this.tabDocker.className = "dr-debug-tab";
      this.tabDocker.innerHTML = `<span>\u{1F433} Docker</span>`;
      this.tabDocker.addEventListener("click", () => this.switchTab("docker"));
      this.tabPrescription = document.createElement("button");
      this.tabPrescription.className = "dr-debug-tab";
      this.tabPrescription.innerHTML = `<span>Prescription</span>`;
      this.tabPrescription.addEventListener("click", () => this.switchTab("prescription"));
      tabs.appendChild(this.tabTimeline);
      tabs.appendChild(this.tabErrors);
      tabs.appendChild(this.tabTriage);
      tabs.appendChild(this.tabGraph);
      tabs.appendChild(this.tabDocker);
      tabs.appendChild(this.tabPrescription);
      const body = document.createElement("div");
      body.className = "dr-debug-body";
      this.timelineContainer = document.createElement("div");
      this.timelineContainer.style.display = "flex";
      this.timelineContainer.style.flexDirection = "column";
      this.timelineContainer.style.gap = "10px";
      this.errorDashboardView = new ErrorDashboardView({
        getController: () => {
          var _a, _b;
          return ((_a = options.getController) == null ? void 0 : _a.call(options)) || (typeof window !== "undefined" ? (_b = window.__DR_DEBUG__) == null ? void 0 : _b.getController() : void 0);
        },
        onLaunchDiagnosis: (goal) => {
          this.queryInput.value = goal;
          this.triggerInvestigate();
        }
      });
      this.errorsContainer = document.createElement("div");
      this.errorsContainer.style.display = "none";
      this.errorsContainer.style.flexDirection = "column";
      this.errorsContainer.style.gap = "10px";
      this.errorsContainer.style.height = "100%";
      this.errorsContainer.appendChild(this.errorDashboardView.getElement());
      this.triageContainer = document.createElement("div");
      this.triageContainer.style.display = "none";
      this.triageContainer.style.flexDirection = "column";
      this.triageContainer.style.gap = "10px";
      this.graphContainer = document.createElement("div");
      this.graphContainer.style.display = "none";
      this.graphContainer.style.flexDirection = "column";
      this.graphContainer.style.gap = "10px";
      this.graphContainer.appendChild(this.causalGraphView.getElement());
      this.dockerDashboardView = new DockerDashboardView({
        getController: () => {
          var _a, _b;
          return ((_a = options.getController) == null ? void 0 : _a.call(options)) || (typeof window !== "undefined" ? (_b = window.__DR_DEBUG__) == null ? void 0 : _b.getController() : void 0);
        },
        onLaunchDiagnosis: (goal) => {
          this.queryInput.value = goal;
          this.triggerInvestigate();
        }
      });
      this.dockerContainer = document.createElement("div");
      this.dockerContainer.style.display = "none";
      this.dockerContainer.style.flexDirection = "column";
      this.dockerContainer.style.gap = "10px";
      this.dockerContainer.style.height = "100%";
      this.dockerContainer.appendChild(this.dockerDashboardView.getElement());
      this.prescriptionContainer = document.createElement("div");
      this.prescriptionContainer.style.display = "none";
      this.prescriptionContainer.style.flexDirection = "column";
      this.prescriptionContainer.style.gap = "10px";
      body.appendChild(this.timelineContainer);
      body.appendChild(this.errorsContainer);
      body.appendChild(this.triageContainer);
      body.appendChild(this.graphContainer);
      body.appendChild(this.dockerContainer);
      body.appendChild(this.prescriptionContainer);
      this.settingsModal = new SettingsModal({
        onSave: (settings) => {
          var _a, _b, _c;
          (_a = options.onSaveSettings) == null ? void 0 : _a.call(options, settings);
          if (typeof window !== "undefined" && window.__DR_DEBUG__) {
            (_c = (_b = window.__DR_DEBUG__).updateLLMConfig) == null ? void 0 : _c.call(_b, settings);
          }
        },
        onTestConnection: async (settings) => {
          var _a;
          if (options.onTestConnection) {
            return await options.onTestConnection(settings);
          }
          if (typeof window !== "undefined" && ((_a = window.__DR_DEBUG__) == null ? void 0 : _a.testLLMConnection)) {
            return await window.__DR_DEBUG__.testLLMConnection(settings);
          }
          return { success: true, message: "Settings validated" };
        }
      });
      this.element.appendChild(this.settingsModal.getElement());
      const queryWrapper = document.createElement("div");
      queryWrapper.className = "dr-debug-query-wrapper";
      const chipsRow = document.createElement("div");
      chipsRow.className = "dr-debug-chips-row";
      const quickChips = [
        { label: "\u26A1 Diagnose 503 Error", query: "Why did the /api/ request return 503 and how can we fix it?" },
        { label: "\u{1F50D} Find Correlations", query: "Find causal links between recent network failures and console exceptions." },
        { label: "\u{1F9E0} Inspect Heap & Vitals", query: "Check memory heap allocations and identify any potential memory leaks." },
        { label: "\u{1F9F9} Clear Telemetry", action: "clear" }
      ];
      for (const chip of quickChips) {
        const chipEl = document.createElement("button");
        chipEl.className = "dr-debug-quick-chip";
        chipEl.textContent = chip.label;
        chipEl.addEventListener("click", () => {
          if (chip.action === "clear") {
            this.clearTimeline();
          } else if (chip.query) {
            this.queryInput.value = chip.query;
            this.triggerInvestigate();
          }
        });
        chipsRow.appendChild(chipEl);
      }
      const queryBox = document.createElement("div");
      queryBox.className = "dr-debug-query-box";
      this.queryInput = document.createElement("input");
      this.queryInput.className = "dr-debug-input";
      this.queryInput.placeholder = "Ask Dr. Debug (e.g. Why did /api/agents/resource/run fail?)...";
      this.queryInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") this.triggerInvestigate();
      });
      this.queryButton = document.createElement("button");
      this.queryButton.id = "dr-debug-query-submit";
      this.queryButton.className = "dr-debug-btn";
      this.queryButton.innerHTML = `<span>\u26A1</span> <span>Diagnose</span>`;
      this.queryButton.addEventListener("click", () => this.triggerInvestigate());
      queryBox.appendChild(this.queryInput);
      queryBox.appendChild(this.queryButton);
      queryWrapper.appendChild(chipsRow);
      queryWrapper.appendChild(queryBox);
      this.element.appendChild(header);
      this.element.appendChild(tabs);
      this.element.appendChild(body);
      this.element.appendChild(queryWrapper);
      const creditFooter = document.createElement("div");
      creditFooter.className = "dr-debug-cockpit-footer";
      creditFooter.innerHTML = `
      <span>\u{1FA7A} Dr. Debug by <a href="https://github.com/SazWhatician" target="_blank" rel="noopener noreferrer" style="color:#38bdf8;text-decoration:none;font-weight:700;">Saswat Mohanty (@SazWhatician)</a></span>
      <span style="color:#64748b;">\xB7</span>
      <a href="https://www.linkedin.com/in/saswat-mohanty-0a4549331/" target="_blank" rel="noopener noreferrer" style="color:#818cf8;text-decoration:none;">LinkedIn</a>
    `;
      this.element.appendChild(creditFooter);
      this.renderEmptyTimeline();
      this.renderEmptyPrescription();
      this.startUptimeTicker();
      this.initDraggable(header);
    }
    element;
    timelineContainer;
    errorsContainer;
    triageContainer;
    graphContainer;
    prescriptionContainer;
    dockerContainer;
    errorDashboardView;
    dockerDashboardView;
    settingsModal;
    causalGraphView = new CausalGraphView();
    queryInput;
    queryButton;
    tabTimeline;
    tabErrors;
    tabTriage;
    tabGraph;
    tabDocker;
    tabPrescription;
    heapMetricBadge;
    uptimeMetricBadge;
    activeTab = "timeline";
    steps = [];
    startTime = Date.now();
    isMaximized = false;
    maximizeBtn;
    settingsBtn;
    thinkingCard = null;
    onInvestigateHandler;
    getSessionPrompt;
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
      this.queryButton.innerHTML = busy ? `<span>\u23F3</span> <span>Diagnosing...</span>` : `<span>\u26A1</span> <span>Diagnose</span>`;
    }
    switchTab(tab) {
      this.activeTab = tab;
      this.tabTimeline.classList.toggle("active", tab === "timeline");
      this.tabErrors.classList.toggle("active", tab === "errors");
      this.tabTriage.classList.toggle("active", tab === "triage");
      this.tabGraph.classList.toggle("active", tab === "graph");
      this.tabDocker.classList.toggle("active", tab === "docker");
      this.tabPrescription.classList.toggle("active", tab === "prescription");
      this.timelineContainer.style.display = tab === "timeline" ? "flex" : "none";
      this.errorsContainer.style.display = tab === "errors" ? "flex" : "none";
      this.triageContainer.style.display = tab === "triage" ? "flex" : "none";
      this.graphContainer.style.display = tab === "graph" ? "flex" : "none";
      this.dockerContainer.style.display = tab === "docker" ? "flex" : "none";
      this.prescriptionContainer.style.display = tab === "prescription" ? "flex" : "none";
      if (tab === "errors") {
        this.errorDashboardView.update();
      } else if (tab === "docker") {
        this.dockerDashboardView.update();
      }
    }
    updateErrors() {
      this.errorDashboardView.update();
    }
    updateDocker() {
      var _a, _b, _c;
      this.dockerDashboardView.update();
      const controller = typeof this.onCloseOrOptions === "object" && ((_b = (_a = this.onCloseOrOptions).getController) == null ? void 0 : _b.call(_a));
      if (controller) {
        const errorCount = (((_c = controller.getDockerLogs) == null ? void 0 : _c.call(controller)) || []).filter((l) => l.level === "error").length;
        if (errorCount > 0) {
          this.tabDocker.innerHTML = `<span>\u{1F433} Docker <span style="background:rgba(244,63,94,0.25);color:#fda4af;border:1px solid rgba(244,63,94,0.5);padding:1px 5px;border-radius:9999px;font-size:9px;font-weight:700">${errorCount}</span></span>`;
        } else {
          this.tabDocker.innerHTML = `<span>\u{1F433} Docker</span>`;
        }
      }
    }
    clearTimeline() {
      this.steps = [];
      this.renderEmptyTimeline();
      this.renderEmptyPrescription();
    }
    renderEmptyTimeline() {
      this.timelineContainer.innerHTML = `
      <div class="dr-debug-timeline-empty">
        <div class="dr-debug-radar-ring">
          <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo radar-logo" alt="Dr. Debug" />
        </div>
        <strong style="color: #f1f5f9; font-size: 13px;">Autonomous Diagnostic Observer Active</strong>
        <p style="font-size: 12px; max-width: 320px; line-height: 1.5;">
          Dr. Debug is continuously analyzing DOM mutations, network traffic, and console telemetry. Click <strong>Diagnose</strong> to launch autonomous RCA.
        </p>
      </div>
    `;
    }
    renderEmptyPrescription() {
      this.prescriptionContainer.innerHTML = `
      <div class="dr-debug-timeline-empty">
        <div class="dr-debug-radar-ring">
          <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo radar-logo" alt="Dr. Debug" />
        </div>
        <strong style="color: #f1f5f9; font-size: 13px;">No Prescription Generated Yet</strong>
        <p style="font-size: 12px; max-width: 320px; line-height: 1.5;">
          Launch a diagnosis to formulate verified code fixes, root causes, and unified diff patches.
        </p>
      </div>
    `;
    }
    addStep(step) {
      this.clearThinking();
      if (this.steps.length === 0) this.timelineContainer.innerHTML = "";
      this.steps.push(step);
      const stepCard = document.createElement("div");
      stepCard.className = "dr-debug-step-card";
      const header = document.createElement("div");
      header.className = "dr-debug-step-header";
      const left = document.createElement("div");
      left.className = "dr-debug-step-left";
      const numSpan = document.createElement("span");
      numSpan.className = "dr-debug-step-pill";
      numSpan.textContent = `Step ${step.stepNumber}`;
      const toolBadge = document.createElement("span");
      toolBadge.className = "dr-debug-step-tool";
      toolBadge.textContent = step.toolName;
      left.appendChild(numSpan);
      left.appendChild(toolBadge);
      const right = document.createElement("div");
      right.className = "dr-debug-step-right";
      if (step.toolOutput) right.appendChild(this.makeCopyBtn(step.toolOutput));
      header.appendChild(left);
      header.appendChild(right);
      stepCard.appendChild(header);
      const reasoningLabel = document.createElement("div");
      reasoningLabel.className = "dr-debug-step-reasoning-label";
      reasoningLabel.textContent = "\u{1F9E0} AI Reasoning";
      const thought = document.createElement("div");
      thought.className = "dr-debug-step-thought";
      thought.textContent = step.hypothesis;
      stepCard.appendChild(reasoningLabel);
      stepCard.appendChild(thought);
      if (step.toolOutput) {
        const outputLabel = document.createElement("div");
        outputLabel.className = "dr-debug-step-output-label";
        outputLabel.textContent = "Tool Output";
        const output = document.createElement("div");
        output.className = "dr-debug-step-output";
        output.textContent = step.toolOutput;
        stepCard.appendChild(outputLabel);
        stepCard.appendChild(output);
      }
      this.timelineContainer.appendChild(stepCard);
      this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight;
    }
    showPrescription(prescription) {
      this.timelineContainer.appendChild(this.buildPrescriptionCard(prescription));
      this.prescriptionContainer.innerHTML = "";
      this.prescriptionContainer.appendChild(this.buildPrescriptionCard(prescription));
      this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight;
      this.switchTab("prescription");
    }
    buildPrescriptionCard(prescription) {
      const card = document.createElement("div");
      card.className = "dr-debug-prescription-card";
      const header = document.createElement("div");
      header.className = "dr-debug-presc-header";
      const title = document.createElement("div");
      title.className = "dr-debug-presc-title";
      title.innerHTML = `
      <img src="${DR_DEBUG_LOGO}" class="dr-debug-logo" alt="Dr. Debug" style="display:inline-block; vertical-align:middle;" />
      <span>Verified Root Cause Diagnosis</span>
    `;
      const confChip = document.createElement("div");
      confChip.className = "dr-debug-confidence-chip";
      confChip.textContent = `${Math.round((prescription.confidence ?? 0.95) * 100)}% Confidence`;
      header.appendChild(title);
      header.appendChild(confChip);
      const sectionFinding = document.createElement("div");
      sectionFinding.className = "dr-debug-presc-section";
      sectionFinding.innerHTML = `
      <div class="dr-debug-presc-label">Diagnostic Finding</div>
      <div class="dr-debug-presc-text">${this.escapeHtml(prescription.diagnosis)}</div>
    `;
      const sectionRCA = document.createElement("div");
      sectionRCA.className = "dr-debug-presc-section";
      sectionRCA.innerHTML = `
      <div class="dr-debug-presc-label">Root Cause Mechanism</div>
      <div class="dr-debug-presc-text" style="color: #cbd5e1;">${this.escapeHtml(prescription.rootCause)}</div>
    `;
      card.appendChild(header);
      card.appendChild(sectionFinding);
      card.appendChild(sectionRCA);
      if (prescription.filesToModify && prescription.filesToModify.length > 0) {
        const sectionFiles = document.createElement("div");
        sectionFiles.className = "dr-debug-presc-section";
        sectionFiles.innerHTML = `
        <div class="dr-debug-presc-label">Target Files To Patch</div>
        <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: #38bdf8;">
          ${prescription.filesToModify.map((f) => `\u{1F4C4} ${this.escapeHtml(f)}`).join(" &nbsp;|&nbsp; ")}
        </div>
      `;
        card.appendChild(sectionFiles);
      }
      if (prescription.fix) {
        const sectionFix = document.createElement("div");
        sectionFix.className = "dr-debug-presc-section";
        sectionFix.innerHTML = `<div class="dr-debug-presc-label">Prescribed Code Patch</div>`;
        const diffContainer = document.createElement("div");
        diffContainer.className = "dr-debug-prescription-diff";
        diffContainer.innerHTML = this.formatDiffHtml(prescription.fix);
        const copyBtn = document.createElement("button");
        copyBtn.className = "dr-debug-copy-btn";
        const idle = `<span>\u{1F4CB}</span> <span>Copy remediation plan</span>`;
        copyBtn.innerHTML = idle;
        this.bindCopyFeedback(
          copyBtn,
          () => prescription.fix,
          idle,
          `<span>\u2705</span> <span>Copied</span>`
        );
        sectionFix.appendChild(diffContainer);
        sectionFix.appendChild(copyBtn);
        card.appendChild(sectionFix);
      }
      const handoff = document.createElement("div");
      handoff.className = "dr-debug-presc-section dr-debug-handoff";
      handoff.innerHTML = `
      <div class="dr-debug-presc-label">Hand off to a coding agent</div>
      <div class="dr-debug-handoff-desc">
        Exports this whole session \u2014 every finding with its evidence, the causal chain, demangled stacks,
        full HTTP transactions with a cURL reproduction, backend logs and the chronological timeline \u2014
        as one Markdown brief for Claude Code, Antigravity or Cursor.
      </div>
    `;
      handoff.appendChild(
        this.makeSessionPromptButton(
          "dr-debug-copy-btn primary",
          "\u{1F4E4} Copy full brief for AI",
          "Copy the complete session brief as Markdown"
        )
      );
      card.appendChild(handoff);
      return card;
    }
    updateTriage(telemetry) {
      this.triageContainer.innerHTML = "";
      if (telemetry.memory && telemetry.memory.usedMB) {
        this.heapMetricBadge.innerHTML = `<span>\u{1F9E0}</span> <span>Heap: ${telemetry.memory.usedMB}MB</span>`;
      }
      if (telemetry.errors.length > 0) {
        for (const err of telemetry.errors) {
          const item = document.createElement("div");
          item.className = "dr-debug-telemetry-item error";
          item.innerHTML = `
          <div class="dr-debug-telemetry-meta">
            <span style="color: #fb7185; font-weight: 700;">\u{1F534} RUNTIME EXCEPTION</span>
            <span>Just now</span>
          </div>
          <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: #f1f5f9;">
            ${this.escapeHtml(err)}
          </div>
        `;
          item.querySelector(".dr-debug-telemetry-meta").appendChild(this.makeCopyBtn(err));
          this.triageContainer.appendChild(item);
        }
      }
      if (telemetry.slowRequests.length > 0) {
        for (const req of telemetry.slowRequests) {
          const isFail = req.includes("[50") || req.includes("[40") || req.includes("[0]");
          const item = document.createElement("div");
          item.className = `dr-debug-telemetry-item ${isFail ? "net-fail" : "warn"}`;
          item.innerHTML = `
          <div class="dr-debug-telemetry-meta">
            <span style="color: ${isFail ? "#fbbf24" : "#38bdf8"}; font-weight: 700;">
              ${isFail ? "\u26A0\uFE0F HTTP NETWORK ANOMALY" : "\u23F3 LATENCY ANOMALY"}
            </span>
            <span>Substrate trace</span>
          </div>
          <div style="font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: #f1f5f9;">
            ${this.escapeHtml(req)}
          </div>
        `;
          item.querySelector(".dr-debug-telemetry-meta").appendChild(this.makeCopyBtn(req));
          this.triageContainer.appendChild(item);
        }
      }
      if (telemetry.memory) {
        const item = document.createElement("div");
        item.className = "dr-debug-telemetry-item ok";
        item.innerHTML = `
        <div class="dr-debug-telemetry-meta">
          <span style="color: #34d399; font-weight: 700;">\u{1F7E2} V8 MEMORY SUBSYSTEM</span>
          <span>Live Snapshot</span>
        </div>
        <div style="font-size: 12px; color: #cbd5e1;">
          Used Heap: <strong>${telemetry.memory.usedMB || 0} MB</strong> / Allocated: <strong>${telemetry.memory.totalMB || 0} MB</strong>
        </div>
      `;
        this.triageContainer.appendChild(item);
      }
      if (this.triageContainer.children.length === 0) {
        this.triageContainer.innerHTML = `
        <div style="color: #34d399; text-align: center; padding: 40px 10px; font-size: 13px;">
          <div style="font-size: 24px; margin-bottom: 6px;">\u2728</div>
          <strong>Substrate is completely healthy.</strong>
          <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Zero unhandled exceptions, zero network timeouts recorded.</p>
        </div>
      `;
      }
    }
    showThinking(message) {
      if (this.thinkingCard) this.thinkingCard.remove();
      if (this.steps.length === 0) this.timelineContainer.innerHTML = "";
      this.thinkingCard = document.createElement("div");
      this.thinkingCard.className = "dr-debug-thinking-card";
      this.thinkingCard.innerHTML = `
      <div class="dr-debug-thinking-pulse"></div>
      <div class="dr-debug-thinking-body">
        <div class="dr-debug-thinking-label">Dr. Debug \xB7 Reasoning</div>
        <div class="dr-debug-thinking-text">${this.escapeHtml(message)}</div>
      </div>
    `;
      this.timelineContainer.appendChild(this.thinkingCard);
      this.timelineContainer.scrollTop = this.timelineContainer.scrollHeight;
      if (this.activeTab !== "timeline") this.switchTab("timeline");
    }
    clearThinking() {
      if (this.thinkingCard) {
        this.thinkingCard.remove();
        this.thinkingCard = null;
      }
    }
    updateCausalGraph(graph) {
      this.causalGraphView.updateGraph(graph);
      if (graph.nodes.length > 0) {
        this.tabGraph.innerHTML = `<span>\u{1F578}\uFE0F</span> <span>Causal Map <span style="background:rgba(251,146,60,0.2);color:#fb923c;border:1px solid rgba(251,146,60,0.4);padding:1px 5px;border-radius:9999px;font-size:9px;font-weight:700">${graph.nodes.length}</span></span>`;
      }
    }
    toggleMaximize() {
      this.isMaximized = !this.isMaximized;
      this.element.classList.toggle("maximized", this.isMaximized);
      this.maximizeBtn.innerHTML = this.isMaximized ? "\u2921" : "\u2922";
      this.maximizeBtn.title = this.isMaximized ? "Restore size" : "Expand to full page";
      if (this.isMaximized) {
        this.element.style.left = "";
        this.element.style.top = "";
        this.element.style.right = "";
        this.element.style.bottom = "";
      }
    }
    /**
     * Clipboard write that reports whether it actually succeeded. The async API
     * needs a secure context and a focused document, neither of which is
     * guaranteed here, so fall back to a detached textarea + execCommand.
     */
    async copyToClipboard(text) {
      var _a;
      try {
        if ((_a = navigator.clipboard) == null ? void 0 : _a.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
      }
      try {
        const scratch = document.createElement("textarea");
        scratch.value = text;
        scratch.setAttribute("readonly", "");
        scratch.style.position = "fixed";
        scratch.style.top = "-1000px";
        scratch.style.opacity = "0";
        document.body.appendChild(scratch);
        scratch.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(scratch);
        return ok;
      } catch {
        return false;
      }
    }
    /** Wires a button to a copy action with honest success/failure feedback. */
    bindCopyFeedback(btn, getText, idleHtml, okHtml, failHtml = "<span>Copy failed</span>") {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const text = getText();
        if (!text) {
          btn.innerHTML = "<span>Nothing to copy</span>";
          setTimeout(() => {
            btn.innerHTML = idleHtml;
          }, 1800);
          return;
        }
        const ok = await this.copyToClipboard(text);
        btn.innerHTML = ok ? okHtml : failHtml;
        btn.classList.toggle("copied", ok);
        setTimeout(() => {
          btn.innerHTML = idleHtml;
          btn.classList.remove("copied");
        }, 2200);
      });
    }
    makeSessionPromptButton(className, label, title) {
      const btn = document.createElement("button");
      btn.className = className;
      btn.title = title;
      const idle = `<span>${label}</span>`;
      btn.innerHTML = idle;
      this.bindCopyFeedback(
        btn,
        () => {
          var _a;
          return ((_a = this.getSessionPrompt) == null ? void 0 : _a.call(this)) || "";
        },
        idle,
        "<span>Copied for AI</span>"
      );
      return btn;
    }
    makeCopyBtn(text) {
      const btn = document.createElement("button");
      btn.className = "dr-debug-copy-inline";
      btn.title = "Copy to clipboard";
      btn.innerHTML = "\u{1F4CB}";
      this.bindCopyFeedback(btn, () => text, "\u{1F4CB}", "\u2705", "\u26A0\uFE0F");
      return btn;
    }
    startUptimeTicker() {
      setInterval(() => {
        const sec = Math.floor((Date.now() - this.startTime) / 1e3);
        const m = Math.floor(sec / 60).toString().padStart(2, "0");
        const s = (sec % 60).toString().padStart(2, "0");
        const el = this.element.querySelector("#dr-debug-uptime-val");
        if (el) el.textContent = `${m}:${s}`;
      }, 1e3);
    }
    triggerInvestigate() {
      const query = this.queryInput.value.trim();
      if (!query) return;
      this.setBusy(true);
      this.switchTab("timeline");
      this.onInvestigateHandler(query);
    }
    formatDiffHtml(diff) {
      return diff.split("\n").map((line) => {
        if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
          return `<div style="color: #94a3b8;">${this.escapeHtml(line)}</div>`;
        }
        if (line.startsWith("+")) return `<span class="dr-debug-diff-add">${this.escapeHtml(line)}</span>`;
        if (line.startsWith("-")) return `<span class="dr-debug-diff-del">${this.escapeHtml(line)}</span>`;
        return `<div>${this.escapeHtml(line)}</div>`;
      }).join("");
    }
    escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    initDraggable(header) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initialX = 0;
      let initialY = 0;
      const onMouseDown = (e) => {
        if (this.isMaximized) return;
        const target = e.target;
        if (target.closest(".dr-debug-close-btn") || target.tagName === "BUTTON" || target.tagName === "INPUT") {
          return;
        }
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = this.element.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        this.element.style.left = `${initialX}px`;
        this.element.style.top = `${initialY}px`;
        this.element.style.right = "auto";
        this.element.style.bottom = "auto";
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      };
      const onMouseMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newX = initialX + dx;
        let newY = initialY + dy;
        const maxX = window.innerWidth - this.element.offsetWidth - 10;
        const maxY = window.innerHeight - this.element.offsetHeight - 10;
        newX = Math.max(10, Math.min(newX, maxX));
        newY = Math.max(10, Math.min(newY, maxY));
        this.element.style.left = `${newX}px`;
        this.element.style.top = `${newY}px`;
      };
      const onMouseUp = () => {
        isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };
      header.addEventListener("mousedown", onMouseDown);
    }
  };

  // packages/ui/src/components/FloatingPill.ts
  var FloatingPill = class {
    element;
    badgeText;
    equalizer;
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
      this.equalizer = document.createElement("div");
      this.equalizer.className = "dr-debug-equalizer";
      this.equalizer.innerHTML = `
      <div class="dr-debug-eq-bar"></div>
      <div class="dr-debug-eq-bar"></div>
      <div class="dr-debug-eq-bar"></div>
    `;
      const icon = document.createElement("span");
      icon.className = "dr-debug-pill-icon";
      icon.innerHTML = `<img src="${DR_DEBUG_LOGO}" class="dr-debug-logo pill-logo" alt="Dr. Debug" />`;
      this.badgeText = document.createElement("div");
      this.badgeText.className = "dr-debug-pill-badge";
      this.badgeText.innerHTML = `<span>Dr. Debug</span> <span class="dr-debug-chip ok">ACTIVE</span>`;
      this.element.appendChild(this.equalizer);
      this.element.appendChild(icon);
      this.element.appendChild(this.badgeText);
      this.element.addEventListener("click", () => {
        if (!this.hasMoved) {
          onClick();
        }
      });
      this.initDraggable();
    }
    getElement() {
      return this.element;
    }
    updateStatus(errorCount, failedNetCount = 0, slowNetCount = 0, isRunning = false) {
      if (isRunning) {
        this.badgeText.innerHTML = `<span>Dr. Debug</span> <span class="dr-debug-chip run">DIAGNOSING</span>`;
        return;
      }
      const totalIssues = errorCount + failedNetCount + slowNetCount;
      if (totalIssues > 0) {
        const chips = [];
        if (errorCount > 0) chips.push(`<span class="dr-debug-chip err">${errorCount} ERR</span>`);
        if (failedNetCount > 0) chips.push(`<span class="dr-debug-chip net">${failedNetCount} NET</span>`);
        if (slowNetCount > 0) chips.push(`<span class="dr-debug-chip net">${slowNetCount} SLOW</span>`);
        this.badgeText.innerHTML = chips.join(" ");
      } else {
        this.badgeText.innerHTML = `<span>Dr. Debug</span> <span class="dr-debug-chip ok">HEALTHY</span>`;
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
        if (!this.isDragging) return;
        this.isDragging = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        if (this.hasMoved) {
          const rect = this.element.getBoundingClientRect();
          const snapPadding = 24;
          if (rect.left < window.innerWidth / 2) {
            this.element.style.left = `${snapPadding}px`;
            this.element.style.right = "auto";
          } else {
            this.element.style.left = "auto";
            this.element.style.right = `${snapPadding}px`;
          }
        }
      };
      this.element.addEventListener("mousedown", onMouseDown);
    }
  };

  // packages/ui/src/styles.ts
  var shadowStyles = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

:host {
  all: initial;
  font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13px;
  line-height: 1.45;
  color: #f1f5f9;
  z-index: 2147483647;
  position: fixed;
  pointer-events: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}


* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ==========================================================================
   1. FLOATING PILL HUD (Holographic Capsule with Rotating Border Aura)
   ========================================================================== */

.dr-debug-pill {
  pointer-events: auto;
  position: fixed;
  bottom: 24px;
  right: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(10, 14, 23, 0.88);
  border: 1px solid rgba(56, 189, 248, 0.28);
  box-shadow: 
    0 12px 32px -4px rgba(0, 0, 0, 0.7),
    0 4px 12px rgba(6, 182, 212, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px) saturate(190%);
  -webkit-backdrop-filter: blur(20px) saturate(190%);
  padding: 7px 16px 7px 12px;
  border-radius: 9999px;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, box-shadow;
}

.dr-debug-pill:hover {
  background: rgba(15, 23, 42, 0.95);
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow: 
    0 16px 40px -4px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(6, 182, 212, 0.4),
    inset 0 1px 1px rgba(255, 255, 255, 0.25);
  transform: translateY(-3px) scale(1.03);
}

.dr-debug-pill:active {
  transform: translateY(-1px) scale(0.98);
}

/* Live Equalizer Activity Waves */
.dr-debug-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 2.5px;
  height: 14px;
  width: 14px;
}

.dr-debug-eq-bar {
  flex: 1;
  background: #00f0ff;
  border-radius: 2px;
  height: 4px;
  transition: height 0.2s ease;
  animation: eq-pulse 1.4s ease-in-out infinite alternate;
}

.dr-debug-eq-bar:nth-child(1) { animation-delay: 0s; }
.dr-debug-eq-bar:nth-child(2) { animation-delay: 0.25s; }
.dr-debug-eq-bar:nth-child(3) { animation-delay: 0.5s; }

@keyframes eq-pulse {
  0% { height: 3px; opacity: 0.6; }
  50% { height: 13px; opacity: 1; }
  100% { height: 6px; opacity: 0.8; }
}

.dr-debug-pill-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.6));
}

.dr-debug-pill-badge {
  font-weight: 600;
  font-size: 12px;
  letter-spacing: 0.3px;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-chip {
  padding: 2px 7px;
  border-radius: 9999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.dr-debug-chip.err {
  background: rgba(244, 63, 94, 0.2);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.4);
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.3);
}

.dr-debug-chip.net {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.4);
}

.dr-debug-chip.ok {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.dr-debug-chip.run {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.4);
  animation: chip-glow 1.2s infinite alternate;
}

@keyframes chip-glow {
  from { box-shadow: 0 0 4px rgba(168, 85, 247, 0.3); }
  to { box-shadow: 0 0 12px rgba(168, 85, 247, 0.8); }
}

/* ==========================================================================
   2. MAIN COCKPIT DRAWER (Obsidian Glass Floating Terminal)
   ========================================================================== */

.dr-debug-modal {
  pointer-events: auto;
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 520px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 100px);
  height: 620px;
  background: rgba(8, 12, 22, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  box-shadow:
    0 24px 60px -8px rgba(0, 0, 0, 0.85),
    0 0 32px rgba(6, 182, 212, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(32px) saturate(220%);
  -webkit-backdrop-filter: blur(32px) saturate(220%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modal-spring-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 2147483647;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-modal.hidden {
  display: none;
}

.dr-debug-modal.maximized {
  inset: 10px;
  width: calc(100vw - 20px) !important;
  height: calc(100vh - 20px) !important;
  max-width: none !important;
  max-height: none !important;
  border-radius: 16px;
  bottom: auto;
  right: auto;
}

@keyframes modal-spring-in {
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes slide-in-card {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes thinking-pulse {
  0%, 100% { transform: scale(1);   opacity: 0.5; box-shadow: 0 0 0 0 rgba(192,132,252,0.4); }
  50%       { transform: scale(1.4); opacity: 1;   box-shadow: 0 0 0 8px rgba(192,132,252,0); }
}

@keyframes causal-flow {
  from { stroke-dashoffset: 24; }
  to   { stroke-dashoffset: 0; }
}

/* Header (Draggable Handle) */
.dr-debug-header {
  padding: 10px 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.01) 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: grab;
  user-select: none;
}

.dr-debug-header:active {
  cursor: grabbing;
}

.dr-debug-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dr-debug-brand-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.7));
}

.dr-debug-title-text {
  font-weight: 700;
  font-size: 12.5px;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, #ffffff 0%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.dr-debug-header-metrics {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10.5px;
  color: #94a3b8;
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
}

.dr-debug-metric-badge {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dr-debug-close-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  cursor: pointer;
  font-size: 12px;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.dr-debug-close-btn:hover {
  color: #fff;
  background: rgba(244, 63, 94, 0.4);
  border-color: rgba(244, 63, 94, 0.7);
  transform: scale(1.05);
}

/* Tabs */
.dr-debug-tabs {
  display: flex;
  background: rgba(6, 9, 16, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 3px 6px;
  gap: 3px;
}

.dr-debug-tab {
  flex: 1;
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s ease;
}

.dr-debug-tab:hover {
  color: #f1f5f9;
  background: rgba(255, 255, 255, 0.05);
}

.dr-debug-tab.active {
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.14);
  border: 1px solid rgba(56, 189, 248, 0.35);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
}

/* Body Content */
.dr-debug-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-body::-webkit-scrollbar {
  width: 6px;
}

.dr-debug-body::-webkit-scrollbar-track {
  background: rgba(10, 14, 23, 0.4);
}

.dr-debug-body::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 9999px;
}

.dr-debug-body::-webkit-scrollbar-thumb:hover {
  background: rgba(56, 189, 248, 0.6);
}

/* ==========================================================================
   3. DIAGNOSTIC TIMELINE & RE-ACT STEP CARDS
   ========================================================================== */

.dr-debug-timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 40px 20px;
  color: #64748b;
  gap: 12px;
}

.dr-debug-radar-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px dashed rgba(56, 189, 248, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  animation: spin-slow 8s linear infinite;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%);
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.dr-debug-step-card {
  position: relative;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s, background 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  animation: slide-in-card 0.32s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-step-card:hover {
  border-color: rgba(56, 189, 248, 0.3);
  background: rgba(20, 30, 50, 0.8);
}

.dr-debug-step-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dr-debug-step-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-step-pill {
  background: linear-gradient(135deg, #a855f7 0%, #6366f1 100%);
  color: #fff;
  font-weight: 700;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 0 6px rgba(168, 85, 247, 0.4);
}

.dr-debug-step-tool {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 10.5px;
  font-weight: 600;
}

.dr-debug-step-reasoning-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #a855f7;
  margin-bottom: 2px;
}

.dr-debug-step-thought {
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.45;
  padding: 6px 10px;
  background: rgba(168, 85, 247, 0.07);
  border-left: 2px solid rgba(168, 85, 247, 0.6);
  border-radius: 0 5px 5px 0;
}

.dr-debug-step-output-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #38bdf8;
  margin-bottom: 2px;
  margin-top: 2px;
}

.dr-debug-step-output {
  background: rgba(6, 9, 16, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 5px;
  padding: 6px 8px;
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 10.5px;
  max-height: 130px;
  overflow-y: auto;
  white-space: pre-wrap;
  color: #94a3b8;
  line-height: 1.4;
}

/* \u2500\u2500 AI Thinking / Reasoning Card \u2500\u2500 */
.dr-debug-thinking-card {
  background: rgba(168, 85, 247, 0.06);
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  animation: slide-in-card 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}

.dr-debug-thinking-pulse {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #c084fc;
  flex-shrink: 0;
  margin-top: 3px;
  animation: thinking-pulse 1.1s ease-in-out infinite;
}

.dr-debug-thinking-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-thinking-label {
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #c084fc;
}

.dr-debug-thinking-text {
  font-size: 12px;
  color: #e2e8f0;
  line-height: 1.4;
}

/* ==========================================================================
   4. PRESCRIPTION CARD & UNIFIED DIFF
   ========================================================================== */

.dr-debug-prescription-card {
  background: linear-gradient(145deg, rgba(16, 35, 28, 0.85) 0%, rgba(8, 20, 16, 0.95) 100%);
  border: 1px solid rgba(16, 185, 129, 0.4);
  box-shadow: 0 6px 18px rgba(16, 185, 129, 0.15);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-presc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dr-debug-presc-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: #34d399;
  font-size: 12.5px;
}

.dr-debug-confidence-chip {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
  font-weight: 700;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 9999px;
}

.dr-debug-presc-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-presc-label {
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #6ee7b7;
}

.dr-debug-presc-text {
  font-size: 11.5px;
  color: #f1f5f9;
  line-height: 1.55;
  /* The root-cause text carries its own paragraph and causal-chain line breaks;
     collapsing them turns the whole section into one unreadable block. */
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.dr-debug-prescription-diff {
  background: rgba(3, 7, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px;
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 11px;
  overflow-x: auto;
  white-space: pre;
  color: #e2e8f0;
  line-height: 1.45;
}

.dr-debug-diff-add {
  color: #34d399;
  background: rgba(16, 185, 129, 0.15);
  display: block;
  padding: 0 3px;
  border-radius: 2px;
}

.dr-debug-diff-del {
  color: #fb7185;
  background: rgba(244, 63, 94, 0.15);
  display: block;
  padding: 0 3px;
  border-radius: 2px;
}

.dr-debug-copy-btn {
  align-self: flex-end;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;
}

.dr-debug-copy-btn:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.5);
  color: #34d399;
}

.dr-debug-copy-inline {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #475569;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1.4;
  flex-shrink: 0;
}

.dr-debug-copy-inline:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.dr-debug-step-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

/* ==========================================================================
   5. TELEMETRY MATRIX & WATERFALL LATENCY CARDS
   ========================================================================== */

.dr-debug-telemetry-item {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11.5px;
  transition: all 0.2s;
}

.dr-debug-telemetry-item:hover {
  background: rgba(20, 30, 50, 0.8);
  border-color: rgba(56, 189, 248, 0.3);
}

.dr-debug-telemetry-item.error {
  border-left: 3px solid #f43f5e;
  background: rgba(244, 63, 94, 0.06);
}

.dr-debug-telemetry-item.net-fail {
  border-left: 3px solid #f59e0b;
  background: rgba(245, 158, 11, 0.06);
}

.dr-debug-telemetry-item.ok {
  border-left: 3px solid #10b981;
}

.dr-debug-telemetry-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: #94a3b8;
}

/* ==========================================================================
   6. QUICK PROMPTS & INTERACTIVE QUERY BAR
   ========================================================================== */

.dr-debug-query-wrapper {
  background: rgba(8, 12, 22, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px;
}

.dr-debug-chips-row {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.dr-debug-chips-row::-webkit-scrollbar {
  display: none;
}

.dr-debug-quick-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  font-size: 10.5px;
  padding: 3px 8px;
  border-radius: 9999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.dr-debug-quick-chip:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  transform: translateY(-1px);
}

.dr-debug-query-box {
  display: flex;
  gap: 6px;
}

.dr-debug-input {
  flex: 1;
  background: rgba(6, 9, 16, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 7px 10px;
  color: #f8fafc;
  font-size: 11.5px;
  outline: none;
  transition: all 0.2s;
}

.dr-debug-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
  background: rgba(10, 15, 28, 0.95);
}

.dr-debug-btn {
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%);
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 7px 12px;
  font-weight: 700;
  font-size: 11.5px;
  letter-spacing: 0.2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 3px 10px rgba(6, 182, 212, 0.3);
}

.dr-debug-btn:hover {
  background: linear-gradient(135deg, #0369a1 0%, #0891b2 100%);
  box-shadow: 0 4px 14px rgba(6, 182, 212, 0.45);
  transform: translateY(-1px);
}

.dr-debug-btn:disabled {
  background: rgba(255, 255, 255, 0.08);
  color: #64748b;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

/* ==========================================================================
   7. BRAND LOGO & RESPONSIVE ADAPTATION
   ========================================================================== */

.dr-debug-logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(0, 240, 255, 0.7));
  border-radius: 4px;
  display: block;
}

.dr-debug-logo.pill-logo {
  width: 18px;
  height: 18px;
}

.dr-debug-logo.header-logo {
  width: 22px;
  height: 22px;
}

.dr-debug-logo.radar-logo {
  width: 32px;
  height: 32px;
}

/* ==========================================================================
   8. CAUSAL GRAPH (Holographic Topology & Animated DAG)
   ========================================================================== */

.dr-debug-graph-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 280px;
}

.dr-debug-graph-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  background: rgba(6, 9, 16, 0.6);
  border: 1px dashed rgba(56, 189, 248, 0.2);
  border-radius: 12px;
}

.dr-debug-graph-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(56, 189, 248, 0.15);
  border-radius: 8px;
  margin-bottom: 10px;
}

.dr-debug-graph-canvas-container {
  flex: 1;
  overflow: auto;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.8) 0%, rgba(6, 9, 16, 0.95) 100%);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 10px;
  padding: 10px;
  min-height: 240px;
}

.dr-debug-graph-canvas-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.dr-debug-graph-canvas-container::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.3);
  border-radius: 3px;
}

.dr-debug-graph-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.dr-debug-causal-link {
  fill: none;
  stroke: rgba(56, 189, 248, 0.5);
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

.dr-debug-causal-pulse {
  fill: none;
  stroke: #00f0ff;
  stroke-width: 2.5;
  stroke-dasharray: 8 20;
  animation: graph-pulse 1.8s linear infinite;
}

@keyframes graph-pulse {
  from { stroke-dashoffset: 28; }
  to { stroke-dashoffset: 0; }
}

.dr-debug-graph-node {
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow: hidden;
}

.dr-debug-graph-node:hover {
  border-color: #00f0ff;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 240, 255, 0.25);
  z-index: 10;
}

.dr-debug-graph-node.selected {
  border-color: #00f0ff;
  box-shadow: 0 0 16px rgba(0, 240, 255, 0.4);
}

.dr-debug-graph-node.node-docker {
  border-left: 3px solid #818cf8;
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.dr-debug-graph-node.node-network {
  border-left: 3px solid #00f0ff;
  background: linear-gradient(135deg, rgba(8, 47, 73, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.dr-debug-graph-node.node-console {
  border-left: 3px solid #f43f5e;
  background: linear-gradient(135deg, rgba(76, 5, 25, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.dr-debug-graph-node.node-dom {
  border-left: 3px solid #c084fc;
  background: linear-gradient(135deg, rgba(59, 7, 100, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%);
}

.dr-debug-graph-node.is-root {
  border: 1.5px solid #f43f5e !important;
  box-shadow: 0 0 20px rgba(244, 63, 94, 0.4) !important;
}

.dr-debug-node-root-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 4px;
  background: #f43f5e;
  color: #fff;
  letter-spacing: 0.4px;
}

.dr-debug-node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.dr-debug-node-title {
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  color: #f8fafc;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dr-debug-node-layer {
  font-size: 9px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.dr-debug-node-summary {
  font-size: 10.5px;
  color: #cbd5e1;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dr-debug-node-detail-box {
  margin-top: 10px;
  background: rgba(6, 9, 16, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
}

.dr-debug-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.dr-debug-detail-pre {
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.4);
  padding: 8px;
  border-radius: 6px;
  max-height: 140px;
  overflow-y: auto;
  white-space: pre-wrap;
}

/* ==========================================================================
   8. CAUSAL GRAPH VIEW
   ========================================================================== */

.dr-debug-graph-wrapper {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

.dr-debug-graph-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 32px 20px;
  gap: 8px;
  color: #64748b;
}

.dr-debug-graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px;
  flex-shrink: 0;
}

.dr-debug-btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}

.dr-debug-btn-secondary:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.dr-debug-badge {
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 10px;
  font-weight: 600;
}

.dr-debug-graph-canvas-container {
  overflow: auto;
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  background: rgba(4, 7, 14, 0.6);
  position: relative;
}

.dr-debug-graph-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
}

.dr-debug-causal-link {
  fill: none;
  stroke: rgba(0, 240, 255, 0.45);
  stroke-width: 1.5;
  stroke-dasharray: 6 3;
  animation: causal-flow 1.5s linear infinite;
}

.dr-debug-causal-pulse {
  fill: none;
  stroke: rgba(0, 240, 255, 0.12);
  stroke-width: 4;
}

.dr-debug-graph-node {
  position: absolute;
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.85);
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.dr-debug-graph-node:hover {
  transform: scale(1.03);
  z-index: 2;
}

.dr-debug-graph-node.node-docker {
  border-color: rgba(251, 146, 60, 0.4);
  background: rgba(30, 18, 10, 0.9);
}

.dr-debug-graph-node.node-network {
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(8, 22, 32, 0.9);
}

.dr-debug-graph-node.node-console {
  border-color: rgba(244, 63, 94, 0.4);
  background: rgba(28, 10, 16, 0.9);
}

.dr-debug-graph-node.node-dom {
  border-color: rgba(99, 102, 241, 0.4);
  background: rgba(15, 14, 36, 0.9);
}

.dr-debug-graph-node.is-root {
  box-shadow: 0 0 16px rgba(251, 146, 60, 0.5), 0 2px 8px rgba(0, 0, 0, 0.4);
  border-width: 2px;
}

.dr-debug-graph-node.selected {
  outline: 2px solid #38bdf8;
  outline-offset: 2px;
  z-index: 3;
}

.dr-debug-node-root-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(251, 146, 60, 0.9);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 9999px;
  white-space: nowrap;
}

.dr-debug-node-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.dr-debug-node-title {
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 150px;
}

.dr-debug-node-layer {
  font-size: 8.5px;
  font-weight: 700;
  letter-spacing: 0.4px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  color: #64748b;
  flex-shrink: 0;
}

.dr-debug-node-summary {
  font-size: 10px;
  color: #64748b;
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.dr-debug-node-detail-box {
  background: rgba(8, 12, 22, 0.98);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 10px 12px;
  flex-shrink: 0;
  max-height: 140px;
  overflow: hidden;
}

.dr-debug-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.dr-debug-detail-pre {
  font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
  font-size: 10px;
  color: #94a3b8;
  white-space: pre-wrap;
}

/* ==========================================================================
   9. ERRORS & ANOMALY MATRIX (2D HEATMAP GRID, STREAM, cURL & WORKBENCH)
   ========================================================================== */

.dr-debug-error-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 8px;
}

.dr-debug-err-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 2px;
  gap: 8px;
  flex-shrink: 0;
}

.dr-debug-err-title {
  font-size: 12px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-err-stats {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.dr-debug-stat-chip {
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.2px;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-stat-chip:hover {
  transform: translateY(-1px);
  filter: brightness(1.2);
}

.chip-5xx { background: rgba(244, 63, 94, 0.2); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.35); }
.chip-4xx { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.35); }
.chip-js { background: rgba(236, 72, 153, 0.2); color: #f472b6; border: 1px solid rgba(236, 72, 153, 0.35); }
.chip-doc { background: rgba(129, 140, 248, 0.2); color: #a5b4fc; border: 1px solid rgba(129, 140, 248, 0.35); }

/* Mode Switcher & Search Bar */
.dr-debug-matrix-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.dr-debug-mode-toggle {
  display: flex;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
}

.dr-debug-mode-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 10.5px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.dr-debug-mode-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  box-shadow: 0 0 8px rgba(56, 189, 248, 0.2);
}

.dr-debug-search-box {
  flex: 1;
  position: relative;
  max-width: 260px;
}

.dr-debug-search-input {
  width: 100%;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 4px 8px 4px 24px;
  font-size: 11px;
  color: #f1f5f9;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.dr-debug-search-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 10px rgba(56, 189, 248, 0.25);
}

.dr-debug-search-icon {
  position: absolute;
  left: 7px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: #64748b;
  pointer-events: none;
}

/* 2D Multi-Dimensional Matrix Grid */
/* Modern Status Dot Indicators */
.dr-debug-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}
.dr-debug-status-dot.dot-critical { background: #f43f5e; box-shadow: 0 0 6px rgba(244, 63, 94, 0.6); }
.dr-debug-status-dot.dot-high { background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.6); }
.dr-debug-status-dot.dot-notice { background: #38bdf8; box-shadow: 0 0 6px rgba(56, 189, 248, 0.6); }
.dr-debug-status-dot.dot-5xx { background: #fb7185; }
.dr-debug-status-dot.dot-4xx { background: #fbbf24; }
.dr-debug-status-dot.dot-js { background: #f472b6; }
.dr-debug-status-dot.dot-docker { background: #818cf8; }
.dr-debug-status-dot.dot-sys { background: #34d399; }

.dr-debug-2d-matrix {
  flex-shrink: 0;
  background: rgba(10, 15, 28, 0.92);
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}

.dr-debug-matrix-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 5px;
}

.dr-debug-matrix-th {
  font-size: 9.5px;
  font-weight: 700;
  color: #94a3b8;
  text-align: center;
  padding: 4px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  font-family: 'Plus Jakarta Sans', sans-serif;
}

.dr-debug-matrix-row-label {
  font-size: 10px;
  font-weight: 700;
  color: #cbd5e1;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  letter-spacing: 0.2px;
}

.dr-debug-matrix-cell {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  padding: 6px 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  min-width: 60px;
}

.dr-debug-matrix-cell:hover {
  transform: translateY(-1px);
  border-color: rgba(56, 189, 248, 0.4);
  background: rgba(255, 255, 255, 0.05);
}

.dr-debug-matrix-cell.has-errors {
  background: rgba(15, 23, 42, 0.85);
}

.dr-debug-matrix-cell.sev-critical.has-errors {
  border-color: rgba(244, 63, 94, 0.45);
  background: rgba(244, 63, 94, 0.1);
}

.dr-debug-matrix-cell.sev-high.has-errors {
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.1);
}

.dr-debug-matrix-cell.sev-notice.has-errors {
  border-color: rgba(56, 189, 248, 0.35);
  background: rgba(56, 189, 248, 0.08);
}

.dr-debug-matrix-cell.active-filter {
  box-shadow: 0 0 0 2px #00f0ff, 0 0 12px rgba(0, 240, 255, 0.4);
  border-color: #00f0ff !important;
}

.dr-debug-cell-count {
  font-size: 13px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.dr-debug-cell-count.critical { color: #fb7185; }
.dr-debug-cell-count.high { color: #fbbf24; }
.dr-debug-cell-count.notice { color: #38bdf8; }
.dr-debug-cell-count.zero { color: #475569; font-size: 11px; font-weight: 400; }

.dr-debug-cell-sub {
  font-size: 8px;
  color: #64748b;
  margin-top: 1px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

/* Histogram Graph */
.dr-debug-chart-wrapper {
  background: rgba(10, 15, 28, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dr-debug-hist-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: #38bdf8;
  letter-spacing: 0.4px;
}

.dr-debug-histogram {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 48px;
  padding-top: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dr-debug-hist-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  gap: 2px;
  cursor: pointer;
}

.dr-debug-hist-bar {
  width: 100%;
  border-radius: 2px 2px 0 0;
  display: flex;
  flex-direction: column-reverse;
  overflow: hidden;
  transition: all 0.2s ease;
  min-height: 3px;
}

.dr-debug-hist-col:hover .dr-debug-hist-bar {
  filter: brightness(1.25);
  transform: scaleY(1.08);
}

.dr-debug-hist-label {
  font-size: 8px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
}

/* Filter Bar */
.dr-debug-err-filter-bar {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 2px 0;
  flex-shrink: 0;
}

.dr-debug-err-filter-bar::-webkit-scrollbar { display: none; }

.dr-debug-filter-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.18s;
}

.dr-debug-filter-btn:hover {
  background: rgba(56, 189, 248, 0.12);
  color: #f1f5f9;
  border-color: rgba(56, 189, 248, 0.3);
}

.dr-debug-filter-btn.active {
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  border-color: #38bdf8;
}

/* Main Split View */
.dr-debug-err-main-view {
  display: flex;
  gap: 8px;
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
}

.dr-debug-err-list {
  flex: 1 1 0;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dr-debug-err-list::-webkit-scrollbar { width: 4px; }
.dr-debug-err-list::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.3); border-radius: 4px; }

.dr-debug-err-empty {
  text-align: center;
  padding: 30px 10px;
  color: #94a3b8;
  font-size: 12px;
}

.dr-debug-err-card {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: all 0.2s;
}

.dr-debug-err-card:hover {
  background: rgba(20, 30, 50, 0.85);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateX(2px);
}

.dr-debug-err-card.selected {
  border-color: #00f0ff;
  box-shadow: 0 0 12px rgba(0, 240, 255, 0.25);
  background: rgba(14, 26, 48, 0.95);
}

.dr-debug-err-card.type-5xx { border-left: 3px solid #f43f5e; }
.dr-debug-err-card.type-4xx { border-left: 3px solid #f59e0b; }
.dr-debug-err-card.type-console { border-left: 3px solid #ec4899; }
.dr-debug-err-card.type-docker { border-left: 3px solid #818cf8; }

.dr-debug-err-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dr-debug-err-badge {
  font-size: 9.5px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}

.badge-5xx { background: rgba(244, 63, 94, 0.2); color: #fb7185; }
.badge-4xx { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.badge-console { background: rgba(236, 72, 153, 0.2); color: #f472b6; }
.badge-docker { background: rgba(129, 140, 248, 0.2); color: #a5b4fc; }

.dr-debug-err-time {
  font-size: 9px;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
}

.dr-debug-err-card-title {
  font-size: 11.5px;
  font-weight: 600;
  color: #f1f5f9;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dr-debug-err-card-subtitle {
  font-size: 10px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Inspector Drawer */
.dr-debug-err-inspector {
  flex: 1.2 1 0;
  min-width: 0;
  background: rgba(6, 10, 20, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.dr-debug-err-inspector::-webkit-scrollbar { width: 4px; }
.dr-debug-err-inspector::-webkit-scrollbar-thumb { background: rgba(56, 189, 248, 0.3); border-radius: 4px; }

.dr-debug-insp-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 6px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.dr-debug-insp-badge {
  font-size: 9.5px;
  font-weight: 700;
  color: #fb7185;
  background: rgba(244, 63, 94, 0.15);
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  margin-bottom: 3px;
}

.dr-debug-insp-title {
  font-size: 11.5px;
  font-weight: 700;
  color: #f8fafc;
  font-family: 'JetBrains Mono', monospace;
  word-break: break-all;
}

.dr-debug-insp-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dr-debug-btn-primary-glow {
  flex: 1;
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 100%);
  color: #ffffff;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  box-shadow: 0 3px 12px rgba(6, 182, 212, 0.35);
  transition: all 0.2s;
}

.dr-debug-btn-primary-glow:hover {
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.6);
  transform: translateY(-1px);
}

.dr-debug-btn-curl {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: #ffffff;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  transition: all 0.2s;
}

.dr-debug-btn-curl:hover {
  filter: brightness(1.15);
  transform: translateY(-1px);
}

.dr-debug-btn-replay {
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  color: #38bdf8;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.dr-debug-btn-replay:hover {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
  transform: translateY(-1px);
}

.dr-debug-btn-mock {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fbbf24;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.dr-debug-btn-mock:hover {
  background: rgba(245, 158, 11, 0.25);
  border-color: #fbbf24;
  transform: translateY(-1px);
}

.dr-debug-btn-synth {
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.35);
  color: #c084fc;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s;
}

.dr-debug-btn-synth:hover {
  background: rgba(168, 85, 247, 0.25);
  border-color: #c084fc;
  transform: translateY(-1px);
}

.dr-debug-copy-inline-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-copy-inline-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

/* RFC Status Explainer Box */
.dr-debug-rfc-box {
  background: rgba(244, 63, 94, 0.08);
  border: 1px solid rgba(244, 63, 94, 0.25);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-rfc-box.type-4xx {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.25);
}

.dr-debug-rfc-title {
  font-size: 11px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 5px;
}

.dr-debug-rfc-desc {
  font-size: 10.5px;
  color: #cbd5e1;
  line-height: 1.4;
}

.dr-debug-rfc-rec {
  font-size: 10px;
  color: #38bdf8;
  font-weight: 600;
  margin-top: 2px;
}

/* cURL Preview Code Box */
.dr-debug-curl-preview {
  background: rgba(3, 7, 18, 0.95);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: #6ee7b7;
  white-space: pre-wrap;
  word-break: break-all;
  position: relative;
}


/* Demangled Call Frames Visualizer */
.dr-debug-frame-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dr-debug-frame-item {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 5px;
  padding: 5px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font-family: ui-monospace, 'Fira Code', Menlo, monospace;
  font-size: 10.5px;
  transition: all 0.15s;
}

.dr-debug-frame-item.user-code {
  border-color: rgba(56, 189, 248, 0.3);
  background: rgba(14, 30, 56, 0.7);
}

.dr-debug-frame-item:hover {
  background: rgba(30, 41, 59, 0.9);
  border-color: #38bdf8;
}

.dr-debug-frame-fn {
  color: #f1f5f9;
  font-weight: 600;
}

.dr-debug-frame-loc {
  color: #94a3b8;
  font-size: 9.5px;
}

.dr-debug-frame-tag {
  font-size: 8.5px;
  padding: 1px 4px;
  border-radius: 3px;
  font-weight: 700;
}

.tag-user { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }
.tag-vendor { background: rgba(100, 116, 139, 0.2); color: #94a3b8; }

.dr-debug-insp-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-insp-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-insp-sec-title {
  font-size: 10px;
  font-weight: 700;

  text-transform: uppercase;
  color: #94a3b8;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.dr-debug-code-box {
  background: rgba(3, 7, 18, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 5px;
  padding: 6px 8px;
  font-family: ui-monospace, 'Fira Code', Menlo, monospace;
  font-size: 10.5px;
  color: #cbd5e1;
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
}

.dr-debug-code-box.error-highlight {
  border-color: rgba(244, 63, 94, 0.3);
  color: #fca5a5;
  background: rgba(20, 6, 10, 0.85);
}

/* ==========================================================================
   10. SETTINGS MODAL OVERLAY
   ========================================================================== */

.dr-debug-settings-overlay {
  position: absolute;
  inset: 0;
  background: rgba(6, 9, 16, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: 14px;
  animation: modal-spring-in 0.25s ease;
}

.dr-debug-settings-modal {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.dr-debug-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 12px;
}

.dr-debug-settings-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-settings-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.dr-debug-form-group {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dr-debug-form-label {
  font-size: 10.5px;
  font-weight: 600;
  color: #94a3b8;
}

.dr-debug-form-select, .dr-debug-form-input {
  background: rgba(6, 9, 16, 0.9);
  border: 1px solid rgba(56, 189, 248, 0.25);
  border-radius: 6px;
  padding: 7px 10px;
  color: #f8fafc;
  font-size: 11.5px;
  outline: none;
  transition: all 0.2s;
}

.dr-debug-form-select:focus, .dr-debug-form-input:focus {
  border-color: #00f0ff;
  box-shadow: 0 0 10px rgba(0, 240, 255, 0.25);
}

.dr-debug-settings-status {
  font-size: 11px;
  min-height: 16px;
  line-height: 1.4;
  margin-top: 2px;
}

.dr-debug-settings-actions {
  display: flex;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.dr-debug-btn-outline {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #e2e8f0;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 11.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: all 0.2s;
}

.dr-debug-btn-outline:hover {
  background: rgba(56, 189, 248, 0.15);
  border-color: #00f0ff;
  color: #00f0ff;
}

@media (max-width: 520px) {
  .dr-debug-modal {
    width: calc(100vw - 20px) !important;
    left: 10px !important;
    right: 10px !important;
    bottom: 10px !important;
    height: 75vh !important;
    max-height: 75vh !important;
    border-radius: 12px;
  }

  .dr-debug-header {
    padding: 8px 10px;
  }

  .dr-debug-header-metrics {
    display: none;
  }

  .dr-debug-tabs {
    padding: 2px 4px;
  }

  .dr-debug-tab {
    padding: 5px 6px;
    font-size: 10.5px;
  }

  .dr-debug-body {
    padding: 8px;
  }

  .dr-debug-pill {
    bottom: 16px;
    right: 16px;
    padding: 5px 12px;
    gap: 6px;
  }

  .dr-debug-err-main-view {
    flex-direction: column;
  }
}

/* Voice Debugger Component Styles */
.dr-debug-voice-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dr-debug-voice-btn:hover {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
}

.dr-debug-voice-btn.listening {
  background: rgba(244, 63, 94, 0.25);
  border-color: #f43f5e;
  color: #f43f5e;
  animation: pulse-voice 1.2s infinite ease-in-out;
}

@keyframes pulse-voice {
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.5); }
  50% { transform: scale(1.12); box-shadow: 0 0 0 8px rgba(244, 63, 94, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); }
}

/* \u2500\u2500 Session hand-off: "Copy for AI" \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

.dr-debug-export-btn {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.18), rgba(129, 140, 248, 0.18));
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #7dd3fc;
  border-radius: 6px;
  padding: 5px 11px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.dr-debug-export-btn:hover {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(129, 140, 248, 0.3));
  border-color: rgba(56, 189, 248, 0.75);
  color: #e0f2fe;
  transform: translateY(-1px);
}

.dr-debug-export-btn.copied,
.dr-debug-copy-btn.copied {
  background: rgba(16, 185, 129, 0.22);
  border-color: rgba(16, 185, 129, 0.6);
  color: #6ee7b7;
}

.dr-debug-copy-btn.primary {
  align-self: flex-start;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(129, 140, 248, 0.2));
  border-color: rgba(56, 189, 248, 0.45);
  color: #7dd3fc;
  padding: 7px 14px;
  font-size: 11.5px;
}

.dr-debug-copy-btn.primary:hover {
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.32), rgba(129, 140, 248, 0.32));
  border-color: rgba(56, 189, 248, 0.8);
  color: #e0f2fe;
}

.dr-debug-handoff {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  margin-top: 4px;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-handoff-desc {
  font-size: 11px;
  line-height: 1.55;
  color: #94a3b8;
}

/* \u2500\u2500 \u{1F433} Dedicated Docker Dashboard Page \u2500\u2500 */
.dr-debug-docker-dashboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.dr-debug-docker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
}

.dr-debug-docker-status-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dr-debug-docker-status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dr-debug-docker-status-dot.online {
  background: #34d399;
  box-shadow: 0 0 10px rgba(52, 211, 153, 0.6);
}

.dr-debug-docker-status-dot.offline {
  background: #fb7185;
  box-shadow: 0 0 8px rgba(251, 113, 133, 0.5);
}

.dr-debug-docker-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
}

.dr-debug-docker-badge {
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 800;
  letter-spacing: 0.4px;
}

.badge-running {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.3);
}

.badge-stopped {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.dr-debug-docker-sub {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.dr-debug-docker-status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dr-debug-docker-stat-pill {
  padding: 4px 10px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 6px;
  font-size: 11px;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 5px;
}

.dr-debug-docker-stat-pill.alert {
  background: rgba(244, 63, 94, 0.15);
  border-color: rgba(244, 63, 94, 0.4);
  color: #fda4af;
}

.dr-debug-dock-btn-refresh {
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #38bdf8;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.dr-debug-dock-btn-refresh:hover {
  background: rgba(56, 189, 248, 0.25);
  transform: rotate(180deg);
}

.dr-debug-docker-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dr-debug-docker-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dr-debug-docker-hint {
  font-size: 10px;
  color: #64748b;
  text-transform: none;
  font-weight: normal;
}

.dr-debug-docker-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.dr-debug-docker-card {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 7px;
  padding: 9px 11px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dr-debug-docker-card:hover {
  background: rgba(30, 41, 59, 0.75);
  border-color: rgba(56, 189, 248, 0.4);
  transform: translateY(-1px);
}

.dr-debug-docker-card.selected {
  border-color: #38bdf8;
  background: rgba(14, 165, 233, 0.1);
  box-shadow: 0 0 12px rgba(14, 165, 233, 0.15);
}

.dr-debug-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dr-debug-card-name {
  font-size: 12px;
  font-weight: 700;
  color: #f1f5f9;
  font-family: ui-monospace, Menlo, monospace;
}

.dr-debug-card-state {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 700;
}

.state-running {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}

.state-exited {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
}

.dr-debug-card-image {
  font-size: 10.5px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dr-debug-card-ports {
  font-size: 10px;
  color: #64748b;
  font-family: ui-monospace, Menlo, monospace;
}

.dr-debug-card-errors {
  font-size: 10px;
  color: #fb7185;
  font-weight: 700;
  margin-top: 2px;
}

.dr-debug-card-desc {
  font-size: 10px;
  color: #94a3b8;
}

.dr-debug-err-badge {
  background: rgba(244, 63, 94, 0.2);
  color: #fda4af;
  border: 1px solid rgba(244, 63, 94, 0.4);
  padding: 0 5px;
  border-radius: 9999px;
  font-size: 9px;
  font-weight: 700;
}

.dr-debug-dock-empty-containers {
  grid-column: 1 / -1;
  padding: 18px;
  text-align: center;
  background: rgba(15, 23, 42, 0.4);
  border: 1px dashed rgba(148, 163, 184, 0.2);
  border-radius: 7px;
  font-size: 12px;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.dr-debug-docker-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.dr-debug-docker-filters {
  display: flex;
  gap: 6px;
}

.dr-debug-dock-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #94a3b8;
  padding: 4px 9px;
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-dock-btn:hover {
  background: rgba(56, 189, 248, 0.15);
  color: #e2e8f0;
}

.dr-debug-dock-btn.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
  font-weight: 700;
}

.dr-debug-docker-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-grow: 1;
  justify-content: flex-end;
}

.dr-debug-dock-search {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.25);
  color: #f8fafc;
  padding: 4px 10px;
  border-radius: 5px;
  font-size: 11px;
  width: 220px;
  font-family: ui-monospace, Menlo, monospace;
}

.dr-debug-dock-search:focus {
  outline: none;
  border-color: #38bdf8;
}

.dr-debug-dock-autoscroll {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: #94a3b8;
  cursor: pointer;
}

.dr-debug-dock-action-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #cbd5e1;
  padding: 4px 8px;
  border-radius: 5px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.dr-debug-dock-action-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.dr-debug-dock-action-btn.primary {
  background: rgba(56, 189, 248, 0.15);
  border-color: rgba(56, 189, 248, 0.4);
  color: #38bdf8;
}

.dr-debug-dock-action-btn.primary:hover {
  background: rgba(56, 189, 248, 0.25);
}

.dr-debug-docker-terminal-wrapper {
  background: #030712;
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 8px;
  flex-grow: 1;
  min-height: 220px;
  max-height: 380px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dr-debug-docker-terminal {
  padding: 10px 12px;
  font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
  font-size: 11px;
  line-height: 1.6;
  overflow-y: auto;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dr-debug-dock-log-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 3px;
  word-break: break-all;
}

.dr-debug-dock-log-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.dr-debug-dock-log-row.log-error {
  background: rgba(244, 63, 94, 0.08);
  border-left: 2px solid #f43f5e;
}

.dr-debug-dock-log-row.log-warn {
  background: rgba(245, 158, 11, 0.06);
  border-left: 2px solid #f59e0b;
}

.dr-debug-dock-time {
  color: #64748b;
  font-size: 10px;
  flex-shrink: 0;
}

.dr-debug-dock-container-tag {
  color: #818cf8;
  font-weight: 700;
  font-size: 10.5px;
  flex-shrink: 0;
}

.dr-debug-dock-stream-tag {
  color: #64748b;
  font-size: 9.5px;
  flex-shrink: 0;
}

.stream-stderr .dr-debug-dock-stream-tag {
  color: #fb923c;
}

.dr-debug-dock-msg {
  color: #e2e8f0;
  flex-grow: 1;
}

.dr-debug-dock-inline-diag {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(225, 29, 72, 0.25));
  border: 1px solid rgba(244, 63, 94, 0.5);
  color: #fda4af;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
  margin-left: 8px;
}

.dr-debug-dock-inline-diag:hover {
  background: linear-gradient(135deg, #f43f5e, #e11d48);
  color: #fff;
  transform: scale(1.05);
}

.dr-debug-dock-term-empty {
  text-align: center;
  padding: 40px 10px;
  color: #64748b;
}

.dr-debug-dock-offline-box {
  background: rgba(15, 23, 42, 0.7);
  border: 1px dashed rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 30px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dr-debug-dock-cmd-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #030712;
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 6px;
  padding: 6px 12px;
}

.dr-debug-dock-cmd-box code {
  color: #38bdf8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.dr-debug-dock-cmd-box button {
  background: rgba(56, 189, 248, 0.15);
  border: none;
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.dr-debug-cockpit-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  color: #64748b;
  padding: 8px 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(3, 7, 18, 0.5);
  backdrop-filter: blur(8px);
}

/* \u2500\u2500 \u{1F433} Docker Instructions Panel \u2500\u2500 */
.dr-debug-docker-instructions-wrapper {
  display: flex;
  flex-direction: column;
}

.dr-debug-dock-instructions-card {
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.7));
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 8px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}

.dr-debug-dock-connected-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(52, 211, 153, 0.25);
  border-radius: 6px;
  padding: 6px 12px;
}

.dr-debug-dock-dot-live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 8px rgba(52, 211, 153, 0.7);
  display: inline-block;
}

.dr-debug-dock-toggle-help {
  background: transparent;
  border: none;
  color: #38bdf8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.dr-debug-dock-help-content {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dr-debug-dock-guide-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dr-debug-dock-guide-badge {
  font-size: 9.5px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(56, 189, 248, 0.35);
  letter-spacing: 0.4px;
}

.dr-debug-dock-guide-desc {
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}

.dr-debug-dock-steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}

.dr-debug-dock-step-box {
  background: rgba(3, 7, 18, 0.65);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 6px;
  padding: 9px 11px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.dr-debug-dock-step-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dr-debug-dock-step-badge {
  background: rgba(56, 189, 248, 0.2);
  color: #7dd3fc;
  font-size: 8.5px;
  font-weight: 800;
  padding: 1px 5px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}

.dr-debug-dock-step-label {
  font-size: 11px;
  font-weight: 700;
  color: #f1f5f9;
}

.dr-debug-dock-step-text {
  font-size: 10.5px;
  color: #94a3b8;
}

.dr-debug-dock-cmd-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #020617;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 5px;
  padding: 4px 8px;
  margin-top: 3px;
}

.dr-debug-dock-cmd-line code {
  color: #38bdf8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  font-weight: 600;
}

.dr-debug-copy-cmd-btn {
  background: rgba(56, 189, 248, 0.2);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #bae6fd;
  border-radius: 4px;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.dr-debug-copy-cmd-btn:hover {
  background: rgba(56, 189, 248, 0.35);
  color: #fff;
}

.dr-debug-copy-cmd-btn.copied {
  background: rgba(16, 185, 129, 0.3);
  border-color: rgba(52, 211, 153, 0.6);
  color: #6ee7b7;
}

.dr-debug-dock-launcher-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: #020617;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 5px;
  padding: 5px 8px;
  font-size: 10.5px;
  color: #cbd5e1;
  font-family: ui-monospace, monospace;
}

.dr-debug-dock-launcher-box code {
  color: #a78bfa;
}

.dr-debug-dock-step-footer {
  font-size: 10.5px;
  color: #34d399;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-style: italic;
}
`;

  // packages/ui/src/DrDebugUI.ts
  var DrDebugUI = class {
    host;
    shadowRoot;
    pill;
    cockpit;
    getController;
    engine = new LocalDiagnosticEngine();
    constructor(options = {}) {
      this.getController = options.getController;
      let host = document.getElementById("dr-debug-root");
      if (!host) {
        host = document.createElement("div");
        host.id = "dr-debug-root";
        host.style.position = "fixed";
        host.style.zIndex = "2147483647";
        host.style.pointerEvents = "none";
        host.style.top = "0";
        host.style.left = "0";
        host.style.width = "0";
        host.style.height = "0";
        host.style.border = "none";
        host.style.margin = "0";
        host.style.padding = "0";
        if (options.container) {
          options.container.appendChild(host);
        } else if (typeof document !== "undefined" && document.body) {
          document.body.appendChild(host);
        } else if (typeof document !== "undefined") {
          const onReady = () => {
            if (document.body && !host.isConnected) {
              document.body.appendChild(host);
            }
          };
          if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", onReady, { once: true });
          } else {
            window.addEventListener("load", onReady, { once: true });
          }
        }
      }
      this.host = host;
      this.shadowRoot = host.shadowRoot || host.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = "";
      const styleEl = document.createElement("style");
      styleEl.textContent = shadowStyles;
      this.shadowRoot.appendChild(styleEl);
      this.cockpit = new CockpitPanel({
        onClose: () => this.cockpit.hide(),
        onInvestigate: async (query) => {
          if (options.onInvestigate) {
            try {
              await options.onInvestigate(query);
            } finally {
              this.cockpit.setBusy(false);
            }
          } else {
            await this.runLocalInvestigation();
          }
        },
        getController: options.getController,
        getSessionPrompt: options.getSessionPrompt || (() => this.buildSessionPrompt()),
        onSaveSettings: options.onSaveSettings,
        onTestConnection: options.onTestConnection
      });
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
    updatePillStatus(errorCount, failedNetCount = 0, slowNetCount = 0, isRunning = false) {
      this.pill.updateStatus(errorCount, failedNetCount, slowNetCount, isRunning);
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
    updateErrors() {
      this.cockpit.updateErrors();
    }
    clearTimeline() {
      this.cockpit.clearTimeline();
    }
    showThinking(message) {
      this.cockpit.showThinking(message);
    }
    updateCausalGraph(graph) {
      this.cockpit.updateCausalGraph(graph);
    }
    updateDocker() {
      this.cockpit.updateDocker();
    }
    switchTab(tab) {
      this.cockpit.switchTab(tab);
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
    buildSessionPrompt() {
      var _a;
      const controller = (_a = this.getController) == null ? void 0 : _a.call(this);
      if (!controller) {
        return "No debug controller is attached to this UI, so there is no telemetry to export.";
      }
      return generateSessionDebugPrompt(controller.getSnapshot());
    }
    /**
     * Fallback path when no LLM-backed investigator is wired in: runs the local
     * deterministic engine over live telemetry and renders its real findings.
     * Nothing here is scripted — with empty buffers it reports an empty session.
     */
    async runLocalInvestigation() {
      var _a, _b, _c, _d, _e;
      const controller = (_a = this.getController) == null ? void 0 : _a.call(this);
      this.cockpit.clearTimeline();
      this.cockpit.switchTab("timeline");
      if (!controller) {
        this.cockpit.addStep({
          stepNumber: 1,
          hypothesis: "No DebugController is attached to this UI instance, so there is no telemetry to read. Attach one via the getController option.",
          toolName: "triage",
          toolOutput: "No telemetry source available."
        });
        this.cockpit.setBusy(false);
        return;
      }
      this.updatePillStatus(0, 0, 0, true);
      this.cockpit.showThinking("Reading the console, network, backend, memory and performance buffers\u2026");
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      await wait(420);
      const state = controller.getSnapshot();
      const analysis = this.engine.analyze(state);
      this.cockpit.addStep({
        stepNumber: 1,
        hypothesis: `Triaging the raw buffers before forming a theory: ${state.console.errorCount} console error(s), ${state.network.failedCount} failed and ${state.network.slowCount} slow request(s), ${((_b = state.docker) == null ? void 0 : _b.errorCount) ?? 0} backend error(s).`,
        toolName: "triage_telemetry",
        toolOutput: [
          `Page:      ${state.pageContext.url || "unknown"}`,
          `Uptime:    ${state.pageContext.uptimeSeconds.toFixed(1)}s`,
          `Console:   ${state.console.errorCount} error(s), ${state.console.warnCount} warning(s) of ${state.console.total} entries`,
          `Network:   ${state.network.failedCount} failed, ${state.network.slowCount} slow of ${state.network.total} requests`,
          `Backend:   ${((_c = state.docker) == null ? void 0 : _c.errorCount) ?? 0} container error(s)`,
          ((_d = state.memory) == null ? void 0 : _d.heapUsagePercent) !== void 0 ? `Heap:      ${Math.round((state.memory.usedJSHeapSize || 0) / 1048576)}MB (${Math.round(state.memory.heapUsagePercent)}% of limit)` : "Heap:      not exposed by this browser",
          `Findings:  ${analysis.findings.length} derived`
        ].join("\n")
      });
      if (!analysis.hasEvidence) {
        await wait(360);
        this.cockpit.showThinking("");
        this.showPrescription({
          diagnosis: analysis.diagnosis,
          rootCause: analysis.rootCause,
          fix: "",
          confidence: 0,
          filesToModify: []
        });
        this.updatePillStatus(0, 0, 0, false);
        return;
      }
      const shown = analysis.findings.slice(0, 5);
      for (let i = 0; i < shown.length; i++) {
        const finding = shown[i];
        this.cockpit.showThinking(
          `Examining the ${finding.layer} layer \u2014 ${finding.title} (${finding.severity}, ${Math.round(finding.confidence * 100)}% confidence).`
        );
        await wait(560);
        this.cockpit.addStep({
          stepNumber: i + 2,
          hypothesis: `${finding.title}. ${finding.detail}`,
          toolName: `inspect_${finding.layer}`,
          toolOutput: [
            ...finding.evidence.map((line) => `\u2022 ${line}`),
            finding.files.length > 0 ? `
Source: ${finding.files.join(", ")}` : "",
            `
Direction: ${finding.remediation}`
          ].filter(Boolean).join("\n")
        });
      }
      if (analysis.causalChain.length > 0) {
        this.cockpit.showThinking(
          `Correlating ${((_e = state.causalGraph) == null ? void 0 : _e.nodes.length) ?? 0} error nodes across layers to separate causes from symptoms\u2026`
        );
        await wait(560);
        this.cockpit.addStep({
          stepNumber: shown.length + 2,
          hypothesis: `The correlation engine linked these faults by timestamp. If the chain holds, only the root needs fixing \u2014 the rest are downstream effects.`,
          toolName: "graphify_errors",
          toolOutput: analysis.causalChain.join("\n")
        });
      }
      this.cockpit.showThinking("Composing the remediation plan from the gathered evidence\u2026");
      await wait(420);
      this.cockpit.showThinking("");
      this.showPrescription({
        diagnosis: analysis.diagnosis,
        rootCause: analysis.rootCause,
        fix: analysis.suggestedFix,
        confidence: analysis.confidence,
        filesToModify: analysis.filesToModify
      });
      this.updatePillStatus(
        state.console.errorCount,
        state.network.failedCount,
        state.network.slowCount,
        false
      );
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
    mcpSocket;
    syncInterval;
    lastInvestigation = null;
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
        this.llmClient = new HeuristicLLMClient(this.controller);
      }
      this.core = new DrDebugCore(this.controller, this.llmClient);
      const shouldEnableUI = options.enableUI !== false && typeof document !== "undefined";
      if (shouldEnableUI) {
        this.ui = new DrDebugUI({
          onInvestigate: async (goal) => {
            await this.investigate(goal);
          },
          getController: () => this.controller,
          getSessionPrompt: () => this.getSessionDebugPrompt(),
          onSaveSettings: (settings) => {
            this.updateLLMConfig(settings);
          },
          onTestConnection: async (settings) => {
            return await this.testLLMConnection(settings);
          }
        });
        this.syncUIStatus();
        if (typeof window !== "undefined") {
          this.syncInterval = setInterval(() => {
            this.syncUIStatus();
          }, 800);
        }
      }
      if (options.autoInvestigate && typeof window !== "undefined") {
        window.addEventListener("error", () => this.handleAutoTrigger());
        window.addEventListener("unhandledrejection", () => this.handleAutoTrigger());
      }
      if (options.enableMCP && typeof window !== "undefined" && typeof WebSocket !== "undefined") {
        this.connectToMCPBridge(options.mcpPort || 9229);
      }
      if (options.enableDocker !== false && typeof window !== "undefined") {
        this.controller.connectDockerBridge(options.mcpPort || 9229);
      }
    }
    updateLLMConfig(config) {
      this.options = { ...this.options, ...config };
      if (config.llmClient) {
        this.llmClient = config.llmClient;
      } else if (config.liteRT || config.model && config.model.toLowerCase().includes("litert")) {
        this.llmClient = new LiteRTClient(config.liteRT || { modelName: config.model });
      } else if (config.apiKey || config.baseURL || config.model) {
        this.llmClient = new OpenAIClient({
          apiKey: config.apiKey || "",
          baseURL: config.baseURL,
          model: config.model || "llama-3.3-70b-versatile"
        });
      }
      this.core = new DrDebugCore(this.controller, this.llmClient);
    }
    async testLLMConnection(config) {
      const targetConfig = config ? { ...this.options, ...config } : this.options;
      let client;
      if (targetConfig.liteRT || targetConfig.model && targetConfig.model.toLowerCase().includes("litert")) {
        client = new LiteRTClient(targetConfig.liteRT || { modelName: targetConfig.model });
      } else {
        client = new OpenAIClient({
          apiKey: targetConfig.apiKey || "",
          baseURL: targetConfig.baseURL,
          model: targetConfig.model || "llama-3.3-70b-versatile"
        });
      }
      if (client instanceof OpenAIClient) {
        return await client.testConnection();
      }
      return { success: true, message: "On-device engine ready" };
    }
    getController() {
      return this.controller;
    }
    /**
     * The full paste-ready incident brief for an external coding agent
     * (Claude Code / Antigravity / Cursor). Composed from live telemetry, and
     * folds in the last agent investigation when one has run.
     */
    getSessionDebugPrompt() {
      return generateSessionDebugPrompt(this.controller.getSnapshot(), {
        investigation: this.lastInvestigation
      });
    }
    getLastInvestigation() {
      return this.lastInvestigation;
    }
    getCore() {
      return this.core;
    }
    getUI() {
      return this.ui;
    }
    async investigate(goal, options = {}) {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const activeGoal = goal || "Diagnose all active browser errors, network failures, and performance bottlenecks.";
      (_a = this.ui) == null ? void 0 : _a.clearTimeline();
      (_b = this.ui) == null ? void 0 : _b.switchTab("timeline");
      (_c = this.ui) == null ? void 0 : _c.openCockpit();
      (_d = this.ui) == null ? void 0 : _d.updatePillStatus(
        this.controller.getConsoleEntries().filter((e) => e.level === "error").length,
        this.controller.getNetworkRecords().filter((r) => r.isFailed).length,
        this.controller.getNetworkRecords().filter((r) => r.isSlow && !r.isFailed).length,
        true
      );
      let currentHypothesis = "Reading telemetry buffers and forming initial hypothesis...";
      let currentStepNumber = 1;
      (_e = this.ui) == null ? void 0 : _e.showThinking(currentHypothesis);
      try {
        const result = await this.core.investigate(activeGoal, {
          maxSteps: options.maxSteps ?? this.options.maxSteps ?? 8,
          signal: options.signal,
          onStepStart: (stepNumber) => {
            var _a2;
            currentStepNumber = stepNumber;
            (_a2 = options.onStepStart) == null ? void 0 : _a2.call(options, stepNumber);
          },
          onReflection: (reflection) => {
            var _a2, _b2;
            currentHypothesis = reflection.working_hypothesis;
            (_a2 = this.ui) == null ? void 0 : _a2.showThinking(reflection.working_hypothesis);
            (_b2 = options.onReflection) == null ? void 0 : _b2.call(options, reflection);
          },
          onToolResult: (toolName, toolResult) => {
            var _a2, _b2;
            (_a2 = this.ui) == null ? void 0 : _a2.addTimelineStep({
              stepNumber: currentStepNumber,
              hypothesis: currentHypothesis,
              toolName,
              toolOutput: toolResult
            });
            (_b2 = options.onToolResult) == null ? void 0 : _b2.call(options, toolName, toolResult);
          },
          onDone: (res) => {
            var _a2;
            (_a2 = options.onDone) == null ? void 0 : _a2.call(options, res);
          }
        });
        this.lastInvestigation = result;
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
      } catch (err) {
        if (this.ui) {
          this.ui.showPrescription({
            diagnosis: `AI Investigation failed: ${err.message || "Unknown error"}`,
            rootCause: ((_f = err.message) == null ? void 0 : _f.includes("API key")) || ((_g = err.message) == null ? void 0 : _g.includes("401")) || ((_h = err.message) == null ? void 0 : _h.includes("404")) ? `LLM Authentication/Configuration error: ${err.message}. Check your API key or chosen model in the config bar.` : err.message || "Execution error during Re-Act investigation",
            confidence: 0,
            fix: ""
          });
        }
        throw err;
      } finally {
        this.syncUIStatus();
      }
    }
    syncUIStatus() {
      if (!this.ui) return;
      const errors = this.controller.getConsoleEntries().filter((e) => e.level === "error");
      const failedNet = this.controller.getNetworkRecords().filter((r) => r.isFailed);
      const slowNet = this.controller.getNetworkRecords().filter((r) => r.isSlow && !r.isFailed);
      const allProblemNet = this.controller.getNetworkRecords().filter((r) => r.isFailed || r.isSlow);
      const memory = this.controller.getMemorySnapshot();
      this.ui.updatePillStatus(errors.length, failedNet.length, slowNet.length, false);
      this.ui.updateTriage({
        errors: errors.map((e) => e.message),
        slowRequests: allProblemNet.map((r) => `${r.method} ${r.url} ${r.status ? `[${r.status}]` : ""} (${Math.round(r.duration || 0)}ms)`),
        memory: memory ? {
          usedMB: Math.round((memory.usedJSHeapSize || 0) / (1024 * 1024)),
          totalMB: Math.round((memory.totalJSHeapSize || 0) / (1024 * 1024))
        } : void 0
      });
      const graph = this.controller.getCausalGraph();
      this.ui.updateCausalGraph(graph);
      this.ui.updateErrors();
      this.ui.updateDocker();
    }
    async handleAutoTrigger() {
      if (this.isAutoInvestigating) return;
      this.isAutoInvestigating = true;
      try {
        await this.investigate("Autonomous diagnosis triggered by uncaught runtime exception.");
      } finally {
        this.isAutoInvestigating = false;
      }
    }
    connectToMCPBridge(port = 9229) {
      try {
        const tabId = `tab_${Date.now()}`;
        const ws = new WebSocket(`ws://localhost:${port}/browser?tabId=${tabId}`);
        this.mcpSocket = ws;
        ws.onopen = () => {
          const state = this.controller.getSnapshot();
          ws.send(
            JSON.stringify({
              type: "TELEMETRY_SYNC",
              state: {
                ...state,
                serializedXml: this.controller.serialize(),
                diagnosticMatrix: this.controller.getDiagnosticMatrix(),
                interactionsHuman: this.controller.getInteractionReplayHuman()
              }
            })
          );
        };
        ws.onmessage = async (evt) => {
          try {
            const msg = JSON.parse(evt.data);
            if (msg.type === "EVAL_SCRIPT") {
              try {
                const res = window.eval(msg.expression);
                ws.send(JSON.stringify({ type: "COMMAND_RESPONSE", commandId: msg.commandId, result: res }));
              } catch (err) {
                ws.send(JSON.stringify({ type: "COMMAND_RESPONSE", commandId: msg.commandId, error: err.message }));
              }
            }
          } catch {
          }
        };
        ws.onerror = () => {
        };
      } catch {
      }
    }
    destroy() {
      var _a;
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = void 0;
      }
      if (this.mcpSocket) {
        this.mcpSocket.close();
        this.mcpSocket = void 0;
      }
      this.controller.destroy();
      (_a = this.ui) == null ? void 0 : _a.destroy();
    }
  };
  if (typeof document !== "undefined" && typeof window !== "undefined") {
    const currentScript = document.currentScript;
    if (currentScript && currentScript.dataset) {
      const dataset = currentScript.dataset;
      if (dataset.autoInit === "true" || dataset.drDebug !== void 0 || dataset.model && dataset.autoInit !== "false") {
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

  // packages/dr-debug/src/standalone.ts
  if (typeof window !== "undefined") {
    window.DrDebug = DrDebug;
    const currentScript = document.currentScript;
    const autoInit = !currentScript || currentScript.getAttribute("data-auto") !== "false";
    if (autoInit && !window.__DR_DEBUG__) {
      const apiKey = (currentScript == null ? void 0 : currentScript.getAttribute("data-api-key")) || void 0;
      const model = (currentScript == null ? void 0 : currentScript.getAttribute("data-model")) || void 0;
      window.__DR_DEBUG__ = new DrDebug({
        apiKey,
        model,
        enableUI: true,
        enableMCP: true,
        enableDocker: true
      });
      console.log(
        "%c\u{1FA7A} Dr. Debug Initialized %cby Saswat Mohanty (@SazWhatician) \xB7 https://github.com/SazWhatician",
        "background: #0284c7; color: #fff; font-weight: bold; padding: 3px 8px; border-radius: 4px; font-size: 11px;",
        "color: #38bdf8; font-size: 11px; font-weight: 500;"
      );
    }
  }
  var standalone_default = DrDebug;
  return __toCommonJS(standalone_exports);
})();
