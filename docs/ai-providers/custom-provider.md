# Custom provider (any endpoint)

For any AI endpoint that doesn't have a dedicated env var — DeepSeek, an internal
gateway, a proxy, a self-hosted server, a new vendor — use the **custom**
provider. You choose the adapter `type`, the base URL, the key, and the model.

This is the escape hatch: if it speaks OpenAI Chat Completions, the Anthropic
Messages API, or the Gemini API, Sophia can drive it.

---

## Prerequisites

- A deployed Sophia Stack (or local `sophia dev`).
- The endpoint's base URL, model id, and (if required) an API key.
- The right adapter `type` for the endpoint's API shape:
  - `openai` — OpenAI-compatible (`/chat/completions`) — the most common.
  - `anthropic` — Claude Messages API (`/messages`).
  - `gemini` — Google Gemini (`:generateContent`).

---

## Setup — environment variables

```bash
CUSTOM_AI_TYPE=openai                      # openai | anthropic | gemini
CUSTOM_AI_BASE_URL=https://api.deepseek.com/v1
CUSTOM_AI_API_KEY=sk-...                   # omit for a keyless local server
CUSTOM_AI_MODEL=deepseek-chat
SOPHIA_AI_PROVIDER=custom
```

The provider is detected as soon as `CUSTOM_AI_BASE_URL` is set. `CUSTOM_AI_TYPE`
defaults to `openai` and `CUSTOM_AI_MODEL` defaults to `gpt-4o-mini` if omitted.

### Example: DeepSeek (OpenAI-compatible)

```bash
CUSTOM_AI_TYPE=openai
CUSTOM_AI_BASE_URL=https://api.deepseek.com/v1
CUSTOM_AI_API_KEY=sk-...
CUSTOM_AI_MODEL=deepseek-chat
SOPHIA_AI_PROVIDER=custom
```

### Example: an Anthropic-compatible gateway

```bash
CUSTOM_AI_TYPE=anthropic
CUSTOM_AI_BASE_URL=https://your-gateway.example.com/v1
CUSTOM_AI_API_KEY=...
CUSTOM_AI_MODEL=claude-sonnet-4
SOPHIA_AI_PROVIDER=custom
```

The `anthropic` adapter posts to `{baseURL}/messages`; the `gemini` adapter posts
to `{baseURL}/models/{model}:generateContent`. Point the base URL at the root
those paths hang off of.

---

## Setup — dashboard

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick the provider whose API shape matches (any OpenAI-compatible entry for
   `openai`, Anthropic for `anthropic`, Gemini for `gemini`).
3. Override the auto-filled base URL, model, and (if shown) `type` to match your
   endpoint.
4. Paste the key (or leave blank for keyless). **Save**.

---

## Verify

```bash
sophia ai:list      # confirm "custom" is detected
sophia ai:doctor    # confirm it's active
sophia ai:test      # send a one-word prompt to the endpoint
```

Then chat with Sophia in the dashboard.

---

## Troubleshooting

- **Not detected** — `CUSTOM_AI_BASE_URL` must be set; that's the trigger.
- **`404`** — wrong base URL or path shape; pick the `type` that matches the
  endpoint's API and point the base URL at the correct root.
- **`401`** — key missing/invalid, or the wrong auth scheme for the chosen
  `type`. The adapter sends `Bearer` (openai), `x-api-key` (anthropic), or
  `?key=` (gemini) automatically — pick the matching `type`.
- **"model not found"** — set `CUSTOM_AI_MODEL` to a valid id for that endpoint.

Related: [overview.md](./overview.md) ·
[openai-compatible.md](./openai-compatible.md)
