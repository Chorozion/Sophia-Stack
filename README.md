# Sophia Stack

An **AI-optimized full-stack deployment stack**: build, connect, edit, and ship premium
websites at **minimal token cost**, with **real-time edits** and **safe deploys**. Sites are
authored as a compact, addressable **Site Model** — not hand-written JSX — and rendered to
real React (SSR + hydration). Premium design is baked in: crafted style presets + a CSS
effects catalog mean AI-built sites look high-end *by default* (no slop).

## Why it's competitive with React

Not a vdom rewrite — it renders *via* React (reuse the ecosystem; eject anytime). It wins
where React is weak: **token-efficient authoring**, **real-time edits**, **deploy as a
built-in feature**, and a **baked-in design system** so output is premium automatically.

## What's built

- **Site Model + patch engine** — ~10× cheaper edits (`src/patch.mjs`).
- **React runtime** — SSR + hydration; real-time edits via SSE + reconciliation
  (`src/dev-server-react.mjs`).
- **Backend connections** — blocks bind to live data; first adapter dogfoods our lab feed
  (`src/connections.mjs`).
- **Design system** — 11 block types, 6 style presets, 19 effects, token-driven so adding
  more is cheap (`src/blocks.jsx`, `src/styles.mjs`, `src/effects.mjs`).
- **Agent skill** — `skills/sophia-stack/SKILL.md` + generated `catalog.json`.

## Run

```
npm install
npm run build      # SSR + client bundles
npm run dev        # live runtime at http://localhost:4321
npm run demo       # token-economics proof
node demo/styles-demo.mjs   # same model across every preset
```

## Map

| Path | What |
|---|---|
| `ARCHITECTURE.md` | design + roadmap |
| `catalog.json` | machine-readable capabilities (blocks/styles/effects/ops) |
| `skills/sophia-stack/SKILL.md` | how an AI agent operates the stack |
| `src/` | model · patch · render · connections · blocks · styles · effects · dev server |
| `demo/` | proofs + tests + showcase |

## Status

Core spine, React runtime, connections, and design system are in and tested. Next:
server actions / auth, and the framework-agnostic deployer (ships Sophia sites **and**
plain React apps through the safe pipeline).

*Built under sophia-2, operator-directed.*
