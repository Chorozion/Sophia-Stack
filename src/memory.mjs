// memory.mjs — lightweight long-term memory for the AI builder.
//
// Indexes the project (catalog components, the runtime skill, the site brief, and
// recent versions) into a vector store, then retrieves the most relevant snippets
// for a user request so the builder plans with context. Entirely optional: if no
// embedding-capable provider is configured, build/retrieve degrade to no-ops and the
// builder works exactly as before.
import { VectorStore } from "./vector-store.mjs";

export function gatherSources({ catalog, skill, versions, brief } = {}) {
  const out = [];
  if (brief) out.push({ id: "brief", kind: "doc", text: "Site brief: " + String(brief).slice(0, 1500) });
  if (skill) out.push({ id: "skill", kind: "doc", text: "Runtime skill: " + String(skill).slice(0, 1800) });
  if (catalog && catalog.blocks) for (const [type, def] of Object.entries(catalog.blocks)) {
    const d = (def && (def.description || def.desc)) || JSON.stringify(def).slice(0, 200);
    out.push({ id: "block:" + type, kind: "component", text: 'Block "' + type + '": ' + d });
  }
  for (const v of versions || []) out.push({ id: "ver:" + v.id, kind: "version", text: "Past version" + (v.label ? ' "' + v.label + '"' : "") + (v.ts ? " (" + v.ts + ")" : "") });
  return out;
}

export class Memory {
  // embedFn: async (texts[]) => vectors[]  — or null to disable.
  constructor(path, embedFn) {
    this.store = new VectorStore(path);
    this.embed = embedFn || null;
    this.ready = this.store.size() > 0;
    this.lastError = null;
  }
  enabled() { return !!this.embed; }
  async build(sources) {
    if (!this.embed) return { ok: false, reason: "no embedding provider" };
    if (!sources || !sources.length) return { ok: false, reason: "nothing to index" };
    try {
      const vectors = await this.embed(sources.map((s) => s.text.slice(0, 2000)));
      if (!Array.isArray(vectors) || vectors.length !== sources.length) throw new Error("embedding count mismatch");
      this.store.clear();
      this.store.add(sources.map((s, i) => ({ id: s.id, kind: s.kind, text: s.text, vector: vectors[i] })));
      this.ready = true; this.lastError = null;
      return { ok: true, count: this.store.size() };
    } catch (e) { this.lastError = String(e.message || e); return { ok: false, reason: this.lastError }; }
  }
  async retrieve(query, k = 5, minScore = 0.2) {
    if (!this.ready || !this.embed || !this.store.size() || !query) return [];
    try { const [qv] = await this.embed([String(query).slice(0, 2000)]); return this.store.search(qv, k).filter((r) => r.score >= minScore); }
    catch (e) { this.lastError = String(e.message || e); return []; }
  }
  status() { return { enabled: this.enabled(), ready: this.ready, count: this.store.size(), error: this.lastError }; }
}
