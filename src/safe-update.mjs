// safe-update.mjs — non-destructive update engine.
//
// The contract: back up first, apply, health-check the result, and AUTO-ROLLBACK on
// any failure so a deployment can never be left half-updated or broken. The concrete
// file/network steps are injected so this core stays pure and testable; bin/sophia.mjs
// supplies real fs + a spawn-based health check.
import { spawn } from "node:child_process";

// steps: { backup(), applyNew(), healthCheck()->{ok,error?}, restore(), log? }
export async function safeApply(steps) {
  const log = steps.log || (() => {});
  let backedUp = false;
  try {
    await steps.backup(); backedUp = true; log("backed up current state");
    await steps.applyNew(); log("applied new version");
    const h = (await steps.healthCheck()) || {};
    if (!h.ok) throw new Error("health check failed: " + (h.error || "unhealthy"));
    log("health check passed");
    return { ok: true };
  } catch (e) {
    const err = String(e.message || e);
    if (!backedUp) return { ok: false, rolledBack: false, error: err };
    try { await steps.restore(); log("rolled back to the previous version"); return { ok: false, rolledBack: true, error: err }; }
    catch (re) { return { ok: false, rolledBack: false, error: err + " — AND restore failed: " + (re.message || re) }; }
  }
}

// Spawn `node <entry>` on an ephemeral PORT and confirm it answers 200 — used as the
// health check before accepting an update. Resolves {ok} / {ok:false,error}; always
// kills the probe process.
export function httpHealthCheck({ cwd, entry = "app.js", node = process.execPath, port = 8999, path = "/", timeoutMs = 8000, env = {} }) {
  return new Promise((resolve) => {
    let done = false;
    const child = spawn(node, [entry], { cwd, env: { ...process.env, ...env, PORT: String(port) }, stdio: "ignore" });
    const finish = (res) => { if (done) return; done = true; try { child.kill(); } catch {} resolve(res); };
    child.on("error", (e) => finish({ ok: false, error: "spawn failed: " + e.message }));
    const deadline = Date.now() + timeoutMs;
    const poll = async () => {
      if (done) return;
      try {
        const r = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(1500) });
        if (r.ok || r.status === 401) return finish({ ok: true }); // 401 = up but auth-gated = healthy
      } catch {}
      if (Date.now() > deadline) return finish({ ok: false, error: "no healthy response within " + timeoutMs + "ms" });
      setTimeout(poll, 400);
    };
    setTimeout(poll, 600);
  });
}
