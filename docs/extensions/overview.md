# Extensions — Overview

Extensions are **optional, installable plugins** for a Sophia Stack deployment. They
add admin nav, settings, API routes, background-job handlers, and hook listeners, and
they can read and (safely) edit the site. Think WordPress plugins: an extension is a
folder you drop into your deployment and restart.

The reference implementation lives in [`src/extensions.mjs`](../../src/extensions.mjs).
The starter example is [`examples/extensions/hello-extension`](../../examples/extensions/hello-extension) —
copy it to begin.

> **New to building extensions? Start with the 15-minute tutorial → [Build your first extension](build-your-first.md).**
> Then: [manifest](manifest.md) · [lifecycle](lifecycle.md) · [permissions](permissions.md) ·
> [hooks](hooks.md) · [API routes](api-routes.md) · [admin UI / panels](admin-ui.md) ·
> [safe patching](safe-patching.md) · [worked example](example-extension.md).

## What an extension is

A directory containing:

- `extension.json` — the **manifest** (id, name, version, permissions, routes, nav, hooks, …).
  See [manifest.md](./manifest.md).
- an **entry module** (JS) that `export default { activate(ctx), deactivate(ctx) }`.
  See [lifecycle.md](./lifecycle.md).

```
my-extension/
├── extension.json
└── extension.js      # export default { activate, deactivate }
```

On boot the host scans the extensions directory, validates each manifest, checks the
required Stack version, and calls `activate(ctx)` for every enabled extension. The `ctx`
object is the **only** surface an extension gets — every capability on it is gated by a
manifest permission. See [permissions.md](./permissions.md).

## Trust model (read this)

> **Extension code runs in the host Node process — it is NOT sandboxed.** Permissions
> scope what the host *hands* the extension on `ctx`; they do **not** restrict the
> extension's raw Node access (it can `import`, read files, open sockets, etc.). This is
> the same trust model as WordPress plugins.
>
> **Install only extensions you trust.**

(The `vm` sandbox in [`src/sandbox.mjs`](../../src/sandbox.mjs) is for *server functions*,
a separate feature — it does **not** apply to extensions.)

Two things keep even a trusted extension honest:

- **Safe patching** — extensions cannot mutate the site model directly. Every site/page
  write goes through the same validate-before-commit + version-snapshot + rollback
  pipeline as external agents. See [safe-patching.md](./safe-patching.md).
- **Audit** — every capability call and site write is appended to an audit log
  (`audit.jsonl` in the data dir). See the management endpoints below.

## How to install

Today, "install" means **put the folder where the host looks, then restart.** There are
three ways to point the host at an extensions directory (first match wins):

1. **`createServer({ extensionsDir })`** — explicit option (highest priority).
2. **`SOPHIA_EXTENSIONS_DIR`** — environment variable.
3. **Default** — `<data-dir>/extensions/`, i.e. `.sophia-data/extensions/`.

```bash
# Default location: copy the folder into the deployment's data dir, then restart.
cp -r examples/extensions/hello-extension <your-deploy>/.sophia-data/extensions/

# Or run the server pointed at any directory of extensions:
SOPHIA_EXTENSIONS_DIR=examples/extensions node ...
```

```js
// Or programmatically:
createServer({ extensionsDir: "/abs/path/to/extensions" });
```

Each immediate subdirectory that contains an `extension.json` is loaded as one
extension. An install/uninstall CLI is **(planned)** — for now it's copy-and-restart.

## Lifecycle in brief

```
scan dir → parse extension.json → validateManifest() → requires.sophiaStack check
        → activate(ctx) → (routes / hooks / nav / settings / jobs registered)
        → enable/disable at runtime → deactivate(ctx)
```

Full detail in [lifecycle.md](./lifecycle.md).

## Management endpoints (admin-gated)

All three require an owner session (`isAdmin`). Defined in
[`src/server.mjs`](../../src/server.mjs).

| Method | Path | Purpose |
|---|---|---|
| `GET`  | `/api/sophia/extensions` | List installed extensions + aggregated admin nav: `{ extensions: [...], nav: [...] }` |
| `POST` | `/api/sophia/extensions` | Enable/disable: body `{ id, enabled }` (`enabled` defaults to `true`) |
| `GET`  | `/api/sophia/audit`      | Read the audit log: `{ entries }` (optional `?n=` tail count, default 200) |

```bash
# List installed extensions (owner session cookie required)
curl -s http://localhost:3000/api/sophia/extensions

# Disable one
curl -s -X POST http://localhost:3000/api/sophia/extensions \
  -H 'Content-Type: application/json' \
  -d '{"id":"hello-extension","enabled":false}'

# Read the audit log
curl -s 'http://localhost:3000/api/sophia/audit?n=50'
```

Enable/disable state persists in `tokens.extEnabled`; per-extension settings persist in
`tokens.extSettings` (both inside `.sophia-data/tokens.json`). A **disabled** extension
stops serving its routes and stops receiving hooks.

An extension's own API routes serve under `/api/extensions/<id>/<path>` — see
[api-routes.md](./api-routes.md).

## Where to go next

- [manifest.md](./manifest.md) — every manifest field and validation rules.
- [lifecycle.md](./lifecycle.md) — load → validate → activate → enable/disable → deactivate.
- [permissions.md](./permissions.md) — the 13 permissions and what each gates.
- [hooks.md](./hooks.md) — the 7 hooks; which the core fires today.
- [admin-ui.md](./admin-ui.md) — admin nav (works) and panel rendering (planned).
- [api-routes.md](./api-routes.md) — the route handler contract and auth.
- [safe-patching.md](./safe-patching.md) — why writes must go through `ctx.site.patch`.
- [example-extension.md](./example-extension.md) — `hello-extension`, line by line.
- [sophia-seo-suite-contract.md](./sophia-seo-suite-contract.md) — the Stack ↔ SEO Suite contract.
