// dashboard-test.mjs — owner manages pages/data/media/keys via session + OAuth config.
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

const dir = fileURLToPath(new URL("./out/_dash-test", import.meta.url));
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const srv = await createServer({ dir, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const S = (m, p, b) => fetch(base + p, { method: m, headers: { Cookie: sid, ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// Dashboard shell
const dash = await fetch(base + "/dashboard", { headers: { Cookie: sid } });
const dh = await dash.text();
ok(dash.status === 200 && dh.includes("Sophia · Dashboard") && dh.includes("Pages") && dh.includes("Media") && dh.includes("Keys") && dh.includes("Build your site with any AI"), "dashboard loads with Build + all tabs");

// Build flow: the AI returns a patch (markdown-fenced, with prose) -> stack applies it
const aiReply = "Sure! Here is the change:\n```json\n{ \"ops\": [ { \"op\": \"set\", \"id\": \"hero\", \"path\": \"headline\", \"value\": \"Bean There Coffee\" } ] }\n```\nLet me know if you want more.";
const fenced = aiReply.match(/```(?:json)?\s*([\s\S]*?)```/);
const parsed = JSON.parse(fenced[1]);
const applied = await S("POST", "/api/sophia/patch", parsed);
ok(applied.body.ok, "Build: a fenced AI reply parses + applies as a patch");
ok((await S("GET", "/api/sophia/model")).body.pages["/"].blocks.find((b) => b.id === "hero").headline === "Bean There Coffee", "Build: the applied edit is live in the model");

// Pages
ok((await S("POST", "/api/sophia/patch", { ops: [{ op: "mset", path: "pages./about", value: { title: "About", blocks: [{ id: "h1", type: "hero", headline: "About" }] } }] })).body.ok, "owner session adds a page");
ok((await S("GET", "/api/sophia/model")).body.pages["/about"], "page persisted");
await S("POST", "/api/sophia/patch", { ops: [{ op: "mdel", path: "pages./about" }] });
ok(!(await S("GET", "/api/sophia/model")).body.pages["/about"], "owner session deletes a page");

// Media (owner upload from dashboard)
const png = Buffer.from("89504e470d0a1a0a" + "00".repeat(20), "hex");
const up = await fetch(base + "/api/media", { method: "POST", headers: { Cookie: sid, "Content-Type": "image/png", "X-Filename": "x.png" }, body: png }).then((r) => r.json());
ok(up.ok && up.url, "owner uploads media from the dashboard");
ok((await S("GET", "/api/media")).body.items.length >= 1, "media lists for owner");

// Keys
const mk = await S("POST", "/api/sophia/tokens", { label: "agent" });
ok(mk.body.token && mk.body.token.startsWith("mykey-"), "owner mints a key from the dashboard");
ok((await S("GET", "/api/sophia/tokens")).body.tokens.some((t) => t.role === "editor"), "keys listed for management");

// OAuth (Option A, optional)
ok((await S("PUT", "/api/sophia/oauth", { enabled: true, clientId: "abc.apps.googleusercontent.com", clientSecret: "secret123", allowedEmail: "Me@Gmail.com" })).body.ok, "owner saves Google OAuth config");
const getO = await S("GET", "/api/sophia/oauth");
ok(getO.body.enabled && getO.body.clientId === "abc.apps.googleusercontent.com" && getO.body.allowedEmail === "me@gmail.com" && getO.body.clientSecret === undefined, "OAuth config returned WITHOUT the secret");
const g = await fetch(base + "/auth/google", { redirect: "manual" });
ok(g.status === 302 && (g.headers.get("location") || "").startsWith("https://accounts.google.com/"), "/auth/google redirects to Google consent");
ok((await (await fetch(base + "/_setup")).text()).includes("Sign in with Google"), "login page offers Google sign-in when enabled");

// Security: no session + no key -> no edit
ok(!(await fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ops: [{ op: "mset", path: "pages./x", value: { blocks: [] } }] }) }).then((r) => r.json())).ok, "no session + no key -> cannot edit");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); await new Promise((r) => setTimeout(r, 200)); try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
