# The Data Layer

The data layer turns a static Sophia site into a real app with persistence —
**without writing any backend code**. You declare collections (data models) in
the [Site Model](./site-model.md), and the runtime gives them storage plus a full
CRUD API automatically. Records are JSON files on disk; there is no database
server and no dependencies.

## Declaring a collection

Collections live under `model.data.collections.<name>`. Define one with a
[patch](./patch-api.md):

```json
{ "op": "mset", "path": "data.collections.posts", "value": {
  "fields": [
    { "name": "title" },
    { "name": "body" },
    { "name": "author" }
  ],
  "access": { "create": "token", "read": "public" }
}}
```

| Key      | Type | What it does |
|----------|------|--------------|
| `fields` | `{name, ...}[]` | The declared fields. **Only these field names are stored** — incoming records are whitelisted to them. Fields may carry extra metadata (e.g. `type`, `label`) that the runtime currently ignores for storage. |
| `access` | `{create, read}` | Access policy. Each is `"public"` or `"token"`. |

Collection names must match `^[a-z0-9_-]+$`.

### Access policy

`access` controls who can hit the auto-generated endpoints:

| Action            | Policy options          | Default if unset |
|-------------------|-------------------------|------------------|
| `read` (list/get) | `"public"` or `"token"` | `token` |
| `create` (POST)   | `"public"` or `"token"` | `token` |
| **update / delete** | always require a token | — (not configurable) |

So a public guestbook uses `{ "create": "public", "read": "public" }`; a private
admin list uses `{ "create": "token", "read": "token" }`. **Update and delete
always require a token regardless of policy.**

> A "token" here means a valid editor/admin bearer token **or** a logged-in owner
> browser session. See [Key Management](../security/key-management.md).

## The auto CRUD API

Declaring the collection above immediately exposes:

| Method & path | Action | Auth |
|---------------|--------|------|
| `GET /api/data/posts` | List records (newest first, up to 200) | `read` policy |
| `GET /api/data/posts/:id` | Get one record | `read` policy |
| `POST /api/data/posts` | Create a record | `create` policy |
| `PUT /api/data/posts/:id` | Update a record | token (always) |
| `DELETE /api/data/posts/:id` | Delete a record | token (always) |

Only **declared** collections are reachable; anything else returns `404 unknown
collection`.

### Create

```bash
curl -X POST https://yoursite.com/api/data/posts \
  -H "Content-Type: application/json" \
  -d '{ "title": "Hello", "body": "First post", "author": "Ada", "junk": "ignored" }'
```

```json
{ "ok": true, "item": {
  "id": "Xk2p9Qa1", "title": "Hello", "body": "First post", "author": "Ada",
  "_created": 1719500000000
} }
```

Note that `junk` was dropped — only declared fields survive (see
[`sanitizeRecord`](../../src/data-store.mjs)). String values are truncated to
5000 characters. Each record gets an auto `id` and a `_created` timestamp.

### List & get

```bash
curl https://yoursite.com/api/data/posts
```

```json
{ "items": [ { "id": "Xk2p9Qa1", "title": "Hello", "_created": 1719500000000 } ] }
```

```bash
curl https://yoursite.com/api/data/posts/Xk2p9Qa1
```

### Update & delete (token required)

```bash
curl -X PUT https://yoursite.com/api/data/posts/Xk2p9Qa1 \
  -H "Authorization: Bearer mykey-..." \
  -H "Content-Type: application/json" \
  -d '{ "title": "Hello (edited)" }'
```

The update is also whitelisted to declared fields; `id` and `_created` are
preserved.

```bash
curl -X DELETE https://yoursite.com/api/data/posts/Xk2p9Qa1 \
  -H "Authorization: Bearer mykey-..."
```

```json
{ "ok": true, "removed": 1 }
```

## Storage model

Each collection is a JSON array persisted to a file in the site's data
directory (`<data-dir>/collections/<name>.json`). Writes are atomic
(write-temp-then-rename). There is no schema migration, no SQL, no external
service — the runtime interprets structured data rather than running backend
code, which is what keeps the whole thing contained.

## Using data from server functions

[Server functions](./server-functions.md) get a scoped `db` object that does CRUD
over your declared collections — `db.list`, `db.get`, `db.create`, `db.update`,
`db.remove`, `db.count`. That's how you add validation or business logic on top
of raw CRUD:

```json
{ "op": "mset", "path": "functions.subscribe", "value": {
  "code": "if(!input.email)return{error:'need email'};return{ok:true,item:db.create('subs',{email:input.email})};"
}}
```

## Showing data on a page

Use a server function behind a button, or an `html` block that fetches
`/api/data/<collection>` on the client. (A built-in data-bound display block is
**(planned)** — for now, wire it through a function or custom HTML.)

---

**Related files**

| File | Purpose |
|------|---------|
| [`src/data-store.mjs`](../../src/data-store.mjs) | DataStore + `sanitizeRecord` |
| [`src/server.mjs`](../../src/server.mjs) | `/api/data/*` routing and access policy |
| [Server Functions](./server-functions.md) | Logic over the data layer |
| [Patch API](./patch-api.md) | Declaring collections |
| [Key Management](../security/key-management.md) | What "token" means |
