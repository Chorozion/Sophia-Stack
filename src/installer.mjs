// installer.mjs — one-click extension install, straight from a git repo.
//
// Pulls a public GitHub repo's tarball, finds the extension.json, validates the
// manifest + Stack compatibility, and installs it into the extensions dir
// NON-DESTRUCTIVELY: an existing install is backed up first and restored on any
// failure, so a bad install can never break a working one.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { validateManifest, satisfies } from "./extensions.mjs";
import { VERSION } from "./version.mjs";

// "owner/repo", "owner/repo#branch", or a github.com URL (incl. /tree/<branch>/<subdir>).
export function parseRepo(input) {
  let s = String(input || "").trim().replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/, "").replace(/\/$/, "");
  let branch = "main", subdir = "";
  const hash = s.indexOf("#"); if (hash >= 0) { branch = s.slice(hash + 1) || "main"; s = s.slice(0, hash); }
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const owner = parts[0], repo = parts[1];
  if (parts[2] === "tree" && parts[3]) { branch = parts[3]; subdir = parts.slice(4).join("/"); }
  const okName = (x) => /^[\w-][\w.-]*$/.test(x); // must start alnum/-/_, no leading dot -> blocks "..", "."
  if (!okName(owner) || !okName(repo)) return null;
  if (/\.\./.test(subdir)) return null; // no path traversal in subdir
  return { owner, repo, branch, subdir };
}

// Find the directory holding extension.json (a hint/subdir, the root, or a shallow scan).
export function findManifestDir(root, hint) {
  if (hint) { const h = join(root, hint); if (existsSync(join(h, "extension.json"))) return h; }
  if (existsSync(join(root, "extension.json"))) return root;
  const scan = (dir, depth) => {
    if (depth > 3) return null;
    let kids = []; try { kids = readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const e of kids) {
      if (e.isDirectory() && e.name !== "node_modules" && e.name !== ".git") {
        const d = join(dir, e.name);
        if (existsSync(join(d, "extension.json"))) return d;
        const sub = scan(d, depth + 1); if (sub) return sub;
      }
    }
    return null;
  };
  return scan(root, 0);
}

// Install from an already-extracted directory tree (validated + non-destructive).
export function installFromDir(treeRoot, extensionsDir, hint) {
  const mdir = findManifestDir(treeRoot, hint);
  if (!mdir) return { ok: false, error: "no extension.json found in the repo" + (hint ? " under " + hint : "") };
  let manifest; try { manifest = JSON.parse(readFileSync(join(mdir, "extension.json"), "utf8")); } catch { return { ok: false, error: "invalid extension.json" }; }
  const v = validateManifest(manifest);
  if (!v.ok) return { ok: false, error: "invalid manifest: " + v.errors.join("; ") };
  if (!satisfies(VERSION, manifest.requires && manifest.requires.sophiaStack)) return { ok: false, error: `needs Sophia Stack ${manifest.requires.sophiaStack} (you have ${VERSION})` };
  const dest = join(extensionsDir, manifest.id);
  const backup = existsSync(dest) ? dest + ".bak-" + process.pid : null;
  try {
    mkdirSync(extensionsDir, { recursive: true });
    if (backup) { rmSync(backup, { recursive: true, force: true }); cpSync(dest, backup, { recursive: true }); rmSync(dest, { recursive: true, force: true }); }
    cpSync(mdir, dest, { recursive: true });
    if (backup) rmSync(backup, { recursive: true, force: true });
    return { ok: true, id: manifest.id, name: manifest.name, version: manifest.version, updated: !!backup };
  } catch (e) {
    try { if (existsSync(dest)) rmSync(dest, { recursive: true, force: true }); if (backup && existsSync(backup)) cpSync(backup, dest, { recursive: true }); } catch {}
    return { ok: false, error: "install failed (rolled back): " + (e.message || e) };
  }
}

// Full flow: parse → download tarball → extract → installFromDir. opts.fetch is injectable.
export async function installFromGit(input, opts = {}) {
  const fetchFn = opts.fetch || fetch;
  const extensionsDir = opts.extensionsDir;
  if (!extensionsDir) return { ok: false, error: "no extensions dir" };
  const r = parseRepo(input);
  if (!r) return { ok: false, error: "could not parse repo — use owner/repo, owner/repo#branch, or a GitHub URL" };
  const tmp = opts.tmpDir || join(extensionsDir, ".sophia-install-" + process.pid);
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
  try {
    const url = `https://codeload.github.com/${r.owner}/${r.repo}/tar.gz/refs/heads/${r.branch}`;
    let res; try { res = await fetchFn(url); } catch (e) { return { ok: false, error: "download failed: " + (e.message || e) }; }
    if (!res.ok) return { ok: false, error: `could not fetch ${r.owner}/${r.repo}@${r.branch} (HTTP ${res.status}) — is it a public repo?` };
    writeFileSync(join(tmp, "repo.tar.gz"), Buffer.from(await res.arrayBuffer()));
    const ex = join(tmp, "x"); mkdirSync(ex, { recursive: true });
    // cwd-relative paths avoid Windows `tar` misreading a drive-colon as host:path.
    const t = spawnSync("tar", ["-xzf", "repo.tar.gz", "-C", "x", "--strip-components=1"], { cwd: tmp, stdio: "ignore" });
    if (t.error || t.status !== 0) return { ok: false, error: "extract failed — `tar` is required" };
    const out = installFromDir(ex, extensionsDir, r.subdir || opts.subdir);
    if (out.ok) out.source = `${r.owner}/${r.repo}@${r.branch}`;
    return out;
  } finally { try { rmSync(tmp, { recursive: true, force: true }); } catch {} }
}

export function uninstall(extensionsDir, id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id || "")) return { ok: false, error: "bad id" };
  const dest = join(extensionsDir, id);
  if (!existsSync(dest)) return { ok: false, error: "not installed" };
  try { rmSync(dest, { recursive: true, force: true }); return { ok: true, id }; } catch (e) { return { ok: false, error: e.message }; }
}
