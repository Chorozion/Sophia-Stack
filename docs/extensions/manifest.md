# Extension Manifest (`extension.json`)

Every extension has an `extension.json` at the root of its folder. The host parses it,
runs `validateManifest()` ([`src/extensions.mjs`](../../src/extensions.mjs)), and skips
the extension (logging an error) if it is invalid or requires a newer Stack version.

## Full example

```json
{
  "id": "hello-extension",
  "name": "Hello Extension",
  "version": "0.1.0",
  "publisher": "SophiaXT Tech",
  "description": "A minimal, working example extension.",
  "entry": "./extension.js",
  "adminEntry": "./admin/index.js",
  "permissions": ["site:read", "site:patch", "settings:read", "settings:write", "ai:use"],
  "routes": ["/api/extensions/hello-extension/*"],
  "adminNav": [{ "label": "Hello", "path": "/admin/extensions/hello", "icon": "smile" }],
  "hooks": ["page.afterSave"],
  "requires": { "sophiaStack": ">=1.0.0" }
}
```

## Fields

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | **yes** | string | Lowercase kebab-case. Must match `^[a-z0-9][a-z0-9-]*$`. This is the extension's identity everywhere (route prefix, settings key, enable/disable key, audit actor `ext:<id>`). |
| `name` | **yes** | string | Human-readable display name. |
| `version` | **yes** | string | Extension version (free-form; surfaced in listings and audit). |
| `entry` | **yes** | string | Path (relative to the folder) to the entry JS module that `export default { activate, deactivate }`. |
| `publisher` | no | string | Author/vendor label. |
| `description` | no | string | One-line description; shown in `/api/sophia/extensions`. |
| `adminEntry` | no | string | Path to an admin-UI module. Surfaced in the manifest; **panel rendering is (planned)** — see [admin-ui.md](./admin-ui.md). |
| `permissions` | no | string[] | Capabilities to grant. Each must be one of the 13 valid permissions (below) or validation fails. See [permissions.md](./permissions.md). |
| `routes` | no | array | Declared route prefixes (documentation/intent). Actual routing is by `ctx.routes.register()` at runtime under `/api/extensions/<id>/*`. Must be an array if present. |
| `adminNav` | no | array | Admin nav items. Must be an array if present. Each item is typically `{ label, path, icon }`. See [admin-ui.md](./admin-ui.md). |
| `hooks` | no | string[] | Hooks the extension listens to. Each must be one of the 7 valid hooks (below) or validation fails. See [hooks.md](./hooks.md). |
| `requires.sophiaStack` | no | string | Minimum Stack version, e.g. `">=1.0.0"`. Checked with a simple semver `>=x.y.z` compare; if unmet, the extension is **skipped**. |

## Valid `permissions` (exactly these 13)

```
site:read   site:patch
pages:read  pages:patch
media:read  media:write
data:read   data:write
settings:read  settings:write
ai:use
jobs:run
audit:read
```

Any value not in this list makes the manifest invalid (`unknown permission: <p>`). What
each one gates is in [permissions.md](./permissions.md).

## Valid `hooks` (exactly these 7)

```
site.beforePublish   site.afterPublish   site.afterPatch
page.beforeSave      page.afterSave
media.afterUpload
seo.audit.requested
```

Any value not in this list makes the manifest invalid (`unknown hook: <h>`). Which hooks
the **core actually fires today** vs which are valid-but-not-yet-fired is in
[hooks.md](./hooks.md).

## Validation rules (`validateManifest`)

The manifest is rejected (and the extension skipped) if any of these fail:

- it is not an object;
- `id` is missing or not lowercase kebab-case (`^[a-z0-9][a-z0-9-]*$`);
- `name` is missing;
- `version` is missing;
- `entry` is missing;
- any `permissions[]` entry is not one of the 13 valid permissions;
- `adminNav` is present but not an array;
- `routes` is present but not an array;
- any `hooks[]` entry is not one of the 7 valid hooks.

Separately, after a valid manifest, the host checks `requires.sophiaStack`. The current
Stack version is `1.0.0` (`STACK_VERSION` in [`src/server.mjs`](../../src/server.mjs)).
If the requirement is not satisfied, the extension is skipped with a logged message.

> Note: the `permissions` and `routes`/`adminNav`/`hooks` arrays in the manifest are the
> **declared** surface. Permissions are enforced at runtime on `ctx`; routes/nav/hooks
> only take effect when the extension actually calls the matching `ctx.*.register()` /
> `ctx.hooks.on()` in `activate()`.
