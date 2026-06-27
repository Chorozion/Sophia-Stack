// vex-test.mjs — VEX preview mode: the agent stages edits (validated) WITHOUT
// committing, returns them for the live preview pane, and the live model is
// untouched until "Apply". A normal (non-preview) turn commits as before.
import http from "node:http";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// Mock OpenAI-compatible provider: first turn -> tool call (apply_patch), then -> final reply.
const llm = http.createServer((req, res) => {
  let body = ""; req.on("data", (d) => (body += d)); req.on("end", () => {
    let msgs = []; try { msgs = JSON.parse(body).messages || []; } catch {}
    const sawTool = msgs.some((x) => x.role === "tool");
    res.setHeader("Content-Type", "application/json");
    if (sawTool) return res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "Done — preview ready." } }] }));
    res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "apply_patch", arguments: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "headline", value: "VEX preview headline" }] }) } }] } }] }));
  });
});
await new Promise((r) => llm.listen(0, r));
const llmBase = "http://127.0.0.1:" + llm.address().port;

const root = fileURLToPath(new URL("./out/_vex-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const srv = await createServer({ dir: root, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const S = (m, p, b) => fetch(base + p, { method: m, headers: { Cookie: sid, ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

await S("PUT", "/api/sophia/llm", { type: "openai", baseURL: llmBase, apiKey: "x", model: "m" });
const heroHeadline = async () => { const mdl = (await S("GET", "/api/sophia/model")).body; const pg = mdl.pages["/"] || Object.values(mdl.pages)[0]; return (pg.blocks.find((b) => b.id === "hero") || {}).headline; };
const before = await heroHeadline();

// preview turn: stages, does NOT commit
const pv = await S("POST", "/api/sophia/agent", { messages: [{ role: "user", content: "change the hero" }], preview: true });
ok(pv.body.preview && Array.isArray(pv.body.preview.ops) && pv.body.preview.ops.length === 1, "preview turn returns staged ops");
ok(pv.body.preview.ops[0].value === "VEX preview headline", "staged op carries the intended change");
ok((await heroHeadline()) === before, "live model is UNCHANGED during preview (not committed)");

// Apply path: committing the staged ops changes the live model
const ap = await S("POST", "/api/sophia/patch", { ops: pv.body.preview.ops });
ok(ap.body.ok === true && (await heroHeadline()) === "VEX preview headline", "Apply commits the staged ops to the live model");

// non-preview turn commits directly (existing behavior)
await S("POST", "/api/sophia/patch", { ops: [{ op: "set", id: "hero", path: "headline", value: "reset" }] });
const live = await S("POST", "/api/sophia/agent", { messages: [{ role: "user", content: "change the hero" }], preview: false });
ok(!live.body.preview && (await heroHeadline()) === "VEX preview headline", "non-preview turn commits live (no staging)");

console.log(`\n  ${pass} passed, ${fail} failed`);
llm.close(); srv.close(); await new Promise((r) => setTimeout(r, 150)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
