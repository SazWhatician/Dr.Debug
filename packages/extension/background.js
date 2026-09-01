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
      try {
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
  groq: { baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  openai: { baseURL: "https://api.openai.com/v1", model: "gpt-4o" }
};
var BackgroundWorker = class {
  tabPorts = /* @__PURE__ */ new Map();
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
  async resolveClient() {
    const settings = await this.readSettings();
    const preset = PROVIDERS[settings.provider || "groq"] || PROVIDERS.groq;
    if (!settings.apiKey) {
      throw new Error("No API key saved. Open the Dr. Debug popup, paste your key and press Save.");
    }
    return new OpenAIClient({
      apiKey: settings.apiKey,
      baseURL: settings.baseURL || preset.baseURL,
      model: settings.model || preset.model
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
      case "DR_DEBUG_TEST_CONNECTION":
        this.resolveClient().then((client) => client.testConnection()).then((result) => sendResponse({ result })).catch(
          (err) => sendResponse({ result: { success: false, message: err?.message || "Failed" } })
        );
        return true;
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
  BackgroundWorker
};
