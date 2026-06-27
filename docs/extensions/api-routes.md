# API Routes

An extension can serve its own HTTP API. Routes register at activation and are served
under `/api/extensions/<id>/<path>`. Routing/dispatch is in
[`src/extensions.mjs`](../../src/extensions.mjs) (`dispatchRoute`); the URL prefix and
the `helpers` object are wired in [`src/server.mjs`](../../src/server.mjs).

## Registering a route

```js
export default {
  async activate(ctx) {
    // GET/POST/etc. handled by your code — register one handler per subpath.
    ctx.routes.register("/ping", async (req, res, h) => {
      h.send(res, 200, { ok: true });
    });
  },
};
```

- The path you register is the **subpath** after `/api/extensions/<id>/`. So `/ping`
  registered by extension `hello-extension` serves at
  `/api/extensions/hello-extension/ping`.
- A leading slash is optional (`"/ping"` and `"ping"` are equivalent).
- **Wildcards:** register `"*"` or a `"prefix/*"` to catch a subtree. The manifest's
  `routes: ["/api/extensions/<id>/*"]` is the declared intent; the actual catch-all comes
  from registering a wildcard handler. With a wildcard, your handler inspects the request
  URL itself to route further.

Routes only serve while the extension is **active and enabled**. Disabling an extension
removes its routes; re-enabling re-registers them.

## The handler contract

```js
ctx.routes.register(path, async (req, res, helpers) => { ... });
```

- `req` — the raw Node `IncomingMessage`.
- `res` — the raw Node `ServerResponse`.
- `helpers` — host-provided conveniences (below).

### `helpers`

| Field | Type | Meaning |
|---|---|---|
| `send(res, status, obj)` | fn | Send a JSON response with the given status code. |
| `readBody(req)` | async fn | Read the request body as a string (parse JSON yourself). |
| `origin` | string | The request origin, e.g. `https://example.com`. |
| `isAdmin` | boolean | True if the request carries a valid owner session. |
| `canEdit` | boolean | True if the request may edit (owner session **or** a valid editor token). |
| `hasToken` | boolean | True if the request carries a valid Bearer `mykey-` editor token. |
| `audit` | object | The host audit log; `audit.log(actor, action, details)`. (Prefer `ctx.audit.log(action, details)` from the extension, which records actor `ext:<id>`.) |

**The extension decides its own auth.** Nothing is enforced for you — read `helpers` and
reject as appropriate. The convention for write routes is to require an owner or a token:

```js
if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
```

## Full example — a read route and a write-via-safe-patch route

```js
export default {
  async activate(ctx) {
    // ── Public read route ──
    // GET /api/extensions/hello-extension/ping
    ctx.routes.register("/ping", async (req, res, h) => {
      h.send(res, 200, {
        ok: true,
        greeting: ctx.settings.get("greeting") || "Hello!",   // settings:read
        site: ctx.site.read().site,                            // site:read
        providers: ctx.ai.listProviders(),                    // ai:use
      });
    });

    // ── Write route (auth required), edits the site SAFELY ──
    // POST /api/extensions/hello-extension/stamp
    ctx.routes.register("/stamp", async (req, res, h) => {
      if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });

      // Goes through validate-before-commit + version snapshot + rollback.
      // The extension CANNOT mutate the model directly — see safe-patching.md.
      const r = ctx.site.patch([{ op: "mset", path: "brief", value: "Touched by hello-extension." }]);
      ctx.audit.log("stamp", { ok: r.ok });
      h.send(res, r.ok ? 200 : 400, r);   // r -> { ok, changed } or { ok:false, error, details }
    });
  },
};
```

```bash
# Read (no auth)
curl -s http://localhost:3000/api/extensions/hello-extension/ping

# Write (owner session cookie, or Bearer token)
curl -s -X POST http://localhost:3000/api/extensions/hello-extension/stamp \
  -H 'Authorization: Bearer mykey-...'
```

## Reading the request body

`req`/`res` are raw Node objects, so parse JSON yourself:

```js
ctx.routes.register("/optimize-title", async (req, res, h) => {
  if (!h.isAdmin && !h.hasToken) return h.send(res, 401, { error: "auth required" });
  const body = JSON.parse((await h.readBody(req)) || "{}");
  const route = body.route || "/";
  // ...do work, then a safe patch...
});
```

## Notes

- A request to `/api/extensions/<id>/...` for a **missing or disabled** extension, or an
  unregistered subpath, returns `404 { error: "no such extension route" }`.
- Routes are matched by exact subpath first, then by wildcard (`*` or `prefix/*`).
- See [safe-patching.md](./safe-patching.md) for why writes must use `ctx.site.patch` /
  `ctx.pages.patch`, and [permissions.md](./permissions.md) for what each `ctx` call needs.
