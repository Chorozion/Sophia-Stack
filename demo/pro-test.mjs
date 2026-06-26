// pro-test.mjs — media hosting + sandboxed server functions (incl. safety).
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";
import { claimAndMint } from "./_helpers.mjs";

const dir = fileURLToPath(new URL("./out/_pro-test", import.meta.url));
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const srv = await createServer({ dir, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));
const { token } = await claimAndMint(base);
const j = (m, p, b, t, extra) => fetch(base + p, { method: m, headers: { ...(t ? { Authorization: "Bearer " + t } : {}), ...(extra || {}) }, body: b }).then(async (r) => ({ status: r.status, ct: r.headers.get("content-type"), body: await r.json().catch(() => ({})) }));
const patch = (ops) => fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ ops }) }).then((r) => r.json());

// ── MEDIA ──
const png = Buffer.from("89504e470d0a1a0a0000000d49484452" + "00".repeat(40), "hex");
const up = await j("POST", "/api/media", png, token, { "Content-Type": "image/png", "X-Filename": "logo.png" });
ok(up.body.ok && up.body.url.startsWith("/media/"), "AI uploads media (image) -> hosted URL");
const served = await fetch(base + up.body.url);
ok(served.status === 200 && served.headers.get("content-type") === "image/png", "media served at its URL with correct type");
ok((await j("GET", "/api/media", null, token)).body.items.length === 1, "media listed in the instance");

// ── SANDBOXED FUNCTIONS ──
await patch([{ op: "mset", path: "data.collections.subs", value: { fields: [{ name: "email" }], access: { create: "token", read: "token" } } }]);
await patch([{ op: "mset", path: "functions.subscribe", value: { code: "if(!input.email)return{error:'need email'};const r=db.create('subs',{email:input.email});return{ok:true,id:r.id};" } }]);
const call = await j("POST", "/api/fn/subscribe", JSON.stringify({ email: "a@b.com" }), null, { "Content-Type": "application/json" });
ok(call.body.ok && call.body.result.ok && call.body.result.id, "sandboxed function runs (real server logic)");
ok((await j("GET", "/api/data/subs", null, token)).body.items[0]?.email === "a@b.com", "function wrote to the database");

// ── SANDBOX SAFETY ──
await patch([{ op: "mset", path: "functions.probe", value: { code: "return typeof process+'/'+typeof require+'/'+typeof globalThis.fetch;" } }]);
ok((await j("POST", "/api/fn/probe", "{}", null, { "Content-Type": "application/json" })).body.result === "undefined/undefined/undefined", "sandbox: no process / require / fetch reachable");
await patch([{ op: "mset", path: "functions.loop", value: { code: "while(true){}" } }]);
ok(!(await j("POST", "/api/fn/loop", "{}", null, { "Content-Type": "application/json" })).body.ok, "sandbox: infinite loop killed by timeout");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); await new Promise((r) => setTimeout(r, 200)); try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
