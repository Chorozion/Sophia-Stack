// vector-store.mjs — a tiny, dependency-free vector store (cosine similarity).
//
// Holds {id, kind, text, vector, meta} records and ranks them against a query
// vector. Small by design: one site's index (catalog blocks + skill + recent
// versions) is a few dozen rows. Persisted as JSON in the data dir.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

export class VectorStore {
  constructor(path) {
    this.path = path || null;
    this.items = [];
    if (path && existsSync(path)) { try { this.items = JSON.parse(readFileSync(path, "utf8")) || []; } catch { this.items = []; } }
  }
  size(kind) { return kind ? this.items.filter((i) => i.kind === kind).length : this.items.length; }
  clear(kind) { this.items = kind ? this.items.filter((i) => i.kind !== kind) : []; this._save(); }
  add(records) {
    for (const r of records || []) {
      if (!r || !r.id || !Array.isArray(r.vector)) continue;
      this.items = this.items.filter((x) => x.id !== r.id);
      this.items.push({ id: r.id, kind: r.kind || "doc", text: String(r.text || "").slice(0, 600), vector: r.vector, meta: r.meta || {} });
    }
    this._save();
  }
  search(vector, k = 5, kind) {
    const pool = kind ? this.items.filter((i) => i.kind === kind) : this.items;
    return pool
      .map((i) => ({ id: i.id, kind: i.kind, text: i.text, meta: i.meta, score: cosine(vector, i.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }
  _save() { if (!this.path) return; try { writeFileSync(this.path, JSON.stringify(this.items)); } catch {} }
}
