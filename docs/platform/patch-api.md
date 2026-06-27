# The Patch API

Sophia Stack edits sites with **surgical patches**, not full-file rewrites.
Instead of re-emitting the whole [Site Model](./site-model.md), the AI emits tiny
ops that target a node by its stable `id` (or a model dot-path). This is the
token-efficiency lever for edits, and it lets a live runtime re-render only the
changed subtree.

Every patch is **validated before it commits**. An invalid patch is rejected
and the previous good state is kept — bad edits simply cannot take effect.

## Endpoint

```
POST /api/sophia/patch
Authorization: Bearer <token>
Content-Type: application/json

{ "ops": [ /* one or more ops */ ] }
```

Writes require a valid token (editor or admin) **or** a logged-in owner browser
session. See [Key Management](../security/key-management.md).

A successful response returns the set of changed node ids:

```json
{ "ok": true, "changed": ["hero1"] }
```

A rejected patch returns `422` with the validation errors, and the live site is
unchanged:

```json
{ "ok": false, "code": 422,
  "error": "edit rejected — would break the site",
  "details": ["page /: block ? has unknown type herro"] }
```

## The six ops

Patches come in two families: **block ops** (target a block by `id`) and
**model ops** (target any model dot-path).

### Block ops

| Op       | Shape | Effect |
|----------|-------|--------|
| `set`    | `{ op: "set", id, path, value }` | Set `block.<path>` (dot path) on the block with id `id`. |
| `add`    | `{ op: "add", route, value, index? }` | Insert a block into a page. `value` **must** have an `id`. Defaults to end of page; `index` inserts at a position. `route` defaults to `"/"`. |
| `remove` | `{ op: "remove", id }` | Delete the block with id `id`. |
| `move`   | `{ op: "move", id, index }` | Reorder the block within its page. |

### Model ops

| Op     | Shape | Effect |
|--------|-------|--------|
| `mset` | `{ op: "mset", path, value }` | Set any model-level dot-path from the root. |
| `mdel` | `{ op: "mdel", path }` | Delete a model-level dot-path. |

`mset`/`mdel` reach the whole model: `style`, page titles, whole pages, data
collections, and functions.

## Examples

### Edit a block prop

```json
{ "op": "set", "id": "hero1", "path": "headline", "value": "Ship even faster" }
```

Dot paths reach nested props:

```json
{ "op": "set", "id": "hero1", "path": "cta.label", "value": "Get started" }
```

### Add a block

```json
{ "op": "add", "route": "/", "value": {
  "id": "stats1", "type": "stats",
  "items": [ { "v": "99.9%", "l": "Uptime" }, { "v": "12ms", "l": "p50 latency" } ]
}}
```

Insert it as the second block instead of the last:

```json
{ "op": "add", "route": "/", "index": 1, "value": { "id": "logos1", "type": "logos", "items": ["A", "B"] } }
```

### Remove / reorder

```json
{ "op": "remove", "id": "logos1" }
{ "op": "move", "id": "stats1", "index": 0 }
```

### Switch the theme

```json
{ "op": "mset", "path": "style", "value": "neon" }
```

### Add a whole page

```json
{ "op": "mset", "path": "pages./about", "value": {
  "title": "About us",
  "blocks": [ { "id": "abouthero", "type": "hero", "headline": "Who we are" } ]
}}
```

### Define a data collection

```json
{ "op": "mset", "path": "data.collections.posts", "value": {
  "fields": [ { "name": "title" }, { "name": "body" } ],
  "access": { "create": "token", "read": "public" }
}}
```

### Define a server function

```json
{ "op": "mset", "path": "functions.subscribe", "value": {
  "code": "if(!input.email)return{error:'need email'};const r=db.create('subs',{email:input.email});return{ok:true,id:r.id};"
}}
```

### Delete a model path

```json
{ "op": "mdel", "path": "data.collections.posts" }
```

## Batching

`ops` is an array — multiple ops apply in order in a single request. They are
validated **together** as one final model; if the combined result is invalid,
the whole batch is rejected and nothing lands.

```json
{ "ops": [
  { "op": "set", "id": "hero1", "path": "headline", "value": "New copy" },
  { "op": "add", "route": "/", "value": { "id": "cta1", "type": "cta", "headline": "Sign up" } }
]}
```

## Validate-before-commit

When a patch arrives, the runtime:

1. Applies the ops to a **clone** of the model (the live model is untouched).
2. Runs [`validateModel`](../../src/validate.mjs) on the result.
3. If invalid → returns `422` with `details`; the live model is unchanged.
4. If valid → snapshots the previous good state, swaps in the new model,
   persists it, and broadcasts the change to live viewers.

Validation checks include: `pages` is an object, every block has a unique string
`id`, every block `type` is known, `fx` is an array, and the `data`/`functions`
layers are well-formed.

## Rollback

Every committed edit snapshots the previous known-good state (model + CSS), up to
30 versions. Undo the last edit:

```
POST /api/sophia/rollback
Authorization: Bearer <token>
```

```json
{ "ok": true, "restored": true, "remaining": 7 }
```

Check how many versions are stored:

```
GET /api/sophia/versions
Authorization: Bearer <token>
```

## MCP equivalents

The same operations are exposed as MCP tools at `POST /mcp` for agent clients:
`sophia_patch`, `sophia_set_css`, `sophia_rollback` (writes, token required),
plus `sophia_catalog` and `sophia_read_model` (reads). See the catalog tool
descriptions in [`src/server.mjs`](../../src/server.mjs).

---

**Related files**

| File | Purpose |
|------|---------|
| [`src/patch.mjs`](../../src/patch.mjs) | Patch op implementation |
| [`src/validate.mjs`](../../src/validate.mjs) | Validate-before-commit |
| [`src/server.mjs`](../../src/server.mjs) | `doPatch`/`doRollback`, endpoints, auth |
| [Site Model](./site-model.md) | The document patches edit |
| [Data Layer](./data-layer.md) | Defining collections via `mset` |
| [Server Functions](./server-functions.md) | Defining functions via `mset` |
