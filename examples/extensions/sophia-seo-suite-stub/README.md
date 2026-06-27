# Sophia SEO Suite — integration stub

> **This is a stub, not the product.** The **Sophia SEO Suite** is being developed as a separate,
> optional, installable **extension/plugin** for Sophia Stack. This folder only proves *how* such an
> extension integrates with the Stack — it does **not** implement SEO.

## What it proves
- **adminNav** registration (a "SEO Suite" item) and **settings** registration.
- **API routes**: `GET /api/extensions/sophia-seo-suite/audit` (stub findings) and
  `POST /api/extensions/sophia-seo-suite/optimize-title` (a **safe**, validated, rollback-able patch).
- **Site/pages read** access (scoped by `site:read` / `pages:read`).
- **Provider-agnostic AI** via `ctx.ai.generate()` — uses whatever provider the owner configured.
- **Audit logging** of every action.
- **Hook** listeners (`page.afterSave`, `media.afterUpload`).

## What the full Suite will add (separate repo)
SEO audits, metadata/title/description tools, schema markup, internal links, content planning,
local/service-area SEO, technical checks, sitemap/robots, image alt text, keyword mapping, page
scores, an owner-friendly admin UI, and tiered modules.

## Contract
See [docs/extensions/sophia-seo-suite-contract.md](../../../docs/extensions/sophia-seo-suite-contract.md)
for what the Suite needs from Sophia Stack (and what's still `(planned)`).
