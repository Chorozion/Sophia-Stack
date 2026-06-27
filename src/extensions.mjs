// extensions.mjs — Sophia Stack extension/plugin system.
//
// Extensions are optional, installable modules (e.g. the Sophia SEO Suite). They
// register admin nav, settings, API routes, and hook listeners, and they touch the
// site ONLY through the same validated/rollback-safe patch pipeline that external
// agents use — never by mutating the model directly. Every granted capability is
// gated by a manifest permission; every site write is audited.
//
// NOTE on trust: extension *code* runs in the host Node process (like WordPress
// plugins) — install only extensions you trust. Permissions scope what the host
// hands them; they do not sandbox arbitrary Node access. The vm sandbox is for
// server functions, not extensions.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const PERMISSIONS = [
  "site:read", "site:patch", "pages:read", "pages:patch",
  "media:read", "media:write", "data:read", "data:write",
  "settings:read", "settings:write", "ai:use", "jobs:run", "audit:read",
  "accounts:read", "accounts:write",
];

export const HOOKS = [
  "site.beforePublish", "site.afterPublish", "site.afterPatch",
  "page.beforeSave", "page.afterSave", "media.afterUpload", "seo.audit.requested",
  "payments.event", "update.available",
];

export function validateManifest(m) {
  const e = [];
  if (!m || typeof m !== "object") return { ok: false, errors: ["manifest is not an object"] };
  if (!/^[a-z0-9][a-z0-9-]*$/.test(m.id || "")) e.push("id must be lowercase kebab-case");
  if (!m.name) e.push("name is required");
  if (!m.version) e.push("version is required");
  if (!m.entry) e.push("entry is required");
  for (const p of m.permissions || []) if (!PERMISSIONS.includes(p)) e.push("unknown permission: " + p);
  if (m.adminNav && !Array.isArray(m.adminNav)) e.push("adminNav must be an array");
  if (m.routes && !Array.isArray(m.routes)) e.push("routes must be an array");
  if (m.hooks) for (const h of m.hooks) if (!HOOKS.includes(h)) e.push("unknown hook: " + h);
  return { ok: e.length === 0, errors: e };
}

// Simple semver-ish ">=x.y.z" check for requires.sophiaStack.
export function satisfies(version, range) {
  if (!range) return true;
  const m = String(range).match(/^>=\s*(\d+)\.(\d+)\.(\d+)/);
  if (!m) return true;
  const need = [+m[1], +m[2], +m[3]];
  const have = String(version || "0.0.0").split(".").map((x) => +x || 0);
  for (let i = 0; i < 3; i++) { if ((have[i] || 0) > need[i]) return true; if ((have[i] || 0) < need[i]) return false; }
  return true;
}

export class ExtensionHost {
  // deps: { stackVersion, getModel, doPatch, doSetCss, store, dataStore, mediaStore,
  //         aiGenerate, aiListProviders, aiDefaultProvider, getExtSettings,
  //         setExtSettings, getEnabled, setEnabled, audit }
  constructor(deps) {
    this.deps = deps;
    this.exts = new Map();          // id -> { manifest, dir, enabled, active, ... }
    this.routes = new Map();        // "id:path" -> { ext, handler }
    this.hookListeners = new Map(); // hook -> [{id, fn}]
    this.audit = deps.audit || { log() {}, tail() { return []; } };
  }

  hasPerm(ext, perm) { return (ext.manifest.permissions || []).includes(perm); }

