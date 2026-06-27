// providers.mjs — provider-agnostic AI access for the built-in builder.
//
// Sophia Stack is NOT tied to any one AI vendor. Core logic never hardcodes a
// provider name; it talks to typed ADAPTERS. A provider config is:
//   { type, apiKey, baseURL?, model, maxTokens?, temperature?, timeoutMs? }
// where type is one of: "openai" (a.k.a. "openai-compatible"), "anthropic", "gemini".
//
// Every adapter takes OpenAI-style messages + tools and returns a NORMALIZED
// OpenAI-style assistant message { role:"assistant", content, tool_calls } so the
// agent loop stays vendor-neutral.

const ADAPTERS = {}; // type -> async (cfg, messages, tools) => assistantMessage
export function registerAdapter(type, fn) { ADAPTERS[type] = fn; }
export function adapterTypes() { return Object.keys(ADAPTERS); }

// Normalize a type string ("openai-compatible" and friends collapse to "openai").
function normType(t) {
  t = String(t || "openai").toLowerCase();
  if (t === "openai-compatible" || t === "compatible" || t === "local") return "openai";
  return t;
}

export async function callProvider(cfg, messages, tools = []) {
  const type = normType(cfg.type);
  const adapter = ADAPTERS[type];
  if (!adapter) throw new Error(`unknown AI provider type "${type}" (have: ${adapterTypes().join(", ")})`);
  return adapter(cfg, messages, tools);
}

async function postJSON(url, headers, body, timeoutMs = 60000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal: ctrl.signal });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, json: j };
  } finally { clearTimeout(t); }
}

// ── OpenAI / OpenAI-compatible (Groq, Together, Fireworks, Perplexity, OpenRouter,
//    Ollama, LM Studio, vLLM, custom base URLs…) ──────────────────────────────
registerAdapter("openai", async (cfg, messages, tools) => {
  const base = (cfg.baseURL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const headers = {};
  if (cfg.apiKey) headers.Authorization = "Bearer " + cfg.apiKey;
  const body = { model: cfg.model || "gpt-4o-mini", messages, temperature: cfg.temperature ?? 0.3 };
  if (tools && tools.length) body.tools = tools;
  if (cfg.maxTokens) body.max_tokens = cfg.maxTokens;
  const { ok, status, json } = await postJSON(base + "/chat/completions", headers, body, cfg.timeoutMs);
  if (!ok) throw new Error((json.error && json.error.message) || `AI error ${status}`);
  return (json.choices && json.choices[0] && json.choices[0].message) || { role: "assistant", content: "" };
});

// ── Anthropic (Claude) — /v1/messages, tool_use blocks ──────────────────────
registerAdapter("anthropic", async (cfg, messages, tools) => {
  const base = (cfg.baseURL || "https://api.anthropic.com/v1").replace(/\/+$/, "");
  // split system out; map OpenAI tool ids -> names for tool_result/tool_use
  let system = "";
  const idToName = {};
  for (const m of messages) {
    if (m.role === "system") system += (system ? "\n" : "") + (m.content || "");
    if (m.role === "assistant" && m.tool_calls) for (const tc of m.tool_calls) idToName[tc.id] = tc.function.name;
  }
  const out = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "user") { out.push({ role: "user", content: [{ type: "text", text: String(m.content || "") }] }); continue; }
    if (m.role === "assistant") {
      const blocks = [];
      if (m.content) blocks.push({ type: "text", text: String(m.content) });
      for (const tc of m.tool_calls || []) { let input = {}; try { input = JSON.parse(tc.function.arguments || "{}"); } catch {} blocks.push({ type: "tool_use", id: tc.id, name: tc.function.name, input }); }
      out.push({ role: "assistant", content: blocks.length ? blocks : [{ type: "text", text: "" }] });
      continue;
    }
    if (m.role === "tool") {
      const block = { type: "tool_result", tool_use_id: m.tool_call_id, content: String(m.content || "") };
      const last = out[out.length - 1];
      if (last && last.role === "user") last.content.push(block); // group consecutive tool results
      else out.push({ role: "user", content: [block] });
    }
  }
  const body = { model: cfg.model || "claude-sonnet-4", max_tokens: cfg.maxTokens || 4096, temperature: cfg.temperature ?? 0.3, messages: out };
  if (system) body.system = system;
  if (tools && tools.length) body.tools = tools.map((t) => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters || { type: "object", properties: {} } }));
  const headers = { "x-api-key": cfg.apiKey || "", "anthropic-version": "2023-06-01" };
  const { ok, status, json } = await postJSON(base + "/messages", headers, body, cfg.timeoutMs);
  if (!ok) throw new Error((json.error && json.error.message) || `Anthropic error ${status}`);
  let content = "";
  const tool_calls = [];
  for (const blk of json.content || []) {
    if (blk.type === "text") content += blk.text;
    else if (blk.type === "tool_use") tool_calls.push({ id: blk.id, type: "function", function: { name: blk.name, arguments: JSON.stringify(blk.input || {}) } });
  }
  const msg = { role: "assistant", content };
  if (tool_calls.length) msg.tool_calls = tool_calls;
  return msg;
});

