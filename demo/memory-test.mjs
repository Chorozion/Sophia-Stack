// memory-test.mjs — the optional vector memory: cosine store, retrieval ranking,
// OpenAI-compatible embed(), and the server build path (graceful without a provider).
import http from "node:http";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { cosine, VectorStore } from "../src/vector-store.mjs";
import { Memory, gatherSources } from "../src/memory.mjs";
import { embed } from "../src/providers.mjs";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// ── vector store ──
ok(Math.abs(cosine([1, 0], [1, 0]) - 1) < 1e-9 && Math.abs(cosine([1, 0], [0, 1])) < 1e-9, "cosine: identical=1, orthogonal=0");
const vs = new VectorStore(null);
vs.add([{ id: "a", kind: "x", text: "alpha", vector: [1, 0, 0] }, { id: "b", kind: "x", text: "beta", vector: [0, 1, 0] }]);
const hit = vs.search([0.9, 0.1, 0], 1)[0];
ok(hit.id === "a" && hit.score > 0.9, "search ranks the nearest vector first");
vs.add([{ id: "a", kind: "x", text: "alpha2", vector: [1, 0, 0] }]);
ok(vs.size() === 2 && vs.search([1, 0, 0], 1)[0].text === "alpha2", "add() upserts by id");

// ── Memory with a deterministic keyword embedder (no network) ──
const KEYS = ["hero", "pricing", "color", "contact"];
const stub = async (texts) => texts.map((t) => KEYS.map((k) => (t.toLowerCase().includes(k) ? 1 : 0)));
const mem = new Memory(null, stub);
const built = await mem.build(gatherSources({ catalog: { blocks: { hero: { description: "a hero banner" }, pricing: { description: "pricing tiers" }, contact: { description: "a contact form" } } }, brief: "a site with a hero and pricing" }));
ok(built.ok && mem.ready, "memory builds an index from catalog + brief");
const got = await mem.retrieve("I want to add a pricing section", 2, 0.1);
ok(got.length && got[0].text.toLowerCase().includes("pricing"), "retrieve surfaces the pricing component for a pricing query");

// ── real embed() against a mock OpenAI-compatible /embeddings ──
const emb = http.createServer((req, res) => { let b = ""; req.on("data", (d) => (b += d)); req.on("end", () => { const inp = JSON.parse(b).input; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ data: inp.map((t, i) => ({ embedding: [t.length, i, 1] })) })); }); });
await new Promise((r) => emb.listen(0, r));
const embBase = "http://127.0.0.1:" + emb.address().port;
const vecs = await embed({ type: "openai", baseURL: embBase, apiKey: "x" }, ["hello", "world!"]);
ok(vecs.length === 2 && vecs[0][0] === 5, "embed() calls the OpenAI-compatible /embeddings endpoint");
let threw = false; try { await embed({ type: "anthropic" }, ["x"]); } catch { threw = true; }
ok(threw, "embed() rejects non-embedding providers (caller treats as no memory)");

// ── server: memory status + build via the mock embedder (EMBED_* env) ──
process.env.EMBED_BASE_URL = embBase; process.env.EMBED_API_KEY = "x";
const root = fileURLToPath(new URL("./out/_memory-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const srv = await createServer({ dir: root, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const S = (m, p) => fetch(base + p, { method: m, headers: { Cookie: sid } }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
ok((await fetch(base + "/api/sophia/memory")).status === 401, "memory status is owner-only");
const rb = await S("POST", "/api/sophia/memory");
ok(rb.body.ready === true && rb.body.count > 0, "server builds the memory index on demand");
delete process.env.EMBED_BASE_URL; delete process.env.EMBED_API_KEY;

console.log(`\n  ${pass} passed, ${fail} failed`);
emb.close(); srv.close(); await new Promise((r) => setTimeout(r, 150)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
