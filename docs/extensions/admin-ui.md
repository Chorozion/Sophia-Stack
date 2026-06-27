# Admin UI (nav + panels)

An extension can contribute to the owner dashboard in two ways: **admin nav items**
(working today) and **admin panels** (registration works; rendering is **(planned)**).
Implementation: `ctx.admin` in [`src/extensions.mjs`](../../src/extensions.mjs);
surfaced via `/api/sophia/extensions` in [`src/server.mjs`](../../src/server.mjs).

## Admin nav (works)

Declare nav in the manifest and/or register it at activation:

```json
"adminNav": [{ "label": "Hello", "path": "/admin/extensions/hello", "icon": "smile" }]
```

```js
export default {
  async activate(ctx) {
    ctx.admin.registerNav({ label: "Hello", path: "/admin/extensions/hello", icon: "smile" });
  },
};
```

Registered nav items from **active, enabled** extensions are aggregated and exposed to
the dashboard through the management endpoint:

```bash
curl -s http://localhost:3000/api/sophia/extensions
```

```jsonc
{
  "extensions": [
    {
      "id": "hello-extension",
      "name": "Hello Extension",
      "version": "0.1.0",
      "description": "...",
      "enabled": true,
      "active": true,
      "error": null,
      "permissions": ["site:read", "site:patch", "settings:read", "settings:write", "ai:use"],
      "nav": [{ "label": "Hello", "path": "/admin/extensions/hello", "icon": "smile" }]
    }
  ],
  "nav": [
    { "label": "Hello", "path": "/admin/extensions/hello", "icon": "smile", "ext": "hello-extension" }
  ]
}
```

- `extensions[].nav` — each extension's own nav (only while active).
- top-level `nav` — the **aggregated** nav across all active+enabled extensions, each
  item tagged with its `ext` id (this is `adminNav()`).

A nav item is a plain object; the convention is `{ label, path, icon }`. The dashboard
decides how to render it; the extension just declares it.

## Admin panels (registration works; rendering is planned)

Two pieces exist for richer admin UI, but the **dashboard does not render them yet**:

1. **`ctx.admin.registerPanel(panel)`** — an extension can register a panel object at
   activation. It is stored on the extension (`ext.panels`) but is **not currently
   surfaced or mounted** by the dashboard. **(planned)**
2. **`adminEntry`** (manifest field) — a path to an admin-UI module the extension ships,
   e.g. `examples/extensions/sophia-seo-suite-stub/admin/index.js`. The manifest field is
   accepted, but the Stack does not import or mount it yet. **(planned)**

```js
// adminEntry module (shape used by the SEO Suite stub) — documentation only today
export default {
  title: "SEO Suite",
  render() {
    return "<h2>Sophia SEO Suite</h2><p>...</p>";
  },
};
```

### How panel mounting would work (planned)

The intended contract, once panel rendering ships:

1. The extension declares `adminNav` with a `path` (e.g. `/admin/extensions/seo`) and an
   `adminEntry` module (and/or calls `ctx.admin.registerPanel`).
2. The dashboard renders the nav item; clicking it navigates to the declared `path`.
3. At that path, the dashboard mounts the panel exported by `adminEntry` /
   `registerPanel` (e.g. calls its `render()` or mounts its component).

Until that lands, the **supported** pattern is: declare `adminNav`, and have the
extension serve its own UI/data from its API routes under `/api/extensions/<id>/*` (see
[api-routes.md](./api-routes.md)). The nav item gives the owner an entry point; the
extension's routes do the work.

## Summary

| Feature | Status |
|---|---|
| `adminNav` (manifest + `ctx.admin.registerNav`) surfaced via `/api/sophia/extensions` | Works |
| Aggregated `nav` with `ext` tagging (`adminNav()`) | Works |
| `ctx.admin.registerPanel(panel)` stored on the extension | Works (not rendered) |
| Dashboard rendering of panels / `adminEntry` | (planned) |
