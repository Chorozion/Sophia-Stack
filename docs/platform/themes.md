# Themes

Sophia Stack's look is driven by a **token-based design system**. Every block
renders with semantic `sx-*` classes, and those classes are styled entirely from
CSS variables (design tokens) set on `:root`. A **preset** is just a small set of
tokens (plus a little signature CSS for character). The result: one
[Site Model](./site-model.md) → radically different premium designs, switched by
name.

## Picking a preset

`model.style` selects the preset. There are **7 presets**:

| Name | Label |
|------|-------|
| `sophia`    | Sophia |
| `dark-tech` | Dark Tech |
| `editorial` | Editorial |
| `brutalist` | Brutalist |
| `soft`      | Soft / Luxury |
| `neon`      | Neon / Cyber |
| `minimal`   | Minimal / Swiss |

Switch with a single model-level [patch](./patch-api.md):

```json
{ "op": "mset", "path": "style", "value": "editorial" }
```

If `style` is missing or unknown, the runtime falls back to `sophia`.

## How a preset works

Each preset in [`src/styles.mjs`](../../src/styles.mjs) is:

```
{ label, fonts: [google-font-urls], vars: ":root token CSS", sig: "signature overrides" }
```

- **`fonts`** — Google Fonts the preset loads.
- **`vars`** — the design tokens set on `:root`.
- **`sig`** — a few signature rules that give the preset its character (e.g. the
  `sophia` preset's gradient text and aurora glow).

The shared core (`SX_CORE`) styles every block using those tokens, so a new
preset is cheap — it's just tokens — and a new component, added once in the core,
works across all presets.

### Design tokens

Presets set these CSS variables (not all are required; the core has fallbacks):

```
--bg --fg --muted --accent --accent2 --card --border --radius --shadow
--font-display --font-body --btn-bg --btn-fg --btn-radius --btn-shadow
--maxw --hero-align --sub-mx --head-transform
```

## Effects layer (`fx`)

On top of the theme, any block can carry an `fx` array of effect names. Effects
are author-level visual treatments that compose with whatever preset is active.
There are **~19 effects**:

```
glass, glow, neon-border, inner-glow, soft-shadow, animated-border,
aurora-bg, grain, grid-bg, dot-bg, spotlight-bg, gradient-text,
shimmer, reveal-up, float, pulse, tilt, shine, lift-hover
```

```json
{ "op": "set", "id": "hero1", "path": "fx", "value": ["aurora-bg", "reveal-up"] }
```

Only the effects actually used on a page have their CSS included in that page's
`<head>` (see `pageHead` in [`src/styles.mjs`](../../src/styles.mjs)).

## Custom CSS layer

Beyond presets, there's a **separate live-editable custom CSS layer** (rendered
as `<style id="sx-custom-live">`) you can update in real time — no redeploy. Set
it via the API:

```
PUT /api/sophia/css
Authorization: Bearer <token>
Content-Type: application/json

{ "css": ".sx-h1{ letter-spacing: -0.05em }" }
```

Read the current custom CSS:

```bash
curl https://yoursite.com/api/sophia/css
```

### Custom CSS is sanitized

Custom CSS is lower-risk than HTML/JS, but the runtime still refuses obvious
breakout / exfiltration vectors before saving (see
[`sanitizeCss`](../../src/validate.mjs)). A submission is **rejected** with `422`
if it:

- contains a `<style>` tag,
- contains a `<script>` tag,
- uses legacy `expression(...)`,
- uses a `javascript:` URL,
- uses `@import` (external fetch),
- targets the protected footer class `sx-core-footer`.

That last rule protects the immutable core footer ("Admin · Powered by Sophia
Stack") that the framework injects on every page — it can't be removed or hidden
through the edit API. See the [threat model](../security/threat-model.md).

## Styling targets

Custom CSS targets the same semantic classes the core uses — `sx-nav`,
`sx-hero`, `sx-h1`, `sx-sub`, `sx-btn`, `sx-card`, `sx-features`, `sx-stats`,
`sx-pricing`, `sx-quote`, `sx-feed`, `sx-foot`, and so on. You can also override
the design tokens directly:

```css
:root { --accent: #ff5500; --radius: 4px; }
.sx-card:hover { transform: translateY(-8px); }
```

## Per-page theming

The preset and custom CSS are site-wide. Per-page or per-block theme overrides
beyond `fx` and shared custom CSS are **(planned)** — for now, scope rules
yourself in custom CSS (e.g. using a block id or an `html` block wrapper).

---

**Related files**

| File | Purpose |
|------|---------|
| [`src/styles.mjs`](../../src/styles.mjs) | Presets, tokens, `pageHead`, custom CSS layer |
| [`src/validate.mjs`](../../src/validate.mjs) | `sanitizeCss` rules |
| [`catalog.json`](../../catalog.json) | Style + effect names |
| [Site Model](./site-model.md) | Where `style` and `fx` live |
| [Threat Model](../security/threat-model.md) | Why the footer is protected |
