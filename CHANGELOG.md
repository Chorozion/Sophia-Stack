# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.5.1] - 2026-06-27

The **AI image generation** release: provider-agnostic image generation as an extension, folded into
the build flow — the builder now creates and places fitting images while it works. Verified live with
fal.ai Seedream 4.5. 247 tests across 24 suites.

### Added
- **The builder generates images automatically** — when **Image Studio** is installed, the AI builder
  gets a `generate_image` tool and is prompted to **proactively** create + place a fitting image while
  building a visual page (no extra ask). The **hero block now takes a `bg` background image**, so a
  generated image drops straight into the hero (readable white-text overlay). Verified live with
  fal.ai **Seedream 4.5**. Works in the chat + streaming builder. The extension also exposes a
  `generate` job and the panel has **per-provider "Get a key" + model links**.
- **One-click "Add Image Studio"** in the Extensions tab (installs from this repo).
- **`ctx.media.save()`** — extensions with `media:write` can save images/files to the site's media
  library (`buffer | base64 | data URL` → `{ id, url, type }`).
- **Image Studio extension** (`examples/extensions/sophia-image-gen`): provider-agnostic image
  generation — **fal.ai Seedream 4.5**, **fal.ai Nano Banana 2**, fal.ai FLUX, OpenAI `gpt-image-1`,
  Google Imagen 3, + a key-free SVG placeholder (the three fal models share one fal key).
  Reads the Site Model and uses the configured AI to write **context-aware prompts**, saves to media,
  and can drop the image straight into a block via a safe patch.

## [1.5.0] - 2026-06-27

The **"anybody can be a dev"** release: a guided, intuitive builder with a Lovable-style live preview,
a community extension ecosystem, safe one-click updates, and run-anywhere packaging — all
non-destructive and self-hosted. 235 tests across 22 suites.

### Added
- **In-dashboard "Update now"** (Settings → Updates): runs the tested safe engine (backup → swap →
  health-check → **auto-rollback** on failure), shows the changelog; `.sophia-data` is untouched.
  Logged-in-gated. `POST /api/sophia/update/apply`.
- **`sophia start`**: one command to run it and open your browser (out-of-the-box launcher).
- **Community extensions**: `sophia create-extension <name>` scaffolds a working extension (own tab,
  route, hook, settings) in seconds; a [Build your first extension](docs/extensions/build-your-first.md)
  guide + CONTRIBUTING section invite community plugins (publish to a public repo → one-click install).
- **Competitive analysis** (`docs/competitive-analysis.md`): honest positioning vs Lovable/Base44/Bolt/
  WordPress/headless CMS/Webflow — the differentiation and the defensible wedge.
- **Streaming build chat (Lovable-style)**: the builder now streams the agent's reply **token-by-token**
  with live "editing your site…/styling…" steps. `callProviderStream` (OpenAI-compatible SSE; graceful
  fallback for others) + `POST /api/sophia/agent/stream` + a streaming dashboard consumer.
- **Extension hooks + jobs (R3/R4)**: core now fires `page.beforeSave`, `site.beforePublish`,
  `site.afterPublish`, and `seo.audit.requested` on edits; extensions can register **and run** jobs
  (`ctx.jobs.run`, owner `POST /api/sophia/jobs`). Completes the Sophia SEO Suite's R1–R5 enablers.
- **Sponsorship**: GitHub `Sponsor` button (`.github/FUNDING.yml`) + a README "Support the project"
  section (Buy Me a Coffee + GitHub Sponsors).
- **Extension admin panels (R5)**: an extension can `ctx.admin.registerPanel({label, path})` and serve
  HTML at that route; the Stack renders it as **its own dashboard tab** (iframed). So the Sophia SEO
  Suite gets its own self-contained panel once installed. Surfaced in `GET /api/sophia/extensions`.
- **Docker / run-like-a-container** (no VPS): `Dockerfile` (multi-stage, tiny runtime), `docker-compose.yml`
  (`docker compose up`), `.dockerignore`. Data persists in a `sophia-data` volume.
- **Agent integration guide** (`docs/ai-agents/building-together.md`): how the site model, safe-patch
  pipeline, accounts, payments, SEO, extensions, and VEX fit together — so any agent builds with
  intention and avoids connection mistakes.
- **One-click extension install from git** (`src/installer.mjs`): the dashboard's new **Extensions** tab
  installs an extension straight from a public GitHub repo — downloads the tarball, validates the
  manifest + `requires.sophiaStack`, and installs **non-destructively** (backs up + auto-rolls-back on
  any failure). "Add Sophia SEO Suite" button + install-from-URL + enable/disable/uninstall.
  `POST /api/sophia/extensions/{install,uninstall}`.
- **Chat-agent build UX**: the Build chat now stages in VEX by default and ships a prominent
  **🚀 Push to Live** button (preview → push), with a "Sophia is thinking…" state.
- **First-run onboarding wizard** + intuitive dashboard: a "Welcome — let's get you live" checklist
  (admin → recovery phrase → connect AI → build) that guides new users, Build as the default tab, and
  a `GET/POST /api/sophia/onboarding` flag. Settings now defaults to **Basic** with a **Show advanced
  settings** toggle (model/base-URL + Google sign-in hidden until enabled).
- **Safe-update engine** (`src/safe-update.mjs`): non-destructive apply with **backup → apply →
  spawn-based health check → auto-rollback** on any failure. `sophia update --apply` now health-checks
  the new boot and reverts if it isn't healthy, then shows the changelog. `.sophia-data` is never touched.
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

[Unreleased]: https://github.com/Chorozion/Sophia-Stack/compare/v1.5.1...HEAD
[1.5.1]: https://github.com/Chorozion/Sophia-Stack/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/Chorozion/Sophia-Stack/compare/v1.0.0...v1.5.0
[1.0.0]: https://github.com/Chorozion/Sophia-Stack/releases/tag/v1.0.0
