# OpenRouter

OpenRouter is a single API in front of hundreds of models (OpenAI, Anthropic,
Google, Meta, Mistral, and more). It speaks the OpenAI Chat Completions format,
so Sophia uses the **`openai`** adapter — you just point the base URL at
OpenRouter and pick a model.

---

## Prerequisites

- A deployed Sophia Stack (or local `sophia dev`).
- An OpenRouter API key.

## Get a key

Create one at <https://openrouter.ai/keys>. It starts with `sk-or-`.

- **Base URL:** `https://openrouter.ai/api/v1`
- **Adapter `type`:** `openai`
- **Example model:** `openai/gpt-4o-mini` (default). Models are namespaced, e.g.
  `anthropic/claude-3.5-sonnet`, `google/gemini-2.0-flash-001`,
  `meta-llama/llama-3.3-70b-instruct`.

---

## Setup — environment variables

```bash
OPENROUTER_API_KEY=sk-or-...
# OPENROUTER_MODEL=openai/gpt-4o-mini      # optional; this is the default
SOPHIA_AI_PROVIDER=openrouter
```

Sophia fills in the OpenRouter base URL automatically for this provider.

## Setup — dashboard

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick **OpenRouter**. Click **Get a key** if needed.
3. Click **Use** (fills base URL + `openai/gpt-4o-mini` + `type: openai`).
4. Paste your `sk-or-...` key, set the model you want, and **Save**.

---

## Verify

```bash
sophia ai:doctor    # should show: active: openrouter
sophia ai:test      # sends a tiny prompt; prints the reply
```

Then chat with Sophia in the dashboard.

---

## Troubleshooting

- **`401`** — bad/missing key.
- **"model not found"** — use a full namespaced id from
  <https://openrouter.ai/models> (e.g. `anthropic/claude-3.5-sonnet`).
- **`402` / credits** — top up your OpenRouter balance.

Related: [overview.md](./overview.md) ·
[openai-compatible.md](./openai-compatible.md)
