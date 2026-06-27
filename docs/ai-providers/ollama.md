# Ollama (local, no key)

Run an open model on your own machine with [Ollama](https://ollama.com) and point
the built-in Sophia builder at it. Ollama exposes an OpenAI-compatible API, so
Sophia uses the **`openai`** adapter with **no API key**.

> **Run the server first.** Local providers only work when the Ollama server is
> running and reachable at its base URL. No key is ever needed.

---

## Prerequisites

- A deployed Sophia Stack (or local `sophia dev`).
- Ollama installed and running.

## Run it

1. Install Ollama from <https://ollama.com/download>.
2. Pull a model and start it (this also starts the server):

   ```bash
   ollama pull llama3.1
   ollama run llama3.1
   ```

   Ollama serves its OpenAI-compatible API at `http://localhost:11434/v1`.

- **Base URL:** `http://localhost:11434/v1` (the default Sophia uses)
- **Adapter `type`:** `openai`
- **Key:** none
- **Example model:** `llama3.1`

---

## Setup — environment variables

```bash
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
SOPHIA_AI_PROVIDER=ollama
```

Setting either `OLLAMA_BASE_URL` or `OLLAMA_MODEL` makes Sophia detect Ollama; if
you omit the base URL it defaults to `http://localhost:11434/v1`.

## Setup — dashboard

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick **Ollama (local)**.
3. Click **Use** (fills base URL + `type: openai`; no key field needed).
4. Set the model name you pulled (e.g. `llama3.1`). **Save**.

> If your Sophia deployment runs on a **different machine** than Ollama, set the
> base URL to that machine's reachable address (and make sure Ollama is bound to
> it), not `localhost`.

---

## Verify

```bash
sophia ai:doctor    # should show: active: openai (the Ollama config)
sophia ai:test      # sends a tiny prompt to your local model
```

Then chat with Sophia in the dashboard.

---

## Troubleshooting

- **"connection refused" / unreachable** — the Ollama server isn't running, or
  the base URL is wrong. Start it (`ollama run <model>`) and confirm
  `http://localhost:11434/v1` is reachable.
- **"model not found"** — `ollama pull <model>` first; set `OLLAMA_MODEL` to the
  exact name.
- **Sophia on another host can't reach `localhost`** — use the Ollama machine's
  real address, not `localhost`.

Related: [overview.md](./overview.md) ·
[openai-compatible.md](./openai-compatible.md)
