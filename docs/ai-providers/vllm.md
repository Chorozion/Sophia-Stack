# vLLM (local / self-hosted, no key)

[vLLM](https://docs.vllm.ai) is a high-throughput inference server that exposes an
OpenAI-compatible API. Point the built-in Sophia builder at it with the
**`openai`** adapter and **no API key** (unless you configured one on the server).

> **Run the server first.** It only works while your vLLM server is up and
> reachable at its base URL.

---

## Prerequisites

- A deployed Sophia Stack (or local `sophia dev`).
- A running vLLM server (typically on a GPU host).

## Run it

Start vLLM with the OpenAI-compatible server, e.g.:

```bash
python -m vllm.entrypoints.openai.api_server \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --port 8000
```

This serves the OpenAI API at `http://localhost:8000/v1`.

- **Base URL:** `http://localhost:8000/v1`
- **Adapter `type`:** `openai`
- **Key:** none by default (set one only if you started vLLM with
  `--api-key`)
- **Model:** the exact `--model` id you launched with (e.g.
  `meta-llama/Llama-3.1-8B-Instruct`)

---

## Setup — environment variables

```bash
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_MODEL=meta-llama/Llama-3.1-8B-Instruct
# VLLM_API_KEY=...        # only if you started vLLM with --api-key
SOPHIA_AI_PROVIDER=vllm
```

Setting `VLLM_BASE_URL` makes Sophia detect vLLM. `VLLM_MODEL` defaults to
`local-model` if omitted, but it should match your served model id.

## Setup — dashboard

vLLM isn't a one-click choice in the dashboard's provider list. Configure it as a
**custom** OpenAI-compatible endpoint:

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick any OpenAI-compatible provider, then set:
   - base URL → your vLLM URL (e.g. `http://localhost:8000/v1`)
   - `type` → `openai`
   - model → your served model id
   - key → leave blank (or the `--api-key` value).
3. **Save**.

See [custom-provider.md](./custom-provider.md) for the custom-endpoint pattern.

---

## Verify

```bash
sophia ai:doctor    # should show: active: openai (the vLLM config)
sophia ai:test      # sends a tiny prompt to your vLLM server
```

Then chat with Sophia in the dashboard.

---

## Troubleshooting

- **"connection refused" / unreachable** — the vLLM server isn't running or the
  base URL/port is wrong.
- **`401`** — you started vLLM with `--api-key`; set `VLLM_API_KEY` to match.
- **"model not found"** — `VLLM_MODEL` must equal the `--model` id vLLM was
  launched with.
- **Cross-machine** — vLLM usually runs on a GPU host; use that host's reachable
  address, not `localhost`.

Related: [overview.md](./overview.md) ·
[openai-compatible.md](./openai-compatible.md) ·
[custom-provider.md](./custom-provider.md)
