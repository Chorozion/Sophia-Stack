# AI providers — overview

The Sophia Stack **built-in AI builder** (the "chat with Sophia to build my site"
flow in the dashboard) is **provider-agnostic**. The core agent loop never
hardcodes a vendor — it speaks to typed **adapters** and normalizes everything to
one OpenAI-style message shape. Pick whatever model you want: a hosted API, a
local server on your laptop, or any custom OpenAI-compatible endpoint.

> This page is about the key that lets **your deployment call an AI to build your
> site**. It is a *different* mechanism from letting an **external** agent operate
> your deployed site over REST / MCP / OpenAPI with a `mykey-` token — that needs
> no LLM key. See [docs/ai-agents/](../ai-agents/).

---

## The three adapter types

Every provider resolves to one of three adapter `type`s:

| `type` | API shape | Covers |
|---|---|---|
| `openai` (a.k.a. `openai-compatible`) | OpenAI Chat Completions (`POST {baseURL}/chat/completions`) | OpenAI, DeepSeek, Groq, OpenRouter, Mistral, Together, Fireworks, Perplexity, **and every local server** (Ollama, LM Studio, vLLM) or custom base URL |
| `anthropic` | Claude Messages API (`POST {baseURL}/messages`, `x-api-key` + `anthropic-version: 2023-06-01`) | Anthropic (Claude) |
| `gemini` | Google Gemini (`POST {baseURL}/models/{model}:generateContent?key=…`) | Google Gemini |

The strings `openai-compatible`, `compatible`, and `local` all collapse to
`openai`. Because that one adapter covers any OpenAI-style endpoint, the list of
hosts it supports is effectively open-ended — see
[openai-compatible.md](./openai-compatible.md).

---

## The provider config shape

Internally a provider is just:

```js
{
  type,         // "openai" | "anthropic" | "gemini"
  apiKey,       // omitted/empty for local servers
  baseURL,      // optional; each adapter has a sensible default
  model,        // e.g. "gpt-4o-mini", "claude-sonnet-4", "gemini-2.5-pro"
  temperature,  // optional (default 0.3)
  maxTokens,    // optional
  timeoutMs,    // optional (default 60000)
}
```

You never write this object by hand — you produce it one of two ways below.

---

## Two ways to configure

### 1. Dashboard (Settings → "AI key")

1. Open `https://your-site.com/dashboard`, log in, go to **Settings**.
2. In the **AI key** card, pick a provider: OpenAI / Anthropic (Claude) /
   Google Gemini / DeepSeek / Groq / OpenRouter / Mistral / Together /
   Ollama (local) / LM Studio (local).
