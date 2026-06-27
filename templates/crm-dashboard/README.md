# CRM Dashboard

A simple internal CRM — **Pipeline** — for a small sales team. A dark-tech dashboard shell with a
pipeline **stats** row (leads, pipeline value, win rate), a **live contacts table** fetched from the
`contacts` data collection, and an **add-contact form** that POSTs a new row and refreshes the table.
Theme: `dark-tech`.

On a fresh deploy the table shows three sample contacts so the page looks finished; as soon as you
add a real contact (or the collection has records) it renders live data instead.

## Data

The model declares a `contacts` collection:

```json
"data": { "collections": { "contacts": {
  "fields": [
    { "name": "name" }, { "name": "company" },
    { "name": "email" }, { "name": "status" }
  ],
  "access": { "create": "public", "read": "public" }
} } }
```

The table fetches with `GET /api/data/contacts` and the form creates with:

```js
fetch('/api/data/contacts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, company, email, status })
})
```

### ⚠️ Production note

This template ships with `read: "public"` **so the demo table renders without a login**. Before you
go live, change the collection's access to:

```json
"access": { "create": "token", "read": "token" }
```

and put the page (or at least the table/form) behind owner auth or a `mykey-` Bearer token — a real
CRM holds private customer data and must not be world-readable or world-writable. Reads then use
`Authorization: Bearer mykey-…`.

## Use it

```bash
sophia template create crm-dashboard   # seeds ./.sophia-data/model.json
node app.js                            # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Add a **deal value** and **owner** column to the contacts table and collection, sort the table by
> status, and add a fourth stat card for **average deal size**."

Or generate a fresh variant from scratch with the prompt in `template.json`.
