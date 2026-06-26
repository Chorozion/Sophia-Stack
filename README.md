<p align="center"><img src="brand/sophia-stack-logo.svg" width="380" alt="Sophia Stack"></p>

<h1 align="center">Sophia Stack</h1>

<p align="center"><b>Your own website, built and edited by AI — you host it, you own it.</b></p>

---

Sophia Stack is a complete website you deploy to your **own** commodity hosting as a single
zip (zero `npm install`). After a one-time setup you build and edit it by **talking to an AI** —
either the **built-in builder** (bring your own key) or **any external AI agent** you hand a token
to. No platform lock-in, no monthly SaaS holding your site hostage. It's yours.

> Replit/Bolt/Lovable power — but **remote, contained, and owned**, on a host you control.

## What it does

1. **Deploy** the zip to any Node host (Hostinger "Setup Node.js App", Railway, Render, a VPS).
2. **Get started** — set an admin login; you get a **five-word recovery phrase** (shown once).
3. **Build with AI** — two ways:
   - **Built-in builder (chat):** add an AI key in Settings (OpenAI, DeepSeek, Groq, OpenRouter,
     Together, Mistral — one-tap presets + "get a key" links). Then just chat in the dashboard.
     A real **agent loop** reads your site, makes changes, fixes its own mistakes, and iterates.
   - **Any external agent:** mint a `mykey-` token and hand any web-capable AI the **skill + URL +
     token** — it edits the live site directly via the REST API or the built-in **MCP** server.
4. **Own everything** — pages, custom HTML/CSS/JS, a data layer with auto CRUD, media hosting,
   and sandboxed server functions, all on your domain.

## Why it's different

- **You own it.** Self-hosted, single artifact, no platform lock-in. Cancel nothing — it's your files.
- **Any AI can operate it.** The deployed site is itself an agent-operable endpoint: a token-gated
  **REST API**, an **MCP server** (`/mcp`), and an **OpenAPI schema** (`/openapi.json`).
- **Safe by design.** Every edit is **validated before it lands** (bad edits rejected), with
  **version history + one-click rollback**, and an **immutable core + footer** the AI can't remove.
- **A real app platform**, not a template: multi-page, custom code, database + forms, media, and
  sandboxed backend functions.
- **Ownership recovery.** Lost your password or someone got in? Your recovery phrase resets the
  login and revokes every key + session — no support ticket, because there's no company in the middle.

## Connect an external AI

- **ChatGPT:** see **[docs/Connect-ChatGPT.md](docs/Connect-ChatGPT.md)** — build a Custom GPT Action
  from `/openapi.json` (Bearer = your `mykey-` token).
- **Claude / MCP clients:** add `/mcp` as a custom connector with a Bearer token.
- **Cursor / Cline / Claude Code:** hand it the skill + URL + token; it edits via the API directly.

> A plain chat with **no web tool** (e.g. the Grok app) can *read* your site but can't *send* the
> request — that's the app's limit, not the token. The token is full auth wherever the AI can make calls.

## What the AI can and cannot do

**CAN:** edit pages, write custom HTML/CSS/JS, define data + forms (CRUD), upload media, write
sandboxed backend functions, use blocks/styles/effects, roll back.
**CANNOT:** touch the framework core or remove the footer/branding · read your password, recovery
phrase, or keys · reach the host OS/filesystem/network (backend code runs in a locked-down sandbox) ·
run code outside that sandbox. Full details in **[SECURITY.md](SECURITY.md)**.

## Deploy from the prebuilt zip

Grab **`release/sophia-stack.zip`** (or build it — below), upload to your host, set the start file to
`app.js` (Node 18+), start it, open the URL. Full step-by-step in the zip's `README.txt`.

## Build from source

```bash
npm install
npm run build       # SSR + client bundles
npm test            # full suite (run the demo/*.mjs)
node scripts/package.mjs   # -> package/  (the deployable artifact)
```

## Repo map

| Path | What |
|---|---|
| `src/` | server · agent loop · store · data · media · sandbox · blocks · styles · effects · dashboard |
| `scripts/` | build · package · catalog |
| `mcp/` | zero-dep stdio MCP wrapper |
| `demo/` | the test suite (server, agent, dashboard, recovery, mcp, pages, pro, ui, package…) |
| `docs/` | Connect-ChatGPT guide |
| `brand/` | logo |
| `ARCHITECTURE.md` · `SECURITY.md` | design + safety model |

## Status — v1

Deployable, branded, and tested end to end: onboarding + recovery, the conversational agent builder,
the agent-operable REST/MCP/OpenAPI surface, data + media + sandboxed functions, validate-before-commit
+ rollback + immutable core. Runs as a CommonJS Express app for broad host compatibility.

*Built under SophiaXT, operator-directed.*
