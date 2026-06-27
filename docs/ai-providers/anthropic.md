# Anthropic (Claude)

Use Anthropic's Claude models for the built-in Sophia builder. Claude uses its
own API shape, so Sophia routes it through the dedicated **`anthropic`** adapter
(Claude Messages API — `POST {baseURL}/messages`, with `x-api-key` and
`anthropic-version: 2023-06-01`).

---

## Prerequisites

- A deployed Sophia Stack (or local `sophia dev`).
- An Anthropic API key.

## Get a key

Create one at <https://console.anthropic.com/settings/keys>. It starts with
`sk-ant-`.

- **Default base URL:** `https://api.anthropic.com/v1`
- **Adapter `type`:** `anthropic`
- **Example model:** `claude-sonnet-4` (default)

---

## Setup — environment variables

```bash
ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-sonnet-4     # optional; this is the default
SOPHIA_AI_PROVIDER=anthropic
```

## Setup — dashboard

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick **Anthropic (Claude)**. Click **Get a key** if needed.
3. Click **Use** (fills base URL + `claude-sonnet-4` + `type: anthropic`).
4. Paste your `sk-ant-...` key. **Save**.

---

## Verify

```bash
sophia ai:doctor    # should show: active: anthropic
sophia ai:test      # sends a tiny prompt; prints the reply
```

Then chat with Sophia in the dashboard.

---

## Troubleshooting

- **`401`** — bad/missing key, or it wasn't sent as `x-api-key` (the adapter
  handles that; just provide the key).
- **"model not found"** — set `ANTHROPIC_MODEL` to a model your account can use.
- **`anthropic-version` errors** — the adapter pins `2023-06-01`; if a future
  model needs a newer version, point a custom provider at it
  ([custom-provider.md](./custom-provider.md)).

Related: [overview.md](./overview.md)
