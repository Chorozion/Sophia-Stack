// ui-test.mjs — compile every inline <script> the stack serves, so a template-
// literal escape bug (e.g. a stray \n that becomes a real newline) can never ship
// a blank/broken page again. new Function() parses without running -> catches
// syntax errors in the dashboard, setup, and recover pages.
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

const dir = fileURLToPath(new URL("./out/_ui-test", import.meta.url));
rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const srv = await createServer({ dir, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

const scripts = (html) => { const out = []; const re = /<script>([\s\S]*?)<\/script>/g; let m; while ((m = re.exec(html))) out.push(m[1]); return out; };
function compiles(html, label) {
  const ss = scripts(html);
  ok(ss.length > 0, `${label}: has inline script`);
  for (let i = 0; i < ss.length; i++) {
    try { new Function(ss[i]); ok(true, `${label}: script #${i + 1} compiles`); }
    catch (e) { ok(false, `${label}: script #${i + 1} SYNTAX ERROR -> ${e.message}`); }
  }
}

// setup + recover (public)
compiles(await (await fetch(base + "/_setup")).text(), "setup (Get started)");
compiles(await (await fetch(base + "/_recover")).text(), "recover");
// dashboard (needs a session)
const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
compiles(await (await fetch(base + "/dashboard", { headers: { Cookie: sid } })).text(), "dashboard");
// setup in "configured" state (sign-in variant)
compiles(await (await fetch(base + "/_setup")).text(), "setup (configured)");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close(); await new Promise((r) => setTimeout(r, 200)); try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
