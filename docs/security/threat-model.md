# Threat Model

This is an honest accounting of what a Sophia Stack deployment protects against,
what it does **not**, and how to mitigate the gaps. It complements the root
[`SECURITY.md`](../../SECURITY.md) and the
[production checklist](./production-checklist.md). The guiding principle:
self-hosting means freedom and responsibility — safe defaults, but a live site
with an AI write-API is a real attack surface.

## Assets we're protecting

- The **integrity of the live site** (its model, CSS, pages).
- **Owner control** (only the owner / authorized agents can edit).
- **Stored data** (collections, media) and **ownership credentials**.

## Trust boundaries

| Actor | Trust | Can do |
|-------|-------|--------|
| Anonymous visitor | untrusted | Read public pages, public-read collections, **call any `/api/fn/<name>`**, create on public-create collections. |
| Editor token holder | semi-trusted | All writes (patch, CSS, rollback, data, media). |
| Admin token / owner session | trusted | Editor writes **plus** token management and owner settings. |
| The AI agent | acts as its token | Whatever its token allows — typically editor. |
| Host / filesystem access | root of trust | Everything; can reset ownership. |

## What's protected (built in)

- **Validate-before-commit.** Every model edit is applied to a clone and
  [validated](../../src/validate.mjs); an edit that would break the site is
  **rejected** (`422`) and the previous good state is preserved. The AI cannot
  push a malformed model into production.
- **Version history + rollback.** Every committed edit snapshots the prior
  good state (up to 30); one call (`POST /api/sophia/rollback`) restores it.
  This bounds the blast radius of any bad or malicious edit.
- **Immutable core.** The framework core (server, render, validation) isn't
  editable through the API — only your site's content/design/data is. The core
  injects a footer (`sx-core-footer`, "Admin · Powered by Sophia Stack") that
  the AI's model edits can't touch, and custom CSS that targets that class is
  **rejected**.
- **Token-gated writes.** Reads can be open; all writes require an editor/admin
  bearer token or an owner session. Token management is admin-only.
- **CSS sanitization.** Custom CSS that contains `<script>`/`<style>`, `@import`,
  `javascript:`, `expression()`, or targets the protected footer is refused
  before saving (see [`sanitizeCss`](../../src/validate.mjs)).
- **Record whitelisting.** Incoming data records are whitelisted to declared
  fields and string-truncated (`sanitizeRecord`) — no junk, no oversized values.
- **Strong credential storage.** Admin password and the five-word recovery code
  are `scrypt`-hashed with per-site salts and compared in **constant time**
  (`timingSafeEqual`). The recovery code is generated from the OS CSPRNG at
  runtime, never baked into the distribution.
- **Brute-force guard.** Login and recovery lock an IP for **15 minutes after 8
  failed attempts**.
- **Session hardening.** The owner session cookie is `HttpOnly; SameSite=Lax`
  with a 30-day max-age; recovery revokes all sessions and editor keys at once.
- **Function sandbox.** Server functions run in a Node `vm` context with no
  `require`/`process`/`fs`/`fetch`/`Buffer`/`eval`, only `input`, a scoped `db`,
  and safe built-ins, under a 1.5s timeout.

## Residual risks (the honest list)

1. **The write API is remote control of your live site.** A leaked editor/admin
   token lets someone edit, deface, or wipe the site (within validation limits).
   *Mitigation:* treat tokens as passwords, least-privilege editor tokens per
   agent, rotate/revoke aggressively, HTTPS-only, recover-to-revoke-all if in
   doubt. See [Key Management](./key-management.md).

2. **The `vm` sandbox is not bulletproof.** `node:vm` provides containment, not a
   hard security boundary, against an attacker who can write arbitrary function
   code. It's "good enough" for single-tenant, owner/AI-authored code — not a
   hardened multi-tenant isolate. *Mitigation:* only let trusted parties define
   functions (function definition is a token-gated model edit); a hardened
   (`isolated-vm`) sandbox is **(planned)**. See
   [Server Functions](./server-functions.md).

3. **`/api/fn/<name>` endpoints are public.** Any visitor can call any defined
   function with arbitrary input — there's **no built-in auth or rate-limit** on
   function calls. *Mitigation:* put access checks inside the function body,
   validate `input`, don't define functions that perform sensitive/expensive
   actions unguarded. Per-function auth/rate-limiting is **(planned)**.

4. **Owner-written HTML/JS runs in visitors' browsers.** The `html` block and an
   AI agent can inject arbitrary markup, CSS, and client JS that executes for
   every visitor. Writes are token-gated, so this is owner-trust — but a
   compromised token or a careless/over-eager AI edit can introduce client-side
   issues (including XSS-style payloads in your own pages). *Mitigation:* review
   AI edits, restrict who holds tokens, rollback if something looks wrong.

5. **Public data create/read where misconfigured.** A collection with
   `access.create: "public"` accepts anonymous writes (whitelisted + truncated,
   but still attacker-controlled volume/content). *Mitigation:* set policies
   deliberately, prefer `"token"` unless you truly want open submission, and
   gate sensitive collections.

6. **Custom CSS is still author-supplied.** Sanitization blocks the obvious
   active-content vectors, but CSS can still be used for layout abuse / clickjacky
   tricks. *Mitigation:* review CSS from sources you don't fully trust.

7. **No independent security audit.** This is new software without a third-party
   audit. *Mitigation:* don't put irreplaceable or regulated data behind it yet.

## Explicitly NOT in scope for v1 (planned)

- **Audit logging** of edits and access.
- **Read-only / scoped key roles** beyond `editor` + `admin`.
- **Per-function authentication and rate-limiting.**
- **A hardened (`isolated-vm`) sandbox.**
- **An encrypted secrets store** (use owner-set host env vars meanwhile).
- **Email-based password reset** (the recovery code is the mechanism).

Don't assume any of these are present.

## Recovery as a backstop

Even if an attacker gains a session or a key, the owner's **five-word recovery
code** at `/_recover` resets the login and **revokes every editor key and
session**, locking the intruder out and issuing a fresh code. If both the
password and recovery code are lost, host-level file access (deleting the `auth`
block in `.sophia-data/tokens.json`) is the final fallback — which the owner
always has on a self-hosted box.

---

**Related files**

| File | Purpose |
|------|---------|
| [`SECURITY.md`](../../SECURITY.md) | Narrative security overview |
| [Production Checklist](./production-checklist.md) | Pre-prod steps |
| [Key Management](./key-management.md) | Tokens, roles, rotation |
| [Server Functions](./server-functions.md) | Sandbox details |
| [`src/server.mjs`](../../src/server.mjs) | Auth, guard, sanitization wiring |
| [`src/validate.mjs`](../../src/validate.mjs) | Validation + CSS sanitizer |
| [`src/sandbox.mjs`](../../src/sandbox.mjs) | The vm sandbox |
| [`src/store.mjs`](../../src/store.mjs) | scrypt hashing, recovery, sessions |
