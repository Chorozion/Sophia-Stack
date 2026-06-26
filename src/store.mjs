// store.mjs — self-contained persistence for a deployed Sophia site.
//
// Everything an uploaded stack edits lives in ONE data dir: the Site Model, a
// live-editable custom CSS layer, and API tokens. Edits write here atomically,
// so they persist across restarts WITHOUT a redeploy — and the hardened deployer
// preserves this dir across releases. This is what makes the stack editable from
// within itself once it's up.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, chmodSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const newToken = () => "sx_" + crypto.randomBytes(24).toString("base64url");

export class Store {
  constructor(dir) {
    this.dir = dir;
    this.modelPath = join(dir, "model.json");
    this.cssPath = join(dir, "custom.css");
    this.tokensPath = join(dir, "tokens.json");
    this.historyPath = join(dir, "history.json");
    mkdirSync(dir, { recursive: true });
  }

  // Bounded version history (for rollback). Each entry is a {model, css} snapshot
  // of a KNOWN-GOOD state, newest last.
  history() { return this._readJson(this.historyPath, []); }
  snapshot(model, css, max = 30) {
    const h = this.history();
    h.push({ model, css: String(css || "") });
    while (h.length > max) h.shift();
    this._writeAtomic(this.historyPath, JSON.stringify(h));
  }
  popVersion() {
    const h = this.history();
    const prev = h.pop();
    this._writeAtomic(this.historyPath, JSON.stringify(h));
    return prev || null;
  }

  _readJson(p, fallback) {
    try { return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : fallback; }
    catch { return fallback; }
  }
  _writeAtomic(p, text) {
    const tmp = p + ".tmp-" + process.pid;
    writeFileSync(tmp, text);
    renameSync(tmp, p);
  }

  // Load everything; seed model from `seedModel` if the store is empty.
  load(seedModel = null) {
    let model = this._readJson(this.modelPath, null);
    if (!model && seedModel) { model = seedModel; this.saveModel(model); }
    const css = existsSync(this.cssPath) ? readFileSync(this.cssPath, "utf8") : "";
    let tokens = this._readJson(this.tokensPath, null);
    if (!tokens) tokens = { tokens: [] };
    return { model: model || { site: "untitled", style: "dark-tech", pages: { "/": { blocks: [] } } }, css, tokens };
  }

  saveModel(model) { this._writeAtomic(this.modelPath, JSON.stringify(model, null, 2)); }
  saveCss(css) { this._writeAtomic(this.cssPath, String(css || "")); }
  saveTokens(tokens) {
    this._writeAtomic(this.tokensPath, JSON.stringify(tokens, null, 2));
    try { chmodSync(this.tokensPath, 0o600); } catch {}
  }

  // Ensure an admin token exists; returns the full token string only when freshly
  // created (bootstrap) so it can be surfaced once. Otherwise returns null.
  ensureAdminToken(tokens) {
    if ((tokens.tokens || []).some((t) => t.role === "admin")) return null;
    const token = newToken();
    tokens.tokens = tokens.tokens || [];
    tokens.tokens.push({ token, label: "bootstrap-admin", role: "admin", created: 0 });
    this.saveTokens(tokens);
    return token;
  }

  static mintToken(tokens, { label = "editor", role = "editor" } = {}) {
    const token = newToken();
    tokens.tokens = tokens.tokens || [];
    tokens.tokens.push({ token, label, role, created: 0 });
    return token;
  }

  // ── Owner password (first-run setup; no console access needed on shared hosting) ──
  static hasPassword(tokens) { return !!(tokens.auth && tokens.auth.hash); }
  static setPassword(tokens, password) {
    const salt = crypto.randomBytes(16).toString("hex");
    tokens.auth = { salt, hash: crypto.scryptSync(String(password), salt, 64).toString("hex") };
  }
  static verifyPassword(tokens, password) {
    if (!Store.hasPassword(tokens)) return false;
    const h = crypto.scryptSync(String(password), tokens.auth.salt, 64).toString("hex");
    const a = Buffer.from(h), b = Buffer.from(tokens.auth.hash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

export { newToken };
