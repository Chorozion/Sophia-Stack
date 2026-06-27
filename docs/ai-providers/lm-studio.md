# LM Studio (local, no key)

Run a model locally with [LM Studio](https://lmstudio.ai) and point the built-in
Sophia builder at its OpenAI-compatible server. Sophia uses the **`openai`**
adapter with **no API key**.

> **Start the local server first.** It only works while LM Studio's server is
> running and reachable.

---

## Prerequisites

- A deployed Sophia Stack (or local `sophia dev`).
- LM Studio installed, with a model downloaded.

## Run it

1. Install LM Studio from <https://lmstudio.ai>.
2. Download a model from the in-app catalog.
3. Open the **Developer / Local Server** tab and **Start Server**. LM Studio
   serves an OpenAI-compatible API, by default at `http://localhost:1234/v1`.

- **Base URL:** `http://localhost:1234/v1`
- **Adapter `type`:** `openai`
- **Key:** none (any value is ignored)
- **Example model:** `local-model` — or the exact model id LM Studio shows in the
  server panel.

---

## Setup — environment variables

```bash
LMSTUDIO_BASE_URL=http://localhost:1234/v1
LMSTUDIO_MODEL=local-model       # use the id LM Studio shows; falls back to "local-model"
SOPHIA_AI_PROVIDER=lmstudio
```

Setting `LMSTUDIO_BASE_URL` makes Sophia detect LM Studio.

## Setup — dashboard

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick **LM Studio (local)**.
3. Click **Use** (fills base URL + `type: openai`; no key needed).
4. Set the model id from LM Studio's server panel. **Save**.

> If Sophia runs on a different machine than LM Studio, use that machine's
> reachable address instead of `localhost` (and enable network access for the
> server in LM Studio).

---

## Verify

```bash
sophia ai:doctor    # should show: active: openai (the LM Studio config)
sophia ai:test      # sends a tiny prompt to your local model
```

Then chat with Sophia in the dashboard.

---

## Troubleshooting

- **"connection refused" / unreachable** — the LM Studio server isn't running.
  Start it in the Developer/Local Server tab.
- **"model not found"** — copy the exact model id from LM Studio's server panel
  into `LMSTUDIO_MODEL`.
- **Cross-machine** — bind/expose the server in LM Studio and use the real host
  address, not `localhost`.

Related: [overview.md](./overview.md) ·
[openai-compatible.md](./openai-compatible.md)
