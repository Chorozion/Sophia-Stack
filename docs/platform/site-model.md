# The Site Model

The **Site Model** is the single source of truth for a Sophia Stack site. It's a
compact JSON document that describes everything: which pages exist, what blocks
are on each page, the visual theme, any data collections, and any server
functions. The runtime reads this model, server-renders it to HTML, and lets an
AI (or you) edit it live through the [Patch API](./patch-api.md).

You almost never write the whole model by hand. The AI emits small patches and
the runtime applies them. But understanding the shape helps you read what the AI
built and reason about what's possible.

## Top-level shape

```json
{
  "site": "Acme Inc",
  "style": "dark-tech",
  "pages": {
    "/": {
      "title": "Acme — Home",
      "blocks": [
        { "id": "nav1", "type": "nav", "brand": "Acme", "links": ["Home", "Pricing"] },
        { "id": "hero1", "type": "hero", "headline": "Ship faster", "sub": "..." }
      ]
    },
    "/about": {
      "title": "About Acme",
      "blocks": [ /* ... */ ]
    }
  },
  "data": { "collections": { /* ... */ } },
  "functions": { /* ... */ },
  "brief": "A landing page for a developer-tools startup."
}
```

| Field       | Required | What it is |
|-------------|----------|------------|
| `site`      | no       | Site name (used as a default page title). |
| `style`     | no       | A theme preset name (defaults to `sophia`/`dark-tech` if absent). See [Themes](./themes.md). |
| `pages`     | **yes**  | Map of `"<route>"` → `{ title?, blocks: [...] }`. |
| `data`      | no       | The declarative [data layer](./data-layer.md): `data.collections.<name>`. |
| `functions` | no       | Named [server functions](./server-functions.md): `functions.<name> = { code }`. |
| `brief`     | no       | Free-text description of what the site should be (the AI reads this for context). Max ~4000 chars. |

Validation requires `pages` to be an object; everything else is optional. An
edit that produces an invalid model is **rejected** before it lands (see
[validate.mjs](../../src/validate.mjs)).

## Pages

`pages` is keyed by route path. The root page is `"/"`. Any other key (e.g.
`"/about"`, `"/pricing"`) becomes a real URL the server will render — the
runtime serves any route present in `model.pages`.

```json
"pages": {
  "/":        { "title": "Home",    "blocks": [ /* ... */ ] },
  "/about":   { "title": "About",   "blocks": [ /* ... */ ] },
  "/contact": { "title": "Contact", "blocks": [ /* ... */ ] }
}
```

Each page is `{ title?: string, blocks: Block[] }`. `blocks` must be an array.

## Blocks

A **block** is one section on a page. Every block has a stable `id` (string,
unique within its page) and a `type`. The remaining keys are the block's props,
which depend on the type.

```json
{ "id": "hero1", "type": "hero", "kicker": "NEW", "headline": "Ship faster", "sub": "..." }
```

Common fields on every block:

| Field  | Type       | Notes |
|--------|------------|-------|
| `id`   | string     | **Required, unique per page.** Patches target a block by this id. |
| `type` | string     | One of the 12 known types below. |
| `fx`   | string[]   | Optional list of visual effects (see [Themes](./themes.md)). |

### Block types

There are **12 block types**. Exact prop names come from
[`catalog.json`](../../catalog.json) (the capability catalog the AI reads first).

| Type       | Props |
|------------|-------|
| `nav`      | `brand: string`, `links: string[]` |
| `hero`     | `kicker?: string`, `headline: string`, `sub?: string`, `cta?: {label, href}` |
| `features` | `items: {t, d}[]` (title + description per card) |
| `stats`    | `items: {v, l}[]` (value + label per stat) |
| `logos`    | `heading?: string`, `items: string[]` |
| `steps`    | `items: {t, d}[]` |
| `pricing`  | `tiers: {name, price, features[], cta?}[]` |
| `quote`    | `text: string`, `author?: string` |
| `html`     | `html: string`, `css?: string`, `js?: string` — escape hatch for fully custom markup/styles/logic |
| `feed`     | `heading?: string`, `connection: connectionId`, `limit?: number` |
| `cta`      | `headline: string`, `button?: {label, href}` |
| `footer`   | `text: string` |

> The validator currently also accepts `form` and `list` as known types, but the
> 12 listed above are the documented, catalog-described set. Treat `form`/`list`
> as **(experimental / undocumented)** — props are not specified in the catalog.

#### Example blocks

```json
{ "id": "feat1", "type": "features", "items": [
  { "t": "Fast", "d": "Sub-second renders." },
  { "t": "Safe", "d": "Validated before every edit." }
]}
```

```json
{ "id": "price1", "type": "pricing", "tiers": [
  { "name": "Starter", "price": "$0",  "features": ["1 site", "Community support"] },
  { "name": "Pro",     "price": "$29", "features": ["Unlimited sites", "Priority support"],
    "cta": { "label": "Upgrade", "href": "/signup" } }
]}
```

The `html` block is the escape hatch when no semantic block fits:

```json
{ "id": "embed1", "type": "html",
  "html": "<div class='promo'><img src='/media/banner.png'></div>",
  "css":  ".promo{padding:40px;text-align:center}",
  "js":   "console.log('loaded')" }
```

> **Security note:** `html` block content runs in the visitor's browser exactly
> as written. Only the owner / owner's AI can add it (writes are token-gated),
> but treat it like any other code you ship. See the
> [threat model](../security/threat-model.md).

### Effects (`fx`)

Any block can carry an `fx` array of effect names that layer visual treatments
on top of the theme. There are **~19 effects**:

```
glass, glow, neon-border, inner-glow, soft-shadow, animated-border,
aurora-bg, grain, grid-bg, dot-bg, spotlight-bg, gradient-text,
shimmer, reveal-up, float, pulse, tilt, shine, lift-hover
```

```json
{ "id": "hero1", "type": "hero", "headline": "Glow up", "fx": ["aurora-bg", "gradient-text"] }
```

## Style presets

`model.style` selects one of **7 theme presets**. See [Themes](./themes.md) for
the full token system.

```
sophia   dark-tech   editorial   brutalist   soft   neon   minimal
```

Switch the theme with a single model-level patch:

```json
{ "op": "mset", "path": "style", "value": "editorial" }
```

## Data & functions

These optional layers turn a static site into a real app:

- `model.data.collections.<name>` — declarative collections with auto CRUD. See
  the [Data Layer](./data-layer.md).
- `model.functions.<name>` — sandboxed server functions. See
  [Server Functions](./server-functions.md).

## Reading the live model

You can fetch the current model at any time (read is public):

```bash
curl https://yoursite.com/api/sophia/model
```

To edit it, use the [Patch API](./patch-api.md).

---

**Related files**

| File | Purpose |
|------|---------|
| [`catalog.json`](../../catalog.json) | Canonical block props, styles, effects, ops |
| [`src/validate.mjs`](../../src/validate.mjs) | Validation rules enforced on every edit |
| [`src/styles.mjs`](../../src/styles.mjs) | Theme presets and token system |
| [Patch API](./patch-api.md) | How to edit the model |
| [Themes](./themes.md) | Style presets, tokens, custom CSS |
