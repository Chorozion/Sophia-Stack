// data-store.mjs — the contained full-stack data layer.
//
// The agent defines collections (data models) declaratively in the App Model;
// this store gives them persistence + CRUD with NO code execution and NO deps
// (JSON files in the data dir). That's what makes "build a real app" safe and
// contained: structured data the runtime interprets, not arbitrary backend code.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const slug = (s) => String(s || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 64);

export class DataStore {
  constructor(dir) {
    this.dir = join(dir, "collections");
    mkdirSync(this.dir, { recursive: true });
  }
  _p(col) { return join(this.dir, slug(col) + ".json"); }
  _read(col) {
    try { return existsSync(this._p(col)) ? JSON.parse(readFileSync(this._p(col), "utf8")) : []; }
    catch { return []; }
  }
  _write(col, arr) {
    const p = this._p(col), tmp = p + ".tmp-" + process.pid;
    writeFileSync(tmp, JSON.stringify(arr));
    renameSync(tmp, p);
  }
  list(col, { limit, sort } = {}) {
    let arr = this._read(col);
    if (sort === "newest") arr = arr.slice().sort((a, b) => (b._created || 0) - (a._created || 0));
    return limit ? arr.slice(0, limit) : arr;
  }
  get(col, id) { return this._read(col).find((r) => r.id === id) || null; }
  create(col, rec) {
    const arr = this._read(col);
    const r = { id: crypto.randomBytes(6).toString("base64url"), ...rec, _created: Date.now() };
    arr.push(r); this._write(col, arr); return r;
  }
  update(col, id, patch) {
    const arr = this._read(col); const i = arr.findIndex((r) => r.id === id);
    if (i < 0) return null;
    arr[i] = { ...arr[i], ...patch, id: arr[i].id, _created: arr[i]._created };
    this._write(col, arr); return arr[i];
  }
  remove(col, id) {
    const arr = this._read(col); const n = arr.filter((r) => r.id !== id);
    this._write(col, n); return arr.length - n.length;
  }
  count(col) { return this._read(col).length; }
}

// Whitelist an incoming record to the collection's declared fields (no junk,
// no oversized values). Returns a clean object.
export function sanitizeRecord(body, def) {
  const out = {};
  const fields = (def && def.fields) || [];
  for (const f of fields) {
    const name = f.name;
    if (name in (body || {})) {
      let v = body[name];
      if (typeof v === "string") v = v.slice(0, 5000);
      out[name] = v;
    }
  }
  return out;
}
