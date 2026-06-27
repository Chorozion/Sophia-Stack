# REST API reference

A deployed Sophia site exposes a small, token-gated REST API under
`/api/sophia/*`. Any agent or client that can make HTTP requests can read the
site and (with a token) edit it. This is the same API the dashboard, the
[MCP endpoint](./mcp.md), and editor integrations like
[Claude Code](./claude-code.md) and [Cursor](./cursor.md) all sit on top of.

- **Base origin:** your deployment, e.g. `https://your-site.com`.
- **Reads** are mostly public; **writes** require a Bearer token.

---

## Authentication

Mint a token in the dashboard **Keys** tab (it starts with `mykey-`). Send it as:

```
Authorization: Bearer mykey-...
```

Token roles:

- **editor** — read + write the site (patch, css, rollback).
- **admin** — everything an editor can do, **plus** token management.

`GET /api/sophia/ping` reports whether your token can write (`canWrite`).

---

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/sophia/ping` | optional | health + `canWrite` token check |
| GET | `/api/sophia/catalog` | none | capability catalog (call FIRST) |
| GET | `/api/sophia/model` | none | current site model (pages, blocks, style, data, functions) |
| GET | `/api/sophia/data` | none | resolved live data |
| GET | `/api/sophia/css` | none | current custom CSS layer |
| POST | `/api/sophia/patch` | Bearer | apply `{ops:[...]}` edits |
| PUT | `/api/sophia/css` | Bearer | replace the custom CSS layer |
| POST | `/api/sophia/rollback` | Bearer | undo the last edit |
| GET | `/api/sophia/versions` | Bearer | rollback history count |
| GET | `/api/sophia/tokens` | admin | list tokens (previews only) |
| POST | `/api/sophia/tokens` | admin | mint a token |
| DELETE | `/api/sophia/tokens` | admin | revoke a token |

> There's also a structured **MCP** endpoint at `/mcp` (JSON-RPC) and an
> **OpenAPI** schema at `/openapi.json` — see [mcp.md](./mcp.md) and
> [openapi.md](./openapi.md).

---

## Read first

```bash
# is my token good, and can it write?
curl https://your-site.com/api/sophia/ping -H "Authorization: Bearer mykey-..."
# => { "ok": true, "site": "Your Site", "host": "your-site.com", "canWrite": true }

# what blocks / styles / patch ops are allowed? (call before editing)
curl https://your-site.com/api/sophia/catalog

# the whole site as JSON
curl https://your-site.com/api/sophia/model
```

---

## Patch ops

`POST /api/sophia/patch` takes a body of `{ "ops": [ ... ] }`. Each op is one
addressable edit. Patches are **validated before commit** — a patch that would
break the site is rejected and the previous good state is kept.

| op | target | fields |
|---|---|---|
| `set` / `add` / `remove` / `move` | a **block** by id | `id`, optional `route`, `path`, `index`, `value` |
| `mset` / `mdel` | a **model dot-path** | `path` (e.g. `style`, `pages./about`, `data.collections.posts`, `functions.subscribe`), `value` |

Set the global style preset:

```bash
curl -X POST https://your-site.com/api/sophia/patch \
  -H "Authorization: Bearer mykey-..." \
  -H "Content-Type: application/json" \
  -d '{"ops":[{"op":"mset","path":"style","value":"dark-tech"}]}'
```

Add an `/about` page:

```bash
curl -X POST https://your-site.com/api/sophia/patch \
  -H "Authorization: Bearer mykey-..." \
  -H "Content-Type: application/json" \
  -d '{
    "ops": [
      { "op": "mset", "path": "pages./about",
        "value": { "title": "About", "blocks": [] } }
    ]
  }'
```

**Responses:**

- Success → `{ "ok": true, "changed": [...] }`
- Rejected → HTTP `422`,
  `{ "ok": false, "error": "edit rejected — would break the site", "details": [...] }`
  — read `details`, fix the op, retry. Nothing changed.

---

## Replace the custom CSS layer

`PUT /api/sophia/css` swaps the live custom CSS. It is sanitized; unsafe CSS is
rejected (HTTP `422`).

```bash
curl -X PUT https://your-site.com/api/sophia/css \
  -H "Authorization: Bearer mykey-..." \
  -H "Content-Type: application/json" \
  -d '{"css":":root{--accent:#00D4FF}"}'
# => { "ok": true, "bytes": 24 }
```

---

## Roll back

`POST /api/sophia/rollback` undoes the last edit and restores the previous good
version. Check how many versions are stored with `GET /api/sophia/versions`.

```bash
curl -X POST https://your-site.com/api/sophia/rollback \
  -H "Authorization: Bearer mykey-..."
# => { "ok": true, "restored": true, "remaining": 4 }

curl https://your-site.com/api/sophia/versions \
  -H "Authorization: Bearer mykey-..."
# => { "count": 4 }
```

---

## Token management (admin)

Admin-role tokens (or an owner session) can manage keys:

```bash
# list (previews only — full tokens are never returned)
curl https://your-site.com/api/sophia/tokens \
  -H "Authorization: Bearer mykey-ADMIN..."

# mint a new editor key
curl -X POST https://your-site.com/api/sophia/tokens \
  -H "Authorization: Bearer mykey-ADMIN..." \
  -H "Content-Type: application/json" \
  -d '{"label":"my-agent","role":"editor"}'
# => { "ok": true, "token": "mykey-..." }

# revoke a key (by full token or its preview prefix)
curl -X DELETE https://your-site.com/api/sophia/tokens \
  -H "Authorization: Bearer mykey-ADMIN..." \
  -H "Content-Type: application/json" \
  -d '{"token":"mykey-..."}'
# => { "ok": true, "removed": 1 }
```

---

## Troubleshooting

- **`401` / "owner or key required"** — missing/invalid `Authorization: Bearer
  mykey-...`, or the token was revoked. Mint a fresh one.
- **`401` / "owner only"** on `/tokens` — that route needs an **admin** token or
  an owner session.
- **`422` "edit rejected"** — the patch (or CSS) would break the site; read
  `details`. Nothing changed.
- **`404` on `/api/sophia/ping`** — the deployment predates the ping endpoint;
  redeploy the latest build. Other endpoints still work.
- **CORS** — `/api/*` and `/mcp` send permissive CORS headers, so browser-based
  clients can call them.

---

Related: [claude-code.md](./claude-code.md) · [cursor.md](./cursor.md) ·
[mcp.md](./mcp.md) · [openapi.md](./openapi.md)
