# Sophia Stack ↔ Sophia SEO Suite — Integration Contract

> **The Sophia SEO Suite is a SEPARATE, optional, installable extension/plugin.** It is
> **not** part of Sophia Stack core and is **not** implemented in this repo beyond a
> non-functional integration stub at
> [`examples/extensions/sophia-seo-suite-stub`](../../examples/extensions/sophia-seo-suite-stub).
> The full Suite is developed as its own product/repo and installs into any compatible
> Sophia Stack deployment like any other extension.

This document is the **contract** the parallel SEO-Suite session builds against: exactly
what the Suite can rely on from the Stack **today**, and exactly what the Stack still owes
the Suite, marked **(planned)**. It is meant to be precise and honest — if it is not in
the "today" list with a working `ctx` capability or endpoint, do not depend on it.

The stub proves the integration shape only; every place the real Suite would do SEO work
is marked `// TODO(seo-suite)` in
[`extension.js`](../../examples/extensions/sophia-seo-suite-stub/extension.js). It does
**not** implement SEO.

## The stub at a glance

Manifest ([`extension.json`](../../examples/extensions/sophia-seo-suite-stub/extension.json)):

```json
{
  "id": "sophia-seo-suite",
  "permissions": [
    "site:read", "site:patch", "pages:read", "pages:patch",
    "media:read", "settings:read", "settings:write", "ai:use", "jobs:run"
  ],
  "routes": ["/api/extensions/sophia-seo-suite/*"],
  "adminNav": [{ "label": "SEO Suite", "path": "/admin/extensions/seo", "icon": "search" }],
  "adminEntry": "./admin/index.js",
  "hooks": ["page.afterSave", "site.afterPatch", "media.afterUpload", "seo.audit.requested"],
  "requires": { "sophiaStack": ">=1.0.0" }
}
```

It registers nav + settings, serves `GET /audit` (stub findings) and
`POST /optimize-title` (a real **safe** patch), reads the site/pages, can call AI, audits
every action, and listens to hooks.

## What the Suite uses from the Stack — available TODAY

Everything here is wired and working in [`src/extensions.mjs`](../../src/extensions.mjs) /
[`src/server.mjs`](../../src/server.mjs). The Suite can build on all of it now.

| Capability | How | Permission |
|---|---|---|
| **Read the site model** | `ctx.site.read()` | `site:read` |
| **Read pages** | `ctx.pages.read()` (`model.pages`) | `pages:read` |
| **Safe site edits** | `ctx.site.patch(ops)` / `ctx.site.setCss(css)` — validate-before-commit + snapshot + rollback + audit | `site:patch` |
| **Safe page edits** | `ctx.pages.patch(ops)` — same pipeline | `pages:patch` |
| **List media** | `ctx.media.list()` | `media:read` |
| **Provider-agnostic AI (generate)** | `ctx.ai.generate({ prompt \| messages, system?, temperature?, maxTokens? })` → `{ text, provider }`; plus `listProviders()` / `getDefaultProvider()` | `ai:use` |
| **Settings** | `ctx.settings.register(schema)`, `ctx.settings.get(key?)`, `ctx.settings.set(key, val)` (persist in `tokens.extSettings`) | `settings:read` / `settings:write` |
| **Audit logging** | `ctx.audit.log(action, details)` (actor `ext:sophia-seo-suite`); owner reads via `GET /api/sophia/audit` | none (write); `audit:read` reserved |
| **Hooks it can listen to that the core FIRES** | `site.afterPatch`, `page.afterSave` (payload `{ ops, changed }`), `media.afterUpload` (payload `{ id, url, type }`) | none |
| **API routes** | `ctx.routes.register(path, handler)` → `/api/extensions/sophia-seo-suite/*`; handler `(req, res, helpers)` with `helpers.isAdmin/hasToken/canEdit/send/readBody/origin/audit` | none |
| **Admin nav** | `ctx.admin.registerNav({ label, path, icon })` surfaced via `GET /api/sophia/extensions` | none |
| **Enable/disable + persistence** | owner toggles via `POST /api/sophia/extensions`; state in `tokens.extEnabled` | (admin) |
| **Job handler registration** | `ctx.jobs.register(name, fn)` — registration works | `jobs:run` |

