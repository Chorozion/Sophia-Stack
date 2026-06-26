// catalog.mjs — emit the stack's machine-readable capability catalog.
// Keeps the skill/agent reference accurate by deriving from the real modules.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { EFFECT_NAMES } from "../src/effects.mjs";
import { PRESETS, PRESET_NAMES } from "../src/styles.mjs";

// Block prop schemas (hand-maintained; blocks.jsx is JSX, not importable here).
const BLOCKS = {
  nav: { props: { brand: "string", links: "string[]" } },
  hero: { props: { kicker: "string?", headline: "string", sub: "string?", cta: "{label,href}?" } },
  features: { props: { items: "{t,d}[]" } },
  stats: { props: { items: "{v,l}[]" } },
  logos: { props: { heading: "string?", items: "string[]" } },
  steps: { props: { items: "{t,d}[]" } },
  pricing: { props: { tiers: "{name,price,features[],cta?}[]" } },
  quote: { props: { text: "string", author: "string?" } },
  html: { props: { html: "string (raw HTML)", css: "string? (raw CSS)", js: "string? (client JS)" }, note: "escape hatch for fully custom markup/styles/logic" },
  feed: { props: { heading: "string?", connection: "connectionId", limit: "number?" } },
  cta: { props: { headline: "string", button: "{label,href}?" } },
  footer: { props: { text: "string" } },
};

const catalog = {
  version: 1,
  blocks: BLOCKS,
  common_block_fields: { id: "string (stable, required)", type: "block type", fx: "effect[] (optional)" },
  styles: PRESET_NAMES.map((n) => ({ name: n, label: PRESETS[n].label })),
  effects: EFFECT_NAMES,
  connections: { type: "rest", fields: { url: "string", path: "dot path", limit: "number?", pick: "string[]?", headers: "object?" } },
  // App backend: declare collections in the App Model -> the runtime gives you
  // CRUD + access policy for free (no code). Define via an mset patch on
  // data.collections.<name>, then hit /api/data/<name>.
  data: {
    define: "patch op {op:'mset', path:'data.collections.<name>', value:{ fields:[{name,type?,label?}], access:{create:'public'|'token', read:'public'|'token'} }}",
    api: {
      "GET /api/data/:collection": "list records (read policy)",
      "GET /api/data/:collection/:id": "one record",
      "POST /api/data/:collection": "create (create policy; body whitelisted to declared fields)",
      "PUT /api/data/:collection/:id": "update (token)",
      "DELETE /api/data/:collection/:id": "delete (token)",
    },
    note: "Only declared collections are reachable. Update/delete always need a token.",
  },
  patch_ops: [
    "{op:'set', id, path, value}     — set a block prop (dot path) by id",
    "{op:'add', route, value, index?}— insert a block (value must have id)",
    "{op:'remove', id}               — delete a block by id",
    "{op:'move', id, index}          — reorder a block within its page",
    "{op:'mset', path, value}        — set ANY model-level path (data, style, page titles)",
    "{op:'mdel', path}               — delete a model-level path",
  ],
};

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "catalog.json");
writeFileSync(out, JSON.stringify(catalog, null, 2) + "\n");
console.log(`catalog -> ${out}`);
console.log(`  ${Object.keys(BLOCKS).length} blocks, ${PRESET_NAMES.length} styles, ${EFFECT_NAMES.length} effects`);
