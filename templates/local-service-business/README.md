# Local Service Business

A one-page site for a local service business — modelled on **Reliable Pipes Co.**, a plumber. It
leads with a trust-first hero, three real service cards, headline stats (24/7 availability, years
in business, review rating), a customer review, and a final call to action to get a free quote.
Theme: `soft`.

## Use it

```bash
sophia template create local-service-business   # seeds ./.sophia-data/model.json
node app.js                                      # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Rebrand this for **Bright Spark Electrical**, an electrician. Rewrite the three services for
> electrical work (rewiring, fuse boards, EV chargers), update the stats and the review, and change
> the phone number in the CTA and footer."

Or generate a fresh variant from scratch with the prompt in `template.json`.
