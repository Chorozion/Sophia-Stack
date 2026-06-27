# OpenAI-compatible endpoints (the `openai` adapter)

This is the umbrella page. The Sophia Stack `openai` adapter speaks the **OpenAI
Chat Completions** format (`POST {baseURL}/chat/completions` with a
`Bearer` key). That one adapter drives **any** OpenAI-compatible host:

- Hosted: **OpenAI**, **DeepSeek**, **Groq**, **OpenRouter**, **Mistral**,
  **Together**, **Fireworks**, **Perplexity**, and most others.
- Local: **Ollama**, **LM Studio**, **vLLM**, or anything that serves the same API.
- **Any custom base URL** you control.

If a provider says "OpenAI-compatible API," it works here — you just supply three
things: a **base URL**, an optional **key**, and a **model name**.

> The strings `openai-compatible`, `compatible`, and `local` all map to the
> `openai` type internally, so use whichever the dashboard or your config shows.

---

## Prerequisites

- A deployed Sophia Stack (or a local `sophia dev`).
- For hosted providers: an API key from that provider.
- For local servers: the server running (no key needed) — see
  [ollama.md](./ollama.md), [lm-studio.md](./lm-studio.md),
  [vllm.md](./vllm.md).

---

## The three knobs

| Knob | What it is | Notes |
|---|---|---|
| **base URL** | The API root, ending in `/v1` for most hosts | Defaults to `https://api.openai.com/v1` if omitted |
| **key** | `Authorization: Bearer <key>` | Omit/blank for local servers |
| **model** | The model id the host expects | Defaults to `gpt-4o-mini` |

---

## Setup — environment variables

The recognized hosts have dedicated vars (Sophia fills in the base URL for you):

```bash
# pick one as the default
SOPHIA_AI_PROVIDER=groq

OPENROUTER_API_KEY=sk-or-...        # base URL https://openrouter.ai/api/v1
GROQ_API_KEY=gsk_...                # base URL https://api.groq.com/openai/v1
MISTRAL_API_KEY=...                 # base URL https://api.mistral.ai/v1
TOGETHER_API_KEY=...                # base URL https://api.together.xyz/v1
FIREWORKS_API_KEY=...               # base URL https://api.fireworks.ai/inference/v1
PERPLEXITY_API_KEY=...              # base URL https://api.perplexity.ai
```

Override the model per provider with `<NAME>_MODEL`, e.g. `GROQ_MODEL=llama-3.3-70b-versatile`.

For a host **without** a dedicated var (DeepSeek, a gateway, your own server),
use the custom set — see [custom-provider.md](./custom-provider.md):

```bash
CUSTOM_AI_TYPE=openai
CUSTOM_AI_BASE_URL=https://api.deepseek.com/v1
CUSTOM_AI_API_KEY=sk-...
CUSTOM_AI_MODEL=deepseek-chat
SOPHIA_AI_PROVIDER=custom
```

---

## Setup — dashboard

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick the provider (or pick the closest one and edit the base URL for an
   unlisted host).
3. **Use** auto-fills base URL + model + `type: openai`.
4. Paste the key (skip for local). **Save**.

---

## Example endpoints

| Host | base URL | example model |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenRouter | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` |
| Mistral | `https://api.mistral.ai/v1` | `mistral-large-latest` |
| Together | `https://api.together.xyz/v1` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| Fireworks | `https://api.fireworks.ai/inference/v1` | `accounts/fireworks/models/llama-v3p3-70b-instruct` |
| Perplexity | `https://api.perplexity.ai` | `sonar` |
| Ollama (local) | `http://localhost:11434/v1` | `llama3.1` |
| LM Studio (local) | `http://localhost:1234/v1` | `local-model` |
| vLLM (local) | `http://localhost:8000/v1` | your served model |

---

## Verify

```bash
sophia ai:list      # confirm the host appears
sophia ai:test      # send a one-word prompt to the active provider
```

A successful `ai:test` prints `provider replied: "ready"` (or similar). Then chat
with Sophia in the dashboard to build.

---

## Troubleshooting

- **`404` / "not found" on the call** — base URL is wrong; most hosts need the
  `/v1` suffix. Check the host's docs.
- **`401` / "invalid api key"** — wrong or missing key. Local servers need no
  key; leave it blank.
- **"model not found"** — the model id isn't valid for that host. Copy an exact
  id from the provider's model list.
- **Provider not detected by `ai:list`** — for unlisted hosts use the
  `CUSTOM_AI_*` vars, not a made-up `*_API_KEY`.

See the per-provider pages for OpenAI, OpenRouter, and the local servers, or
[custom-provider.md](./custom-provider.md) for anything else. Back to
[overview.md](./overview.md).
