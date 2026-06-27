# Knowledge Base

A help / docs center for a product — modelled as **Helpdesk**. A "How can we help?" hero, three
help categories (Getting Started / Guides / FAQ), and a **live article list** that fetches from the
`articles` data collection and renders article cards. Theme: `editorial`.

## Data

The model declares an `articles` collection:

```json
"data": { "collections": { "articles": {
  "fields": [{ "name": "title" }, { "name": "category" }, { "name": "body" }],
  "access": { "create": "token", "read": "public" }
} } }
```

Anyone can **read** the published articles (so the page renders for visitors with no auth), but
only a holder of a `mykey-` token can **create** them (`create: token`). The article list lives in
an `html` block and calls:

```js
fetch('/api/data/articles')   // GET, public read
```

When the collection is empty it shows three hardcoded **sample articles** so a fresh deploy still
looks finished. Every card's title/category/body is HTML-escaped before rendering.

### Add an article

```bash
curl -X POST https://your-site/api/data/articles \
  -H "Authorization: Bearer mykey-…" \
  -H "Content-Type: application/json" \
  -d '{"title":"Setting up SSO","category":"Guides","body":"…"}'
```

## Production note

`read` is `"public"` here so the demo renders without auth. That's fine for a public help center.
If your articles are **internal / customer-confidential**, change `read` to `"token"` and add auth
to the `fetch` call (send an `Authorization: Bearer mykey-…` header) before going live, so only
authenticated readers can list them.

## Use it

```bash
sophia template create knowledge-base   # seeds ./.sophia-data/model.json
node app.js                             # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Add a fourth category 'Billing & Plans', add a `tags` field to the articles collection, and make
> the article cards link to a per-article page."

Or generate a fresh variant from scratch with the prompt in `template.json`.
