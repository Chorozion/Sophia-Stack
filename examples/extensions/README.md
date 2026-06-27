# Building Extensions & Plugins for Sophia Stack

A practical guide for developers who want to extend Sophia Stack. Extensions add features —
admin tabs, API routes, background jobs, AI-powered tools, integrations — **without forking the
core**. Think WordPress plugins, but safe-by-construction: an extension can only touch the site
through a validated, reversible patch pipeline, every capability is gated by a scoped permission,
and every action is audited.

This folder ships working examples you can copy:
- [`hello-extension`](hello-extension) — the minimal extension (nav, settings, a route, a safe edit).
- [`sophia-image-gen`](sophia-image-gen) — **Image Studio**: provider-agnostic AI image generation
  (settings, an admin panel, routes, a job the builder calls, `ctx.media.save`).

> Deep-dive reference lives in [`/docs/extensions`](../../docs/extensions/overview.md). This README is
> the one-page "what's required" for contributors. Start with the 15-minute tutorial:
> [Build your first extension](../../docs/extensions/build-your-first.md).

---

## 1. What's required

- **Node 18+** and the Sophia Stack repo (or a deployment you can drop the folder into).
- A folder with two files: a **manifest** (`extension.json`) and an **entry module** (`extension.js`,
  ESM, `export default { activate }`).
- Your extension must declare every capability it uses as a **permission** in the manifest. Calling a
  `ctx` method without its permission throws.
- It must target a compatible core via `requires.sophiaStack` (current core is **1.5.1**).

Scaffold a working extension in seconds:

```bash
node bin/sophia.mjs create-extension my-extension
# -> creates my-extension/ with a manifest + entry (own tab, route, hook, settings)
```

Load it locally for development by pointing the Stack at a directory of extensions:

```bash
SOPHIA_EXTENSIONS_DIR=/abs/path/to/your/extensions  node package/app.js
# or drop the folder into a deployment's  .sophia-data/extensions/
```

---

## 2. Anatomy

```
my-extension/
├─ extension.json     # manifest: id, version, permissions, requires
└─ extension.js       # export default { async activate(ctx) { … }, async deactivate() {} }
```

**Manifest** (`extension.json`):

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "0.1.0",
  "publisher": "You",
  "description": "What it does, in one line.",
  "entry": "./extension.js",
  "permissions": ["site:read", "site:patch", "settings:read", "settings:write"],
  "routes": ["/api/extensions/my-extension/*"],
  "adminNav": [{ "label": "My Tab", "path": "/admin/extensions/my-extension", "icon": "star" }],
  "requires": { "sophiaStack": ">=1.5.0" }
}
```

| Field | Required | Notes |
|---|---|---|
| `id` | ✅ | Unique, `[\w-]+`. Namespaces your routes (`/api/extensions/<id>/…`). |
| `name`, `version` | ✅ | `version` is semver. |
| `entry` | ✅ | Relative path to the ESM entry. |
| `permissions` | ✅ | Subset of the list in §4. Anything you call needs its permission. |
| `description`, `publisher` | – | Shown in the Extensions tab. |
| `routes` | – | Declares the route namespace (documentation/clarity). |
| `adminNav` | – | A nav entry; pair with `ctx.admin.registerPanel` to render a tab. |
| `requires.sophiaStack` | – | Semver range the core must satisfy. Install is refused otherwise. |

**Entry** (`extension.js`):

```js
export default {
  async activate(ctx) {
    // register settings, routes, panels, hooks, jobs here
  },
  async deactivate() {
    // optional cleanup
  },
};
```

---

## 3. Lifecycle

1. **Validate** — manifest shape, known permissions, `requires.sophiaStack`.
2. **activate(ctx)** — you register everything (settings, routes, panels, hooks, jobs). Throwing here
   marks the extension `error` and inactive; it won't break the host.
3. **Running** — your routes serve, your hook listeners fire, your jobs run on demand.
4. **deactivate()** — on disable/uninstall (best-effort cleanup).

Install/enable/disable/uninstall are **non-destructive**: the installer backs up and auto-rolls-back on
any failure, and your site data is never touched.

---

## 4. Permissions

Declare each in the manifest. Calling the matching `ctx` method without it throws.

| Permission | Unlocks |
|---|---|
| `site:read` | `ctx.site.read()` — the Site Model |
| `site:patch` | `ctx.site.patch(ops)` — validated, reversible edits + `ctx.versions.rollbackTo` |
| `pages:read` / `pages:patch` | Page-scoped read/edit |
| `media:read` / `media:write` | `ctx.media.list()` / `ctx.media.save()` |
| `data:read` / `data:write` | Declarative collections |
| `settings:read` / `settings:write` | `ctx.settings.get/set` (your namespaced config) |
| `ai:use` | `ctx.ai.generate()` / `ctx.ai.embed()` / `ctx.ai.listProviders()` |
| `jobs:run` | `ctx.jobs.register()` / run jobs |
| `audit:read` | Read the audit log |
| `accounts:read` / `accounts:write` | End-user accounts/members |

Ask for the **least** you need.

---

## 5. The `ctx` API

```js
// Site (the golden path — never mutate the model directly)
ctx.site.read()                         // -> the Site Model JSON
ctx.site.patch(ops, label?)             // -> { ok, changed } | { ok:false, errors } (validated)

