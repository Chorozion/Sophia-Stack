# Production Checklist

Sophia Stack is **self-hosted — you own it, including its security.** It's safe
*by default*, but a live site with an AI write-API is a real attack surface.
Work through this list before you put a deployment on the internet. The root
[`SECURITY.md`](../../SECURITY.md) has the narrative version; this is the
do-it checklist.

## Before you go live

- [ ] **Serve over HTTPS only.** Use your host's TLS. Tokens and the session
      cookie must never travel over plain HTTP. The session cookie is
      `HttpOnly; SameSite=Lax` — HTTPS is what protects it in transit.

- [ ] **Run behind a reverse proxy.** Put the app behind nginx / your host's
      proxy (e.g. Passenger on shared hosting). The app reads
      `x-forwarded-for` / `x-forwarded-proto` / `x-forwarded-host`, so the proxy
      sets the real client IP (which the brute-force guard depends on) and the
      correct scheme.

- [ ] **Complete "Get started" immediately.** Visit `/_setup` and create the
      admin account before anyone else can. Until an owner is claimed, the
      setup page will create the *first* account for whoever submits it.

- [ ] **Choose a strong admin password.** Minimum is 8 characters; pick much
      more. The password is `scrypt`-hashed with a per-site salt and compared in
      constant time — but a weak password is still guessable.

- [ ] **Save your recovery phrase.** "Get started" shows a **five-word recovery
      code once.** It is the root of trust for ownership — store it somewhere
      safe and offline. Without it (and without the password) the only way back
      is host file access.

## Keys & access

- [ ] **Mint least-privilege tokens.** Give AI agents **editor** tokens, not the
      admin token. Keep the admin/bootstrap token offline. See
      [Key Management](./key-management.md).

- [ ] **Rotate and revoke.** Revoke any token you're done with from the
      dashboard Keys tab. **Rotate immediately if a token is ever exposed** — a
      leaked token is remote control of your live site.

- [ ] **Restrict who holds tokens.** Treat tokens like passwords. Don't paste
      them into public chats, screenshots, issues, or commits.

- [ ] **Lock down data collections.** Set each collection's `access` policy
      deliberately — `"public"` only where you truly want open create/read.
      Update and delete always require a token. See the
      [Data Layer](../platform/data-layer.md).

## Runtime hardening

- [ ] **Know the brute-force lockout.** Login (`/_setup`) and recovery
      (`/_recover`) lock an IP for **15 minutes after 8 failed attempts**. This
      depends on a correct client IP from your proxy (above).

- [ ] **Keep `.sophia-data` backed up.** The site's entire state — model, custom
      CSS, tokens, data collections, media, version history — lives in the data
      dir. Back it up regularly and keep file permissions tight (the tokens file
      is written `0600`). The deployer preserves this dir across releases; your
      backups protect against everything else.

- [ ] **Never put provider API keys where the model/agent/client can read them.**
      If your site calls an LLM or other API, keep those keys in server-side,
      owner-set secrets — never in the Site Model, the client, or anything the
      agent reads back.

- [ ] **Review what the AI changes.** Validation + rollback bound the blast
      radius and the immutable core can't be bricked, but review edits before
      trusting them on a production site.

- [ ] **Understand the sandbox caveat.** [Server functions](../platform/server-functions.md)
      run in a Node `vm` sandbox (no `require`/`fs`/network, 1.5s timeout). This
      is **"good enough" containment, not a hardened multi-tenant isolate**, and
      `/api/fn/<name>` endpoints are **public** (no built-in auth/rate-limit).
      Don't define functions that take sensitive action without your own guard.

- [ ] **Keep the host patched.** Self-hosting means OS/runtime updates are on
      you.

## Recovery drill (know it before you need it)

- **Lost password →** `/_recover`, enter the five-word code, set a new password.
- **Someone got in →** `/_recover` resets the login **and revokes every key and
  session**, instantly locking out the intruder. You get a fresh recovery code.
- **Lost password *and* recovery code →** host-level access only: delete the
  `auth` block in `.sophia-data/tokens.json` on the server and re-run "Get
  started." (You own the host, so this is always possible.)

## Not yet in v1 (plan accordingly)

These are **(planned)**, not built — don't assume them:

- Audit logging of edits/access.
- Read-only or finer-grained key roles (only `editor` and `admin` exist today).
- Per-function authentication or rate-limiting.
- A hardened (`isolated-vm`) function sandbox.
- An encrypted server-side secrets store (use host env vars, owner-set).
- Email-based password reset (the recovery code is the mechanism).

Until these land, don't put irreplaceable or regulated data behind a Sophia
deployment, and review the [threat model](./threat-model.md).

---

**Related files**

| File | Purpose |
|------|---------|
| [`SECURITY.md`](../../SECURITY.md) | Narrative security overview |
| [Key Management](./key-management.md) | Tokens, roles, rotation |
| [Threat Model](./threat-model.md) | What's protected, residual risks |
| [`src/server.mjs`](../../src/server.mjs) | Auth, brute-force guard, endpoints |
| [`src/store.mjs`](../../src/store.mjs) | scrypt hashing, recovery, sessions |
