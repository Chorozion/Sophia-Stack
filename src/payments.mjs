// payments.mjs — owner payments. Each site OWNER connects THEIR OWN Stripe account
// to sell to THEIR customers; Sophia never takes a cut. Processor-agnostic by design
// (adapter pattern, Stripe first). Raw Stripe REST (no SDK) keeps the zero-dep artifact.
//
// Keys are owner-supplied and live ONLY in runtime config (tokens.payments) or env —
// never in the repo. The secret key is never returned to the browser.
import crypto from "node:crypto";

const STRIPE_BASE = "https://api.stripe.com/v1";

// Flatten nested objects/arrays into Stripe's bracket form-encoding:
//   { line_items:[{price:"x",quantity:1}] } -> line_items[0][price]=x&line_items[0][quantity]=1
export function stripeForm(obj, prefix = "", out = []) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? stripeForm(item, `${key}[${i}]`, out) : out.push(`${key}[${i}]=${encodeURIComponent(item)}`)));
    else if (typeof v === "object") stripeForm(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return out.join("&");
}

export function resolvePayments(cfg, env = process.env) {
  if (cfg && cfg.secretKey) return { type: "stripe", baseURL: cfg.baseURL || STRIPE_BASE, ...cfg };
  if (env.STRIPE_SECRET_KEY) return { type: "stripe", baseURL: env.STRIPE_BASE_URL || STRIPE_BASE, secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET || "", publishableKey: env.STRIPE_PUBLISHABLE_KEY || "", currency: env.STRIPE_CURRENCY || "usd" };
  return null;
}

async function stripeRequest(cfg, method, path, params) {
  const res = await fetch((cfg.baseURL || STRIPE_BASE) + path, {
    method,
    headers: { Authorization: "Bearer " + cfg.secretKey, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body: method === "GET" || !params ? undefined : stripeForm(params),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json.error && json.error.message) || `Stripe ${res.status}`);
  return json;
}

// Create a Checkout Session and return its hosted URL.
export async function createCheckout(cfg, opts) {
  const mode = opts.mode === "subscription" ? "subscription" : "payment";
  const line = opts.priceId
    ? { price: opts.priceId, quantity: opts.quantity || 1 }
    : { quantity: opts.quantity || 1, price_data: { currency: opts.currency || cfg.currency || "usd", unit_amount: opts.amount, product_data: { name: opts.name || "Purchase" } } };
  const params = {
    mode,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    line_items: [line],
    ...(opts.customerEmail ? { customer_email: opts.customerEmail } : {}),
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  };
  const s = await stripeRequest(cfg, "POST", "/checkout/sessions", params);
  return { id: s.id, url: s.url };
}

// List the owner's active products (with their default price) for a pricing page.
export async function listProducts(cfg) {
  const r = await stripeRequest(cfg, "GET", "/products?active=true&limit=100&expand[]=data.default_price", null);
  return (r.data || []).map((p) => ({
    id: p.id, name: p.name, description: p.description || "",
    price: p.default_price ? { id: p.default_price.id, amount: p.default_price.unit_amount, currency: p.default_price.currency, recurring: p.default_price.recurring ? p.default_price.recurring.interval : null } : null,
  }));
}

// Create a product + price in one step (owner convenience).
export async function createProduct(cfg, { name, amount, currency, interval }) {
  const product = await stripeRequest(cfg, "POST", "/products", { name });
  const price = await stripeRequest(cfg, "POST", "/prices", { product: product.id, unit_amount: amount, currency: currency || cfg.currency || "usd", ...(interval ? { recurring: { interval } } : {}) });
  return { id: product.id, name: product.name, price: { id: price.id, amount: price.unit_amount, currency: price.currency, recurring: interval || null } };
}

// Verify a Stripe webhook signature (so we only trust real Stripe events).
// Header: "t=<ts>,v1=<sig>"; signedPayload = `${t}.${rawBody}`; HMAC-SHA256 with the secret.
export function verifyWebhook(rawBody, sigHeader, secret, toleranceSec = 300, nowMs = Date.now()) {
  if (!secret) return { ok: false, error: "no webhook secret configured" };
  const parts = Object.fromEntries(String(sigHeader || "").split(",").map((kv) => kv.split("=")));
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return { ok: false, error: "malformed signature header" };
  if (Math.abs(nowMs / 1000 - Number(t)) > toleranceSec) return { ok: false, error: "timestamp outside tolerance" };
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, error: "signature mismatch" };
  try { return { ok: true, event: JSON.parse(rawBody) }; } catch { return { ok: false, error: "bad JSON" }; }
}
