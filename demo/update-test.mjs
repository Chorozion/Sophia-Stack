// update-test.mjs — update awareness (version compare + channel check) and the
// non-destructive forward-migration framework (backup, idempotent, never deletes).
import http from "node:http";
import { rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { cmpVersion, checkForUpdate } from "../src/updater.mjs";
import { migrate, dataVersion, setDataVersion } from "../src/migrate.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// ── version compare ──
ok(cmpVersion("1.2.0", "1.1.9") === 1 && cmpVersion("1.0.0", "1.0.0") === 0 && cmpVersion("v1.0.0", "1.2.0") === -1, "cmpVersion handles ordering + v-prefix");

// ── update check against a mock release channel ──
const ghub = http.createServer((req, res) => res.end(JSON.stringify({ tag_name: "v1.2.0", body: "Shiny new release", html_url: "https://x/r", assets: [{ name: "sophia-stack.zip", browser_download_url: "https://x/sophia-stack.zip", size: 1234 }] })));
await new Promise((r) => ghub.listen(0, r));
const channel = "http://127.0.0.1:" + ghub.address().port;
const up = await checkForUpdate({ url: channel, current: "1.0.0" });
ok(up.updateAvailable === true && up.latest === "1.2.0" && up.asset && /sophia-stack\.zip/.test(up.asset.url), "checkForUpdate detects a newer version + zip asset");
ok((await checkForUpdate({ url: channel, current: "1.2.0" })).updateAvailable === false, "no update when already current");
ok((await checkForUpdate({ url: channel, current: "1.0.0", env: { SOPHIA_UPDATE_CHECK: "off" } })).enabled === false, "update check can be disabled");

// ── migration framework ──
const root = fileURLToPath(new URL("./out/_update-test", import.meta.url));
rmSync(root, { recursive: true, force: true });

// fresh install: no stamp -> adopt current version, no migration
const d1 = join(root, "fresh"); mkdirSync(d1, { recursive: true }); writeFileSync(join(d1, "model.json"), JSON.stringify({ site: "X" }));
const r1 = migrate(d1, "1.0.0", []);
ok(r1.firstRun === true && dataVersion(d1) === "1.0.0", "fresh install stamps current version, no migration");

// existing data at 1.0.0, code 1.1.0, with one additive migration
const d2 = join(root, "upgrade"); mkdirSync(d2, { recursive: true });
writeFileSync(join(d2, "model.json"), JSON.stringify({ site: "Acme", keep: "me" }));
writeFileSync(join(d2, "accounts.json"), JSON.stringify({ users: { "u1": { id: "u1", email: "a@b.com" } }, sessions: {} }));
setDataVersion(d2, "1.0.0");
let ran = 0;
const MIG = [{ to: "1.1.0", describe: "add flag", up: (dir) => { ran++; const m = JSON.parse(readFileSync(join(dir, "model.json"), "utf8")); m.migratedFlag = true; writeFileSync(join(dir, "model.json"), JSON.stringify(m)); } }];
const r2 = migrate(d2, "1.1.0", MIG);
ok(r2.migrated === true && r2.applied.join() === "1.1.0" && dataVersion(d2) === "1.1.0", "forward migration runs + stamps the new version");
ok(JSON.parse(readFileSync(join(d2, "model.json"), "utf8")).keep === "me", "existing data preserved (non-destructive)");
ok(JSON.parse(readFileSync(join(d2, "model.json"), "utf8")).migratedFlag === true, "migration transform applied");
ok(existsSync(join(d2, "backups")) && readdirSync(join(d2, "backups")).length === 1, "a state backup was taken before migrating");
ok(existsSync(join(d2, "backups", readdirSync(join(d2, "backups"))[0], "accounts.json")), "backup includes member accounts");

// idempotent: running again does not re-run the migration
const r3 = migrate(d2, "1.1.0", MIG);
ok(r3.migrated === false && ran === 1, "migration is idempotent (does not re-run)");

// a failing migration leaves the data version + data intact (safe)
const d4 = join(root, "failsafe"); mkdirSync(d4, { recursive: true });
writeFileSync(join(d4, "model.json"), JSON.stringify({ site: "Safe" }));
setDataVersion(d4, "1.0.0");
const BAD = [{ to: "1.1.0", up: () => { throw new Error("boom"); } }];
const r4 = migrate(d4, "1.1.0", BAD);
ok(r4.migrated === false && r4.error && dataVersion(d4) === "1.0.0", "a failing migration aborts safely (version stays, retries next boot)");
ok(JSON.parse(readFileSync(join(d4, "model.json"), "utf8")).site === "Safe", "data intact after a failed migration");

console.log(`\n  ${pass} passed, ${fail} failed`);
ghub.close(); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
