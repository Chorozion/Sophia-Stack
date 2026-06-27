# Payments — sell with your own Stripe

Sophia Stack lets **you, the site owner, take payments through your own Stripe account** — sell
products or subscriptions to your customers. **Sophia never touches the money and never takes a cut.**
Each self-hosted site connects its own Stripe; keys live only in your deployment, never in the repo.

> New to this? The friendly walkthrough (including a paste-into-ChatGPT helper) is in
> [docs/setup/setup-with-ai-assistant.md](../setup/setup-with-ai-assistant.md). **Use Stripe _test_ keys
> first** so you can try everything safely with no real charges.

## 1. Connect Stripe (about 5 minutes)

1. In **Stripe** → Developers → **API keys** ([dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)),
   copy your **Secret key** (`sk_test_…` to start).
2. In your Sophia dashboard → **Settings → Payments**, paste the **Secret key**, then **Save**.
   (Optionally paste your **Publishable key** `pk_…`.)
3. **Webhook** (so paid orders are confirmed): in Stripe → Developers → **Webhooks** → *Add endpoint*,
   set the URL to `https://your-site/api/payments/webhook`, select the events
   `checkout.session.completed` and `customer.subscription.deleted`, save it, copy the
   **Signing secret** (`whsec_…`), and paste it into **Settings → Payments → Webhook signing secret**.

Prefer env vars? Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`,
`STRIPE_CURRENCY` (see [`.env.example`](../../.env.example)). Dashboard settings win if both are set.

## 2. Create what you sell

Create products + prices in your Stripe dashboard, or via the API:

```bash
# owner-only: create a product + price ($19/mo subscription)
curl -X POST https://your-site/api/payments/products -H 'Authorization: Bearer mykey-…' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Pro Plan","amount":1900,"currency":"usd","interval":"month"}'
```

`amount` is in the smallest currency unit (cents). Omit `interval` for a one-time product.

## 3. Take a payment

Your page (or an AI agent) starts a **Stripe Checkout** session and sends the customer to the
returned URL:

```bash
curl -X POST https://your-site/api/payments/checkout -H 'Content-Type: application/json' \
  -d '{"priceId":"price_123","mode":"subscription"}'
# -> { "url": "https://checkout.stripe.com/c/pay/cs_…" }   (redirect the buyer here)
```

- One-time charge without a saved price: `{"amount":2500,"name":"T-shirt"}`.
- If a **member** is signed in (`/api/accounts`), their email + id ride along, and on success the
  webhook stamps their account `meta` with `stripeCustomerId`, `lastPayment`, and `plan: "active"`
  (for subscriptions) — so you can gate member content by plan.

## API summary

| Method & path | Auth | Purpose |
|---|---|---|
| `GET/PUT /api/payments/config` | owner | connect/inspect Stripe (secret key never returned) |
| `GET /api/payments/products` | public | list products for a pricing page |
| `POST /api/payments/products` | owner | create a product + price |
| `POST /api/payments/checkout` | public/member | start a Checkout session → `{ url }` |
| `POST /api/payments/webhook` | Stripe (signed) | confirm payments; updates member `meta` |

**Security:** the secret key is stored in your runtime config and **never** sent to the browser or
committed. The webhook **verifies Stripe's signature** (HMAC-SHA256 + timestamp tolerance) before
trusting any event. Extensions can react to `payments.event` via the hook bus.

> **(planned)** A built-in pricing/checkout UI block, the Stripe Customer Portal for self-serve plan
> changes, and refunds from the dashboard. Track in [ROADMAP.md](../../ROADMAP.md).
