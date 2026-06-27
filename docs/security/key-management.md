# Key Management

Every **write** to a Sophia Stack site needs authorization. Reads can be open;
edits (model patches, CSS, rollback, data writes, media, token management) need
either a **bearer token** or a logged-in **owner browser session**. This page
covers tokens: what they are, the two roles, how to mint/list/revoke them, and
how to use and rotate them safely.

## Two ways to authorize a write

| Mechanism | How | Used by |
|-----------|-----|---------|
| **Bearer token** | `Authorization: Bearer mykey-...` header | AI agents, scripts, MCP clients, custom integrations |
| **Owner session** | `sid` cookie set after logging in at `/_setup` | You, in the dashboard browser |

Both satisfy "can edit." Some sensitive operations (token management, AI builder
settings, OAuth/LLM config, the site brief) additionally require **admin** — an
admin token *or* a logged-in owner session.

## The two roles

There are exactly two roles (finer-grained / read-only roles are **(planned)**):

| Role | Can do |
|------|--------|
| `editor` | All writes: patch the model, set CSS, rollback, data CRUD, media. |
| `admin`  | Everything `editor` can, **plus** token management and owner-only settings. |

A **bootstrap admin token** is generated on first run and printed to the server
console **once** ("first run — admin token (store it; shown once)"). Store it
offline. Day-to-day, prefer logging in as the owner and minting **editor** tokens
for agents.

## Minting, listing, revoking (Keys tab / API)

Token management lives in the dashboard **Keys** tab and is **admin-gated**.

### Mint a token

```
POST /api/sophia/tokens
Authorization: Bearer <admin-token>      # or an owner session cookie
Content-Type: application/json

{ "label": "my-agent", "role": "editor" }
```

```json
{ "ok": true, "token": "mykey-AbC123..." }
```

The full token is returned **only at creation** — copy it now; it isn't shown
again. Tokens look like `mykey-<random>`. Any `role` other than `"admin"` is
treated as `editor`.

### List tokens

```
GET /api/sophia/tokens
Authorization: Bearer <admin-token>
```

```json
{ "tokens": [
  { "preview": "mykey-AbC12…", "label": "my-agent", "role": "editor" }
] }
```

Listing returns **previews only** (first 12 chars), never the full token.

### Revoke a token

```
DELETE /api/sophia/tokens
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "token": "mykey-AbC123..." }      # full token, or a unique prefix
```

```json
{ "ok": true, "removed": 1 }
```

You can pass the full token or a unique prefix (handy when you only kept the
preview).

## Using a token

Send it as a bearer token on any write request:

```bash
curl -X POST https://yoursite.com/api/sophia/patch \
  -H "Authorization: Bearer mykey-AbC123..." \
  -H "Content-Type: application/json" \
  -d '{ "ops": [ { "op": "set", "id": "hero1", "path": "headline", "value": "Hi" } ] }'
```

Verify a token works before relying on it:

```bash
curl https://yoursite.com/api/sophia/ping -H "Authorization: Bearer mykey-..."
# -> { "ok": true, "site": "...", "canWrite": true }
```

For MCP clients, the same token goes on the `Authorization` header to `POST /mcp`;
read tools are open, write tools (`sophia_patch`, `sophia_set_css`,
`sophia_rollback`) require it.

## Rotation & hygiene

- **Rotate on exposure.** A leaked token is remote control of your live site.
  Mint a replacement, update the agent/integration, then revoke the old one.
- **Rotate periodically** for long-lived agents.
- **One token per consumer.** Give each agent/integration its own labeled editor
  token so you can revoke it in isolation.
- **Keep the admin token offline.** Use the owner session for admin tasks in the
  browser; reserve the admin token for break-glass.
- **Never paste a token in public.** No public chats, screenshots, issues,
  commits, or logs. Tokens are stored server-side in `.sophia-data/tokens.json`
  (written with `0600` permissions); your job is to not leak them client-side.

## Nuclear option: revoke everything

If you suspect an intruder, recovery wipes all access at once. Go to `/_recover`,
enter your **five-word recovery code**, and set a new password. This **revokes
every editor key and every session** in one move (admin tokens are preserved for
the recovering owner) and issues a fresh recovery code. See the
[production checklist](./production-checklist.md) and root
[`SECURITY.md`](../../SECURITY.md).

## How auth is enforced (under the hood)

- A bearer token is matched against stored tokens; `admin`-gated routes also
  check the role (see `auth()` in [`src/server.mjs`](../../src/server.mjs)).
- The owner session is a random `sid` cookie (`HttpOnly; SameSite=Lax`,
  30-day max-age), validated against the server's session list.
- Passwords and the recovery code are `scrypt`-hashed with per-site salts and
  compared with constant-time `timingSafeEqual` (see
  [`src/store.mjs`](../../src/store.mjs)).

---

**Related files**

| File | Purpose |
|------|---------|
| [`src/store.mjs`](../../src/store.mjs) | Token mint/verify, sessions, recovery |
| [`src/server.mjs`](../../src/server.mjs) | `auth`/`isAdmin`/`canEdit`, token endpoints |
| [Production Checklist](./production-checklist.md) | Pre-prod steps |
| [Threat Model](./threat-model.md) | What tokens protect against |
| [`SECURITY.md`](../../SECURITY.md) | Narrative overview |
