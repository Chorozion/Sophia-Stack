# Sophia Stack — Architecture (v0.2)

> File: D:/sophiaxt/sophia-stack/ARCHITECTURE.md
> Parent index: D:/sophiaxt/sophia-stack/README.md
> Companions: @sophiaxt/lab-live (renderer lib), D:/lens-xt deploy tooling
> Date: 2026-06-25 · Author: sophia-2 (operator-directed) · Status: DRAFT — for review

---

## What it is

The **Sophia Stack** is an **AI-optimized, full-stack deployment stack**: a robust toolchain
where an AI agent builds, edits, connects to backends, and ships real production sites at
**minimal token cost**, with **real-time edits** and **safe one-command deploys**. It runs
many different sites and ships with **its own Markdown docs, an agent skill, and MCP/OpenAPI/REST interfaces** so agents
operate it natively.

## Proven core (v0, done — 6/6 tests green)

The token/patch/real-time spine is built and validated:

- **Compact, addressable Site Model** → ~3.5× fewer authoring tokens (grows with block richness).
- **Patch engine** (set/add/remove/move by node id) → ~10× cheaper edits than re-emitting files.
- **Real-time runtime** — patches apply over SSE; the browser swaps only the changed nodes
  in place, no reload. (`src/render.mjs`, `src/patch.mjs`, `src/dev-server.mjs`.)

This spine is renderer-agnostic — it holds whether a node renders to a string or a hydrated
component. The HTML-string renderer was a cheap proof; the robust stack upgrades the renderer
and adds the layers below.

## The robust stack — added layers

### 1. Component runtime (not simple HTML)
Nodes render to real, interactive components (recommend **Preact** for footprint + hydration,
behind a swappable renderer adapter). Client interactivity, state, and events — a real
frontend, not static markup. The Site Model still drives it; components are the expansion target.

### 2. Backend connections & data (first-class)
The model gains a **connections** layer and blocks **bind** to live data:

- **Data sources** — declared connections (REST / GraphQL / SQL / and our custom systems:
  the lab live feed, agents, Mnema, memory). A block binds: `feed{ source: "lab.feed", thread }`.
- **Server actions** — form submits / mutations routed to server-side handlers.
- **API routes** — each site can host its own backend endpoints.
- **Auth / sessions** — robust apps need it; built into the runtime.

The dev server is already a Node server — it grows into the backend host (dev + prod parity).

### 3. Robustness
Typed Site Model + validation, error boundaries per node, deterministic builds, structured
logging, and the **non-destructive deployer** we hardened today (backup → atomic swap →
runtime-data + `.env` preservation → health-verify → rollback). Deploy safety is built in.

### 4. Docs & Skills (the stack teaches itself to agents)
The stack **ships** its own operating manual for AI:

- **Reference MD** — the Site Model schema, block vocabulary, data-binding + connection syntax,
  patch ops, server actions, deploy flow.
- **Agent skill (provider-agnostic)** — a `sophia-stack` skill (SKILL.md, served at /skill.md) that teaches any agent
  the verb set (`read` / `patch` / `connect` / `preview` / `deploy`) so any Sophia agent builds
  on the stack natively, token-efficiently. This is a first-class deliverable, not an afterthought.

## The agent verb set

`new <site>` · `read [node]` · `patch <ops>` · `connect <source>` · `action <name>` ·
`preview` (live runtime) · `deploy` / `rollback`. Token efficiency is the headline metric.

## Build order (proposed)

1. ✅ **Core spine** — model + patch + real-time runtime (done).
2. **Connections layer** — model `connections` + block data-binding + a first adapter
   (the lab live feed — dogfood our own custom system).
3. **Component runtime** — Preact adapter with hydration + interactivity + data binding.
4. **Skill + MD** — author the `sophia-stack` skill and reference docs against the real API.
5. **Server actions + API routes + auth.**
6. **Deploy command** — wire the safe deployer; ship one real site end-to-end.

## Open decisions (your call)

- **Component runtime:** Preact (recommended, small + React-compatible) vs React vs Solid.
- **Connections first adapter:** the lab live feed (dogfood) vs a generic REST adapter.
- **Server model:** single Node runtime hosting both render + backend (recommended) vs split.

## Non-goals (still)
Visual builder, plugin marketplace, edge/SSR multi-region — after the full-stack spine is solid.

---

## Provider-agnostic AI + Extensions (v1)

**Provider-agnostic AI (`src/providers.mjs`).** The built-in builder never calls a vendor
directly. Typed adapters — `openai` (every OpenAI-compatible host + local Ollama/LM Studio/vLLM +
custom), `anthropic`, `gemini` — normalize to one internal message/tool shape. Config comes from the
dashboard or environment variables (`.env.example`); `resolveProvider()` selects the active one.
Extensions get the same service via `ctx.ai.*`.

**Extension/plugin system (`src/extensions.mjs`).** Optional installable modules (manifest +
`activate`/`deactivate`) extend the platform without forking it. They register admin nav, settings,
API routes (`/api/extensions/<id>/*`), and hook listeners; every capability is gated by a scoped
permission; every action is recorded by the **audit log (`src/audit.mjs`)**. Crucially, extensions
touch the site **only** through the same `doPatch` pipeline as external agents — validate-before-commit,
version snapshot, rollback — so they can never corrupt the model. The **Sophia SEO Suite** is the
first major extension and is developed separately against
`docs/extensions/sophia-seo-suite-contract.md`.
