// providers-test.mjs — the provider-agnostic AI layer: openai-compatible,
// Anthropic, and Gemini adapters, plus env-based provider resolution. Mock
// servers only — no real keys, no network.
import http from "node:http";
import { callProvider, resolveProvider, envProviders, adapterTypes } from "../src/providers.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));
const mock = (handler) => { const s = http.createServer((req, res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => handler(req, JSON.parse(b || "{}"), res)); }); return s; };
const json = (res, obj) => { res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

const TOOLS = [{ type: "function", function: { name: "apply_patch", description: "edit", parameters: { type: "object", properties: { ops: { type: "array" } } } } }];
const MSGS = [{ role: "system", content: "You build sites." }, { role: "user", content: "make a hero" }];

ok(adapterTypes().includes("openai") && adapterTypes().includes("anthropic") && adapterTypes().includes("gemini"), "adapters registered: openai, anthropic, gemini");

// OpenAI-compatible
let oaBody;
const oa = mock((req, b, res) => { oaBody = b; json(res, { choices: [{ message: { role: "assistant", content: "ok", tool_calls: [{ id: "c1", type: "function", function: { name: "apply_patch", arguments: "{}" } }] } }] }); });
await new Promise((r) => oa.listen(0, r));
const oaRes = await callProvider({ type: "openai", baseURL: "http://127.0.0.1:" + oa.address().port + "/v1", apiKey: "k", model: "m" }, MSGS, TOOLS);
ok(Array.isArray(oaBody.messages) && Array.isArray(oaBody.tools) && oaBody.model === "m", "openai: sends OpenAI-shaped messages + tools");
ok(oaRes.tool_calls && oaRes.tool_calls[0].function.name === "apply_patch", "openai: normalized tool_calls");

// Anthropic
let anBody;
const an = mock((req, b, res) => { anBody = b; json(res, { content: [{ type: "text", text: "sure" }, { type: "tool_use", id: "tu1", name: "apply_patch", input: { ops: [1] } }] }); });
await new Promise((r) => an.listen(0, r));
const anRes = await callProvider({ type: "anthropic", baseURL: "http://127.0.0.1:" + an.address().port + "/v1", apiKey: "k", model: "claude-x" }, MSGS, TOOLS);
ok(anBody.system === "You build sites." && Array.isArray(anBody.messages), "anthropic: system extracted + messages translated");
ok(anBody.tools && anBody.tools[0].name === "apply_patch" && anBody.tools[0].input_schema, "anthropic: tools -> {name, input_schema}");
ok(anRes.content === "sure" && anRes.tool_calls[0].function.name === "apply_patch", "anthropic: response normalized to OpenAI shape");

// Gemini
let geBody;
const ge = mock((req, b, res) => { geBody = b; json(res, { candidates: [{ content: { parts: [{ text: "yep" }, { functionCall: { name: "apply_patch", args: { ops: [2] } } }] } }] }); });
await new Promise((r) => ge.listen(0, r));
const geRes = await callProvider({ type: "gemini", baseURL: "http://127.0.0.1:" + ge.address().port, apiKey: "k", model: "gemini-x" }, MSGS, TOOLS);
ok(geBody.systemInstruction && Array.isArray(geBody.contents), "gemini: systemInstruction + contents translated");
ok(geBody.tools && geBody.tools[0].functionDeclarations[0].name === "apply_patch", "gemini: tools -> functionDeclarations");
ok(geRes.content === "yep" && geRes.tool_calls[0].function.name === "apply_patch", "gemini: response normalized");

// Env-based resolution (12-factor; keys from env, never the repo)
const env = { OPENAI_API_KEY: "x", ANTHROPIC_API_KEY: "y", OLLAMA_BASE_URL: "http://localhost:11434/v1" };
const found = envProviders(env);
ok(found.openai && found.anthropic && found.ollama && found.ollama.type === "openai" && !found.ollama.apiKey, "env: detects openai + anthropic + local ollama (no key)");
ok(resolveProvider(null, env).type === "openai", "resolve: falls back to env provider when no dashboard config");
ok(resolveProvider({ apiKey: "d", type: "anthropic", model: "m" }, env).type === "anthropic", "resolve: dashboard config wins");
ok(resolveProvider(null, {}) === null, "resolve: null when nothing configured");

console.log(`\n  ${pass} passed, ${fail} failed`);
oa.close(); an.close(); ge.close();
process.exit(fail ? 1 : 0);
