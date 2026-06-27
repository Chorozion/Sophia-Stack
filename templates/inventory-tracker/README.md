# Inventory Tracker

A stock-tracking dashboard — **Stockroom** — for a small warehouse or shop. A dark-tech shell with an
inventory **stats** row (SKUs, low stock, total value), a **live items table** fetched from the
`items` data collection, and an **add-item form** that POSTs a new row and refreshes the table.
Theme: `dark-tech`.

On a fresh deploy the table shows three sample items so the page looks finished; once the collection
has real records it renders those instead. Quantities at or below 10 are highlighted as low stock.

## Data

The model declares an `items` collection:

```json
"data": { "collections": { "items": {
  "fields": [
    { "name": "sku" }, { "name": "name" },
    { "name": "quantity" }, { "name": "price" }
  ],
  "access": { "create": "public", "read": "public" }
} } }
```

The table fetches with `GET /api/data/items` and the form creates with:

```js
fetch('/api/data/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sku, name, quantity, price })
})
```

### ⚠️ Production note

This template ships with `read: "public"` **so the demo table renders without a login**. Before you
go live, change the collection's access to:

```json
"access": { "create": "token", "read": "token" }
```

and put the page behind owner auth or a `mykey-` Bearer token — your stock and pricing shouldn't be
world-readable or world-writable. Reads then use `Authorization: Bearer mykey-…`.

## Use it

```bash
sophia template create inventory-tracker   # seeds ./.sophia-data/model.json
node app.js                                # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Add a **reorder point** and **supplier** field to the items collection and form, compute total
> value per row, and add a stats card for **out-of-stock** items."

Or generate a fresh variant from scratch with the prompt in `template.json`.
