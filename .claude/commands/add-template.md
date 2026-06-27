---
description: Scaffold a new starter template under templates/
---

Create a new Sophia Stack template. Args: the template slug (e.g. `barber-shop`).

1. Read `templates/README.md` and an existing template (e.g. `templates/saas-landing-page/`) for the shape.
2. Create `templates/<slug>/`:
   - `template.json` — `{ name, slug, description, category, style, tags, screenshot, prompt }`.
   - `model.json` — a valid Site Model: `{ site, style, pages: { "/": { title, blocks: [...] } } }`,
     using only block types in `catalog.json` and a preset from `src/styles.mjs`. Include real
     starter copy (no lorem ipsum). Add `data.collections` if the use-case needs it.
   - `README.md` — what it's for, how to use it (`sophia template create <slug>` or seed via the API),
     and the exact `prompt` you'd give the AI builder to produce/extend it.
3. Validate: `node -e "import('./src/validate.mjs').then(m=>console.log(m.validateModel(require('./templates/<slug>/model.json'))))"` — must be `{ok:true}`.
4. Register it: ensure it appears in `sophia template list` (the CLI reads `templates/*/template.json`).
5. Update `CHANGELOG.md` (Unreleased).

Keep it honest — only use implemented block types/themes. No invented features.
