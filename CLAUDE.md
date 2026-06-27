# CLAUDE.md — repo guide for AI-assisted contributors

> **Claude Code is one recommended *contributor* workflow — not a requirement, and not part of the
> product.** Sophia Stack is provider-agnostic: it can be built, operated, and extended with any
> compatible AI (OpenAI, Anthropic, Gemini, local models, …) or none at all. The standards below
> apply to any tool. End users never need Claude.

This file orients an AI assistant working **on the Sophia Stack codebase**. (It is not the
runtime "skill" an agent uses to operate a *deployed* site — that's served at `/skill.md`.)

## What this repo is

Sophia Stack is an open-source, self-hosted AI app builder. The owner deploys a single artifact
to their own host, owns their files/data, and builds the site by chatting with a built-in AI or by
handing an external AI a token (REST / MCP / OpenAPI). See `README.md` and `ROADMAP.md`.

## Architecture (where things live)

| File | Responsibility |
|---|---|
| `src/server.mjs` | The runtime. Routes, auth (session + `mykey-` tokens), REST API, `/mcp`, `/openapi.json`, the agent loop, brute-force guard. |
| `src/store.mjs` | Model + CSS + tokens persistence; admin (scrypt), 5-word recovery, sessions, version snapshots. |
| `src/patch.mjs` + `src/validate.mjs` | The addressable patch engine + **validate-before-commit**. |
| `src/data-store.mjs` | Declarative collections → auto CRUD; field whitelisting. |
| `src/media-store.mjs` | Photo/file/video hosting. |
| `src/sandbox.mjs` | The `vm` sandbox for server functions. |
| `src/dashboard.mjs` | Owner control panel (chat builder, pages/data/media/keys/settings). Plain JS, **no backticks/`\n` inside the template literal** (use `String.fromCharCode`). |
| `src/blocks.jsx` · `styles.mjs` · `effects.mjs` · `theme.mjs` | Design system (12 blocks, 7 themes, ~19 effects). |
| `src/openapi.mjs` · `skill-text.mjs` | Agent surface (OpenAPI schema, the runtime skill). |
| `scripts/` | `build` (SSR+client+catalog) · `package` (the deployable CJS artifact) · `dev` · `serve` · `catalog`. |
| `bin/sophia.mjs` | The `sophia` CLI. |
| `demo/` | The test suite. `run-all.mjs` runs everything; `ui-test.mjs` compiles every served inline script. |

## Commands

```bash
npm install
npm run build      # dist/ssr.mjs + public/client.js + catalog.json
npm test           # full in-process suite (demo/run-all.mjs)
npm run package    # -> package/  (the zero-install artifact)
npm run test:package
npm run dev        # local dev server
node bin/sophia.mjs doctor
```

## Safety rules — do NOT regress these

- **Validate-before-commit** — invalid patches must be rejected; the previous good state is kept.
- **Immutable core + footer** — the `sx-core-footer` (Admin · Powered by Sophia Stack) and the
  framework core cannot be edited away by the AI; custom CSS targeting it is rejected.
- **Auth** — writes require an owner session or a Bearer `mykey-` token. Keep scrypt +
  `timingSafeEqual`, `SameSite=Lax` cookies, and the brute-force lockout on login/recovery.
- **Sandbox** — server functions run in `vm` with no `require/process/fs/network` and a timeout.
  Never add capabilities to that context.
- **Artifact** — `package/app.js` must stay **CommonJS** (no top-level await), boot with **zero
  `npm install`**, and honor `process.env.PORT` as **numeric TCP or a Unix socket path**.

## Contribution standards

- Keep `npm test` and `npm run build` green; add a `demo/*-test.mjs` for new behavior and wire it
  into `demo/run-all.mjs`.
- Update `docs/` and `CHANGELOG.md` (Unreleased) for user-facing changes.
- **Never** commit secrets, tokens, machine paths, or `.sophia-data`.
- Mark unimplemented behavior `(planned)` — don't describe it as done.
- Prefer boring, reliable code. Small, focused PRs.

## Common tasks

- **Add a block:** define it in `src/blocks.jsx`, style its `sx-*` classes in `src/styles.mjs`,
  add it to `KNOWN_TYPES` in `src/validate.mjs` and to the catalog in `scripts/catalog.mjs`.
- **Add a theme:** add a preset to `PRESETS` in `src/styles.mjs`.
- **Add a template:** see `templates/README.md` and `.claude/commands/add-template.md`.
