# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **VEX — live preview pane**: split-screen builder (chat + a live `/?vex=1` iframe) that updates in
  real time over the existing `/live` SSE, highlights changed blocks, and supports an optimistic
  **preview → Apply / Discard** flow (the agent can stage edits against a validated clone without
  committing). `src/entry-client.jsx`, `src/dashboard.mjs`, agent `preview` mode.
- **Builder memory (optional vector retrieval)**: a dependency-free vector store (`src/vector-store.mjs`)
  + `src/memory.mjs` index the catalog, skill, brief, and recent versions; before planning edits the
  builder retrieves the most relevant context. Real `embed()` for OpenAI-compatible providers (also
  powers `ctx.ai.embed` for extensions). Off without an embedder. `GET/POST /api/sophia/memory`,
  `EMBED_*` env.
- **Self-update + non-destructive auto-migration**: deployments check the public release channel
  (`GET /api/sophia/update`, Settings → Updates banner, `sophia update [--apply]`), and on boot they
  migrate stored data **forward, safely** — backing up state first, running only additive migrations,
  and stamping the new version only on success (`src/updater.mjs`, `src/migrate.mjs`,
  `src/version.mjs`). New `update.available` extension hook. Pull-based (no telemetry; opt-out via
  `SOPHIA_UPDATE_CHECK=off`). See `docs/operations/updates.md`.
- **SEO metadata rendering**: optional `model.seo` (site defaults) + `pages.<route>.seo` are now served
  in `<head>` — meta description, canonical, robots, OpenGraph, Twitter Card, and script-safe JSON-LD.
- **Enumerable versions + targeted rollback**: `GET /api/sophia/versions` (ids/labels), an optional
  `label` on patches, and `POST /api/sophia/rollback { id }` to revert one specific change without
  clobbering later edits. Extensions get `ctx.versions.list()` / `ctx.versions.rollbackTo(id)`.
- **Owner payments / Stripe** (`src/payments.mjs`): the owner connects **their own** Stripe (Settings →
  Payments or env) to sell products/subscriptions — Sophia takes no cut. Checkout sessions, product
  creation, and **signature-verified webhooks** that stamp member `meta` (plan/customer). Processor-
  agnostic adapter; secret key never leaves the server. `docs/payments/stripe.md`.
- **Non-technical setup docs** (`docs/setup/`): no-code quickstart, a **paste-into-ChatGPT** setup
  assistant, FAQ, and glossary — aimed at a 10–30 minute first setup.
- **End-user accounts** (`src/accounts.mjs`): member signup/login/logout/me + password change, owner
  member listing, `scrypt`+salt+`timingSafeEqual`, per-email brute-force lockout, HttpOnly sessions.
  Exposed to extensions via `ctx.accounts` (`accounts:read`/`accounts:write`). Foundation for
  memberships, portals, and subscription billing. See `docs/platform/accounts.md`.
- **Provider-agnostic AI layer** (`src/providers.mjs`): typed adapters for OpenAI-compatible,
  Anthropic, and Gemini; local models (Ollama/LM Studio/vLLM) + custom endpoints; env-based config
  (`.env.example`) and dashboard config; `sophia ai:list/doctor/test/set-default`.
- **Extension / plugin system** (`src/extensions.mjs`): manifest + lifecycle, 13 scoped permissions,
  hook bus, API-route + admin-nav + settings registration, **safe-patch-only** site access (through
  validate-before-commit + rollback), and an example extension + Sophia SEO Suite contract stub.
- **Audit logging** (`src/audit.mjs`, `GET /api/sophia/audit`): append-only record of writes +
  extension actions.
- `sophia` CLI (`bin/sophia.mjs`): `init`, `dev`, `doctor`, `build`, `package`,
  `template list/create`, `deploy`, `backup`, `restore`, plus `ai:*`.
- Templates system (`templates/`) with 10 validated starter apps.
- Expanded documentation under `docs/` (deploy, AI providers, AI agents, platform, security, extensions).
- GitHub Actions for test / build / package / security / release.

## [1.0.0] - 2026-06-27

First public, open-source release. Relicensed to **Apache-2.0**.

### Added
- Self-hosted, single-artifact deploy (CommonJS Express, zero runtime `npm install`); honors
  numeric `PORT` or a Unix socket path (Passenger/Hostinger).
- First-run admin setup, five-word recovery phrase, and brute-force lockout on login/recovery.
- Built-in conversational AI builder: tool-using agent loop (read → edit → self-correct → iterate),
  bring-your-own OpenAI-compatible key with one-tap provider presets.
- External agent operation: token-gated REST API, MCP server (`/mcp` + stdio wrapper),
  OpenAPI schema (`/openapi.json`), and `skill.md`.
- Site Model + addressable patch engine, validate-before-commit, version history + one-click
  rollback, and an immutable framework core + footer.
- Design system: 12 block types, 7 themes, ~19 effects, sanitized custom-CSS layer.
- Declarative data collections with auto CRUD, media hosting, and sandboxed (`vm`) server functions.
- Multi-page sites with auto `sitemap.xml`, `robots.txt`, and `llms.txt`.
- Branded landing page, README screenshots, and the `Connect-ChatGPT` guide.

### Security
- scrypt + constant-time comparison for passwords and the recovery phrase.
- `SameSite=Lax` session cookies; CORS that does not bypass auth.
- No secrets, keys, or machine paths committed; live URL + internal endpoint scrubbed from history.

[Unreleased]: https://github.com/Chorozion/Sophia-Stack/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Chorozion/Sophia-Stack/releases/tag/v1.0.0
