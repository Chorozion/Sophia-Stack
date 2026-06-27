// image-gen-test.mjs — the Image Studio extension + the new media:write capability.
// The key-free "placeholder" provider exercises the full flow end-to-end (generate →
// ctx.media.save → URL → optional placement) with no API key.
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

const root = fileURLToPath(new URL("./out/_imggen-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const extDir = fileURLToPath(new URL("../examples/extensions", import.meta.url));
const srv = await createServer({ dir: root, port: 0, seedModel: DEFAULT_SITE, quiet: true, extensionsDir: extDir });
const base = srv.url.replace(/\/$/, "");
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const J = (m, p, b, auth) => fetch(base + p, { method: m, headers: { ...(auth ? { Cookie: sid } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// loads + active
const list = (await J("GET", "/api/sophia/extensions", undefined, true)).body;
const ext = (list.extensions || []).find((e) => e.id === "sophia-image-gen");
ok(ext && ext.active && !ext.error, "Image Studio extension loads + activates");
ok(ext.panels.some((p) => p.path === "panel"), "registers its Image Studio panel");

// auth gating
ok((await J("POST", "/api/extensions/sophia-image-gen/generate", { prompt: "x" }, false)).status === 401, "generate requires auth");

// real provider without a key -> clear error
ok(/api key/i.test((await J("POST", "/api/extensions/sophia-image-gen/generate", { prompt: "x", provider: "openai" }, true)).body.error || ""), "real provider without a key returns a clear error");

// full flow with the key-free placeholder provider -> saved to media
const gen = await J("POST", "/api/extensions/sophia-image-gen/generate", { prompt: "a warm coffee shop hero", provider: "placeholder" }, true);
ok(gen.body.ok && /^\/media\//.test(gen.body.url || ""), "placeholder generates + saves to media (returns a /media/ URL)");
const img = await fetch(base + gen.body.url);
ok(img.ok && /image\//.test(img.headers.get("content-type") || ""), "the saved image is served from the media library");

// contextual flag is graceful even with no AI provider configured
ok((await J("POST", "/api/extensions/sophia-image-gen/generate", { prompt: "hero", provider: "placeholder", contextual: true }, true)).body.ok, "contextual mode degrades gracefully without an AI provider");

// place straight into a block (safe patch)
const heroBefore = (await J("GET", "/api/sophia/model", undefined, true)).body.pages["/"].blocks.find((b) => b.id === "hero");
const placed = await J("POST", "/api/extensions/sophia-image-gen/generate", { prompt: "bg", provider: "placeholder", place: { id: "hero", path: "image" } }, true);
const heroAfter = (await J("GET", "/api/sophia/model", undefined, true)).body.pages["/"].blocks.find((b) => b.id === "hero");
ok(placed.body.ok && heroAfter.image === placed.body.url && heroAfter.image !== (heroBefore || {}).image, "place: drops the image into a block via a safe patch");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); await new Promise((r) => setTimeout(r, 150)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
