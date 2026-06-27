# Server Functions

Server functions are named bits of backend logic you (or the AI) define in the
[Site Model](./site-model.md). The runtime executes the function body inside a
locked-down Node `vm` sandbox: it can read the request input and do scoped CRUD
over your [data collections](./data-layer.md), but it **cannot** touch the
filesystem, network, environment, or anything else on the host. This is the
contained "v1 backend": real logic that can't escape to host capabilities.

## Defining a function

Functions live under `model.functions.<name>`. Each is `{ code: "<body>" }` where
`code` is the **body** of the function (the runtime wraps it for you). Define one
with a [patch](./patch-api.md):

```json
{ "op": "mset", "path": "functions.subscribe", "value": {
  "code": "if(!input.email)return{error:'need email'};const r=db.create('subs',{email:input.email});return{ok:true,id:r.id};"
}}
```

Function names must match `^[a-z0-9_-]+$`, and `code` must be a string under
20,000 characters (enforced by [validation](../../src/validate.mjs)).

## Calling a function

```
POST /api/fn/<name>     body JSON  -> input = parsed body
GET  /api/fn/<name>     query      -> input = query params
```

```bash
curl -X POST https://yoursite.com/api/fn/subscribe \
  -H "Content-Type: application/json" \
  -d '{ "email": "ada@example.com" }'
```

```json
{ "ok": true, "result": { "ok": true, "id": "Xk2p9Qa1" } }
```

The function's return value lands under `result`. An error (thrown or timeout)
returns `400` with `{ ok: false, error: "..." }`. The return value must be
JSON-serializable — the runtime round-trips it through `JSON.stringify`/`parse`.

> **Public by default.** `/api/fn/<name>` has **no built-in auth or rate limit**
> — anyone who can reach the site can call any defined function. Put any access
> checks inside the function body, and don't define functions that perform
> sensitive actions without your own guard. Per-function auth / rate-limiting is
> **(planned)**.

## What the sandbox provides

Inside the function body you have exactly these globals (see
[`src/sandbox.mjs`](../../src/sandbox.mjs)):

| Global | What it is |
|--------|------------|
| `input` | The request data (parsed body for POST, query params for GET). |
| `db`    | Scoped CRUD over your **declared** collections (see below). |
| `JSON`, `Math`, `Date`, `Number`, `String`, `Boolean`, `Array`, `Object` | Safe built-ins. |
| `console.log` / `console.error` | No-ops (calls are accepted but produce no output). |

**Explicitly NOT available:** `require`, `process`, `global`, `fetch`, `fs`,
`Buffer`, `eval`, `Function`, network, environment variables. A function that
references them throws.

### The `db` surface

`db` does CRUD over collections declared in `model.data.collections`. Calling it
on an undeclared collection throws `unknown collection`.

| Call | Returns |
|------|---------|
| `db.list(col, opts?)` | Array of records. `opts` like `{ sort: "newest", limit: N }`. |
| `db.get(col, id)` | One record or `null`. |
| `db.create(col, rec)` | The created record (with `id`, `_created`). |
| `db.update(col, id, patch)` | The updated record or `null`. |
| `db.remove(col, id)` | Count removed. |
| `db.count(col)` | Number of records. |

> Note: `db.create`/`db.update` inside a function store the object you pass
> as-is — field whitelisting (`sanitizeRecord`) is applied by the REST
> `/api/data` layer, not by `db`. Validate input yourself in the function body.

## Limits

- **1.5-second timeout** per call. Long-running or infinite-loop code is killed
  and returns an error.
- Return value must be JSON-serializable (functions/cycles are stripped).
- No persistence beyond `db` (no module state survives between calls).

## Examples

### Validated create

```js
if (!input.email || !input.email.includes("@")) return { error: "bad email" };
if (db.count("subs") >= 10000) return { error: "full" };
const r = db.create("subs", { email: input.email, at: Date.now() });
return { ok: true, id: r.id };
```

### Simple aggregate / read

```js
const posts = db.list("posts", { sort: "newest", limit: 5 });
return { count: db.count("posts"), latest: posts.map(p => ({ id: p.id, title: p.title })) };
```

### A tiny counter (read-modify-write)

```js
const all = db.list("counters");
const c = all[0] || db.create("counters", { n: 0 });
db.update("counters", c.id, { n: (c.n || 0) + 1 });
return { n: (c.n || 0) + 1 };
```

## Honest containment note

This is a Node `vm` sandbox with a minimal frozen context and a timeout. It is
**"good enough" containment** for owner/AI-authored code on a single-tenant,
self-hosted site — there is no `require`, no host access, and a hard time bound.

It is **not** a hardened, multi-tenant isolate. `node:vm` is not a security
boundary against a determined attacker who can write arbitrary code into a
function, and the `/api/fn` endpoints are unauthenticated. A hardened
(`isolated-vm`) sandbox is **(planned)**. Treat function code as code you trust,
and read the [threat model](../security/threat-model.md) before exposing
sensitive logic.

---

**Related files**

| File | Purpose |
|------|---------|
| [`src/sandbox.mjs`](../../src/sandbox.mjs) | The vm sandbox + `db` surface |
| [`src/server.mjs`](../../src/server.mjs) | `/api/fn/*` routing |
| [Data Layer](./data-layer.md) | Collections the functions operate on |
| [Patch API](./patch-api.md) | Defining functions |
| [Threat Model](../security/threat-model.md) | Residual risks |
