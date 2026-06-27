# Lead Capture

A focused lead-gen landing page for a free guide or webinar — modelled on **Ship It Weekly**'s
"Ship-Faster Playbook". A strong value-prop hero, three sign-up benefits, and a **working
email-capture form** that POSTs to the `leads` data collection and shows a thank-you on success.
Theme: `neon`.

## Data

The model declares a `leads` collection:

```json
"data": { "collections": { "leads": {
  "fields": [{ "name": "email" }],
  "access": { "create": "public", "read": "token" }
} } }
```

Anyone can submit (`create: public`); only a holder of a `mykey-` token can read the captured
leads (`read: token`). The form lives in an `html` block and calls:

```js
fetch('/api/data/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email })
})
```

Read your leads with the API or dashboard, e.g. `GET /api/data/leads` with `Authorization: Bearer mykey-…`.

## Use it

```bash
sophia template create lead-capture   # seeds ./.sophia-data/model.json
node app.js                           # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Turn this into a **webinar** registration page for 'Scaling Postgres', add a name field to the
> form (and the leads collection), rewrite the hero and benefits for the webinar, and change the
> thank-you message to confirm the date and time."

Or generate a fresh variant from scratch with the prompt in `template.json`.