// ── Google Gemini — :generateContent, functionCall/functionResponse ─────────
registerAdapter("gemini", async (cfg, messages, tools) => {
  const base = (cfg.baseURL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
  const model = cfg.model || "gemini-2.5-pro";
  let systemText = "";
  const idToName = {};
  for (const m of messages) {
    if (m.role === "system") systemText += (systemText ? "\n" : "") + (m.content || "");
    if (m.role === "assistant" && m.tool_calls) for (const tc of m.tool_calls) idToName[tc.id] = tc.function.name;
  }
  const contents = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    if (m.role === "user") { contents.push({ role: "user", parts: [{ text: String(m.content || "") }] }); continue; }
    if (m.role === "assistant") {
      const parts = [];
      if (m.content) parts.push({ text: String(m.content) });
      for (const tc of m.tool_calls || []) { let args = {}; try { args = JSON.parse(tc.function.arguments || "{}"); } catch {} parts.push({ functionCall: { name: tc.function.name, args } }); }
      contents.push({ role: "model", parts: parts.length ? parts : [{ text: "" }] });
      continue;
    }
    if (m.role === "tool") {
      const name = idToName[m.tool_call_id] || "tool";
      let resp; try { resp = JSON.parse(m.content); } catch { resp = { result: String(m.content || "") }; }
      contents.push({ role: "user", parts: [{ functionResponse: { name, response: typeof resp === "object" && resp ? resp : { result: resp } } }] });
    }
  }
  const body = { contents, generationConfig: { temperature: cfg.temperature ?? 0.3, ...(cfg.maxTokens ? { maxOutputTokens: cfg.maxTokens } : {}) } };
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] };
  if (tools && tools.length) body.tools = [{ functionDeclarations: tools.map((t) => ({ name: t.function.name, description: t.function.description, parameters: t.function.parameters || { type: "object", properties: {} } })) }];
  const url = `${base}/models/${model}:generateContent` + (cfg.apiKey ? `?key=${encodeURIComponent(cfg.apiKey)}` : "");
  const { ok, status, json } = await postJSON(url, {}, body, cfg.timeoutMs);
  if (!ok) throw new Error((json.error && json.error.message) || `Gemini error ${status}`);
  const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
  let content = "";
  const tool_calls = [];
  let i = 0;
  for (const p of parts) {
    if (p.text) content += p.text;
    else if (p.functionCall) tool_calls.push({ id: "call_" + (i++), type: "function", function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args || {}) } });
  }
  const msg = { role: "assistant", content };
  if (tool_calls.length) msg.tool_calls = tool_calls;
  return msg;
});

// ── Config from environment (12-factor; keys never live in the repo) ─────────
// Recognizes common providers by env var; everything else uses CUSTOM_AI_*.
const ENV_PROVIDERS = [
  { name: "openai", type: "openai", keyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" },
  { name: "anthropic", type: "anthropic", keyEnv: "ANTHROPIC_API_KEY", model: "claude-sonnet-4" },
  { name: "gemini", type: "gemini", keyEnv: "GEMINI_API_KEY", model: "gemini-2.5-pro" },
  { name: "openrouter", type: "openai", keyEnv: "OPENROUTER_API_KEY", baseURL: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  { name: "groq", type: "openai", keyEnv: "GROQ_API_KEY", baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { name: "mistral", type: "openai", keyEnv: "MISTRAL_API_KEY", baseURL: "https://api.mistral.ai/v1", model: "mistral-large-latest" },
  { name: "together", type: "openai", keyEnv: "TOGETHER_API_KEY", baseURL: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { name: "fireworks", type: "openai", keyEnv: "FIREWORKS_API_KEY", baseURL: "https://api.fireworks.ai/inference/v1", model: "accounts/fireworks/models/llama-v3p3-70b-instruct" },
  { name: "perplexity", type: "openai", keyEnv: "PERPLEXITY_API_KEY", baseURL: "https://api.perplexity.ai", model: "sonar" },
];

export function envProviders(env = process.env) {
  const found = {};
  for (const p of ENV_PROVIDERS) if (env[p.keyEnv]) found[p.name] = { type: p.type, apiKey: env[p.keyEnv], baseURL: p.baseURL, model: env[(p.name.toUpperCase()) + "_MODEL"] || p.model };
  // Local OpenAI-compatible servers (Ollama / LM Studio / vLLM) — no key needed.
  if (env.OLLAMA_BASE_URL || env.OLLAMA_MODEL) found.ollama = { type: "openai", baseURL: env.OLLAMA_BASE_URL || "http://localhost:11434/v1", model: env.OLLAMA_MODEL || "llama3.1", apiKey: "" };
  if (env.LMSTUDIO_BASE_URL) found.lmstudio = { type: "openai", baseURL: env.LMSTUDIO_BASE_URL, model: env.LMSTUDIO_MODEL || "local-model", apiKey: env.LMSTUDIO_API_KEY || "" };
  if (env.VLLM_BASE_URL) found.vllm = { type: "openai", baseURL: env.VLLM_BASE_URL, model: env.VLLM_MODEL || "local-model", apiKey: env.VLLM_API_KEY || "" };
  // Fully custom OpenAI-compatible endpoint.
  if (env.CUSTOM_AI_BASE_URL) found.custom = { type: env.CUSTOM_AI_TYPE || "openai", baseURL: env.CUSTOM_AI_BASE_URL, apiKey: env.CUSTOM_AI_API_KEY || "", model: env.CUSTOM_AI_MODEL || "gpt-4o-mini" };
  return found;
}

// Resolve the active provider config: dashboard-configured key wins; otherwise the
// env default (SOPHIA_AI_PROVIDER) or the first env provider found.
export function resolveProvider(dashboardCfg, env = process.env) {
  // Dashboard config wins if it has a key OR a base URL (local models need no key).
  if (dashboardCfg && (dashboardCfg.apiKey || dashboardCfg.baseURL)) return { type: dashboardCfg.type || "openai", apiKey: dashboardCfg.apiKey || "", baseURL: dashboardCfg.baseURL, model: dashboardCfg.model, temperature: dashboardCfg.temperature, maxTokens: dashboardCfg.maxTokens };
  const found = envProviders(env);
  const want = env.SOPHIA_AI_PROVIDER;
  if (want && found[want]) return found[want];
  const names = Object.keys(found);
  return names.length ? found[names[0]] : null;
}
