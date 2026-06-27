# Templates

> **Status: (in progress).** The templates *system* is being built right now by
> another contributor. This page describes the concept and where it will live;
> specifics (the gallery route, the template format, how you apply one) will be
> filled in as that work lands. Treat anything below not marked "available today"
> as forward-looking.

## The idea

A **template** is a complete, ready-made [Site Model](./site-model.md) — pages,
blocks, copy, a [theme preset](./themes.md), and optionally
[data collections](./data-layer.md) and [functions](./server-functions.md) —
that you can drop in as a starting point instead of building from an empty page.
Pick a template, then use the AI and the [Patch API](./patch-api.md) to
customize it.

Because a template is *just a Site Model*, it's fully compatible with everything
else: every block type, all 7 style presets, the data layer, and server
functions. Applying a template will be equivalent to seeding the model and then
patching from there.

## Where it will live

The gallery is planned at **`/templates`** on a running deployment. (This route
does not exist yet — it's part of the in-progress system.) Once shipped, the
gallery will let you browse templates and start a new site from one.

## What you can do today (without the templates system)

You can already get the same outcome manually:

1. **Start from the default site.** A fresh deployment seeds a starter model.
2. **Describe what you want.** Set a `brief` and let the built-in AI builder
   construct pages and blocks (see [`src/server.mjs`](../../src/server.mjs) →
   `/api/sophia/agent`).
3. **Hand-seed a model.** Any valid Site Model JSON can be applied via
   [`mset` patches](./patch-api.md) — e.g. add whole pages with
   `{ "op": "mset", "path": "pages./about", "value": { ... } }`.

So a "template" today is simply a Site Model you (or the AI) construct and apply.
The in-progress system will make this a one-click, curated experience.

## Planned capabilities (not built yet)

- A browsable gallery at `/templates`.
- One-click "use this template" to seed a new site.
- A defined template manifest/format and a contribution path for new templates.

This page will be updated with concrete usage, the template format, and the
gallery API once the system lands. Track progress against the `/templates` route.

---

**Related files**

| File | Purpose |
|------|---------|
| [Site Model](./site-model.md) | A template is just a Site Model |
| [Patch API](./patch-api.md) | How a template would be applied |
| [Themes](./themes.md) | Presets a template can ship with |
| [`src/server.mjs`](../../src/server.mjs) | AI builder / seeding today |
