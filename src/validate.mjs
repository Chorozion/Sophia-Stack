// validate.mjs — guard rail for the live edit API.
//
// A valid edit can land; an invalid one is REJECTED before it ever touches the
// running site (the good state is preserved). This is the first line of
// "auto-rollback if necessary": bad edits simply cannot take effect.
const KNOWN_TYPES = new Set([
  "nav", "hero", "features", "cta", "footer", "feed",
  "stats", "logos", "steps", "pricing", "quote",
  "form", "list", "html",
]);

export function validateModel(model) {
  const errors = [];
  if (!model || typeof model !== "object") return { ok: false, errors: ["model is not an object"] };
  if (!model.pages || typeof model.pages !== "object") errors.push("model.pages missing");
  // App Model data layer (optional): collections with fields + access policy.
  if (model.data !== undefined) {
    if (typeof model.data !== "object" || model.data === null) errors.push("model.data must be an object");
    else {
      const cols = model.data.collections;
      if (cols !== undefined) {
        if (typeof cols !== "object" || cols === null) errors.push("model.data.collections must be an object");
        else for (const [name, def] of Object.entries(cols)) {
          if (!/^[a-z0-9_-]+$/i.test(name)) errors.push(`collection name invalid: ${name}`);
          if (def && def.fields && !Array.isArray(def.fields)) errors.push(`collection ${name}: fields must be an array`);
          if (def && def.access && typeof def.access !== "object") errors.push(`collection ${name}: access must be an object`);
        }
      }
    }
  }
  for (const [route, page] of Object.entries(model.pages || {})) {
    if (!page || !Array.isArray(page.blocks)) { errors.push(`page ${route}: blocks must be an array`); continue; }
    const ids = new Set();
    for (const b of page.blocks) {
      if (!b || typeof b !== "object") { errors.push(`page ${route}: a block is not an object`); continue; }
      if (typeof b.id !== "string" || !b.id) errors.push(`page ${route}: block missing string id`);
      if (b.id) { if (ids.has(b.id)) errors.push(`page ${route}: duplicate block id ${b.id}`); ids.add(b.id); }
      if (!KNOWN_TYPES.has(b.type)) errors.push(`page ${route}: block ${b.id || "?"} has unknown type ${b.type}`);
      if (b.fx && !Array.isArray(b.fx)) errors.push(`page ${route}: block ${b.id} fx must be an array`);
    }
  }
  return { ok: errors.length === 0, errors };
}

// Custom CSS sanity: block anything that could break out of <style> or smuggle
// active content. CSS is far lower risk than HTML/JS, but we still refuse the
// obvious exfiltration/breakout vectors.
export function sanitizeCss(css) {
  const s = String(css || "");
  const bad = [];
  if (/<\/?\s*style/i.test(s)) bad.push("contains a <style> tag");
  if (/<\s*script/i.test(s)) bad.push("contains a <script> tag");
  if (/expression\s*\(/i.test(s)) bad.push("uses legacy expression()");
  if (/javascript\s*:/i.test(s)) bad.push("uses javascript: url");
  if (/@import/i.test(s)) bad.push("uses @import (external fetch)");
  return { ok: bad.length === 0, errors: bad, css: s };
}
