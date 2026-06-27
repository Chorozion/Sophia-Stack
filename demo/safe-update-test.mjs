// safe-update-test.mjs — the non-destructive update engine: every failure path
// auto-rolls-back, and the spawn-based health check accepts only a healthy boot.
import { rmSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import net from "node:net";
import { safeApply, httpHealthCheck } from "../src/safe-update.mjs";

const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

const mk = (over = {}) => {
  const calls = [];
  const steps = {
    backup: async () => calls.push("backup"),
    applyNew: async () => calls.push("applyNew"),
    healthCheck: async () => { calls.push("healthCheck"); return { ok: true }; },
    restore: async () => calls.push("restore"),
    ...over, calls,
  };
  return steps;
};

// success: no restore
let s = mk();
let r = await safeApply(s);
ok(r.ok && !s.calls.includes("restore"), "success path applies and never restores");

// health check fails -> rollback
s = mk({ healthCheck: async () => ({ ok: false, error: "boom" }) });
r = await safeApply(s);
ok(!r.ok && r.rolledBack && s.calls.includes("restore"), "failed health check auto-rolls-back");

// applyNew throws -> rollback (we backed up first)
s = mk({ applyNew: async () => { throw new Error("apply failed"); } });
r = await safeApply(s);
ok(!r.ok && r.rolledBack && /apply failed/.test(r.error), "a failed apply auto-rolls-back");

// backup throws -> nothing applied, no restore needed
s = mk({ backup: async () => { throw new Error("no backup"); } });
r = await safeApply(s);
ok(!r.ok && r.rolledBack === false && !s.calls.includes("applyNew"), "a failed backup aborts before touching anything");

// restore itself fails -> reported honestly
s = mk({ healthCheck: async () => ({ ok: false, error: "x" }), restore: async () => { throw new Error("restore broke"); } });
r = await safeApply(s);
ok(!r.ok && r.rolledBack === false && /restore failed/.test(r.error), "a failed restore is reported clearly");

// httpHealthCheck: a healthy server passes; a crashing entry fails
const root = fileURLToPath(new URL("./out/_safeupd", import.meta.url));
rmSync(root, { recursive: true, force: true }); mkdirSync(root, { recursive: true });
// ESM fixtures (this repo is type:module, so .js under it is ESM).
writeFileSync(root + "/good.js", "import http from 'node:http'; http.createServer((q,s)=>s.end('ok')).listen(Number(process.env.PORT),'127.0.0.1')");
writeFileSync(root + "/bad.js", "process.exit(1)");
ok((await httpHealthCheck({ cwd: root, entry: "good.js", port: await freePort(), timeoutMs: 6000 })).ok, "httpHealthCheck passes a healthy boot");
ok(!(await httpHealthCheck({ cwd: root, entry: "bad.js", port: await freePort(), timeoutMs: 3000 })).ok, "httpHealthCheck fails a crashing boot");

console.log(`\n  ${pass} passed, ${fail} failed`);
try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
