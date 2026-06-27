# Build your first extension (15 minutes)

Sophia Stack is meant to be **extended by the community**. An extension can add a dashboard tab,
API routes, background jobs, settings, and react to site events — all **permission-scoped** and
**non-destructive** (extensions touch the site only through the validated patch pipeline). If it's
useful, anyone can install it from your **public git repo in one click**.

## 1. Scaffold it

```bash
sophia create-extension my-tool
```

You get `my-tool/` with:
- `extension.json` — the manifest (id, version, permissions, nav, hooks, `requires.sophiaStack`).
- `extension.js` — a working starter: a settings field, **its own dashboard tab** (panel), a JSON
  route, and a `page.afterSave` hook.
- `README.md`.

## 2. Run it

Point a dev server at the folder's parent and start:

```bash
SOPHIA_EXTENSIONS_DIR="$(pwd)" sophia dev
# open the dashboard → your extension's tab is there
```

(Or copy the folder into a deployment's `.sophia-data/extensions/`.)

## 3. Build your feature

In `activate(ctx)` you have a scoped toolbox (declare the matching permission in `extension.json`):

| You want to… | Use |
|---|---|
| Read/change the site safely | `ctx.site.read()` / `ctx.site.patch(ops, label)` (validated + rollback-able) |
| Your own dashboard tab | `ctx.admin.registerPanel({label, path})` + a `ctx.routes.register(path, …)` serving HTML |
| An API endpoint | `ctx.routes.register('/thing', (req,res,h) => …)` → `/api/extensions/<id>/thing` |
| Use AI (any provider) | `ctx.ai.generate({prompt})` · `ctx.ai.embed([texts])` |
| Members / gating | `ctx.accounts.*`, and `helpers.user` in routes |
| React to edits | `ctx.hooks.on('page.afterSave' | 'site.afterPublish' | 'payments.event' | …)` |
| Background work | `ctx.jobs.register(name, fn)` → run via `ctx.jobs.run(name)` |
| Persist config | `ctx.settings.get/set` · audit with `ctx.audit.log` |

Golden rule: **never mutate the model directly** — go through `ctx.site.patch` so edits stay
validated and reversible. Full reference: [overview](overview.md) · [manifest](manifest.md) ·
[permissions](permissions.md) · [hooks](hooks.md) · [api-routes](api-routes.md) ·
[safe-patching](safe-patching.md) · [admin-ui](admin-ui.md).

## 4. Publish (so anyone can one-click install)

1. Push `my-tool/` to a **public GitHub repo** (the extension dir can be the repo root or a subdir).
2. Make sure `requires.sophiaStack` matches the versions you support.
3. Anyone installs it from their dashboard's **Extensions** tab: paste `owner/repo` (+ subdir), click
   **Install**. The Stack pulls it, validates it, and installs it **non-destructively** (backs up +
   auto-rolls-back on failure).

## 5. Share it with the community

Open a PR adding your extension to the community list (see [CONTRIBUTING.md](../../CONTRIBUTING.md)),
or just share the repo. Good extensions to build: analytics, forms/CRM, a blog/CMS layer, image
optimization, i18n, A/B testing, backups-to-cloud, comment systems, search, and integrations
(email, calendars, e-commerce). The **Sophia SEO Suite** is the first major example.
