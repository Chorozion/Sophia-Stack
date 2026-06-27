# Building on Sophia Stack — how it all fits together (for AI agents)

This is the integration guide for any agent (Codex, Claude Code, Cursor, Grok, the built-in builder, …)
that builds or operates a Sophia site. Follow it to build **with intention** and avoid connection/setup
mistakes. The golden rule: **read before you write, change only through the safe patch pipeline, and
never assume — verify.**

## The mental model

A Sophia site is one **Site Model** (pages → blocks → props) plus CSS, data collections, media, members,
payments config, and installed extensions. Everything you change goes through **one validated pipeline**:

```
your edit ──▶ POST /api/sophia/patch {ops}  ──▶ validate ──▶ commit + version snapshot ──▶ live (SSE)
                       (rejected if it would break the site; previous good state kept)
```

So you can't corrupt a site: a bad patch is rejected, and any change can be rolled back
(`POST /api/sophia/rollback {id}`; list with `GET /api/sophia/versions`).

## The build loop (do this, in order)

1. **Read the skill + catalog + model.** `GET /skill.md`, `GET /api/sophia/catalog` (the ONLY valid
   block types + styles), `GET /api/sophia/model` (current site). Never invent a block type — use the catalog.
2. **Plan small patches.** Prefer several small `ops` over one giant change. Keep every block `id` unique.
3. **Preview, then push (VEX).** In the dashboard the builder stages edits in the live preview; the owner
   clicks **🚀 Push to Live**. Programmatically, just `POST /api/sophia/patch`.
4. **Verify.** Re-read the model or watch the live preview; if something's off, `rollback`.

Patch op cheatsheet: `set`(block prop) · `add`/`remove`/`move`(blocks) · `mset`/`mdel`(any dot-path,
e.g. `pages./about`, `data.collections.signups`, `seo.description`, `functions.subscribe`).

## Integration points (wire features the right way)

- **SEO** — set `model.seo` (site defaults) and/or `pages.<route>.seo` (`description`, `canonical`,
  `robots`, `openGraph`, `twitter`, `jsonLd[]`). They render into `<head>` automatically. *(Or install
  the Sophia SEO Suite — it does this for you and adds its own panel.)*
- **Members / gated content** — end users sign up via `/api/accounts/*`. Gate by reading the member
  (`helpers.user` in extension routes, or `/api/accounts/me`) and checking `member.meta.plan`.
- **Payments** — the **owner** connects their own Stripe in **Settings → Payments** (don't ask the agent
  for keys; they live in runtime config). To sell, create a price, then `POST /api/payments/checkout
  {priceId}` → redirect the buyer to the returned URL. On success the webhook stamps
  `member.meta.plan/stripeCustomerId` — that's how you tie a purchase to access.
- **New feature with its own UI** — build it as an **extension** (manifest + `activate`). Use scoped
  permissions, the safe patch pipeline, `ctx.ai.*`, `ctx.accounts`, hooks, and `ctx.admin.registerPanel`
  to get **your own tab** in the dashboard. Install in one click from a public git repo.
- **AI features** — always go through the provider abstraction (`ctx.ai.generate` / `ctx.ai.embed`),
  never a hardcoded vendor. Embeddings power the builder's memory + semantic search.

## Don't-screw-it-up checklist

- ✅ Read the catalog; use only its block types/styles. ❌ Don't guess block types.
- ✅ Keep `id`s unique; use `mset` for nested/new paths. ❌ Don't overwrite the whole model.
- ✅ Keys (AI, Stripe) live in **env or the dashboard**, never in code/commits/patches.
- ✅ Changes are reversible — if unsure, make the change, check, and `rollback` if wrong.
- ✅ Provider-agnostic everywhere. ❌ Don't assume Claude/OpenAI/any one vendor.
- ✅ Extensions edit the site only through `ctx.site.patch` (validated). ❌ Never mutate the model directly.

## Building client sites (hand-off ready)

1. Start from a **template** (`sophia template create …`) or describe the site in **Build**.
2. Refine by chatting with preview on; **push to live** when it looks right.
3. Add members/payments/SEO as the client needs (above). Install the SEO Suite for ongoing optimization.
4. Hand off: the client gets the dashboard (owner login + recovery phrase), their **own** Stripe, their
   data in `.sophia-data`, and safe **one-click updates** that auto-roll-back. They own everything; no
   lock-in. Run it on their host or as a container (`docker compose up`) — no VPS gymnastics required.
