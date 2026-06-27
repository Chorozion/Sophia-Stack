// installer-test.mjs — one-click git install: repo parsing, manifest location,
// non-destructive install/rollback, the full mocked git-pull flow, and uninstall.
import { spawnSync } from "node:child_process";
import { rmSync, mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRepo, findManifestDir, installFromDir, installFromGit, uninstall } from "../src/installer.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// parseRepo
ok(parseRepo("Chorozion/SophiaXT-SEO-Suite").repo === "SophiaXT-SEO-Suite", "parseRepo owner/repo");
ok(parseRepo("owner/repo#dev").branch === "dev", "parseRepo branch via #");
const u = parseRepo("https://github.com/o/r/tree/main/extensions/seo");
ok(u && u.subdir === "extensions/seo" && u.branch === "main", "parseRepo GitHub /tree/ URL with subdir");
ok(parseRepo("not-a-repo") === null && parseRepo("../evil/x") === null, "parseRepo rejects junk");

const root = fileURLToPath(new URL("./out/_installer", import.meta.url));
rmSync(root, { recursive: true, force: true });
const extDir = join(root, "extensions");
mkdirSync(extDir, { recursive: true });

// fixture extension tree (mimicking a repo with the extension in a subdir)
const mkExt = (dir, id, requires) => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "extension.json"), JSON.stringify({ id, name: id, version: "0.1.0", entry: "./extension.js", permissions: ["site:read"], ...(requires ? { requires: { sophiaStack: requires } } : {}) }));
  writeFileSync(join(dir, "extension.js"), "export default { async activate(){} };");
};
const repo = join(root, "repo-main");
mkExt(join(repo, "extensions", "demo-ext"), "demo-installer-ext");

// findManifestDir
ok(findManifestDir(repo, "extensions/demo-ext").endsWith("demo-ext"), "findManifestDir honors a subdir hint");
ok(findManifestDir(repo).endsWith("demo-ext"), "findManifestDir scans to locate extension.json");

// installFromDir
let r = installFromDir(repo, extDir, "extensions/demo-ext");
ok(r.ok && r.id === "demo-installer-ext" && existsSync(join(extDir, "demo-installer-ext", "extension.json")), "installFromDir installs the extension");

// non-destructive update: reinstall, no leftover .bak
r = installFromDir(repo, extDir, "extensions/demo-ext");
ok(r.ok && r.updated === true && !readdirSync(extDir).some((d) => d.includes(".bak")), "reinstall updates in place with no leftover backup");

// reject incompatible + bad manifest
const badReq = join(root, "badreq"); mkExt(join(badReq, "e"), "needs-future", ">=99.0.0");
ok(!installFromDir(badReq, extDir, "e").ok, "rejects an extension that needs a newer Stack");
const bad = join(root, "bad"); mkdirSync(join(bad, "e"), { recursive: true }); writeFileSync(join(bad, "e", "extension.json"), "{ not json");
ok(!installFromDir(bad, extDir, "e").ok, "rejects an invalid manifest");

// full git flow via a mocked fetch returning a real tar.gz
const tgz = join(root, "repo.tar.gz");
spawnSync("tar", ["-czf", "repo.tar.gz", "repo-main"], { cwd: root, stdio: "ignore" }); // cwd-relative: avoids Windows drive-colon parsing
const buf = readFileSync(tgz);
const mockFetch = async () => ({ ok: true, status: 200, arrayBuffer: async () => buf });
const g = await installFromGit("someowner/somerepo#main", { extensionsDir: extDir, fetch: mockFetch, subdir: "extensions/demo-ext" });
ok(g.ok && g.id === "demo-installer-ext" && g.source === "someowner/somerepo@main", "installFromGit downloads + extracts + installs");
ok(!(await installFromGit("o/r", { extensionsDir: extDir, fetch: async () => ({ ok: false, status: 404 }) })).ok, "installFromGit reports a failed fetch");

// uninstall
ok(uninstall(extDir, "demo-installer-ext").ok && !existsSync(join(extDir, "demo-installer-ext")), "uninstall removes the extension");
ok(!uninstall(extDir, "nope").ok, "uninstall of a missing extension errors");

console.log(`\n  ${pass} passed, ${fail} failed`);
try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
