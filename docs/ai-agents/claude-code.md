# Drive your Sophia site from Claude Code (or Cursor / Cline)

A deployed Sophia site is **agent-operable**: it ships its own token-gated REST
API, so any AI coding tool that can run shell commands — Claude Code, Cursor,
Cline — can read and edit your live site by `curl`-ing the API directly. Claude
Code works like a CLI because it *is* one: hand it the skill URL and a token, and
it can do the rest.

This doc is the plain-HTTP path. For a structured tool integration instead, see
[mcp.md](./mcp.md).

---

## Prerequisites

1. **A deployed Sophia site** at some origin, e.g. `https://your-site.com`.
2. **A minted token.** Open `https://your-site.com/dashboard`, log in, go to the
   **Keys** tab, and **Mint a new key**. A token starting with `mykey-` appears —
   copy it. Roles: **editor** (read + write the site) or **admin** (also manages
   tokens). For building the site, **editor** is enough.

> Reads are mostly public; **writes require** `Authorization: Bearer mykey-...`.

---

## Step 1 — Give the agent its operating manual

Every deployed site serves an LLM operating manual at `/skill.md`. Point Claude
Code at it and at your token. A simple prompt:

> Read https://your-site.com/skill.md . Then connect to my Sophia site at
> https://your-site.com using this token: `mykey-...` . Call the catalog and
> model first, then make the edits I describe.

The skill explains the connect flow, the block types, the patch ops, and the
quality rules. You can also fetch it yourself:

```bash
curl https://your-site.com/skill.md
```

---

## Step 2 — Verify the connection (ping)

`GET /api/sophia/ping` confirms reachability and whether your token can write.
It never changes the site.

```bash
curl https://your-site.com/api/sophia/ping \
  -H "Authorization: Bearer mykey-..."
```

Expected:

```json
{ "ok": true, "site": "Your Site", "host": "your-site.com", "canWrite": true }
```

- `canWrite: true` — the token is valid and can edit.
- `canWrite: false` — token missing/revoked; mint a fresh one in **Keys**.

---

## Step 3 — Read the catalog FIRST

`GET /api/sophia/catalog` is the machine spec: allowed block types and their
props, style presets, effects, patch ops, and the data / media / functions rules.
Always read this before editing so the agent only uses real blocks and styles.
Reads are public (no token needed).

```bash
curl https://your-site.com/api/sophia/catalog
```

---

## Step 4 — Read the current site model

`GET /api/sophia/model` returns the compact JSON of the whole site (pages →
blocks, style, data collections, functions, brief).

```bash
curl https://your-site.com/api/sophia/model
```

---

## Step 5 — Edit with a patch

`POST /api/sophia/patch` with a body of `{ "ops": [...] }`. Each op is one
addressable edit. **Writes need the Bearer token.** Edits are validated — a patch
that would break the site is rejected and the previous good state is kept.

Patch ops:

| op | target | fields |
|----|--------|--------|
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

A successful response looks like `{ "ok": true, "changed": [...] }`. A rejected
one returns `{ "ok": false, "error": "edit rejected — would break the site", "details": [...] }`
with HTTP 422 — read `details`, fix, and retry.

---

## Step 6 — Replace the custom CSS layer (optional)

`PUT /api/sophia/css` with `{ "css": "..." }` swaps the live custom CSS layer.
It is sanitized; unsafe CSS is rejected.

```bash
curl -X PUT https://your-site.com/api/sophia/css \
  -H "Authorization: Bearer mykey-..." \
  -H "Content-Type: application/json" \
  -d '{"css":":root{--accent:#00D4FF}"}'
```

---

## Step 7 — Roll back if needed

`POST /api/sophia/rollback` undoes the last edit and restores the previous good
version.

```bash
curl -X POST https://your-site.com/api/sophia/rollback \
  -H "Authorization: Bearer mykey-..."
```

Check how many versions are stored (token required):

```bash
curl https://your-site.com/api/sophia/versions \
  -H "Authorization: Bearer mykey-..."
```

---

## Endpoint quick reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/sophia/ping` | optional | health + `canWrite` token check |
| GET | `/api/sophia/catalog` | none | capability catalog (call first) |
| GET | `/api/sophia/model` | none | current site model |
| POST | `/api/sophia/patch` | Bearer | apply `{ops:[...]}` edits |
| PUT | `/api/sophia/css` | Bearer | replace custom CSS layer |
| POST | `/api/sophia/rollback` | Bearer | undo last edit |
| GET | `/api/sophia/versions` | Bearer | rollback history count |

---

## Troubleshooting

- **`401` / "owner or key required"** — the `Authorization: Bearer mykey-...`
  header is missing or the token was revoked. Mint a fresh key in **Keys**.
- **`canWrite: false`** on ping — same cause: invalid/missing token.
- **`422` "edit rejected"** — the patch would break the site. Read `details`,
  correct the op, retry. Nothing was changed.
- **`404` on `/api/sophia/ping`** — your deployment predates the ping endpoint;
  redeploy the latest build. The other endpoints still work.
- **Used a block type or style that errored** — re-read `/api/sophia/catalog`;
  only the types listed there are allowed.

---

Same idea applies to Cursor and Cline: paste the skill URL + token into the chat
and let the agent run the `curl` commands above. To wire a structured tool
integration instead, use [MCP](./mcp.md).
