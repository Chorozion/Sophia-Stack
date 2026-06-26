// agent-test.mjs — the in-stack AI builder: type a request, the STACK calls an AI
// and applies the change. Uses a mock OpenAI-compatible server (no real key needed).
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

// Mock "AI": returns a chat-completion whose content is a patch (fenced + prose,
// to exercise the extractor).
const mock = http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    const content = "Sure, here you go!\n```json\n" +
      JSON.stringify({ ops: [
        { op: "mset", path: "style", value: "dark-tech" },
        { op: "set", id: "hero", path: "headline", value: "Made by the in-stack agent" },
      ] }) + "\n```";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ choices: [{ message: { content } }] }));
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

ok((await S("POST", "/api/sophia/agent", { message: "hi" })).body.error === "no_llm", "agent refuses with no AI key (points to Settings)");
ok((await S("PUT", "/api/sophia/llm", { apiKey: "sk-test", baseURL: mockUrl, model: "mock-1" })).body.ok, "owner saves an AI key");
const a = await S("POST", "/api/sophia/agent", { message: "make it dark and change the headline" });
ok(a.body.applied === true, "stack calls the AI and APPLIES the returned patch (no copy-paste)");
const m = await S("GET", "/api/sophia/model");
ok(m.body.style === "dark-tech" && m.body.pages["/"].blocks.find((b) => b.id === "hero").headline === "Made by the in-stack agent", "the AI's edit is live in the model");
const cfg = await S("GET", "/api/sophia/llm");
ok(cfg.body.configured === true && cfg.body.apiKey === undefined, "llm config returns WITHOUT the secret key");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); mock.close(); await new Promise((r) => setTimeout(r, 200)); try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
