# Safe Patching

Extensions **cannot mutate the site model directly.** There is no writable model on `ctx`
— the only way to change the site or pages is `ctx.site.patch(ops)`,
`ctx.site.setCss(css)`, or `ctx.pages.patch(ops)`. These call the exact same `doPatch` /
`doSetCss` pipeline that external agents use over REST/MCP, which means every extension
write gets the same safety guarantees. Implementation: `ctx.site` / `ctx.pages` in
[`src/extensions.mjs`](../../src/extensions.mjs); `doPatch` / `doSetCss` in
[`src/server.mjs`](../../src/server.mjs).

## Why

`ctx.site.read()` returns the model so you can inspect it, but mutating that object does
nothing — it is not the live model and is not persisted. The host hands you a read view
and a **patch function**, not a writable handle. This guarantees:

- **Validate-before-commit** — the patch is applied to a copy, the result is validated,
  and if validation fails the **previous good state is kept** and an error is returned.
- **Version snapshot + rollback** — a snapshot is taken before each committed change, so
  the owner (or an agent) can roll back.
- **Audit** — every `ctx.site.patch` / `ctx.site.setCss` / `ctx.pages.patch` call is
  written to the audit log with the actor `ext:<id>`.

This is the same `validate-before-commit` and immutable-core protection described in the
repo's safety rules — extensions cannot route around it.

## What `doPatch` does (the pipeline behind `ctx.site.patch`)

1. Apply the ops to a fresh copy of the model.
2. Validate the resulting model (`validateModel`). If invalid →
   `{ ok: false, code: 422, error: "edit rejected — would break the site", details: [...] }`
   and **nothing is committed**.
3. Snapshot the current good model + CSS (for rollback).
4. Replace the live model, persist it, and broadcast the change to live previews.
5. Return `{ ok: true, changed: [...] }`.

`ctx.site.setCss(css)` is analogous: it sanitizes the CSS (`sanitizeCss`) and rejects
unsafe input with `{ ok: false, code: 422, error: "unsafe css rejected", details: [...] }`,
including custom CSS that targets the immutable core/footer.

## Return shape

```jsonc
// success
{ "ok": true, "changed": [ /* paths/keys that changed */ ] }

// rejected (model would break) — previous state preserved
{ "ok": false, "code": 422, "error": "edit rejected — would break the site", "details": [ /* validation errors */ ] }
```

`ctx.site.setCss` on success returns `{ ok: true, bytes: <length> }`.

## Worked example

```js
export default {
  async activate(ctx) {
    ctx.routes.register("/optimize-title", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });

      const body = JSON.parse((await h.readBody(req)) || "{}");
      const route = body.route || "/";
      const title = body.title || "New Title";

      // SAFE: validate-before-commit + snapshot + rollback + audit.
      const r = ctx.site.patch([
        { op: "mset", path: `pages.${route}.title`, value: title },
      ]);

      // r.ok === false  → the model would break; the live site is unchanged.
      ctx.audit.log("optimize-title", { route, ok: r.ok });
      h.send(res, r.ok ? 200 : 400, r);
    });
  },
};
```

## What gets rejected

- **Invalid model patches** — ops that would produce a model failing validation (unknown
  block types, broken page structure, etc.). Returns `422` and keeps the prior state.
- **Unsafe CSS** — `ctx.site.setCss` rejects CSS that fails sanitization, including custom
  CSS targeting the immutable core/footer (`sx-core-footer`).
- **Permission gaps** — calling `ctx.site.patch` / `ctx.pages.patch` / `ctx.site.setCss`
  without `site:patch` / `pages:patch` throws before any patch is attempted (see
  [permissions.md](./permissions.md)).

## Rules of thumb

- **Read** the model with `ctx.site.read()` / `ctx.pages.read()`; treat it as immutable.
- **Write** only via `ctx.site.patch` / `ctx.pages.patch` / `ctx.site.setCss`.
- **Check `r.ok`** and surface `r.error` / `r.details` to the caller — a rejected patch is
  not an exception, it is a `{ ok: false }` result.
- Never reach for `fs` or other Node APIs to edit `.sophia-data` directly. It bypasses
  validation, snapshots, and audit, and will desync the in-memory model.
