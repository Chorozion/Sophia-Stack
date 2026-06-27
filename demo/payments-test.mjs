// payments-test.mjs — owner Stripe payments: form encoding, checkout, product list,
// webhook signature verification, and server-side config security (no secret leak).
import http from "node:http";
import crypto from "node:crypto";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";
import { stripeForm, createCheckout, listProducts, createProduct, verifyWebhook, resolvePayments } from "../src/payments.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// 1. nested form encoding (Stripe bracket notation)
ok(stripeForm({ line_items: [{ price: "p1", quantity: 2 }], mode: "payment" }) === "line_items%5B0%5D%5Bprice%5D=p1&line_items%5B0%5D%5Bquantity%5D=2&mode=payment", "stripeForm encodes nested arrays/objects (Stripe bracket form)");

// 2. mock Stripe API
let lastAuth = "", lastBody = "";
const stripe = http.createServer((req, res) => {
  let body = ""; req.on("data", (d) => (body += d)); req.on("end", () => {
    lastAuth = req.headers.authorization || ""; lastBody = body;
    if (req.url.startsWith("/checkout/sessions")) return res.end(JSON.stringify({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }));
    if (req.url.startsWith("/products") && req.method === "GET") return res.end(JSON.stringify({ data: [{ id: "prod_1", name: "Pro Plan", description: "", default_price: { id: "price_1", unit_amount: 1900, currency: "usd", recurring: { interval: "month" } } }] }));
    if (req.url === "/products" && req.method === "POST") return res.end(JSON.stringify({ id: "prod_new", name: "Coffee" }));
    if (req.url === "/prices") return res.end(JSON.stringify({ id: "price_new", unit_amount: 500, currency: "usd" }));
    res.end("{}");
  });
});
await new Promise((r) => stripe.listen(0, r));
const base = "http://127.0.0.1:" + stripe.address().port;
const cfg = { type: "stripe", secretKey: "sk_test_xyz", baseURL: base, currency: "usd", webhookSecret: "whsec_test" };

const co = await createCheckout(cfg, { priceId: "price_1", mode: "subscription", successUrl: "s", cancelUrl: "c", customerEmail: "a@b.com" });
ok(co.url.includes("checkout.stripe.com"), "createCheckout returns the hosted URL");
ok(lastAuth === "Bearer sk_test_xyz", "checkout authenticates with the secret key");
ok(/mode=subscription/.test(lastBody) && /line_items%5B0%5D%5Bprice%5D=price_1/.test(lastBody), "checkout sends mode + line item");

const prods = await listProducts(cfg);
ok(prods.length === 1 && prods[0].price.amount === 1900 && prods[0].price.recurring === "month", "listProducts maps product + default price");
const np = await createProduct(cfg, { name: "Coffee", amount: 500 });
ok(np.id === "prod_new" && np.price.id === "price_new", "createProduct creates product + price");

// 3. webhook signature verification
const payload = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: { metadata: { memberId: "usr-1" } } } });
const t = Math.floor(Date.now() / 1000);
const sig = crypto.createHmac("sha256", "whsec_test").update(`${t}.${payload}`).digest("hex");
ok(verifyWebhook(payload, `t=${t},v1=${sig}`, "whsec_test").ok, "valid webhook signature accepted");
ok(!verifyWebhook(payload + "x", `t=${t},v1=${sig}`, "whsec_test").ok, "tampered body rejected");
ok(!verifyWebhook(payload, `t=${t},v1=${sig}`, "wrong-secret").ok, "wrong secret rejected");
ok(!verifyWebhook(payload, `t=${t - 9999},v1=${sig}`, "whsec_test").ok, "stale timestamp rejected");
ok(resolvePayments({ secretKey: "sk_x" }) && !resolvePayments(null, {}), "resolvePayments: config wins, none -> null");

// 4. server: config never leaks the secret; webhook rejects bad signatures
const root = fileURLToPath(new URL("./out/_pay-test", import.meta.url));
rmSync(root, { recursive: true, force: true });
const srv = await createServer({ dir: root, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const u = srv.url.replace(/\/$/, "");
const sr = await fetch(u + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "admin", password: "ownerpass1" }) });
const sid = (sr.headers.get("set-cookie") || "").split(";")[0];
const S = (m, p, b) => fetch(u + p, { method: m, headers: { Cookie: sid, ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

ok((await fetch(u + "/api/payments/config")).status === 401, "payments config is owner-only");
ok((await S("GET", "/api/payments/products")).body.configured === false, "unconfigured site reports no payments (no Stripe call)");
await S("PUT", "/api/payments/config", { secretKey: "sk_live_secret", webhookSecret: "whsec_x", publishableKey: "pk_test_1" });
const gc = await S("GET", "/api/payments/config");
ok(gc.body.configured === true && gc.body.publishableKey === "pk_test_1" && !JSON.stringify(gc.body).includes("sk_live_secret"), "config reports configured + publishable key, NEVER the secret");
ok((await fetch(u + "/api/payments/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=bad" }, body: "{}" })).status === 400, "webhook with a bad signature is rejected");

console.log(`\n  ${pass} passed, ${fail} failed`);
stripe.close(); srv.close(); await new Promise((r) => setTimeout(r, 150)); try { rmSync(root, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
