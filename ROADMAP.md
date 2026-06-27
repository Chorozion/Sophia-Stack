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

## 🚧 In progress

- **Templates gallery** — reusable starter apps (`templates/`) + `sophia template` commands.
- **`sophia` CLI** — `init · dev · doctor · build · package · template · deploy · backup · restore`.
- **CI/CD** — GitHub Actions for test/build/package/security.

## 🔭 Planned

- **Scoped API keys** — read-only / write / admin roles beyond the current editor+admin split.
- **Audit logging** — append-only record of writes (who/when/what).
- **Backup / export / import** — first-class data + model snapshots.
- **Hardened sandbox** — optional `isolated-vm` backend for stricter function isolation.
- **Per-function auth + rate limiting** for public `/api/fn/*` endpoints.
- **Live preview pane** in the builder (watch edits land as you chat).
- **Hosted "Sophia AI" option** — managed inference so non-technical users don't bring a key.
- **Anthropic-native + more providers** in the built-in builder.
- **Shipped Docker image** and one-click deploy buttons.

Have a request? Open a [feature request](https://github.com/Chorozion/Sophia-Stack/issues/new/choose).
