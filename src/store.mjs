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
import { WORDS } from "./wordlist.mjs";

const newToken = () => "mykey-" + crypto.randomBytes(24).toString("base64url");
const normWords = (s) => String(s || "").toLowerCase().trim().split(/[\s-]+/).filter(Boolean).join(" ");

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

  // ── Owner admin account (username + password). Created at "Get started";
  // no console access needed on shared hosting. ──
  static hasAdmin(tokens) { return !!(tokens.auth && tokens.auth.hash); }
  static setAdmin(tokens, username, password) {
    const salt = crypto.randomBytes(16).toString("hex");
    tokens.auth = {
      username: String(username || "admin").trim().slice(0, 64),
      salt,
      hash: crypto.scryptSync(String(password), salt, 64).toString("hex"),
    };
  }
  static verifyAdmin(tokens, username, password) {
    if (!Store.hasAdmin(tokens)) return false;
    if (String(username || "").trim() !== tokens.auth.username) return false;
    const h = crypto.scryptSync(String(password), tokens.auth.salt, 64).toString("hex");
    const a = Buffer.from(h), b = Buffer.from(tokens.auth.hash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  static adminUsername(tokens) { return tokens.auth?.username || null; }

  // ── Ownership recovery — a one-time code is the root of trust ──
  // Generated at "Get started", shown ONCE. If the password is lost OR someone
  // else gets in, the true owner uses this code to reset the password and kick
  // everyone out. Self-hosted, so this (or host file access) is the only way back.
  static newRecoveryCode(tokens) {
    const pick = () => WORDS[crypto.randomInt(WORDS.length)];
    const code = [pick(), pick(), pick(), pick(), pick()].join(" "); // five random words
    const salt = crypto.randomBytes(16).toString("hex");
    tokens.recovery = { salt, hash: crypto.scryptSync(normWords(code), salt, 64).toString("hex") };
    return code; // plaintext shown once; only the hash is stored
  }
  static hasRecovery(tokens) { return !!tokens.recovery?.hash; }
  static verifyRecovery(tokens, code) {
    if (!Store.hasRecovery(tokens)) return false;
    const h = crypto.scryptSync(normWords(code), tokens.recovery.salt, 64).toString("hex");
    const a = Buffer.from(h), b = Buffer.from(tokens.recovery.hash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  // On recovery: drop every editor key + every session (kick out an intruder).
  static revokeAllAccess(tokens) {
    tokens.tokens = (tokens.tokens || []).filter((t) => t.role === "admin");
    tokens.sessions = [];
  }

  // ── Owner browser sessions (cookie) — how you get into your dashboard ──
  static addSession(tokens) {
    const id = "sess-" + crypto.randomBytes(18).toString("base64url");
    tokens.sessions = tokens.sessions || [];
    tokens.sessions.push(id);
    if (tokens.sessions.length > 50) tokens.sessions = tokens.sessions.slice(-50);
    return id;
  }
  static hasSession(tokens, id) { return !!id && (tokens.sessions || []).includes(id); }
  static clearSession(tokens, id) { tokens.sessions = (tokens.sessions || []).filter((s) => s !== id); }
}

export { newToken };
