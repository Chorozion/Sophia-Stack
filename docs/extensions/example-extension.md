# Example: `hello-extension`

[`examples/extensions/hello-extension`](../../examples/extensions/hello-extension) is a
minimal, working extension that exercises the full contract: admin nav, a setting, two
API routes (a read and a safe write), a hook listener, provider-agnostic AI, and audit
logging. Copy it as your starting point.

```
examples/extensions/hello-extension/
├── extension.json     # manifest
├── extension.js       # entry module
└── README.md
```

## The manifest — `extension.json`

```json
{
  "id": "hello-extension",
  "name": "Hello Extension",
  "version": "0.1.0",
  "publisher": "SophiaXT Tech",
  "description": "A minimal, working example: admin nav, a setting, two API routes (read + safe patch), a hook listener, provider-agnostic AI usage, and audit logging.",
  "entry": "./extension.js",
  "permissions": ["site:read", "site:patch", "settings:read", "settings:write", "ai:use"],
  "routes": ["/api/extensions/hello-extension/*"],
  "adminNav": [{ "label": "Hello", "path": "/admin/extensions/hello", "icon": "smile" }],
  "hooks": ["page.afterSave"],
  "requires": { "sophiaStack": ">=1.0.0" }
}
```

- `id: "hello-extension"` — lowercase kebab-case; becomes the route prefix
  (`/api/extensions/hello-extension/...`), the settings key, and the audit actor
  (`ext:hello-extension`).
- `entry: "./extension.js"` — the module loaded at activation.
- `permissions` — only what it uses: read the site, patch it safely, read/write its own
  settings, use AI. (No `pages:*`, `media:*`, `data:*`, `jobs:run`, etc. — so those `ctx`
  calls would throw.)
- `adminNav` — one dashboard entry.
- `hooks: ["page.afterSave"]` — declares the hook it listens to (one the core actually
  fires; see [hooks.md](./hooks.md)).
- `requires.sophiaStack: ">=1.0.0"` — current Stack is `1.0.0`, so it loads.

## The entry module — `extension.js`, line by line

```js
export default {
  async activate(ctx) {
    ctx.logger.info("activating");
```
`activate(ctx)` runs at load (and on re-enable). `ctx.logger.info` writes a namespaced
console line (`[ext:hello-extension] activating`). No permission needed.

```js
    // A setting the owner can configure (settings:read/write).
    ctx.settings.register({ greeting: { type: "string", default: "Hello from the extension!" } });
```
Declares a settings schema. `register` itself needs no permission; reading/writing the
values needs `settings:read` / `settings:write`, both granted. Settings persist in
`tokens.extSettings["hello-extension"]`.

```js
    // Show up in the admin (the dashboard reads adminNav from /api/sophia/extensions).
    ctx.admin.registerNav({ label: "Hello", path: "/admin/extensions/hello", icon: "smile" });
```
Adds the nav item at runtime. It is aggregated into the top-level `nav` of
`GET /api/sophia/extensions` while the extension is active. See [admin-ui.md](./admin-ui.md).

```js
    // GET /api/extensions/hello-extension/ping  — a public read route.
    ctx.routes.register("/ping", async (req, res, h) => {
      h.send(res, 200, {
        ok: true,
        greeting: ctx.settings.get("greeting") || "Hello!",   // settings:read
        site: ctx.site.read().site,                            // site:read
        providers: ctx.ai.listProviders(),                    // ai:use
      });
    });
```
Registers `GET-able` `/api/extensions/hello-extension/ping`. No auth check → public read.
It uses three permissioned capabilities (settings read, site read, AI provider list), all
declared in the manifest. `h.send` is the response helper. See [api-routes.md](./api-routes.md).

```js
    // POST /api/extensions/hello-extension/stamp — a SAFE patch.
    ctx.routes.register("/stamp", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
      const r = ctx.site.patch([{ op: "mset", path: "brief", value: "Touched by hello-extension." }]);
      ctx.audit.log("stamp", { ok: r.ok });
      h.send(res, r.ok ? 200 : 400, r);
    });
```
A write route. It does its **own** auth (`isAdmin || hasToken`), then edits the site via
`ctx.site.patch` — which goes through validate-before-commit + snapshot + rollback + audit
(the extension cannot mutate the model directly; see [safe-patching.md](./safe-patching.md)).
It also writes an audit entry and returns the patch result.

```js
    // React to site changes (hook bus). Disabled extensions never receive hooks.
    ctx.hooks.on("page.afterSave", (payload) => {
      ctx.audit.log("observed:page.afterSave", (payload && payload.changed) || null);
    });
```
Subscribes to `page.afterSave` (fired by the core on a successful `POST /api/sophia/patch`,
payload `{ ops, changed }`). The listener just audits what changed. See [hooks.md](./hooks.md).

```js
    ctx.audit.log("activated", { version: ctx.manifest.version });
  },

  async deactivate(ctx) {
    ctx.logger.info("deactivating");
  },
};
```
A final audit entry on activation, and a `deactivate` that logs on teardown. The host
also removes routes/hooks/nav automatically on deactivate.

## Run it

```bash
# Option A — copy into the deployment's data dir, then restart
cp -r examples/extensions/hello-extension <your-deploy>/.sophia-data/extensions/

# Option B — point the server at the examples dir
SOPHIA_EXTENSIONS_DIR=examples/extensions node ...
```

```bash
# Public read route
curl -s http://localhost:3000/api/extensions/hello-extension/ping
# -> { "ok": true, "greeting": "...", "site": "...", "providers": [ ... ] }

# Safe write (owner session, or a Bearer token)
curl -s -X POST http://localhost:3000/api/extensions/hello-extension/stamp \
  -H 'Authorization: Bearer mykey-...'

# Confirm it loaded + see its nav (owner only)
curl -s http://localhost:3000/api/sophia/extensions
```

## Adapt it

1. Copy the folder; rename it and set a new kebab-case `id` and `name` in
   `extension.json`.
2. Trim `permissions` to exactly what you use (each unused one is attack surface; each
   missing one makes the matching `ctx` call throw).
3. Replace the routes/hooks with your own; keep all site writes on `ctx.site.patch` /
   `ctx.pages.patch`.
4. Drop it into the extensions directory and restart.

See also: [manifest.md](./manifest.md), [permissions.md](./permissions.md),
[api-routes.md](./api-routes.md), [hooks.md](./hooks.md), [safe-patching.md](./safe-patching.md).
