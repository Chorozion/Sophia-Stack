# End-user accounts

Sophia Stack has a built-in **member account** system — the visitors who sign up on your deployed
site (distinct from the single **owner-admin** who runs the dashboard). It's the foundation for
memberships, client portals, gated content, and subscription billing.

Security matches the owner login: **scrypt + per-user salt + `timingSafeEqual`**, a **per-email
brute-force lockout** (5 failures → 15-minute cool-off), HttpOnly `SameSite=Lax` session cookies, an
8-character minimum password, and responses that **never** include the password hash or salt. Data is
stored in `.sophia-data/accounts.json`.

## REST API

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/accounts/signup` | public | `{ email, password, meta? }` → creates a member, sets the `uid` cookie |
| `POST /api/accounts/login` | public | `{ email, password }` → sets the `uid` cookie |
| `POST /api/accounts/logout` | member | clears the session |
| `GET /api/accounts/me` | member | the signed-in member (`401` if not) |
| `POST /api/accounts/password` | member | `{ current, password }` → change password |
| `GET /api/accounts` | **owner** | list members + count |
| `DELETE /api/accounts/:id` | **owner** | remove a member |

```bash
curl -X POST https://your-site/api/accounts/signup -H 'Content-Type: application/json' \
  -d '{"email":"jane@example.com","password":"a-strong-passphrase"}' -c jar.txt
curl -b jar.txt https://your-site/api/accounts/me
```

## For extensions

With the `accounts:read` / `accounts:write` permissions, an extension gets `ctx.accounts`:

```js
ctx.accounts.list()                 // [{ id, email, createdAt, meta }]
ctx.accounts.get(id)                // one member (no hash)
ctx.accounts.getByEmail(email)
ctx.accounts.create(email, pw, meta)
ctx.accounts.update(id, { meta })   // merge into meta (e.g. plan, stripeCustomerId)
ctx.accounts.remove(id)
```

Extension API handlers also receive the current member as `helpers.user` — so a payments or portal
extension can act on behalf of whoever is signed in. The `meta` object is the right place to stamp
membership state (e.g. `{ plan: "pro", stripeCustomerId: "cus_…" }`).

> **(planned)** Email verification, password-reset emails, OAuth/social login, and role-based member
> groups. Track in [ROADMAP.md](../../ROADMAP.md).
