# Booking Site

A site for a service that takes bookings — modelled on **Sharp & Co.**, a barbershop. A hero, a
services section that lists each service with its price in the description, a three-step
"how booking works" section, and a **working booking-request form** (name, email, preferred date)
that POSTs to the `bookings` data collection and confirms on success. Theme: `editorial`.

## Data

The model declares a `bookings` collection:

```json
"data": { "collections": { "bookings": {
  "fields": [{ "name": "name" }, { "name": "email" }, { "name": "date" }],
  "access": { "create": "public", "read": "token" }
} } }
```

Anyone can request a booking (`create: public`); only a holder of a `mykey-` token can read the
requests (`read: token`). The form lives in an `html` block and calls:

```js
fetch('/api/data/bookings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, date })
})
```

Read incoming requests with `GET /api/data/bookings` and `Authorization: Bearer mykey-…`.

## Use it

```bash
sophia template create booking-site   # seeds ./.sophia-data/model.json
node app.js                           # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Rework this for **Stillpoint Yoga Studio**: rename the brand, swap the three services for class
> types (Vinyasa, Restorative, Beginners) with their drop-in prices, add a 'preferred time' field
> to the booking form and the bookings collection, and rewrite the steps for booking a class."

Or generate a fresh variant from scratch with the prompt in `template.json`.
