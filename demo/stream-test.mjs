// stream-test.mjs — Lovable-style streaming: the provider streams token deltas and
// the /api/sophia/agent/stream endpoint relays them as SSE (tokens + a final done).
import http from "node:http";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { callProviderStream } from "../src/providers.mjs";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

const NL2 = "\n\n";
function sseServer(chunks) {
  return http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/event-stream" }); let i = 0; const go = () => { if (i < chunks.length) { res.write(chunks[i++]); setTimeout(go, 5); } else res.end(); }; go(); });
}

// 1. callProviderStream streams + assembles content
const s1 = sseServer([`data: {"choices":[{"delta":{"content":"Hel"}}]}${NL2}`, `data: {"choices":[{"delta":{"content":"lo"}}]}${NL2}`, `data: [DONE]${NL2}`]);
await new Promise((r) => s1.listen(0, r));
const deltas = [];
const m1 = await callProviderStream({ type: "openai", baseURL: "http://127.0.0.1:" + s1.address().port, apiKey: "x" }, [{ role: "user", content: "hi" }], [], (t) => deltas.push(t));
ok(m1.content === "Hello" && deltas.join("") === "Hello", "callProviderStream streams deltas + assembles the full message");
s1.close();

// 2. tool_call deltas are assembled
const s1b = sseServer([`data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"apply_patch","arguments":"{\\"ops\\""}}]}}]}${NL2}`, `data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":":[]}"}}]}}]}${NL2}`, `data: [DONE]${NL2}`]);
await new Promise((r) => s1b.listen(0, r));
const m2 = await callProviderStream({ type: "openai", baseURL: "http://127.0.0.1:" + s1b.address().port, apiKey: "x" }, [{ role: "user", content: "x" }], [{}], () => {});
ok(m2.tool_calls && m2.tool_calls[0].function.name === "apply_patch" && m2.tool_calls[0].function.arguments === '{"ops":[]}', "callProviderStream assembles streamed tool_calls");
s1b.close();

// 3. the streaming endpoint relays tokens + a final done event
const s2 = sseServer([`data: {"choices":[{"delta":{"content":"Building "}}]}${NL2}`, `data: {"choices":[{"delta":{"content":"now."}}]}${NL2}`, `data: [DONE]${NL2}`]);
await new Promise((r) => s2.listen(0, r));
const root = fileURLToPath(new URL("./out/_stream-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const srv = await createServer({ dir: root, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
await fetch(base + "/api/sophia/llm", { method: "PUT", headers: { Cookie: sid, "Content-Type": "application/json" }, body: JSON.stringify({ type: "openai", baseURL: "http://127.0.0.1:" + s2.address().port, apiKey: "x", model: "m" }) });

const res = await fetch(base + "/api/sophia/agent/stream", { method: "POST", headers: { Cookie: sid, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "build" }] }) });
ok(/text\/event-stream/.test(res.headers.get("content-type") || ""), "stream endpoint responds with SSE");
const txt = await res.text();
const events = txt.split(NL2).filter(Boolean).map((c) => { const l = c.split("\n").filter((x) => x.startsWith("data:")).map((x) => x.slice(5).trim()).join(""); try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const tokens = events.filter((e) => e.type === "token").map((e) => e.text).join("");
const done = events.find((e) => e.type === "done");
ok(tokens === "Building now.", "endpoint streams the token deltas");
ok(done && done.reply === "Building now.", "endpoint sends a final done event with the full reply");

console.log(`\n  ${pass} passed, ${fail} failed`);
s2.close(); srv.close(); await new Promise((r) => setTimeout(r, 150)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
