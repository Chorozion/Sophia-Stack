// extensions-test.mjs — the extension/plugin system: manifest validation, scoped
// permissions, registration, hook dispatch, disabled-can't-run, and that extension
// site writes go through the validated/rollback-safe pipeline. Uses temp fixtures.
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";
import { validateManifest, satisfies } from "../src/extensions.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// 1. manifest validation + version requires
ok(validateManifest({ id: "x", name: "X", version: "1.0.0", entry: "./e.js" }).ok, "valid manifest passes");
ok(!validateManifest({ id: "Bad Id", name: "", version: "", entry: "" }).ok, "bad manifest rejected");
ok(!validateManifest({ id: "x", name: "X", version: "1", entry: "./e.js", permissions: ["bogus:perm"] }).ok, "unknown permission rejected");
ok(satisfies("1.2.0", ">=1.0.0") && !satisfies("0.9.0", ">=1.0.0"), "requires.sophiaStack version check");

// 2. fixtures: one with full perms, one missing site:patch
const root = fileURLToPath(new URL("./out/_ext-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const extDir = root + "/extensions";
mkdirSync(extDir + "/demo-ext", { recursive: true });
writeFileSync(extDir + "/demo-ext/extension.json", JSON.stringify({ id: "demo-ext", name: "Demo", version: "0.1.0", entry: "./extension.js", permissions: ["site:read", "site:patch", "ai:use"], adminNav: [{ label: "Demo", path: "/admin/x", icon: "box" }], hooks: ["page.afterSave"] }));
writeFileSync(extDir + "/demo-ext/extension.js", [
  "export default { async activate(ctx){",
  "  ctx.admin.registerNav({label:'Demo',path:'/admin/x',icon:'box'});",
  "  ctx.routes.register('/ping', async (req,res,h)=> h.send(res,200,{ok:true,site:ctx.site.read().site}));",
  "  ctx.routes.register('/stamp', async (req,res,h)=>{ const r=ctx.site.patch([{op:'mset',path:'brief',value:'by demo-ext'}]); ctx.audit.log('stamp',{ok:r.ok}); h.send(res,200,r); });",
  "  ctx.hooks.on('page.afterSave',(p)=> ctx.audit.log('saw:page.afterSave',(p&&p.changed)||null));",
  "} };",
].join("\n"));
mkdirSync(extDir + "/no-perm-ext", { recursive: true });
writeFileSync(extDir + "/no-perm-ext/extension.json", JSON.stringify({ id: "no-perm-ext", name: "NoPerm", version: "0.1.0", entry: "./extension.js", permissions: ["site:read"] })); // NO site:patch
writeFileSync(extDir + "/no-perm-ext/extension.js", [
  "export default { async activate(ctx){",
  "  ctx.routes.register('/try-write', async (req,res,h)=>{ try{ ctx.site.patch([{op:'mset',path:'brief',value:'nope'}]); h.send(res,200,{ok:true}); }catch(e){ h.send(res,403,{error:e.message}); } });",
  "} };",
].join("\n"));

const srv = await createServer({ dir: root + "/data", port: 0, seedModel: DEFAULT_SITE, quiet: true, extensionsDir: extDir });
const base = srv.url.replace(/\/$/, "");
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const S = (m, p, b) => fetch(base + p, { method: m, headers: { Cookie: sid, ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const get = (p) => fetch(base + p).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// 3. both loaded + admin nav registered
const list = (await S("GET", "/api/sophia/extensions")).body;
ok(list.extensions.some((e) => e.id === "demo-ext" && e.active) && list.nav.some((n) => n.label === "Demo"), "extensions load + register admin nav");

// 4. extension API route serves
ok((await get("/api/extensions/demo-ext/ping")).body.ok, "extension API route serves");

// 5. permission enforcement
ok(/permission/.test((await get("/api/extensions/no-perm-ext/try-write")).body.error || ""), "extension without site:patch is DENIED");

// 6. extension writes go through the validated pipeline + land
ok((await get("/api/extensions/demo-ext/stamp")).body.ok, "extension patch applies via validate-before-commit");
ok((await S("GET", "/api/sophia/model")).body.brief === "by demo-ext", "the extension's safe patch landed in the model");

// 7. hook dispatch -> audited
await S("POST", "/api/sophia/patch", { ops: [{ op: "set", id: "hero", path: "headline", value: "hooked" }] });
ok((await S("GET", "/api/sophia/audit")).body.entries.some((e) => e.action === "saw:page.afterSave"), "hook dispatched to extension (and audited)");

// 8. disabled extension cannot run
await S("POST", "/api/sophia/extensions", { id: "demo-ext", enabled: false });
ok((await get("/api/extensions/demo-ext/ping")).status === 404, "disabled extension stops serving routes");
ok((await S("GET", "/api/sophia/extensions")).body.extensions.find((e) => e.id === "demo-ext").active === false, "disabled extension reported inactive");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); await new Promise((r) => setTimeout(r, 200)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
