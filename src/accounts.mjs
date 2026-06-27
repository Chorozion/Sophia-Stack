// accounts.mjs — end-user accounts (signup/login) for sites built on Sophia Stack.
//
// SEPARATE from the single owner-admin (that's src/store.mjs). These are the visitors
// who register on a deployed site — the foundation for memberships, client portals,
// gated content, and Stripe subscriptions. Same hardened crypto as the owner login:
// scrypt + per-user salt + timingSafeEqual, plus a per-email brute-force lockout.
// Never returns passHash/salt. Persists to <data-dir>/accounts.json.
import crypto from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const scrypt = (pw, salt) => crypto.scryptSync(String(pw), salt, 64).toString("hex");
const eq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254;

export class AccountStore {
  constructor(dir) {
    this.path = join(dir, "accounts.json");
    this.data = existsSync(this.path) ? safeRead(this.path) : { users: {}, sessions: {} };
    this.fails = new Map(); // email -> { n, until }
  }
  _save() { try { writeFileSync(this.path, JSON.stringify(this.data)); } catch {} }
  _public(u) { if (!u) return null; const { passHash, salt, ...rest } = u; return rest; }

  list() { return Object.values(this.data.users).map((u) => this._public(u)); }
  count() { return Object.keys(this.data.users).length; }
  get(id) { return this._public(this.data.users[id]); }
  getByEmail(email) { const e = normEmail(email); return Object.values(this.data.users).find((u) => u.email === e) || null; }

  create(email, password, meta = {}) {
    const e = normEmail(email);
    if (!validEmail(e)) return { ok: false, error: "invalid email" };
    if (!password || String(password).length < 8) return { ok: false, error: "password must be at least 8 characters" };
    if (this.getByEmail(e)) return { ok: false, error: "email already registered" };
    const id = "usr-" + crypto.randomBytes(12).toString("base64url");
    const salt = crypto.randomBytes(16).toString("hex");
    this.data.users[id] = { id, email: e, salt, passHash: scrypt(password, salt), createdAt: new Date().toISOString(), meta: meta && typeof meta === "object" ? meta : {} };
    this._save();
    return { ok: true, user: this.get(id) };
  }

  verify(email, password) {
    const e = normEmail(email);
    const g = this.fails.get(e);
    if (g && g.until > Date.now()) return { ok: false, error: "too many attempts — try again later", locked: true };
    const u = this.getByEmail(e);
    const good = !!u && eq(scrypt(password, u.salt), u.passHash);
    if (!good) {
      const n = (g && g.until > Date.now() ? g.n : (g ? g.n : 0)) + 1;
      this.fails.set(e, { n, until: n >= 5 ? Date.now() + 15 * 60 * 1000 : 0 });
      if (this.fails.size > 5000) this.fails.clear();
      return { ok: false, error: "invalid email or password" };
    }
    this.fails.delete(e);
    return { ok: true, user: this.get(u.id) };
  }

  setPassword(id, password) {
    const u = this.data.users[id]; if (!u) return { ok: false, error: "no such user" };
    if (!password || String(password).length < 8) return { ok: false, error: "password too short" };
    u.salt = crypto.randomBytes(16).toString("hex"); u.passHash = scrypt(password, u.salt); this._save();
    return { ok: true };
  }
  update(id, patch) {
    const u = this.data.users[id]; if (!u) return { ok: false, error: "no such user" };
    if (patch && patch.meta && typeof patch.meta === "object") u.meta = { ...u.meta, ...patch.meta };
    this._save(); return { ok: true, user: this.get(id) };
  }
  remove(id) {
    if (!this.data.users[id]) return { ok: false, error: "no such user" };
    delete this.data.users[id];
    for (const [t, s] of Object.entries(this.data.sessions)) if (s.userId === id) delete this.data.sessions[t];
    this._save(); return { ok: true };
  }

  // ── opaque sessions (HttpOnly cookie token) ──
  startSession(userId, ttlMs = 30 * 24 * 3600 * 1000) {
    const token = "usess-" + crypto.randomBytes(24).toString("base64url");
    this.data.sessions[token] = { userId, exp: Date.now() + ttlMs }; this._save();
    return token;
  }
  sessionUser(token) {
    const s = token && this.data.sessions[token]; if (!s) return null;
    if (s.exp < Date.now()) { delete this.data.sessions[token]; this._save(); return null; }
    return this.get(s.userId);
  }
  endSession(token) { if (token && this.data.sessions[token]) { delete this.data.sessions[token]; this._save(); } }
}

function safeRead(p) { try { const d = JSON.parse(readFileSync(p, "utf8")); return { users: d.users || {}, sessions: d.sessions || {} }; } catch { return { users: {}, sessions: {} }; } }