3. Click **Get a key** (a link to the provider's key page) if you need one.
4. Click **Use** — it auto-fills the base URL, a default model, and the adapter
   `type` for that provider.
5. Paste your key (local providers need none) and **Save**.

The dashboard stores this in your deployment's data dir — keys never touch the
repo.

### 2. Environment variables (12-factor)

Set the keys/endpoints you use in `.env` (copy from
[`.env.example`](../../.env.example)) and pick the default with
`SOPHIA_AI_PROVIDER`. Recognized variables:

| Provider | Key var | Model var (optional) | Adapter |
|---|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` | `openai` |
| Anthropic | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` | `anthropic` |
| Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` | `gemini` |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` | `openai` |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` | `openai` |
| Mistral | `MISTRAL_API_KEY` | `MISTRAL_MODEL` | `openai` |
| Together | `TOGETHER_API_KEY` | `TOGETHER_MODEL` | `openai` |
| Fireworks | `FIREWORKS_API_KEY` | `FIREWORKS_MODEL` | `openai` |
| Perplexity | `PERPLEXITY_API_KEY` | `PERPLEXITY_MODEL` | `openai` |
| Ollama (local) | — (no key) | `OLLAMA_MODEL` | `openai` |
| LM Studio (local) | — (no key) | `LMSTUDIO_MODEL` | `openai` |
| vLLM (local) | — (no key) | `VLLM_MODEL` | `openai` |

Local servers are detected by their base URL:
`OLLAMA_BASE_URL`, `LMSTUDIO_BASE_URL`, `VLLM_BASE_URL`. Any other
OpenAI-style endpoint goes through the custom set:
`CUSTOM_AI_TYPE` / `CUSTOM_AI_BASE_URL` / `CUSTOM_AI_API_KEY` /
`CUSTOM_AI_MODEL`.

> Keys live **only** in your `.env` or the dashboard — never in the repo. `.env`
> is gitignored.

---

## Resolution order

When the builder needs an AI, it resolves the active provider like this:

1. **Dashboard config wins** if it has an API key **or** a base URL (local models
   need no key).
2. Otherwise the env provider named by **`SOPHIA_AI_PROVIDER`**.
3. Otherwise the **first** env provider found.
4. If nothing is configured, the builder returns `no_llm` and asks you to connect
   one.

---

## CLI commands

The `sophia` CLI inspects and tests env-configured providers (it reads `.env`):

```bash
sophia ai:list                 # list providers detected from your env
sophia ai:doctor               # which providers are configured + the active one
sophia ai:test                 # send a tiny prompt to the active provider
sophia ai:set-default <name>   # write SOPHIA_AI_PROVIDER=<name> into .env
```

`sophia ai:test` is the fastest "did I wire it up right?" check — it calls the
active provider with a one-word prompt and prints the reply.

---

## Supported providers at a glance

| Provider | `type` | Default base URL | Example model | Page |
|---|---|---|---|---|
| OpenAI | `openai` | `https://api.openai.com/v1` | `gpt-4o-mini` | [openai.md](./openai.md) |
| Anthropic (Claude) | `anthropic` | `https://api.anthropic.com/v1` | `claude-sonnet-4` | [anthropic.md](./anthropic.md) |
| Google Gemini | `gemini` | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.5-pro` | [gemini.md](./gemini.md) |
| OpenRouter | `openai` | `https://openrouter.ai/api/v1` | `openai/gpt-4o-mini` | [openrouter.md](./openrouter.md) |
| Groq | `openai` | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` | [openai-compatible.md](./openai-compatible.md) |
| Mistral | `openai` | `https://api.mistral.ai/v1` | `mistral-large-latest` | [openai-compatible.md](./openai-compatible.md) |
| Together | `openai` | `https://api.together.xyz/v1` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` | [openai-compatible.md](./openai-compatible.md) |
| Fireworks | `openai` | `https://api.fireworks.ai/inference/v1` | `accounts/fireworks/models/llama-v3p3-70b-instruct` | [openai-compatible.md](./openai-compatible.md) |
| Perplexity | `openai` | `https://api.perplexity.ai` | `sonar` | [openai-compatible.md](./openai-compatible.md) |
| Ollama (local) | `openai` | `http://localhost:11434/v1` | `llama3.1` | [ollama.md](./ollama.md) |
| LM Studio (local) | `openai` | `http://localhost:1234/v1` | `local-model` | [lm-studio.md](./lm-studio.md) |
| vLLM (local) | `openai` | `http://localhost:8000/v1` | your served model | [vllm.md](./vllm.md) |
| Any custom endpoint | `openai`/`anthropic`/`gemini` | (you set it) | (you set it) | [custom-provider.md](./custom-provider.md) |

DeepSeek and any other OpenAI-style host configure exactly like the `openai`
adapter rows above — point the base URL at the host. See
[openai-compatible.md](./openai-compatible.md).

---

## Verify

```bash
sophia ai:list      # do I see my provider?
sophia ai:doctor    # is one active?
sophia ai:test      # does it actually answer?
```

Then open the dashboard, chat with Sophia ("add a hero and a contact section"),
and watch the live preview change.

---

## Troubleshooting

- **`sophia ai:list` shows nothing** — no recognized env var is set. Copy
  `.env.example` to `.env` and add a key or a local base URL.
- **`no active provider`** — set `SOPHIA_AI_PROVIDER` (or
  `sophia ai:set-default <name>`), or configure one in the dashboard.
- **`provider call failed`** — wrong key, model name, or base URL. For local
  servers, confirm the server is running and the base URL ends in `/v1`.
- **Builder says `no_llm`** in the dashboard — connect a provider in Settings or
  set a provider env var, then reload the dashboard.
