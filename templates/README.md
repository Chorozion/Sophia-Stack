# Templates

A template is a **valid Sophia Stack Site Model** plus metadata. Use one to start from a real,
finished-looking app instead of a blank page — then refine it by chatting with the AI builder.

## Use a template

```bash
sophia template list                       # see what's available
sophia template create local-service-business   # seeds ./.sophia-data/model.json
node app.js                                # (or: sophia dev) — open the site
```

`sophia template create <slug>` writes the template's `model.json` to `./.sophia-data/model.json`,
so a fresh deployment boots straight into that template. You can also tell the built-in builder
*"start from the booking-site template and add my services"*, or apply it over the API.

## Structure

```
templates/<slug>/
  template.json   # metadata (see schema below)
  model.json      # the Site Model (must pass src/validate.mjs)
  README.md       # what it's for + the prompt to extend it
```

### `template.json`

```json
{
  "name": "Local Service Business",
  "slug": "local-service-business",
  "description": "One-page site for a local service (plumber, cleaner, etc.) with services + contact.",
  "category": "business",
  "style": "soft",
  "tags": ["business", "local", "lead-gen"],
  "screenshot": "screenshot.png",
  "prompt": "Build a one-page site for a local <service> business with a hero, services, reviews, hours, and a contact form."
}
```

Templates use only **implemented** block types (see [`catalog.json`](../catalog.json)) and a built-in
theme (`sophia`, `dark-tech`, `editorial`, `brutalist`, `soft`, `neon`, `minimal`). Add
`data.collections` when the use-case needs data (bookings, leads, inventory).

## Add a template

See [`.claude/commands/add-template.md`](../.claude/commands/add-template.md). Validate before
committing — the model must return `{ok:true}` from `src/validate.mjs`. `screenshot.png` is optional
(generate one from a running instance).

## Available templates

| Slug | Category | Status |
|---|---|---|
| `saas-landing-page` | marketing | ✅ |
| `local-service-business` | business | ✅ |
| `lead-capture` | marketing + data | ✅ |
| `booking-site` | business + data | ✅ |
| `knowledge-base` | content | ✅ |
| `crm-dashboard` | internal | ✅ |
| `client-portal` | internal | ✅ |
| `internal-tool` | internal | ✅ |
| `inventory-tracker` | data | ✅ |
| `ai-chatbot-site` | content | ✅ |

All 10 templates ship validated. More ideas? Open a feature request or see [ROADMAP.md](../ROADMAP.md).
