// package-test.mjs — prove the uploadable artifact works standalone (no node_modules).
// Copies package/ to a temp dir, boots it, and runs the full self-hosted flow.
import { spawn } from "node:child_process";
import { cpSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "sophia-pkg-"));
cpSync(join(root, "package"), tmp, { recursive: true });   // NO node_modules copied

const port = 3987, base = `http://localhost:${port}`;
const child = spawn(process.execPath, ["app.js"], { cwd: tmp, env: { ...process.env, PORT: String(port) }, stdio: "ignore" });

let up = false;
for (let i = 0; i < 50; i++) { try { await fetch(base + "/"); up = true; break; } catch { await new Promise((r) => setTimeout(r, 150)); } }

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));
try {
  ok(up, "packaged app boots from a dir with NO node_modules (zero runtime deps)");
  const home = await (await fetch(base + "/")).text();
  ok(home.includes("Sophia Stack"), "serves the starter site");
  ok(home.includes("sx-custom-live"), "live CSS layer present");
  const setup = await (await fetch(base + "/_setup")).text();
  ok(setup.includes("Get started") || setup.includes("Create account"), "first-run setup page (Get started)");
  const sr = await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "hunter2pw" }) });
  const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
  ok((await sr.json()).ok, "Get started creates the admin account");
  const mk = await (await fetch(base + "/api/sophia/tokens", { method: "POST", headers: { "Content-Type": "application/json", Cookie: sid }, body: JSON.stringify({ label: "agent" }) })).json();
  ok(mk.token && mk.token.startsWith("mykey-"), "dashboard mints a mykey- key to hand to the AI");
  const patch = await (await fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + mk.token }, body: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "headline", value: "Built by my agent" }] }) })).json();
  ok(patch.ok, "agent token edits the live site via the API");
  const cat = await (await fetch(base + "/api/sophia/catalog")).json();
  ok(cat.blocks && cat.styles, "catalog served for the agent to read");
} finally {
  child.kill();
}
console.log(`\n  ${pass} passed, ${fail} failed`);
// Best-effort temp cleanup (Windows may hold the handle briefly after kill).
await new Promise((r) => setTimeout(r, 400));
try { rmSync(tmp, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
