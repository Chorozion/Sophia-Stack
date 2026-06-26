// recovery-test.mjs — ownership recovery: lost password OR intruder lockout.
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

const dir = fileURLToPath(new URL("./out/_recovery-test", import.meta.url));
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const srv = await createServer({ dir, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));
const post = (p, b, cookie) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(b) });

// Get started -> capture session + recovery code
const sr = await post("/_setup", { username: "thomas", password: "pass12345" });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const setup = await sr.json();
ok(setup.first && setup.recoveryCode && setup.recoveryCode.trim().split(/\s+/).length === 5, "Get started issues a five-word recovery string");

// Owner mints a key; an attacker is now using it
const key = (await (await post("/api/sophia/tokens", { label: "agent" }, sid)).json()).token;
const editOk = await (await fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "headline", value: "attacker edit" }] }) })).json();
ok(editOk.ok, "leaked key can edit (the problem we're solving)");

// Wrong recovery code rejected
ok((await post("/_recover", { code: "recover-wrong", username: "t", password: "newpass123" })).status === 401, "wrong recovery code rejected");

// Recover: new login, and EVERYTHING old is revoked
const rec = await (await post("/_recover", { code: setup.recoveryCode, username: "thomas2", password: "newpass123" })).json();
ok(rec.ok && rec.recoveryCode && rec.recoveryCode.trim().split(/\s+/).length === 5 && rec.recoveryCode !== setup.recoveryCode, "recovery resets login + issues a NEW 5-word code");

// The attacker's key no longer works
const afterKey = await (await fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key }, body: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "headline", value: "still here?" }] }) })).json();
ok(!afterKey.ok, "the leaked key is DEAD after recovery (intruder locked out)");

// Old session dead, old password dead, new password works
ok((await fetch(base + "/dashboard", { headers: { Cookie: sid }, redirect: "manual" })).status === 302, "old session is dead");
ok((await post("/_setup", { username: "thomas", password: "pass12345" })).status === 401, "old password no longer works");
ok((await (await post("/_setup", { username: "thomas2", password: "newpass123" })).json()).ok, "new password works");

// brute-force guard: repeated wrong logins lock the IP (429)
let locked = false;
for (let i = 0; i < 9; i++) { if ((await post("/_setup", { username: "thomas2", password: "WRONGpw" })).status === 429) locked = true; }
ok(locked, "brute-force guard locks the IP after 8 wrong logins (429)");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); await new Promise((r) => setTimeout(r, 200)); try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
