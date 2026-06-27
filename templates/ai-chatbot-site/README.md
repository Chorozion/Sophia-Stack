# AI Chatbot Site

A landing page for an AI assistant product — modelled as **Askly** — with a **working in-page demo
chat**. The chat widget POSTs to a sandboxed Sophia server function (`/api/fn/chat`) and shows the
reply, so the page is interactive on a fresh deploy with no external AI wired up. Theme: `neon`.

## The server function

The model declares a `chat` function in the `functions` layer:

```json
"functions": {
  "chat": {
    "code": "if(!input.message)return{reply:'Ask me anything!'};return {reply:'You said: '+String(input.message).slice(0,200)+'. (This demo echoes — wire me to a real AI in the dashboard.)'};"
  }
}
```

The demo function simply **echoes** the message back. Server functions run in a `vm` sandbox with
no network, filesystem, or `require` (input, `db`, and `JSON`/`Math`/`Date` only) and a 1.5s
timeout — so the demo can't call a real LLM by itself.

The chat widget lives in an `html` block and calls:

```js
fetch('/api/fn/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message })
})
// -> { ok: true, result: { reply: "…" } }
```

It reads `result.reply` from the `{ ok, result }` envelope and falls back gracefully on error.

## Production note

The bundled `chat` function is an **echo demo** — it does not call a real AI. The sandbox blocks
network access on purpose, so to power Askly with a real model you connect an AI in the dashboard
(or front the function with your own backend) before going live. Until then, the demo still
responds so the page feels finished.

## Use it

```bash
sophia template create ai-chatbot-site   # seeds ./.sophia-data/model.json
node app.js                              # open the site
```

## Extend it with AI

Once it's running, open the dashboard's **Build** tab (or hand any agent the token) and try:

> "Rewrite the three capabilities for a customer-support assistant, add a pricing section with
> three tiers, and make the demo chat remember the last few messages in the reply."

Or generate a fresh variant from scratch with the prompt in `template.json`.
