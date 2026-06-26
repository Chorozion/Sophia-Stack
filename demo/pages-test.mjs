// pages-test.mjs — multi-page, custom HTML block, and auto SEO/AI files.
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

const dir = fileURLToPath(new URL("./out/_pages-test", import.meta.url));
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const srv = await createServer({ dir, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));
const { token } = await (await import("./_helpers.mjs")).claimAndMint(base);
const patch = (ops) => fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ ops }) }).then((r) => r.json());
const get = (path) => fetch(base + path).then(async (r) => ({ status: r.status, text: await r.text() }));

// 1. Agent adds a new page with a custom HTML block (custom markup + css)
const addPage = await patch([{ op: "mset", path: "pages./about", value: { title: "About Us", blocks: [
  { id: "ah", type: "hero", headline: "About", sub: "Who we are" },
  { id: "custom", type: "html", html: "<div class='x'>CUSTOM-HTML-MARKER</div>", css: ".x{color:#0f0}", js: "window.__ran=true" },
] } }]);
ok(addPage.ok, "agent adds a new page (/about) with a custom html block");

// 2. The new page is served at its route, with the custom markup
const about = await get("/about");
ok(about.status === 200 && about.text.includes("About Us"), "new page served at /about");
ok(about.text.includes("CUSTOM-HTML-MARKER") && about.text.includes(".x{color:#0f0}"), "custom HTML + CSS rendered on the page");

// 3. Auto sitemap.xml includes both pages
const sm = await get("/sitemap.xml");
ok(sm.status === 200 && sm.text.includes("/about") && sm.text.includes("<urlset"), "sitemap.xml auto-generated with all pages");

// 4. robots.txt + llms.txt
ok((await get("/robots.txt")).text.includes("Sitemap:"), "robots.txt points to the sitemap");
const llms = await get("/llms.txt");
ok(llms.text.includes("About Us") && llms.text.includes("# "), "llms.txt lists the pages for AI crawlers");

// 5. Unknown route still 404s
ok((await get("/nope")).status === 404, "unknown route -> 404");

// 6. Immutable core footer on EVERY page + un-hideable via custom CSS
const home = (await get("/")).text;
ok(home.includes("sx-core-footer") && home.includes("Sophia Stack") && home.includes('href="/dashboard"'), "core footer (admin + branding) on home");
ok((await get("/about")).text.includes("sx-core-footer"), "core footer on AI-added pages too");
const cssTry = await (await fetch(base + "/api/sophia/css", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ css: ".sx-core-footer{display:none}" }) })).json();
ok(!cssTry.ok, "custom CSS cannot hide the protected footer");

// 7. OpenAPI schema for a ChatGPT Custom GPT Action (dynamic server url)
const oas = JSON.parse((await get("/openapi.json")).text);
ok(oas.openapi === "3.1.0" && oas.servers[0].url.endsWith(new URL(base).host) && oas.paths["/api/sophia/patch"] && oas.components.securitySchemes.bearerAuth, "/openapi.json: valid schema, server url = this origin, bearer auth");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close();
await new Promise((r) => setTimeout(r, 200));
try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
