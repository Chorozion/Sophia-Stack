// seo-test.mjs — R1: render SEO metadata (model.seo + pages.<route>.seo) into <head>.
// R2: enumerable versions with ids/labels + targeted rollback (snapshots first).
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";
import { pageHead, seoTags } from "../src/styles.mjs";
import { validateModel } from "../src/validate.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// ── R1: seoTags rendering (page seo overrides site seo; all escaped; JSON-LD script-safe) ──
const model = {
  site: "Acme", style: "sophia",
  seo: { description: "site default", robots: "index,follow", openGraph: { image: "https://x/o.png" } },
  pages: { "/": { title: "Home", seo: { description: "Home page desc", canonical: "https://acme.com/", twitter: { site: "@acme" }, jsonLd: [{ "@context": "https://schema.org", "@type": "Organization", name: "Acme & Co <b>" }] }, blocks: [] } },
};
const h = seoTags(model, "/", { origin: "https://acme.com" });
ok(h.includes('<meta name="description" content="Home page desc">'), "page seo description overrides site default");
ok(h.includes('<meta name="robots" content="index,follow">'), "robots inherited from site seo");
ok(h.includes('<link rel="canonical" href="https://acme.com/">'), "canonical rendered");
ok(h.includes('<meta property="og:title" content="Home">') && h.includes('<meta property="og:image" content="https://x/o.png">'), "OpenGraph title + image");
ok(h.includes('<meta property="og:url" content="https://acme.com/">'), "og:url from canonical");
ok(h.includes('<meta name="twitter:card" content="summary_large_image">') && h.includes('<meta name="twitter:site" content="@acme">'), "twitter card + site");
ok(h.includes('application/ld+json') && h.includes("Acme &amp; Co") === false && h.includes("\\u003cb>"), "JSON-LD present + script-safe (escaped <)");
ok(pageHead(model, "/", "", { origin: "https://acme.com" }).includes('name="description"'), "pageHead embeds the SEO tags");
ok(validateModel(model).ok, "a model with seo blocks passes validation");

// ── R1 server: setting model.seo is served in the page <head> ──
const root = fileURLToPath(new URL("./out/_seo-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const srv = await createServer({ dir: root, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const S = (m, p, b) => fetch(base + p, { method: m, headers: { Cookie: sid, ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

await S("POST", "/api/sophia/patch", { ops: [{ op: "mset", path: "seo.description", value: "Served meta description" }] });
const html = await (await fetch(base + "/")).text();
ok(html.includes('<meta name="description" content="Served meta description">'), "owner-set SEO description is served in the live page <head>");

// ── R2: versions with ids/labels + targeted rollback ──
await S("POST", "/api/sophia/patch", { ops: [{ op: "set", id: "hero", path: "headline", value: "AAA" }], label: "set-A" });
await S("POST", "/api/sophia/patch", { ops: [{ op: "set", id: "hero", path: "headline", value: "BBB" }], label: "set-B" });
const vs = (await S("GET", "/api/sophia/versions")).body;
ok(Array.isArray(vs.versions) && vs.versions.every((v) => v.id) && vs.versions.some((v) => v.label === "set-B"), "versions are enumerable with ids + labels");
const headlineNow = () => { const m = JSON.parse(JSON.stringify((/* current */ 0, 0))); return m; };
// the snapshot labeled "set-B" holds the state BEFORE that change (headline "AAA")
const target = vs.versions.find((v) => v.label === "set-B");
const rb = await S("POST", "/api/sophia/rollback", { id: target.id });
ok(rb.body.ok && rb.body.id === target.id, "rollback to a specific version id succeeds");
const hero = (await S("GET", "/api/sophia/model")).body.pages["/"].blocks.find((b) => b.id === "hero");
ok(hero && hero.headline === "AAA", "targeted rollback restored that version (headline reverted to AAA, not clobbering all edits)");
ok((await fetch(base + "/api/sophia/versions")).status === 401, "versions list requires auth");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); await new Promise((r) => setTimeout(r, 150)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
