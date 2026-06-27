# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `sophia` CLI (`bin/sophia.mjs`): `init`, `dev`, `doctor`, `build`, `package`,
  `template list/create`, `deploy`, `backup`, `restore`.
- Templates system (`templates/`) with starter apps.
- Expanded documentation under `docs/` (deploy guides, AI-agent guides, platform + security).
- GitHub Actions for test / build / package / security.

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
