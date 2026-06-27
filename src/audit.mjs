// audit.mjs — append-only audit log (who/when/what). Used for extension actions
// and any sensitive operation. Stored as JSONL in the data dir.
import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export function makeAudit(dir) {
  const path = join(dir, "audit.jsonl");
  return {
    log(actor, action, details) {
      try { appendFileSync(path, JSON.stringify({ ts: new Date().toISOString(), actor: String(actor || "?"), action: String(action || "?"), details: details ?? null }) + "\n"); } catch {}
    },
    tail(n = 200) {
      try {
        if (!existsSync(path)) return [];
        return readFileSync(path, "utf8").trim().split("\n").slice(-n)
          .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      } catch { return []; }
    },
  };
}
