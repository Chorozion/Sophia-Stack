---
description: Adversarial security review of the repo + runtime
---

Perform a focused security review. Report findings by severity; do not change code unless asked.

Check:

1. **Auth gating** — every write endpoint (`/api/sophia/patch|css|rollback`, `/api/data/*` writes,
   `/api/media`, `/api/sophia/tokens|brief|llm|oauth|agent`) requires `canEdit`/`isAdmin`/token.
   `/api/fn/*` is intentionally public — confirm it stays sandboxed.
2. **No dangerous exec** outside `src/sandbox.mjs` — grep for `eval`, `new Function`,
   `child_process`, `exec`. The only `new Function` should be the owner HTML block (disclosed) and
   the package banner.
3. **Path traversal** — file serving (`/media/*`, `/client.js`) must sanitize names (slashes stripped).
4. **Crypto** — passwords + recovery use scrypt + `timingSafeEqual`. Cookies `SameSite=Lax`.
5. **Brute force** — login + recovery are rate-limited (IP lockout). Recovery code space + scrypt.
6. **Custom CSS** — `sanitizeCss` blocks `<script>`, `@import`, `javascript:`, `expression()`, and `sx-core-footer`.
7. **Sandbox** — `src/sandbox.mjs` context exposes only `input`, `db`, safe built-ins; no escape vectors added.
8. **Repo hygiene** — no secrets, tokens, machine paths, live URLs, or `.sophia-data` committed (and not in history).

For each finding: severity (critical/high/medium/low), the file:line, the risk, and a concrete fix.
Be adversarial — assume a public deployment URL and a determined attacker.
