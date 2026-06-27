# The OpenAPI surface

A deployed Sophia site serves an **OpenAPI 3.1** schema at `/openapi.json`. The
schema's `servers[0].url` is set to **your deployment's origin** at request time,
so whatever site serves it is the site it edits. It's the canonical machine
description of the editing API and is what a ChatGPT Custom GPT Action imports —
but any OpenAPI-aware tool can consume it.

---

## Prerequisites

1. **A deployed Sophia site**, e.g. `https://your-site.com`.
2. **A minted token** for writes. Dashboard → **Keys** → **Mint a new key** →
   copy the `mykey-...` token (role **editor** or **admin**). Auth is HTTP Bearer
   (`bearerAuth` in the schema).

---

## Operations

The schema defines six operations:

| operationId | Method + path | Security | Summary |
|-------------|---------------|----------|---------|
| `sophiaPing` | GET `/api/sophia/ping` | bearer (optional) | Health + token check (call first). Returns `{ ok, site, canWrite }`. |
| `sophiaCatalog` | GET `/api/sophia/catalog` | public | Capability catalog: block types + props, styles, effects, patch ops, data/functions/media rules. Call FIRST. |
| `sophiaReadModel` | GET `/api/sophia/model` | public | The compact JSON model of the whole live site. |
| `sophiaPatch` | POST `/api/sophia/patch` | bearer | Apply validated edits. Body `{ ops: [...] }`. |
| `sophiaSetCss` | PUT `/api/sophia/css` | bearer | Replace the live custom CSS layer. Body `{ css }`. |
| `sophiaRollback` | POST `/api/sophia/rollback` | bearer | Undo the last edit (restore previous good version). |

The global `security` is `bearerAuth`; the two read operations override it with
an empty `security: []`, so reads are public and only writes need the token.

### Patch op shape

`sophiaPatch`'s `ops` array contains objects with:

- `op` — one of `set`, `add`, `remove`, `move`, `mset`, `mdel`
- `id` — block id (for `set`/`add`/`remove`/`move`)
- `route` — page route, e.g. `/` or `/about`
- `path` — prop path on a block, or a model dot-path for `mset`/`mdel`
  (e.g. `style`, `pages./about`, `data.collections.posts`, `functions.subscribe`)
- `index` — position for `add`/`move`
- `value` — any JSON

Invalid patches are rejected and the previous good state is kept.

---

## Fetch the schema

```bash
curl https://your-site.com/openapi.json
```

`/openapi` (no extension) returns the same JSON.

---

## Import it

- **ChatGPT Custom GPT Action:** in the Action editor, **Import from URL** →
  `https://your-site.com/openapi.json`, then set Auth = API Key / **Bearer** with
  your `mykey-...` token. Full walkthrough in
  [chatgpt-actions.md](./chatgpt-actions.md).
- **Any OpenAPI tool** (Swagger UI, Postman, codegen): point it at the same URL.
  Configure HTTP Bearer auth with your token for the write operations.

---

## curl example

Call `sophiaPatch` directly against the documented path:

```bash
curl -X POST https://your-site.com/api/sophia/patch \
  -H "Authorization: Bearer mykey-..." \
  -H "Content-Type: application/json" \
  -d '{"ops":[{"op":"mset","path":"style","value":"dark-tech"}]}'
```

And the public `sophiaReadModel` (no token):

```bash
curl https://your-site.com/api/sophia/model
```

---

## Troubleshooting

- **Schema `servers` URL looks wrong** → it's derived from the request's
  forwarded host/proto headers. Fetch `/openapi.json` over your real public
  origin (through your proxy), not directly from localhost.
- **Importer reports 0 operations / parse error** → re-import from the URL or
  paste the complete JSON; partial paste fails.
- **401 on writes** → add `Authorization: Bearer mykey-...`. Reads (`sophiaPing`,
  `sophiaCatalog`, `sophiaReadModel`) work without it.

---

See also: [chatgpt-actions.md](./chatgpt-actions.md),
[claude-code.md](./claude-code.md), [mcp.md](./mcp.md).
