// skill-text.mjs — the operating manual served at /skill.md on every deployed
// site. You hand your AI: this skill + the URL + the token. The skill tells it
// how to connect and build a REAL site/app. {{URL}} is replaced at serve time.
export const SKILL = `# Operate this Sophia site (AI instructions)

You have been given this site's **URL** ({{URL}}) and an **agent token**. With those you can
build and edit this live website/app. Apply changes via MCP or the REST API; they go live
instantly, are validated (bad edits are rejected), and can be rolled back.

## 1. Connect
- **MCP endpoint:** {{URL}}mcp  — JSON-RPC 2.0 over HTTP POST. Send header
  \`Authorization: Bearer <token>\` on any write.
- First call: read the machine spec -> **GET {{URL}}api/sophia/catalog** (blocks, props,
  styles, effects, patch ops, data API). Use only what's in the catalog.

## 2. What you can build (real apps, not brochures)
- **Pages / routing:** add a route with \`{op:"mset", path:"pages./about", value:{title, blocks:[...]}}\`.
  Multi-page sites are served automatically.
- **Blocks:** nav, hero, features, cta, footer, stats, logos, steps, pricing, quote, feed,
  and **html** — a raw **HTML + CSS + JS** block. The \`html\` block is your escape hatch to
  build ANY custom UI, interactivity, animation, or feature. Buttons must actually DO things.
- **Backend / data:** define a collection ->
  \`{op:"mset", path:"data.collections.signups", value:{fields:[{name:"email"}], access:{create:"public", read:"token"}}}\`.
  You instantly get CRUD at **{{URL}}api/data/signups** (GET list, POST create, etc.). Wire
  forms to it so they actually save. Build real, data-backed features.
- **Design:** pick ONE preset via \`{op:"mset", path:"style", value:"dark-tech"}\` (also:
  editorial, brutalist, soft, neon, minimal). Add effects per block via \`fx:[...]\`. Or full
  custom CSS through the \`html\` block / the live CSS layer.

## 3. How to edit (token-efficient)
- **Read:** \`sophia_read_model\` (or GET {{URL}}api/sophia/model) — compact JSON of the whole site.
- **Patch:** \`sophia_patch\` with \`ops\`: \`set\`/\`add\`/\`remove\`/\`move\` (blocks) and
  \`mset\`/\`mdel\` (any model path: data, style, pages). Prefer many small patches over rewrites.
- **Undo:** \`sophia_rollback\` restores the previous good version.

## 4. Quality rules (anti-slop)
- Real, specific copy. No "Lorem", no dead buttons, no "Welcome to our website".
- One coherent style. Compose the right blocks (use \`stats\`, \`pricing\`, \`steps\`, a real
  \`form\` over a collection) instead of cramming everything into one block.
- Effects are seasoning — sparse and intentional.

## 5. Safety
The framework core is immutable; you cannot break the platform. Every edit is validated and
reversible. Build boldly.
`;

export function renderSkill(origin) {
  return SKILL.replaceAll("{{URL}}", origin.endsWith("/") ? origin : origin + "/");
}