### Hooks: a precise caveat

The Suite's manifest lists `seo.audit.requested` (and the publish hooks could be listed),
but of the four the manifest references, **only `page.afterSave`, `site.afterPatch`, and
`media.afterUpload` are actually fired by the core today.** `seo.audit.requested` is a
**valid** hook name the Suite may listen to and `emit()` itself for internal/cross-
extension coordination, but the **core does not fire it** — see [hooks.md](./hooks.md).
The Suite must not assume the Stack will trigger it.

## What the Stack still needs to add for the Suite — (planned)

These are **not** available today. The Suite should design around their absence and treat
them as future integration points. Each is tracked here as the Stack's commitment to the
Suite.

| Needed | Status | Detail |
|---|---|---|
| **Admin PANEL rendering (`adminEntry`)** | **(planned)** | The dashboard surfaces `adminNav` but does **not** import or mount the `adminEntry` module / `ctx.admin.registerPanel` output. The Suite's `admin/index.js` is documentation-only until the panel-mount contract ships. See [admin-ui.md](./admin-ui.md). **Workaround today:** declare `adminNav` and serve the Suite's UI/data from its own `/api/extensions/sophia-seo-suite/*` routes. |
| **Install/uninstall CLI** | **(planned)** | No `sophia ext install/uninstall`. Today = copy the folder into `.sophia-data/extensions/` and restart. See [lifecycle.md](./lifecycle.md#install--uninstall). |
| **Background job execution** | **(planned)** | `ctx.jobs.register(name, fn)` accepts handlers (gated by `jobs:run`), but the core does **not** schedule or run them yet. The Suite cannot rely on queued re-audits firing; do work inline (e.g. in a route or a fired hook) for now. |
| **`ctx.ai.stream()`** | **(planned)** | Throws *"sophia.ai.stream() is planned — use ai.generate() for now"*. Use `ctx.ai.generate()`. |
| **`ctx.ai.embed()`** | **(planned)** | Throws *"sophia.ai.embed() is planned"*. No embeddings capability yet — the Suite must not depend on Stack-provided embeddings. |
| **Core firing publish / pre-save / SEO hooks** | **(planned)** | `site.beforePublish`, `site.afterPublish`, `page.beforeSave`, `seo.audit.requested` are valid names but **not fired by core**. Until then, drive audits from `page.afterSave` / `site.afterPatch` / `media.afterUpload`, or from the Suite's own routes/`emit()`. |
| **Data-model registration helpers** | **(planned)** | There is no extension-facing helper to *register/define* new declarative collections or schema. The Suite can read/write **existing** declared collections via `ctx.data.*` (with `data:read` / `data:write`), but cannot declare its own collections through `ctx` today. |
| **`audit:read` on `ctx`** | **(planned)** | The Suite can **write** audit entries (`ctx.audit.log`), but there is no `ctx`-level audit **read**. Owners read the log via `GET /api/sophia/audit`. |
| **`media:write` capability** | **(planned)** | `media:read`/`ctx.media.list()` exist; there is no `ctx.media` write capability wired. The Suite cannot upload/modify media through `ctx` today. |

## Recommended build posture for the Suite (today)

1. **Reads:** use `ctx.site.read()` / `ctx.pages.read()` / `ctx.media.list()` /
   `ctx.data.list/get`.
2. **Writes to the site:** always `ctx.site.patch` / `ctx.pages.patch` — never touch the
   model or files directly (validate-before-commit + rollback + audit are mandatory and
   automatic). See [safe-patching.md](./safe-patching.md).
3. **AI:** `ctx.ai.generate()` only; do not use `stream`/`embed`.
4. **Triggers:** drive work from the three fired hooks and from the Suite's own routes;
   do not wait on `jobs` execution or unfired hooks.
5. **UI:** ship `adminNav` + API routes now; keep `adminEntry` ready for when panel
   mounting lands.
6. **Settings:** persist Suite config via `ctx.settings.*` (lives in `tokens.extSettings`).

When the Stack ships any **(planned)** item above, this contract is the place it gets
promoted to the "today" table.