  _context(ext) {
    const host = this, id = ext.manifest.id;
    const need = (perm) => { if (!host.hasPerm(ext, perm)) throw new Error(`extension "${id}" is missing permission "${perm}"`); };
    return {
      id,
      manifest: ext.manifest,
      stackVersion: host.deps.stackVersion,
      permissions: ext.manifest.permissions || [],
      logger: { info: (...a) => console.log(`[ext:${id}]`, ...a), error: (...a) => console.error(`[ext:${id}]`, ...a) },
      audit: { log: (action, details) => host.audit.log("ext:" + id, action, details) },
      // Site/pages: read freely (with perm); writes go through the validated pipeline.
      // patch(ops, label?) — the optional label names the version snapshot for targeted rollback.
      site: {
        read: () => { need("site:read"); return host.deps.getModel(); },
        patch: (ops, label) => { need("site:patch"); const r = host.deps.doPatch(ops, label || `ext:${id}`); host.audit.log("ext:" + id, "site.patch", { ok: r.ok, changed: r.changed || null, error: r.error || null, label: label || null }); return r; },
        setCss: (css) => { need("site:patch"); const r = host.deps.doSetCss(css); host.audit.log("ext:" + id, "site.setCss", { ok: r.ok }); return r; },
      },
      pages: {
        read: () => { need("pages:read"); return host.deps.getModel().pages; },
        patch: (ops, label) => { need("pages:patch"); const r = host.deps.doPatch(ops, label || `ext:${id}`); host.audit.log("ext:" + id, "pages.patch", { ok: r.ok, label: label || null }); return r; },
      },
      // Enumerable versions + targeted rollback (snapshots current state first).
      versions: {
        list: () => { need("site:read"); return host.deps.versions(); },
        rollbackTo: (vid) => { need("site:patch"); const r = host.deps.rollbackTo(vid); host.audit.log("ext:" + id, "versions.rollbackTo", { id: vid, ok: r.ok }); return r; },
      },
      media: {
        list: () => { need("media:read"); return host.deps.mediaStore.list(); },
        // Save a Buffer / base64 string / data URL to the site's media library → { id, url, type }.
        save: (data, meta = {}) => {
          need("media:write");
          let buf, type = meta.type;
          if (Buffer.isBuffer(data)) buf = data;
          else if (typeof data === "string") {
            const m = data.match(/^data:([^;]+);base64,(.*)$/);
            if (m) { type = type || m[1]; buf = Buffer.from(m[2], "base64"); }
            else buf = Buffer.from(data, "base64");
          } else throw new Error("media.save expects a Buffer, base64 string, or data URL");
          const rec = host.deps.mediaStore.save(buf, { name: meta.name, type });
          host.audit.log("ext:" + id, "media.save", { url: rec.url, type: rec.type });
          return rec;
        },
      },
      // End-user accounts (members) — for memberships, portals, and payments.
      accounts: {
        list: () => { need("accounts:read"); return host.deps.accounts.list(); },
        count: () => { need("accounts:read"); return host.deps.accounts.count(); },
        get: (uid) => { need("accounts:read"); return host.deps.accounts.get(uid); },
        getByEmail: (e) => { need("accounts:read"); const u = host.deps.accounts.getByEmail(e); return u ? host.deps.accounts.get(u.id) : null; },
        create: (email, pw, meta) => { need("accounts:write"); return host.deps.accounts.create(email, pw, meta); },
        update: (uid, patch) => { need("accounts:write"); return host.deps.accounts.update(uid, patch); },
        remove: (uid) => { need("accounts:write"); return host.deps.accounts.remove(uid); },
      },
      data: {
        list: (c, o) => { need("data:read"); return host.deps.dataStore.list(c, o || {}); },
        get: (c, i) => { need("data:read"); return host.deps.dataStore.get(c, i); },
        create: (c, rec) => { need("data:write"); return host.deps.dataStore.create(c, rec); },
        update: (c, i, rec) => { need("data:write"); return host.deps.dataStore.update(c, i, rec); },
        remove: (c, i) => { need("data:write"); return host.deps.dataStore.remove(c, i); },
      },
      settings: {
        get: (key) => { need("settings:read"); const s = host.deps.getExtSettings(id) || {}; return key === undefined ? s : s[key]; },
        set: (key, val) => { need("settings:write"); host.deps.setExtSettings(id, key, val); },
        register: (schema) => { ext.settingsSchema = schema; },
      },
      // Provider-agnostic AI — routes through the provider abstraction, never a vendor.
      ai: {
        listProviders: () => { need("ai:use"); return host.deps.aiListProviders(); },
        getDefaultProvider: () => { need("ai:use"); return host.deps.aiDefaultProvider(); },
        generate: async (opts) => { need("ai:use"); return host.deps.aiGenerate(opts || {}); },
        stream: async () => { need("ai:use"); throw new Error("sophia.ai.stream() is planned — use ai.generate() for now"); },
        embed: async (texts) => { need("ai:use"); return host.deps.aiEmbed(texts); },
      },
      hooks: {
        on: (hook, fn) => { if (!HOOKS.includes(hook)) throw new Error("unknown hook: " + hook); const a = host.hookListeners.get(hook) || []; a.push({ id, fn }); host.hookListeners.set(hook, a); },
        emit: (hook, payload) => host.emit(hook, payload, id),
      },
      routes: { register: (path, handler) => { host.routes.set(id + ":" + String(path).replace(/^\//, ""), { ext: id, handler }); } },
      admin: {
        registerNav: (item) => { ext.nav = ext.nav || []; ext.nav.push(item); },
        registerPanel: (panel) => { ext.panels = ext.panels || []; ext.panels.push(panel); },
      },
      jobs: {
        register: (name, fn) => { need("jobs:run"); ext.jobs = ext.jobs || {}; ext.jobs[name] = fn; },
        run: (name, payload) => { need("jobs:run"); return host.runJob(id, name, payload); },
      },
    };
  }

  // R4: execute a registered job by name (manually, via ctx.jobs.run, or an owner endpoint).
  async runJob(id, name, payload) {
    const ext = this.exts.get(id);
    if (!ext || !ext.active || !ext.enabled) return { ok: false, error: "extension not active" };
    const fn = ext.jobs && ext.jobs[name];
    if (typeof fn !== "function") return { ok: false, error: "no such job: " + name };
    try { const result = await fn(payload || {}); this.audit.log("ext:" + id, "job.run", { name, ok: true }); return { ok: true, result: result ?? null }; }
    catch (e) { this.audit.log("ext:" + id, "job.run", { name, ok: false, error: e.message }); return { ok: false, error: String(e.message || e) }; }
  }

  async loadDir(dir) {
    if (!dir || !existsSync(dir)) return;
    const enabled = (this.deps.getEnabled && this.deps.getEnabled()) || {};
    for (const slug of readdirSync(dir)) {
      if (slug.startsWith(".")) continue; // skip temp/backup dirs from the installer
      const mpath = join(dir, slug, "extension.json");
      if (!existsSync(mpath)) continue;
      let manifest;
      try { manifest = JSON.parse(readFileSync(mpath, "utf8")); } catch { console.error(`[ext] ${slug}: bad extension.json`); continue; }
      const v = validateManifest(manifest);
      if (!v.ok) { console.error(`[ext] ${slug}: invalid manifest — ${v.errors.join("; ")}`); continue; }
      if (!satisfies(this.deps.stackVersion, manifest.requires && manifest.requires.sophiaStack)) {
        console.error(`[ext] ${manifest.id}: requires Sophia Stack ${manifest.requires.sophiaStack} (have ${this.deps.stackVersion}) — skipped`); continue;
      }
      const isEnabled = enabled[manifest.id] !== false; // default enabled unless explicitly off
      const ext = { manifest, dir: join(dir, slug), enabled: isEnabled, active: false };
      this.exts.set(manifest.id, ext);
      if (isEnabled) await this.activate(manifest.id);
    }
  }

  // Re-scan after an install/uninstall: cleanly deactivate everything, then reload.
  async reload(dir) {
    for (const id of [...this.exts.keys()]) await this.deactivate(id);
    this.exts.clear(); this.routes.clear(); this.hookListeners.clear();
    await this.loadDir(dir);
  }

  async activate(id) {
    const ext = this.exts.get(id);
    if (!ext || ext.active) return;
    try {
      const mod = await import(pathToFileURL(join(ext.dir, ext.manifest.entry)).href);
      ext.module = mod.default || mod;
      ext.context = this._context(ext);
      ext.nav = []; ext.panels = []; ext.jobs = {};
      if (typeof ext.module.activate === "function") await ext.module.activate(ext.context);
      ext.active = true; ext.error = null;
      this.audit.log("ext:" + id, "activated", { version: ext.manifest.version });
    } catch (e) { ext.error = e.message; ext.active = false; console.error(`[ext] activate ${id} failed: ${e.message}`); }
  }

  async deactivate(id) {
    const ext = this.exts.get(id);
    if (!ext || !ext.active) return;
    try { if (ext.module && typeof ext.module.deactivate === "function") await ext.module.deactivate(ext.context); } catch (e) { console.error(`[ext] deactivate ${id}: ${e.message}`); }
    for (const k of [...this.routes.keys()]) if (this.routes.get(k).ext === id) this.routes.delete(k);
    for (const [h, a] of this.hookListeners) this.hookListeners.set(h, a.filter((l) => l.id !== id));
    ext.active = false; ext.nav = []; ext.panels = []; ext.jobs = {};
    this.audit.log("ext:" + id, "deactivated", null);
  }

  async setEnabled(id, on) {
    const ext = this.exts.get(id);
    if (!ext) return { ok: false, error: "no such extension" };
    ext.enabled = !!on;
    if (this.deps.setEnabled) this.deps.setEnabled(id, !!on);
    if (on) await this.activate(id); else await this.deactivate(id);
    return { ok: true, id, enabled: ext.enabled, active: ext.active, error: ext.error || null };
  }

  // Disabled or inactive extensions never receive hooks or serve routes.
  async emit(hook, payload) {
    for (const l of this.hookListeners.get(hook) || []) {
      const ext = this.exts.get(l.id);
      if (!ext || !ext.active || !ext.enabled) continue;
      try { await l.fn(payload, { hook }); } catch (e) { console.error(`[ext:${l.id}] hook "${hook}": ${e.message}`); }
    }
  }

  async dispatchRoute(id, subpath, req, res, helpers) {
    const ext = this.exts.get(id);
    if (!ext || !ext.active || !ext.enabled) return false;
    const key = id + ":" + subpath;
    let entry = this.routes.get(key);
    if (!entry) for (const [k, v] of this.routes) { if (v.ext === id && k.endsWith(":*")) { entry = v; break; } if (v.ext === id && k.endsWith("/*") && key.startsWith(k.slice(0, -1))) { entry = v; break; } }
    if (!entry) return false;
    await entry.handler(req, res, helpers || {});
    return true;
  }

  list() {
    return [...this.exts.values()].map((e) => ({ id: e.manifest.id, name: e.manifest.name, version: e.manifest.version, description: e.manifest.description || "", enabled: e.enabled, active: e.active, error: e.error || null, permissions: e.manifest.permissions || [], nav: e.active ? (e.nav || []) : [], panels: e.active ? (e.panels || []) : [], jobs: e.active ? Object.keys(e.jobs || {}) : [] }));
  }
  adminNav() { const out = []; for (const e of this.exts.values()) if (e.active && e.enabled && e.nav) for (const n of e.nav) out.push({ ...n, ext: e.manifest.id }); return out; }
}
