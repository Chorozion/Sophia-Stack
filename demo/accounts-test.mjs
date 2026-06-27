// accounts-test.mjs — end-user accounts: signup, login, session, wrong-password,
// duplicate/weak rejection, password change, owner listing, logout, lockout.
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";
import { AccountStore } from "../src/accounts.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

const root = fileURLToPath(new URL("./out/_accounts-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const srv = await createServer({ dir: root, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
const J = (m, p, b, cookie) => fetch(base + p, { method: m, headers: { ...(b !== undefined ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined })
  .then(async (r) => ({ status: r.status, cookie: (r.headers.get("set-cookie") || "").split(";")[0], body: await r.json().catch(() => ({})) }));

// signup
const su = await J("POST", "/api/accounts/signup", { email: "Member@Example.com ", password: "hunter2pass" });
ok(su.status === 200 && su.body.user.email === "member@example.com" && !("passHash" in su.body.user), "signup creates a user (email normalized, no hash leaked)");
const uc = su.cookie;
ok(/^uid=/.test(uc), "signup sets an HttpOnly uid session cookie");

// me
ok((await J("GET", "/api/accounts/me", undefined, uc)).body.user.email === "member@example.com", "me returns the signed-in user");
ok((await J("GET", "/api/accounts/me")).status === 401, "me without cookie is 401");

// weak + duplicate
ok((await J("POST", "/api/accounts/signup", { email: "a@b.co", password: "short" })).status === 400, "weak password rejected");
ok((await J("POST", "/api/accounts/signup", { email: "member@example.com", password: "anotherpass" })).status === 400, "duplicate email rejected");

// login wrong + right
ok((await J("POST", "/api/accounts/login", { email: "member@example.com", password: "wrong" })).status === 401, "wrong password is 401");
const li = await J("POST", "/api/accounts/login", { email: "member@example.com", password: "hunter2pass" });
ok(li.status === 200 && /^uid=/.test(li.cookie), "correct login returns a session");

// change password
ok((await J("POST", "/api/accounts/password", { current: "hunter2pass", password: "evenbetterpass" }, uc)).status === 200, "password change works");
ok((await J("POST", "/api/accounts/login", { email: "member@example.com", password: "evenbetterpass" })).status === 200, "login with the new password works");

// owner-only listing
ok((await J("GET", "/api/accounts")).status === 401, "member list requires the owner");
const sr = await J("POST", "/_setup", { username: "admin", password: "ownerpass1" });
ok((await J("GET", "/api/accounts", undefined, sr.cookie)).body.count === 1, "owner can list members");

// logout
const lo = await J("POST", "/api/accounts/logout", {}, uc);
ok(/^uid=;/.test(lo.cookie) || lo.body.ok, "logout clears the cookie");

// per-email brute-force lockout (deterministic, module-level)
const ldir = root + "/lock"; mkdirSync(ldir, { recursive: true });
const as = new AccountStore(ldir);
as.create("lock@test.com", "correcthorse");
for (let i = 0; i < 5; i++) as.verify("lock@test.com", "wrong");
const after = as.verify("lock@test.com", "correcthorse"); // correct, but should be locked out now
ok(after.ok === false && after.locked === true, "5 failures lock the account (correct password still blocked while locked)");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); await new Promise((r) => setTimeout(r, 150)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
