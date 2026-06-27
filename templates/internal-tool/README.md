# Internal Tool

An internal request tracker — **Ops Desk** — where staff submit operational requests and watch the
open queue. A no-nonsense **brutalist** shell with a short functional hero, a **submit form** (title,
requester, priority) that POSTs to the `requests` data collection, and a **live table of open
requests** that refreshes after each submit.

On a fresh deploy the table shows three sample requests so the page looks finished; once the
collection has real records it renders those instead.

## Data

The model declares a `requests` collection:

```json
"data": { "collections": { "requests": {
  "fields": [
    { "name": "title" }, { "name": "requester" },
    { "name": "priority" }, { "name": "status" }
  ],
  "access": { "create": "public", "read": "public" }
} } }
```

The list fetches with `GET /api/data/requests` and the form creates with:

```js
fetch('/api/data/requests', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title, requester, priority, status: 'Open' })
})
```

### ⚠️ Production note

This template ships with `read: "public"` **so the demo queue renders without a login**. Before you
go live, change the collection's access to:

```json
"access": { "create": "token", "read": "token" }
```

and put the tool behind owner auth or a `mykey-` Bearer token — an internal queue shouldn't be
world-readable or world-writable. Reads then use `Authorization: Bearer mykey-…`.

## Use it

```bash
sophia template create internal-tool   # seeds ./.sophia-data/model.json
node app.js                            # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Add an **assignee** and **category** field to the requests collection and form, show a **Resolved**
> filter on the table, and add a stats row counting open vs. urgent requests."

Or generate a fresh variant from scratch with the prompt in `template.json`.
