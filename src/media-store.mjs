// media-store.mjs — host photos, files, and video inside the contained instance.
// No dependencies: raw bytes on disk in the data dir + a JSON manifest. Served
// from the site at /media/<file>. Both the owner (dashboard) and the AI (key)
// can upload; the AI references the returned URL in pages.
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import crypto from "node:crypto";

const EXT = {
  "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp",
  "image/svg+xml": "svg", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm",
  "video/quicktime": "mov", "audio/mpeg": "mp3", "application/pdf": "pdf",
};
const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT).map(([t, e]) => [e, t]));

export class MediaStore {
  constructor(dir, { maxBytes = 200 * 1024 * 1024 } = {}) { // 200MB cap (video)
    this.dir = join(dir, "media");
    mkdirSync(this.dir, { recursive: true });
    this.manifestPath = join(this.dir, "_manifest.json");
    this.maxBytes = maxBytes;
  }
  _manifest() { try { return existsSync(this.manifestPath) ? JSON.parse(readFileSync(this.manifestPath, "utf8")) : []; } catch { return []; } }
  _save(m) { const t = this.manifestPath + ".tmp"; writeFileSync(t, JSON.stringify(m)); renameSync(t, this.manifestPath); }
  list() { return this._manifest(); }

  save(buffer, { name, type } = {}) {
    if (!buffer || !buffer.length) throw new Error("empty upload");
    if (buffer.length > this.maxBytes) throw new Error(`too large (max ${Math.round(this.maxBytes / 1048576)}MB)`);
    const id = crypto.randomBytes(8).toString("hex");
    const ext = EXT[type] || (name && name.includes(".") ? name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) : "bin");
    const file = id + "." + ext;
    writeFileSync(join(this.dir, file), buffer);
    const rec = { id, file, name: name || file, type: type || TYPE_BY_EXT[ext] || "application/octet-stream", size: buffer.length, url: "/media/" + file, created: Date.now() };
    const m = this._manifest(); m.unshift(rec); this._save(m);
    return rec;
  }
  resolve(file) {
    const safe = String(file || "").replace(/[^a-z0-9._-]/gi, "");
    const p = join(this.dir, safe);
    if (!existsSync(p) || safe.startsWith("_")) return null;
    const ext = safe.split(".").pop();
    return { path: p, type: TYPE_BY_EXT[ext] || "application/octet-stream", bytes: readFileSync(p) };
  }
  remove(idOrFile) {
    const m = this._manifest();
    const rec = m.find((r) => r.id === idOrFile || r.file === idOrFile);
    if (!rec) return 0;
    try { unlinkSync(join(this.dir, rec.file)); } catch {}
    this._save(m.filter((r) => r !== rec));
    return 1;
  }
}
