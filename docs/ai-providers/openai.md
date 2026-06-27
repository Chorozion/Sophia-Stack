# OpenAI

Use OpenAI models (GPT-4o and friends) as the brain for the built-in Sophia
builder. OpenAI uses the `openai` adapter — the native target of the Chat
Completions format.

---

## Prerequisites

- A deployed Sophia Stack (or local `sophia dev`).
- An OpenAI API key.

## Get a key

Create one at <https://platform.openai.com/api-keys>. It starts with `sk-`.

- **Default base URL:** `https://api.openai.com/v1`
- **Adapter `type`:** `openai`
- **Example models:** `gpt-4o-mini` (default), `gpt-4o`

---

## Setup — environment variables

```bash
OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini      # optional; this is the default
SOPHIA_AI_PROVIDER=openai
```

No base URL needed — `openai` defaults to `https://api.openai.com/v1`.

## Setup — dashboard

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick **OpenAI**. Click **Get a key** if you need one.
3. Click **Use** (fills base URL + `gpt-4o-mini` + `type: openai`).
4. Paste your `sk-...` key. **Save**.

---

## Verify

```bash
sophia ai:doctor    # should show: active: openai
sophia ai:test      # sends a tiny prompt; prints the reply
```

Then open the dashboard and chat with Sophia to build your site.

---

## Troubleshooting

- **`401`** — bad/missing key. Mint a fresh one in the OpenAI console.
- **`429` / quota** — billing not set up or rate-limited on your OpenAI account.
- **"model not found"** — pick a model your account can access; set
  `OPENAI_MODEL` to a valid id.

Related: [overview.md](./overview.md) ·
[openai-compatible.md](./openai-compatible.md)
