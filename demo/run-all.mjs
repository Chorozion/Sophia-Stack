// run-all.mjs — run every in-process test suite and aggregate the results.
// (package-test is separate: it needs a built package — see `npm run test:package`.)
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SUITES = [
  "react-test", "connections-test", "server-test", "mcp-test", "app-test",
  "pages-test", "pro-test", "recovery-test", "dashboard-test", "agent-test", "providers-test", "extensions-test", "accounts-test", "payments-test", "seo-test", "update-test", "ui-test",
];

let pass = 0, fail = 0;
const failedSuites = [];
for (const name of SUITES) {
  const r = spawnSync(process.execPath, [join(here, name + ".mjs")], { encoding: "utf8" });
  const out = (r.stdout || "") + (r.stderr || "");
  const m = out.match(/(\d+) passed, (\d+) failed/);
  const p = m ? +m[1] : 0;
  const f = m ? +m[2] : (r.status ? 1 : 0);
  pass += p; fail += f;
  const ok = r.status === 0 && f === 0;
  console.log((ok ? "  ok   " : "  FAIL ") + name.padEnd(18) + (m ? m[0] : (ok ? "ok" : "crashed")));
  if (!ok) { failedSuites.push(name); if (!m) console.log(out.split("\n").slice(-10).map((l) => "      " + l).join("\n")); }
}
console.log(`\n${pass} passed, ${fail} failed  (${SUITES.length} suites, ${failedSuites.length} failing)`);
process.exit(fail || failedSuites.length ? 1 : 0);
