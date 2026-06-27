// agent-image-test.mjs — the main builder can generate images via the Image Studio
// extension: when it's installed, the agent gets a generate_image tool, calls it, and
// places the returned media URL on a block. Uses the key-free placeholder provider.
import http from "node:http";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// Mock LLM: turn 1 -> generate_image, turn 2 -> apply_patch with the returned URL, turn 3 -> done.
const llm = http.createServer((req, res) => {
  let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => {
    let parsed = {}; try { parsed = JSON.parse(b); } catch {}
    const msgs = parsed.messages || [];
    const toolNames = (parsed.tools || []).map((t) => t.function && t.function.name);
    const tools = msgs.filter((x) => x.role === "tool");
    res.setHeader("Content-Type", "application/json");
    const reply = (m) => res.end(JSON.stringify({ choices: [{ message: m }] }));
    // expose whether generate_image was offered (assert below via a header echo)
    res.setHeader("x-had-image-tool", toolNames.includes("generate_image") ? "1" : "0");
    if (tools.length === 0) return reply({ role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "generate_image", arguments: JSON.stringify({ prompt: "a warm coffee shop hero, golden hour" }) } }] });
    if (tools.length === 1) { let url = ""; try { url = JSON.parse(tools[0].content).url; } catch {} return reply({ role: "assistant", content: null, tool_calls: [{ id: "c2", type: "function", function: { name: "apply_patch", arguments: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "image", value: url }] }) } }] }); }
    return reply({ role: "assistant", content: "Added a generated hero image. ✓" });
  });
});
await new Promise((r) => llm.listen(0, r));
const llmBase = "http://127.0.0.1:" + llm.address().port;

const root = fileURLToPath(new URL("./out/_agent-image-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const extDir = fileURLToPath(new URL("../examples/extensions", import.meta.url));
const srv = await createServer({ dir: root, port: 0, seedModel: DEFAULT_SITE, quiet: true, extensionsDir: extDir });
const base = srv.url.replace(/\/$/, "");
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const S = (m, p, b) => fetch(base + p, { method: m, headers: { Cookie: sid, ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

await S("PUT", "/api/sophia/llm", { type: "openai", baseURL: llmBase, apiKey: "x", model: "m" });
ok((await S("GET", "/api/sophia/extensions")).body.extensions.some((e) => e.id === "sophia-image-gen" && e.active), "Image Studio extension is installed + active");

const run = await S("POST", "/api/sophia/agent", { messages: [{ role: "user", content: "build a coffee shop site with a hero image" }], preview: false });
ok(run.body.ok, "the builder ran");
const hero = (await S("GET", "/api/sophia/model")).body.pages["/"].blocks.find((b) => b.id === "hero");
ok(hero && /^\/media\//.test(hero.image || ""), "the builder generated an image via the extension and placed it on the hero block");
const served = hero && hero.image ? await fetch(base + hero.image) : { ok: false, headers: { get: () => "" } };
ok(served.ok && /image\//.test(served.headers.get("content-type") || ""), "the generated image is served from the media library");

console.log(`\n  ${pass} passed, ${fail} failed`);
llm.close(); srv.close(); await new Promise((r) => setTimeout(r, 150)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
