// migrate.mjs — non-destructive forward migration of a deployment's stored data.
//
// When a deployment boots on a newer code version, its .sophia-data is migrated
// FORWARD automatically and safely: state is backed up first, only additive/forward
// migrations run, and the data version is stamped only after success. Migrations must
// never delete data. This is what lets existing stacks update without losing anything.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";
import { cmpVersion } from "./updater.mjs";
import { VERSION } from "./version.mjs";

// Small, critical state we snapshot before any migration (NOT media — too large).
const STATE_FILES = ["model.json", "custom.css", "tokens.json", "accounts.json", "history.json"];

// Ordered, idempotent, ADDITIVE migrations: { to, describe, up(dir) }.
// up() must only add/transform forward — never delete. Empty today; framework is live.
// Example:
//   { to: "1.1.0", describe: "stamp plan on legacy members",
//     up: (dir) => { /* read accounts.json, add missing fields, write back */ } },
export const MIGRATIONS = [];

export function dataVersion(dir) {
  try { const p = join(dir, ".sophia-version"); return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")).version : null; } catch { return null; }
}
export function setDataVersion(dir, v) {
  try { writeFileSync(join(dir, ".sophia-version"), JSON.stringify({ version: v, ts: new Date().toISOString() }, null, 2)); } catch {}
}

export function backupState(dir, tag) {
  const dest = join(dir, "backups", tag);
  try {
    mkdirSync(dest, { recursive: true });
    for (const f of STATE_FILES) { const src = join(dir, f); if (existsSync(src)) copyFileSync(src, join(dest, f)); }
    return dest;
  } catch { return null; }
}

// Bring stored data up to `codeVersion`. Returns a summary; never throws.
export function migrate(dir, codeVersion = VERSION, migrations = MIGRATIONS) {
  if (!dir || !existsSync(dir)) return { migrated: false, reason: "no data dir" };
  const from = dataVersion(dir);
  // Fresh install (no stamp yet): adopt the current version, nothing to migrate.
  if (from === null) { setDataVersion(dir, codeVersion); return { migrated: false, from: null, to: codeVersion, firstRun: true }; }
  const pending = migrations
    .filter((m) => cmpVersion(m.to, from) > 0 && cmpVersion(m.to, codeVersion) <= 0)
    .sort((a, b) => cmpVersion(a.to, b.to));
  if (!pending.length) {
    if (cmpVersion(codeVersion, from) > 0) setDataVersion(dir, codeVersion); // code newer, data unchanged
    return { migrated: false, from, to: cmpVersion(codeVersion, from) >= 0 ? codeVersion : from, applied: [] };
  }
  const backup = backupState(dir, "pre-" + codeVersion + "-" + Date.now());
  const applied = [];
  for (const m of pending) {
    try { m.up(dir); applied.push(m.to); }
    catch (e) { return { migrated: false, from, to: from, error: `migration ${m.to} failed: ${e.message} (data left at ${from}; backup: ${backup})`, backup, applied }; }
  }
  setDataVersion(dir, codeVersion);
  return { migrated: true, from, to: codeVersion, applied, backup };
}
