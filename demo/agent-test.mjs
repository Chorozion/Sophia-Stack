// agent-test.mjs — the robust in-stack builder: a tool-using agent loop. The mock
// AI (1) tries an INVALID patch, (2) sees the error and applies a valid one, (3)
// finishes — proving the loop reads, edits, self-corrects, and iterates. No real key.
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

let calls = 0;
const mock = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    calls++;
    let message;
    if (calls === 1) message = { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "apply_patch", arguments: JSON.stringify({ ops: [{ op: "add", value: { id: "bad1", type: "bogus" } }] }) } }] };
    else if (calls === 2) message = { role: "assistant", content: null, tool_calls: [{ id: "c2", type: "function", function: { name: "apply_patch", arguments: JSON.stringify({ ops: [{ op: "mset", path: "style", value: "dark-tech" }, { op: "set", id: "hero", path: "headline", value: "Made by the agent loop" }] }) } }] };
    else message = { role: "assistant", content: "Done — I dropped the invalid block, switched to dark-tech, and rewrote the headline." };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message }] }));
  });
});
await new Promise((r) => mock.listen(0, r));
const mockUrl = "http://127.0.0.1:" + mock.address().port + "/v1";

const dir = fileURLToPath(new URL("./out/_agent-test", import.meta.url));
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const srv = await createServer({ dir, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const S = (m, p, b) => fetch(base + p, { method: m, headers: { Cookie: sid, ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

ok((await S("POST", "/api/sophia/agent", { messages: [{ role: "user", content: "hi" }] })).body.error === "no_llm", "agent needs an AI key (points to Settings)");
ok((await S("PUT", "/api/sophia/llm", { apiKey: "sk-test", baseURL: mockUrl, model: "mock-1" })).body.ok, "owner saves an AI key");
const a = await S("POST", "/api/sophia/agent", { messages: [{ role: "user", content: "make it dark and rewrite the headline" }] });
ok(typeof a.body.reply === "string" && /dark-tech/.test(a.body.reply), "agent loop returns a final reply when done");
ok(calls >= 3, "agent looped: invalid patch -> error -> fix -> done (tool calls executed server-side)");
ok((a.body.applied || []).includes("model:style") || (a.body.applied || []).includes("hero"), "applied changes are reported back");
const mdl = (await S("GET", "/api/sophia/model")).body;
ok(mdl.style === "dark-tech" && mdl.pages["/"].blocks.find((x) => x.id === "hero").headline === "Made by the agent loop", "the live site reflects the agent's edits");
ok(!mdl.pages["/"].blocks.find((x) => x.id === "bad1"), "the invalid block was rejected (validate-before-commit held)");
ok((await S("GET", "/api/sophia/llm")).body.apiKey === undefined, "key never leaves the server");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); mock.close(); await new Promise((r) => setTimeout(r, 200)); try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
