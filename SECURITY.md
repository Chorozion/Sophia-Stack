# Security — read this before you deploy

The Sophia Stack is **self-hosted and you own it.** That means you also **own its
security.** We make it safe *by default*, but a live site with an AI write-API is a real
attack surface. Please read this honestly before putting it on the internet.

## What the stack protects you from (built in)

- **Token auth on every write.** Reads can be open; edits (model/CSS/rollback) require a
  bearer token. Token management is owner-gated.
- **Validate-before-commit.** Every edit is checked; an edit that would break the site is
  **rejected** and never lands — the good state is preserved.
- **CSS is sanitized.** `<script>`/`<style>` breakout, `@import`, `javascript:`,
  `expression()` are refused.
- **Version history + instant rollback.** Every good state is snapshotted; one call
  restores the previous one.
- **Immutable core.** The framework core (server, render, validation) is not editable
  through the API — only your site's content/design/data is.
- **Atomic, persisted writes.** Edits survive restarts; no redeploy needed.

## Caveats you MUST understand (the honest list)

1. **The write API is remote control of your live site.** Treat your tokens like
   passwords. A leaked token lets someone edit your site. **Rotate immediately if exposed.**
2. **Serve over HTTPS only.** Use your host's TLS. Never send a token over plain HTTP.
3. **This is new software.** It has not had an independent third-party security audit.
   Deploy with that in mind; don't put irreplaceable/regulated data behind it yet.
4. **AI can make mistakes.** Validation + rollback limit the blast radius, but you should
   review what your agent changes. The immutable core means it can't brick the framework.
5. **Strong owner password + least-privilege tokens.** Mint *editor* tokens for agents, keep
   the *admin* token offline. Revoke tokens you're done with.
6. **Keep your host patched.** Self-hosting means OS/runtime updates are on you.
7. **Custom CSS is still author-supplied.** We block the obvious vectors, but review CSS
   from sources you don't trust.

## AI features on YOUR site (API keys)

If your site uses AI (e.g. an LLM feature), **never put provider API keys in the Site
Model, the client, or anything the agent can read back.** Keys belong in **server-side
secrets**, set by the owner after login, used only by backend code, and **never returned to
the model or the browser.** Don't commit keys to git. (A dedicated encrypted secrets store
is on the roadmap; until then, use host environment variables, owner-set.)

## Reporting

Found a vulnerability? Contact the maintainer privately before disclosing publicly.

---

*Self-hosted means freedom and responsibility. We give you safe defaults and the tools to
stay safe; the rest is yours.*
