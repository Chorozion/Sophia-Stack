# Client Portal

A portal landing page for an agency's clients — modelled as **Northstar Studio**. A "Welcome back"
hero, three portal sections (Project updates / Files / Invoices), a **live recent-updates list**,
and a **"leave a message" form** — both wired to the data API. Theme: `soft`.

## Data

The model declares two collections:

```json
"data": { "collections": {
  "updates":  { "fields": [{ "name": "title" }, { "name": "body" }], "access": { "create": "token",  "read": "public" } },
  "messages": { "fields": [{ "name": "name" },  { "name": "body" }], "access": { "create": "public", "read": "token"  } }
} }
```

- **`updates`** — clients can **read** the latest updates (public read, so the list renders with no
  auth), but only you (a `mykey-` token holder) can **post** them.
- **`messages`** — clients can **submit** a message (public create), but only you can **read** the
  inbox (`read: token`).

The updates list and the message form both live in a single `html` block:

```js
fetch('/api/data/updates')                                   // GET, public read
fetch('/api/data/messages', { method: 'POST', /* … */ })     // public create
```

When `updates` is empty the list shows three hardcoded **sample updates** so a fresh portal still
looks finished. All rendered values are HTML-escaped.

### Read the message inbox

```bash
curl https://your-site/api/data/messages -H "Authorization: Bearer mykey-…"
```

## Production note

This template is a **public landing**: `updates.read` is `"public"` so any visitor can list your
updates. A real client portal should be **per-client and gated**. Before going live, change
`updates.read` to `"token"`, add real client authentication (issue each client a token or front the
portal with a login), and send an `Authorization: Bearer mykey-…` header on the updates `fetch` so
only signed-in clients see their updates. `messages.read` is already `"token"` — keep it that way.

## Use it

```bash
sophia template create client-portal   # seeds ./.sophia-data/model.json
node app.js                            # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Add a `date` field to updates and show it on each card, add an Invoices section with an outstanding
> balance, and add a file-name + link field so clients can download deliverables from the portal."

Or generate a fresh variant from scratch with the prompt in `template.json`.
