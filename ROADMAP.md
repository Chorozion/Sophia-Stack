# Roadmap

Status legend: ✅ shipped · 🚧 in progress · 🔭 planned

This roadmap is intentionally honest. Anything not marked ✅ is **not** in the product yet.

## ✅ Shipped (v1)

- **Self-hosted deploy** — single artifact (`package/app.js`, CommonJS Express, zero `npm install`),
  runs on any Node 18+ host; honors numeric `PORT` or a Unix socket path (Passenger/Hostinger).
- **Onboarding + ownership** — first-run admin setup, 5-word recovery phrase, brute-force lockout.
- **Built-in AI builder** — conversational tool-using agent loop (read → edit → self-correct →
  iterate); bring your own OpenAI-compatible key (OpenAI/DeepSeek/Groq/OpenRouter/Together/Mistral).
- **External agent operation** — token-gated REST API, MCP server (`/mcp` + stdio wrapper),
  OpenAPI schema (`/openapi.json`), and `skill.md`.
- **Safe editing** — Site Model + addressable patch engine, validate-before-commit, version
  history, one-click rollback, immutable framework core + footer.
- **Design system** — 12 block types, 7 themes, ~19 effects, sanitized custom-CSS layer.
- **App features** — declarative data collections + auto CRUD, media hosting, sandboxed
  (`vm`) server functions, multi-page sites, auto sitemap/robots/llms.txt.

## ✅ Shipped (since v1)

- **Provider-agnostic AI** — adapter layer (OpenAI-compatible, Anthropic, Gemini, local
  Ollama/LM Studio/vLLM, custom); env + dashboard config; `sophia ai:*` commands.
- **Extensions / plugins** — manifest + lifecycle, 13 scoped permissions, hook bus, routes,
  admin-nav, settings, **safe-patch-only** site access, and audit logging. Example + SEO-suite stub.
- **Audit logging** — append-only log of writes + extension actions (`/api/sophia/audit`).
- **Templates gallery** — 10 validated starter apps + `sophia template` commands.
- **`sophia` CLI** — `init · dev · doctor · build · package · template · backup · restore · deploy · ai:*`.
- **CI/CD** — GitHub Actions for test / build / package / security / release.

## 🎯 Next major release — v1.5 "Stable"

**Theme: anybody can be a dev.** Full plan: **[docs/roadmap/v1.5-stable.md](docs/roadmap/v1.5-stable.md)**.
Headline workstreams (all non-destructive; sensitive ops require login):

- **Intuitive dashboard + first-run onboarding wizard**; Settings split into **Basic + an Advanced toggle**.
- **Lovable-class live build** — streaming chat + VEX live preview + push-to-live; works with Codex,
  Claude Code, Grok build, and any provider (in-app and as external agents in VEX).
- **Safe auto-update** in Settings — auto-pull, logged-in-gated, shows the changelog, **auto-rolls-back
  on any failure**.
- **One-click Sophia SEO Suite install** — pulled, verified, auto-installed, non-destructive.
- **Zip runs out of the box** — self-contained, auto-deploy, onboarding on first boot.
- **Stack ⇄ SEO Suite sync at 1.5** — ship R3/R4/R5; pinned compatibility matrix; joint release.
- **Screenshots/GIF** of the whole system working together in both READMEs.

### Already shipped toward 1.5
- **VEX** live preview pane (split-screen, SSE node-swaps, optimistic preview, Apply/Discard, highlights).
- **Vector memory** for the builder + real `ai.embed`.
- **Sophia SEO Suite** — first major extension (separate repo; see the
  [contract](docs/extensions/sophia-seo-suite-contract.md)).

## 🔭 Planned

- **Scoped API keys** — read-only / write / admin roles beyond the current editor+admin split.
- **Extension admin-panel rendering** (`adminEntry`) + **install/uninstall CLI** + background jobs.
- **`ai.stream()` / `ai.embed()`** for the built-in builder and extensions.
- **Backup export/import** beyond the current `sophia backup/restore`.
- **Hardened sandbox** — optional `isolated-vm` backend for stricter function isolation.
- **Per-function auth + rate limiting** for public `/api/fn/*` endpoints.
- **Live preview pane** in the builder.
- **Hosted "Sophia AI" option** — managed inference so non-technical users don't bring a key.
- **Shipped Docker image** and one-click deploy buttons.

Have a request? Open a [feature request](https://github.com/Chorozion/Sophia-Stack/issues/new/choose).
