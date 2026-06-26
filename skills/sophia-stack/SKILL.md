---
name: sophia-stack
description: Build, edit, connect, and deploy premium websites with the Sophia Stack — an AI-native full-stack framework. Use when creating or editing a site as a compact Site Model (blocks + style preset + effects + backend connections) instead of hand-writing JSX/CSS. Optimized for minimal token cost, real-time edits, and safe deploys. Trigger when the user wants a landing page, marketing site, or web UI built fast and beautifully, or asks to work in "the Sophia stack".
---

# Sophia Stack — agent operating manual

You build sites by authoring a **compact Site Model**, not by hand-writing markup. The
stack expands the model into premium, server-rendered React with live data and real-time
edits. This is dramatically cheaper in tokens than writing JSX, and the output is
high-end *by default* (crafted style presets + effects). Your job is taste and structure,
not boilerplate.

Repo: `D:/sophiaxt/sophia-stack`. Capability catalog (authoritative, generated):
`catalog.json` — read it first to see exact blocks, props, styles, effects, and patch ops.

## The loop (token-efficient)

1. **Read** the current model — `GET /model` from the dev server, or the model file. It's
   small; loading it is cheap.
2. **Author or edit.** New site → write a Site Model. Editing → emit **patches** (small,
   addressable ops), never re-emit the whole file. Editing one node costs ~10× fewer
   tokens than rewriting it.
3. **Preview** live — `npm run dev` serves `http://localhost:4321`; patches apply with no
   reload (React reconciles only the changed nodes).
4. **Deploy** safely (when wired) — backup → atomic swap → runtime-data + `.env` preserved
   → verify → rollback available.

## Connecting (how you reach a live site)

- **Remote MCP (preferred):** the deployed site exposes `POST /mcp` (JSON-RPC). Connect with
  the site URL + a bearer token; you get `sophia_catalog`, `sophia_read_model`, `sophia_patch`,
  `sophia_set_css`, `sophia_rollback`. Read tools are open; write tools need the token.
- **Local stdio:** `mcp/sophia-mcp.mjs` (env `SOPHIA_URL` + `SOPHIA_TOKEN`) for desktop agents.
- The user gets their token from `/_setup` on their own domain — no console needed.

## Build order — secure foundation first, THEN the frontend

When building a site, do it in this order (don't jump straight to pixels):
1. **Model the data + connections first.** Define `connections` and bind blocks to real
   backends. If the site needs auth or server actions, wire those before UI.
2. **Then design the frontend** — pick ONE style preset, compose the right blocks, add
   sparing effects. A beautiful UI over fake/insecure data is slop; structure first.
3. Validate as you go — patches are checked; if one is rejected, read the error and fix it.

## The Site Model

```jsonc
{
  "site": "my-site",
  "style": "dark-tech",            // one preset — see Styles
  "connections": {                  // optional backend data sources
    "feed": { "type": "rest", "url": "https://.../api", "path": "events", "limit": 5, "pick": ["title","kind"] }
  },
  "pages": {
    "/": {
      "title": "My Site",
      "blocks": [                    // ordered; every block has a stable id + type
        { "id": "nav",  "type": "nav",  "brand": "Acme", "links": ["Product","Pricing"] },
        { "id": "hero", "type": "hero", "fx": ["reveal-up"], "kicker": "NEW",
          "headline": "...", "sub": "...", "cta": { "label": "Start", "href": "/start" } }
      ]
    }
  }
}
```

Blocks, props, styles, effects, connection fields, and patch ops are all listed in
`catalog.json`. Use it as the source of truth — don't invent block types or props.

## Editing = patches (do this for edits)

```jsonc
POST /patch  { "ops": [
  { "op": "set",    "id": "hero", "path": "headline", "value": "New headline" },
  { "op": "add",    "route": "/", "index": 3, "value": { "id": "p", "type": "pricing", "tiers": [...] } },
  { "op": "remove", "id": "old" },
  { "op": "move",   "id": "cta", "index": 9 }
] }
```

`set` uses a dot path (`items.2.t`, `cta.label`). Prefer many small patches over rewriting.

## Styles (pick exactly ONE per site)

Each preset is a complete, crafted design system. Choosing one makes the whole site
cohesive and premium. Match the preset to the brief:

- `dark-tech` — modern SaaS / dev tools. Gradient text, glass, aurora glow.
- `editorial` — publications, essays, refined brands. Serif, asymmetric, restrained.
- `brutalist` — bold, raw, statement sites. Mono, hard borders, offset shadows.
- `soft` — consumer / luxury / wellness. Warm, rounded, soft shadows.
- `neon` — gaming, crypto, nightlife. Dark, glow, cyber grid.
- `minimal` — Swiss/portfolio/agency. White space, discipline, tiny accents.

## Effects (`fx` on a block) — use sparingly

19 composable effects (see catalog). They layer onto a block: `"fx": ["glass","glow"]`.
Restraint is the rule: 0–2 effects per block, usually `reveal-up` on key sections, maybe
`glass`/`glow` on a card or CTA. The preset already carries the look — effects are accents.

## Anti-slop rules (this is the whole point — obey them)

- **One coherent style.** Never mix preset aesthetics. Let the preset do the heavy lifting.
- **Don't center everything.** Use the preset's natural alignment; vary block types.
- **Real, specific copy.** No "Lorem", no "Welcome to our website", no vague filler.
- **Effects are seasoning, not the meal.** Sparse, intentional. Over-animation reads cheap.
- **Compose, don't decorate.** Reach for the right block (`stats`, `steps`, `pricing`,
  `quote`, `logos`) instead of stuffing everything into `features`.
- **Bind real data** when it exists — add a `connection` and a `feed` block rather than
  faking content.

## Commands

- `npm run dev` — live runtime + preview (real-time patches).
- `npm run build` — SSR + client bundles.
- `node scripts/catalog.mjs` — regenerate `catalog.json` (after adding blocks/styles/fx).
- `node demo/styles-demo.mjs` — render one model across every preset (sanity / inspiration).

## Extending the stack

- **New block** → add a component to `src/blocks.jsx` (structure + `sx-*` classes only),
  register it in `BLOCKS`, add its prop schema to `scripts/catalog.mjs`, style its classes
  in `SX_CORE` (`src/styles.mjs`) using tokens so it works in every preset.
- **New preset** → add a token set (+ small signature) to `PRESETS` in `src/styles.mjs`.
  ~5 lines; instantly works with all blocks and components.
- **New effect** → add a `.fx-<name>` entry to `EFFECTS` in `src/effects.mjs`.

Always keep the look premium and the model compact. The framework already knows what good
looks like — your job is to choose well and write less.
