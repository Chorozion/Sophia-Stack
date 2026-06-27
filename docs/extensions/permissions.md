# Permissions

An extension declares the capabilities it needs in its manifest's `permissions[]` array.
The host builds the `ctx` object so that **each capability checks for its permission and
throws if it was not granted**:

```
extension "<id>" is missing permission "<perm>"
```

Permissions scope **what the host hands the extension on `ctx`** — they are not a sandbox
(see the trust model in [overview.md](./overview.md#trust-model-read-this)). Declare the
minimum set you need. Implementation: `_context()` in
[`src/extensions.mjs`](../../src/extensions.mjs).

## The 13 permissions

These are the only valid values; anything else fails manifest validation.

| Permission | Gates on `ctx` | Behavior |
|---|---|---|
| `site:read` | `ctx.site.read()` | Returns the full site model. |
| `site:patch` | `ctx.site.patch(ops)`, `ctx.site.setCss(css)` | **Safe** writes through validate-before-commit + rollback (see [safe-patching.md](./safe-patching.md)). Both calls are audited. |
| `pages:read` | `ctx.pages.read()` | Returns `model.pages`. |
| `pages:patch` | `ctx.pages.patch(ops)` | Safe write to pages (same pipeline as `site.patch`); audited. |
| `media:read` | `ctx.media.list()` | Lists media items. |
| `media:write` | *(reserved)* | No `ctx.media` write capability is wired today; declaring it grants nothing callable. **(planned)** |
| `data:read` | `ctx.data.list(c, o)`, `ctx.data.get(c, i)` | Read declarative-collection records. |
| `data:write` | `ctx.data.create(c, rec)`, `ctx.data.update(c, i, rec)`, `ctx.data.remove(c, i)` | Create/update/delete records. |
| `settings:read` | `ctx.settings.get(key?)` | Read this extension's persisted settings (all, or one key). |
| `settings:write` | `ctx.settings.set(key, val)` | Persist a setting (in `tokens.extSettings[<id>]`). |
| `ai:use` | `ctx.ai.listProviders()`, `ctx.ai.getDefaultProvider()`, `ctx.ai.generate(...)`, `ctx.ai.stream(...)`, `ctx.ai.embed(...)` | Provider-agnostic AI. `generate` works; `stream` and `embed` throw **(planned)**. See below. |
| `jobs:run` | `ctx.jobs.register(name, fn)` | Register a background-job handler. **Note:** registration is gated by this permission, but the core does not yet *execute* registered jobs — job execution is **(planned)**. |
| `audit:read` | *(reserved)* | No `ctx`-level audit *read* capability is wired today (`ctx.audit.log` for **writing** is always available, ungated). Reading the audit log is done by the owner via `GET /api/sophia/audit`. **(planned)** for `ctx`. |

### Capabilities that need no permission

Some `ctx` members are always available and are **not** permission-gated:

- `ctx.id`, `ctx.manifest`, `ctx.stackVersion`, `ctx.permissions` — identity/metadata.
- `ctx.logger.info / error` — namespaced console logging.
- `ctx.audit.log(action, details)` — append an audit entry (actor `ext:<id>`).
- `ctx.settings.register(schema)` — declare a settings schema (read/write the values
  still needs `settings:read` / `settings:write`).
- `ctx.hooks.on(hook, fn)` / `ctx.hooks.emit(hook, payload)` — hook bus (any of the 7
  valid hooks; see [hooks.md](./hooks.md)).
- `ctx.routes.register(path, handler)` — serve an API route (see [api-routes.md](./api-routes.md)).
- `ctx.admin.registerNav(item)` / `ctx.admin.registerPanel(panel)` — admin UI (nav works;
  panel rendering is **(planned)**, see [admin-ui.md](./admin-ui.md)).

## AI — provider-agnostic

`ctx.ai` (under `ai:use`) routes through the Stack's provider abstraction
([`src/providers.mjs`](../../src/providers.mjs)), never a specific vendor:

```js
const providers = ctx.ai.listProviders();        // e.g. ["openai", "dashboard"]
const def = ctx.ai.getDefaultProvider();          // { type, model } | null

const out = await ctx.ai.generate({
  prompt: "Write a concise page title.",          // or: messages: [{role, content}, ...]
  system: "You are a copywriter.",                // optional
  temperature: 0.7,                                // optional
  maxTokens: 64,                                   // optional
});
// out -> { text, provider }
```

- `ctx.ai.generate(opts)` accepts **either** `{ prompt }` **or** `{ messages }`, plus
  optional `system`, `temperature`, `maxTokens`. Returns `{ text, provider }`.
- `ctx.ai.stream(...)` — throws: *"sophia.ai.stream() is planned — use ai.generate() for now"*. **(planned)**
- `ctx.ai.embed(...)` — throws: *"sophia.ai.embed() is planned"*. **(planned)**

If no provider is configured on the deployment, `generate` rejects (`no AI provider
configured`) — handle that in your route.

## Example

```json
"permissions": ["pages:read", "pages:patch", "ai:use", "settings:read", "settings:write"]
```

```js
export default {
  async activate(ctx) {
    const pages = ctx.pages.read();                 // pages:read  ✓
    // ctx.media.list()                             // would THROW — media:read not granted
    const r = ctx.pages.patch([/* ops */]);         // pages:patch ✓  (safe + audited)
  },
};
```
