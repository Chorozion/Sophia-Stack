# Extension Lifecycle

This describes how an extension goes from a folder on disk to an active, route-serving,
hook-receiving plugin — and how it is disabled and torn down. Implementation:
[`src/extensions.mjs`](../../src/extensions.mjs) (`ExtensionHost`), wired in
[`src/server.mjs`](../../src/server.mjs).

## The flow

```
loadDir(extensionsDir)
  for each subdir with extension.json:
    parse extension.json
      └─ bad JSON?            → log error, skip
    validateManifest()
      └─ invalid?             → log errors, skip
    satisfies(requires.sophiaStack)
      └─ unmet?               → log, skip
    register in registry (enabled unless tokens.extEnabled[id] === false)
    if enabled → activate(id)

activate(id)
    import(entry module)
    build ctx (permission-gated capabilities)
    reset ext.nav / ext.panels / ext.jobs
    module.activate(ctx)        ← extension registers routes, hooks, nav, settings, jobs
    mark active; audit "activated"

(runtime)
    serve routes under /api/extensions/<id>/*   (only while active AND enabled)
    deliver hooks to listeners                  (only while active AND enabled)

setEnabled(id, false)  → deactivate(id)
setEnabled(id, true)   → activate(id)

deactivate(id)
    module.deactivate(ctx)      ← extension cleanup
    remove its routes + hook listeners
    clear nav / panels / jobs
    mark inactive; audit "deactivated"
```

## Load (boot)

On server start, after the edit pipeline is ready, the host calls
`extHost.loadDir(extensionsDir)` **before serving requests**. The directory is resolved
as: `createServer({ extensionsDir })` → `SOPHIA_EXTENSIONS_DIR` → `<data-dir>/extensions/`
(default `.sophia-data/extensions/`). See [overview.md](./overview.md#how-to-install).

For each immediate subdirectory containing `extension.json`:

1. **Parse** the JSON. Malformed JSON → logged, skipped.
2. **Validate** via `validateManifest()`. Invalid → logged with the specific errors, skipped.
   See [manifest.md](./manifest.md#validation-rules-validatemanifest).
3. **Requires check** — `satisfies(stackVersion, requires.sophiaStack)`. If the
   deployment is older than required, the extension is skipped.
4. **Register** in the host registry. The extension is enabled by default unless
   `tokens.extEnabled[id] === false` was previously persisted.
5. If enabled, **activate** it.

## Activate

`activate(id)`:

1. Dynamically `import()` the manifest's `entry` module.
2. Build the `ctx` object — the permission-gated capability surface (see
   [permissions.md](./permissions.md)).
3. Reset the extension's `nav`, `panels`, and `jobs` collections.
4. Call `module.activate(ctx)` (awaited). This is where the extension does its
   registration:
   - `ctx.routes.register(path, handler)` — serve API routes.
   - `ctx.hooks.on(hook, fn)` — listen to hooks.
   - `ctx.admin.registerNav(item)` — add admin nav.
   - `ctx.settings.register(schema)` — declare settings.
   - `ctx.jobs.register(name, fn)` — register a job handler (requires `jobs:run`).
5. Mark the extension `active` and audit `"activated"`.

If `activate` throws, the error is captured on the extension (`ext.error`), it is left
**inactive**, and the failure is logged — it does not crash the host or other extensions.

```js
// entry module shape
export default {
  async activate(ctx) {
    // register routes / hooks / nav / settings / jobs here
  },
  async deactivate(ctx) {
    // optional cleanup
  },
};
```

Both `activate` and `deactivate` are optional and may be async.

## Enable / disable (runtime)

`POST /api/sophia/extensions { id, enabled }` (admin-gated) toggles an extension:

- `enabled: false` → `deactivate(id)` and persist `tokens.extEnabled[id] = false`.
- `enabled: true`  → `activate(id)` and persist `tokens.extEnabled[id] = true`.

A **disabled** extension serves no routes and receives no hooks. State survives restarts
because it lives in `.sophia-data/tokens.json`.

## Deactivate

`deactivate(id)`:

1. Call `module.deactivate(ctx)` if present (errors are logged, not fatal).
2. Remove all of the extension's registered **routes**.
3. Remove all of the extension's **hook listeners**.
4. Clear its `nav`, `panels`, and `jobs`.
5. Mark inactive; audit `"deactivated"`.

## Install / uninstall

- **Install (today):** copy the extension folder into the extensions directory and
  restart the server. See [overview.md](./overview.md#how-to-install).
- **Uninstall (today):** disable it (`POST /api/sophia/extensions`), and/or remove the
  folder and restart.
- **Install/uninstall CLI: (planned).** There is no `sophia ext install/uninstall`
  command yet — copy-and-restart is the supported flow.

## State persisted across restarts

| State | Location |
|---|---|
| Enabled/disabled | `tokens.extEnabled[<id>]` in `.sophia-data/tokens.json` |
| Per-extension settings | `tokens.extSettings[<id>]` in `.sophia-data/tokens.json` |
| Audit entries | `audit.jsonl` in the data dir |

Registry membership, active state, registered routes/hooks/nav/jobs, and the `ctx`
object are **in-memory** and rebuilt on every boot from the folders on disk.
