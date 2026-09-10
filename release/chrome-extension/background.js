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
    const isGroqKey = this.apiKey.startsWith("gsk_");
    const resolvedBaseURL = config.baseURL || (isGroqKey ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1");
    this.baseURL = resolvedBaseURL.replace(/\/+$/, "");
    const isGroq = isGroqKey || this.baseURL.includes("groq.com");
    let resolvedModel = config.model;
    if (isGroq) {
      if (!resolvedModel || resolvedModel === "gpt-4o" || resolvedModel === "llama-3.3-70b-versatile") {
        resolvedModel = "openai/gpt-oss-120b";
      }
    } else if (resolvedModel === "llama-3.3-70b-versatile") {
      resolvedModel = "openai/gpt-oss-120b";
    }
    this.model = resolvedModel || "gpt-4o";
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
          let errorText = "";
          try {
            const errJson = await response.json();
            errorText = errJson?.error?.message || JSON.stringify(errJson);
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
      } catch (err) {
        if (attempt >= maxRetries || err.name === "AbortError" || err.message?.includes("401") || err.message?.includes("404")) {
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

// packages/extension/src/background.ts
var PROVIDERS = {
  groq: { baseURL: "https://api.groq.com/openai/v1", model: "openai/gpt-oss-120b" },
  openai: { baseURL: "https://api.openai.com/v1", model: "gpt-4o" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-flash-latest" }
};
var DockerStreamManager = class {
  active = false;
  abortController = null;
  retryTimer = null;
  port = 9229;
  containers = [];
  recentLogs = [];
  lastStatus = {
    connected: false,
    daemonRunning: false
  };
  start() {
    if (this.active) return;
    this.active = true;
    this.connect();
  }
  stop() {
    this.active = false;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
  getState() {
    return {
      type: "INIT",
      status: this.lastStatus,
      containers: this.containers,
      recentLogs: this.recentLogs
    };
  }
  async proxyFetch(endpoint, params) {
    try {
      let url = `http://localhost:${this.port}${endpoint}`;
      if (params && typeof params === "object") {
        const sp = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== void 0 && v !== null) sp.set(k, String(v));
        }
        const qs = sp.toString();
        if (qs) url += `?${qs}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      return { error: err?.message || "Proxy fetch failed" };
    }
    return null;
  }
  async connect() {
    if (!this.active) return;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.abortController = new AbortController();
    try {
      const statusRes = await fetch(`http://localhost:${this.port}/docker/status`, {
        signal: AbortSignal.timeout(3e3)
      }).catch(() => null);
      if (!statusRes || !statusRes.ok) {
        this.lastStatus = {
          connected: false,
          daemonRunning: false,
          error: "Docker bridge service offline on port " + this.port
        };
        this.broadcast({
          type: "STATUS",
          connected: false,
          daemonRunning: false,
          error: this.lastStatus.error
        });
        this.scheduleRetry(4e3);
        return;
      }
      const statusData = await statusRes.json().catch(() => ({}));
      this.lastStatus = {
        connected: true,
        daemonRunning: statusData.daemonRunning ?? true
      };
      const res = await fetch(`http://localhost:${this.port}/docker/stream`, {
        headers: { Accept: "text/event-stream" },
        signal: this.abortController.signal
      });
      if (!res.ok || !res.body) {
        this.scheduleRetry(5e3);
        return;
      }
      this.broadcast({
        type: "STATUS",
        connected: true,
        daemonRunning: this.lastStatus.daemonRunning
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (this.active) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("data:")) {
            const jsonStr = trimmed.slice(5).trim();
            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "INIT") {
                this.lastStatus = {
                  connected: true,
                  daemonRunning: data.status?.daemonRunning ?? true
                };
                this.containers = data.containers || [];
                this.recentLogs = data.recentLogs || [];
              } else if (data.type === "CONTAINERS") {
                this.containers = data.containers || [];
              } else if (data.type === "LOG" && data.entry) {
                if (this.recentLogs.length >= 100) this.recentLogs.shift();
                this.recentLogs.push(data.entry);
              }
              this.broadcast(data);
            } catch {
            }
          }
        }
      }
      this.scheduleRetry(3e3);
    } catch (err) {
      if (err?.name === "AbortError") return;
      this.lastStatus = {
        connected: false,
        daemonRunning: false,
        error: err?.message || "Disconnected from Docker daemon"
      };
      this.broadcast({
        type: "STATUS",
        connected: false,
        daemonRunning: false,
        error: this.lastStatus.error
      });
      this.scheduleRetry(5e3);
    }
  }
  scheduleRetry(delayMs) {
    if (!this.active || this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delayMs);
  }
  broadcast(data) {
    if (typeof chrome === "undefined" || !chrome.tabs?.query) return;
    chrome.tabs.query({}, (tabs) => {
      if (chrome.runtime.lastError || !tabs) return;
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: "DR_DEBUG_DOCKER_EVENT", data }, () => {
            void chrome.runtime.lastError;
          });
        }
      }
    });
  }
};
var BackgroundWorker = class {
  tabPorts = /* @__PURE__ */ new Map();
  dockerManager;
  constructor() {
    this.dockerManager = new DockerStreamManager();
    this.dockerManager.start();
  }
  readSettings() {
    return new Promise((resolve) => {
      if (typeof chrome === "undefined" || !chrome.storage?.local) return resolve({});
      chrome.storage.local.get(
        ["provider", "apiKey", "baseURL", "model"],
        (items) => resolve(items || {})
      );
    });
  }
  /**
   * Builds the client here in the worker so the API key never crosses into page
   * context, and so the request is not subject to the page's CSP.
   */
  async resolveClient(override) {
    const stored = await this.readSettings();
    const settings = { ...stored, ...override || {} };
    const isGroqKey = Boolean(settings.apiKey?.startsWith("gsk_"));
    const isGeminiKey = Boolean(settings.apiKey?.startsWith("AQ.") || settings.apiKey?.startsWith("AIza"));
    let provider = settings.provider;
    if (!provider) {
      if (isGroqKey) provider = "groq";
      else if (isGeminiKey) provider = "gemini";
      else provider = "groq";
    }
    const preset = PROVIDERS[provider] || PROVIDERS.groq;
    if (!settings.apiKey) {
      throw new Error("No API key saved. Open the Dr. Debug popup, paste your key and press Save.");
    }
    let model = settings.model || preset.model;
    if (model === "llama-3.3-70b-versatile") {
      model = "openai/gpt-oss-120b";
    }
    return new OpenAIClient({
      apiKey: settings.apiKey,
      baseURL: settings.baseURL || preset.baseURL,
      model
    });
  }
  handleMessage(message, sender, sendResponse) {
    const tabId = sender.tab?.id || message.tabId;
    switch (message.type) {
      case "DR_DEBUG_CONNECT_TAB":
        if (tabId) {
          this.tabPorts.set(tabId, sender);
          sendResponse({ status: "connected", tabId });
        }
        break;
      case "DR_DEBUG_SAVE_SETTINGS":
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.set(message.payload, () => {
            sendResponse({ status: "saved" });
          });
          return true;
        }
        sendResponse({ status: "saved_mock" });
        break;
      case "DR_DEBUG_GET_SETTINGS":
        if (typeof chrome !== "undefined" && chrome.storage?.local) {
          chrome.storage.local.get(null, (items) => {
            sendResponse(items);
          });
          return true;
        }
        sendResponse({});
        break;
      case "DR_DEBUG_LLM_CHAT": {
        const { messages, tools } = message.payload || {};
        if (!Array.isArray(messages)) {
          sendResponse({ error: "LLM_CHAT requires a messages array" });
          return false;
        }
        this.resolveClient().then((client) => client.chat(messages, tools)).then((result) => sendResponse({ result })).catch((err) => sendResponse({ error: err?.message || "LLM request failed" }));
        return true;
      }
      case "DR_DEBUG_TEST_CONNECTION": {
        const override = message.payload?.settings || message.payload;
        this.resolveClient(override && Object.keys(override).length > 0 ? override : void 0).then((client) => client.testConnection()).then((result) => sendResponse({ result })).catch(
          (err) => sendResponse({ result: { success: false, message: err?.message || "Failed" } })
        );
        return true;
      }
      case "DR_DEBUG_GET_DOCKER_STATE":
        sendResponse(this.dockerManager.getState());
        return false;
      case "DR_DEBUG_DOCKER_FETCH": {
        const { endpoint, params } = message.payload || {};
        this.dockerManager.proxyFetch(endpoint || "/docker/status", params).then((result) => sendResponse({ result })).catch((err) => sendResponse({ error: err?.message || "Docker fetch failed" }));
        return true;
      }
      default:
        sendResponse({ status: "unhandled_type", type: message.type });
        break;
    }
    return false;
  }
};
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  const worker = new BackgroundWorker();
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    return worker.handleMessage(message, sender, sendResponse);
  });
}
export {
  BackgroundWorker,
  DockerStreamManager
};
