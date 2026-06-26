// server-test.mjs — verify the self-contained editable server (self-terminating).
// Covers: catalog, token auth, live CSS edit, persistence across restart, patch
// persistence, and token minting. Requires `npm run build` + catalog.json.
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { SAMPLE } from "./sample-model.mjs";

const dir = fileURLToPath(new URL("./out/_srv-test", import.meta.url));
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));
const J = (r) => r.json();

let srv = await createServer({ dir, port: 4396, seedModel: SAMPLE, quiet: true });
const base = srv.url.replace(/\/$/, "");
const admin = srv.getTokens().tokens.find((t) => t.role === "admin").token;

// 1. catalog public
const cat = await J(await fetch(base + "/api/sophia/catalog"));
ok(cat.blocks && cat.styles && cat.effects, "catalog served (blocks/styles/effects)");

// 2. css write requires a token
let r = await fetch(base + "/api/sophia/css", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ css: "x" }) });
ok(r.status === 401, "PUT /css without token -> 401");

// 3. css write with admin token + read back + SSE broadcast
const events = [];
const es = await fetch(base + "/live");
const reader = es.body.getReader(); const dec = new TextDecoder();
(async () => { while (true) { const { value, done } = await reader.read(); if (done) break; events.push(dec.decode(value)); } })();
await new Promise((r) => setTimeout(r, 80));

const CSS = ".sx-h1{color:red}";
r = await fetch(base + "/api/sophia/css", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + admin }, body: JSON.stringify({ css: CSS }) });
ok(r.ok, "PUT /css with token -> ok");
const got = await J(await fetch(base + "/api/sophia/css"));
ok(got.css === CSS, "GET /css returns the edit");
await new Promise((r) => setTimeout(r, 80));
ok(events.join("").includes('"type":"css"') && events.join("").includes("sx-h1"), "css change broadcast live over SSE");

// 4. patch with token persists
r = await fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + admin }, body: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "headline", value: "Persisted!" }] }) });
ok(r.ok, "POST /patch with token -> ok");

// 5. mint an editor token; it can write css but NOT manage tokens
const mint = await J(await fetch(base + "/api/sophia/tokens", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + admin }, body: JSON.stringify({ label: "llm" }) }));
ok(mint.token && mint.token.startsWith("sx_"), "admin mints an editor token");
r = await fetch(base + "/api/sophia/css", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + mint.token }, body: JSON.stringify({ css: CSS + "/*e*/" }) });
ok(r.ok, "editor token can edit css");
r = await fetch(base + "/api/sophia/tokens", { headers: { Authorization: "Bearer " + mint.token } });
ok(r.status === 401, "editor token CANNOT manage tokens (admin-only)");

// 7. safe-edits: an invalid patch is REJECTED and the good state is preserved
r = await fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + admin }, body: JSON.stringify({ ops: [{ op: "add", route: "/", value: { id: "bad", type: "not-a-real-block" } }] }) });
ok(r.status === 422, "invalid edit (unknown block type) -> 422 rejected");
const stillGood = await J(await fetch(base + "/api/sophia/model"));
ok(stillGood.pages["/"].blocks.find((b) => b.id === "hero").headline === "Persisted!", "good state preserved after rejected edit");

// 8. unsafe CSS rejected
r = await fetch(base + "/api/sophia/css", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: "Bearer " + admin }, body: JSON.stringify({ css: "body{}</style><script>alert(1)</script>" }) });
ok(r.status === 422, "unsafe CSS (script/style breakout) -> 422 rejected");

// 9. rollback restores the previous good version
r = await fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + admin }, body: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "headline", value: "Oops bad copy" }] }) });
ok(r.ok, "apply an edit we will undo");
r = await J(await fetch(base + "/api/sophia/rollback", { method: "POST", headers: { Authorization: "Bearer " + admin } }));
ok(r.ok && r.restored, "rollback ok");
const rolled = await J(await fetch(base + "/api/sophia/model"));
ok(rolled.pages["/"].blocks.find((b) => b.id === "hero").headline === "Persisted!", "rollback restored previous good headline");

es.body.cancel().catch(() => {});
srv.close();

// 6. PERSISTENCE: reopen the same dir in a fresh server — edits survived (no redeploy)
const srv2 = await createServer({ dir, port: 4395, quiet: true });
ok(srv2.getCss().includes("sx-h1"), "custom CSS persisted across restart");
ok(srv2.getModel().pages["/"].blocks.find((b) => b.id === "hero").headline === "Persisted!", "model patch persisted across restart");
srv2.close();

console.log(`\n  ${pass} passed, ${fail} failed`);
rmSync(dir, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
