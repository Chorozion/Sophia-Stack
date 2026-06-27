# Hooks

Hooks are a lightweight event bus. An extension subscribes with `ctx.hooks.on(hook, fn)`
and (rarely) publishes with `ctx.hooks.emit(hook, payload)`. Hook delivery is
implemented in `ExtensionHost.emit()` in [`src/extensions.mjs`](../../src/extensions.mjs);
the core fires hooks from [`src/server.mjs`](../../src/server.mjs).

> Only **active and enabled** extensions receive hooks. A disabled extension is skipped.

## The 7 valid hooks

These are the only names accepted (manifest `hooks[]` and `ctx.hooks.on()` reject
anything else with `unknown hook: <h>`).

| Hook | Fired by core today? | Payload (when core fires) |
|---|---|---|
| `site.afterPatch` | **Yes** — on a successful `POST /api/sophia/patch` | `{ ops, changed }` |
| `page.afterSave` | **Yes** — on a successful `POST /api/sophia/patch` | `{ ops, changed }` |
| `media.afterUpload` | **Yes** — on a media upload | `{ id, url, type }` |
| `site.beforePublish` | No — **(not fired by core yet)** | — |
| `site.afterPublish` | No — **(not fired by core yet)** | — |
| `page.beforeSave` | No — **(not fired by core yet)** | — |
| `seo.audit.requested` | No — **(not fired by core yet)** | — |

All seven are **valid** names you may listen to or `emit()` yourself. The four marked
"not fired by core yet" simply will not be triggered by the Stack today — your listener
will never run unless another extension emits them. They are reserved so extensions can
build against stable names. **(planned)** for core to fire them.

> Implementation note: `site.afterPatch` and `page.afterSave` are **both** emitted from
> the same successful patch (`POST /api/sophia/patch`), with the **same** `{ ops, changed }`
> payload. There is currently no per-page granularity — both fire for any model patch.

## Listening — `ctx.hooks.on()`

```js
export default {
  async activate(ctx) {
    ctx.hooks.on("page.afterSave", (payload, meta) => {
      // payload -> { ops, changed }
      // meta    -> { hook: "page.afterSave" }
      ctx.audit.log("observed:page.afterSave", payload.changed || null);
    });

    ctx.hooks.on("media.afterUpload", (payload) => {
      // payload -> { id, url, type }
      // e.g. queue an alt-text check for payload.id
    });
  },
};
```

- The handler receives `(payload, { hook })`. It may be async (it is awaited).
- Handler errors are caught and logged (`[ext:<id>] hook "<hook>": <message>`) — a
  throwing listener does not break the patch or other listeners.
- `ctx.hooks.on()` requires no permission, but you should still declare the hook in your
  manifest's `hooks[]` for clarity and validation.

## Emitting — `ctx.hooks.emit()`

```js
// Publish to any of the 7 valid hooks. Other active extensions listening receive it.
ctx.hooks.emit("seo.audit.requested", { route: "/", reason: "manual" });
```

`emit(hook, payload)` delivers to every active+enabled extension that registered a
listener for `hook`. Use this for cross-extension coordination (e.g. an SEO extension
asking others to react to `seo.audit.requested`). The core does not currently consume
extension-emitted hooks itself.

## Payload shapes (for the fired hooks)

```jsonc
// site.afterPatch  and  page.afterSave  (same payload, from POST /api/sophia/patch)
{
  "ops":     [ /* the patch ops that were applied */ ],
  "changed": [ /* paths/keys that changed, as returned by doPatch */ ]
}

// media.afterUpload
{
  "id":   "media-id",
  "url":  "/media/...",
  "type": "image/png"   // the stored item's type
}
```