// Media
ctx.media.list()                        // -> [{ id, url, type, … }]
ctx.media.save(data, { name, type })    // data: Buffer | base64 | data URL -> { id, url, type }

// Settings (namespaced to your extension; persisted in .sophia-data)
ctx.settings.register({ key: { type, default } })
ctx.settings.get(key)                    // ctx.settings.set(key, value)

// AI (provider-agnostic — the owner's configured model)
await ctx.ai.generate({ system, prompt })   // -> { text }
await ctx.ai.embed(texts)                    // -> vectors
ctx.ai.listProviders()

// HTTP routes — served under /api/extensions/<id>/<path>
ctx.routes.register("/thing", async (req, res, h) => {
  if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
  const body = JSON.parse((await h.readBody(req)) || "{}");
  return h.send(res, 200, { ok: true });
});
// h.isAdmin  — owner session?   h.hasToken — valid mykey- token?
// h.readBody(req) -> string     h.send(res, status, obj)

// Admin UI — render your own dashboard tab (serve HTML from a route)
ctx.admin.registerNav({ label, path, icon })
ctx.admin.registerPanel({ label, path })     // path resolves to your /<path> route's HTML

// Hooks — react to core events (see §6)
ctx.hooks.on("site.afterPatch", (payload) => { … })

// Jobs — background/agent-callable work
ctx.jobs.register("name", async (payload) => ({ ok: true /* … */ }))

// Versions, audit, accounts, data
ctx.versions.list(); ctx.versions.rollbackTo(id)
ctx.audit.log(action, meta)
ctx.accounts.…   ctx.data.…
ctx.logger.info(…)
```

---

## 6. Hooks

Register with `ctx.hooks.on(hook, fn)`:

`site.beforePublish` · `site.afterPublish` · `site.afterPatch` · `page.beforeSave` ·
`page.afterSave` · `media.afterUpload` · `seo.audit.requested` · `payments.event` · `update.available`

---

## 7. The golden rules

- **Edit the site ONLY via `ctx.site.patch`.** It validates before committing and is reversible. Never
  reach around it. Invalid patches are rejected and the previous good state is kept.
- **Secrets stay server-side.** Store API keys via `ctx.settings.set` (persisted in `.sophia-data`,
  gitignored). Never put a secret in your panel HTML, a card, or the repo.
- **Least privilege.** Request only the permissions you use.
- **Be non-destructive.** Don't delete user content without explicit intent; prefer additive changes.
- **Respect the immutable core.** The framework core + footer can't be edited away.

---

## 8. Test it

Add a `demo/*-test.mjs` style check (see [`demo/image-gen-test.mjs`](../../demo/image-gen-test.mjs) for a
full example): spin up `createServer({ extensionsDir })`, set up an owner, then hit your routes and
assert behavior + auth gating. Keep `npm test` and `npm run build` green.

---

## 9. Publish for one-click install

1. Put your extension folder in a **public git repo** (root, or a subdirectory).
2. Anyone installs it from the **Extensions** tab → *Install from a git repo*:
   `owner/repo` (+ optional subdir), or paste a GitHub URL. The installer downloads the tarball,
   validates the manifest + `requires.sophiaStack`, and installs non-destructively.
3. Tell users the repo/subdir. (Image Studio installs from `Chorozion/Sophia-Stack`, subdir
   `examples/extensions/sophia-image-gen`.)

PRs that add your extension to the community list are welcome — see
[CONTRIBUTING.md](../../CONTRIBUTING.md).

---

## Reference

- Tutorial: [Build your first extension](../../docs/extensions/build-your-first.md)
- Overview + deep dives: [manifest](../../docs/extensions/manifest.md) ·
  [lifecycle](../../docs/extensions/lifecycle.md) · [permissions](../../docs/extensions/permissions.md) ·
  [hooks](../../docs/extensions/hooks.md) · [API routes](../../docs/extensions/api-routes.md) ·
  [admin UI](../../docs/extensions/admin-ui.md) · [safe patching](../../docs/extensions/safe-patching.md)
- Reference implementation: [`src/extensions.mjs`](../../src/extensions.mjs)
