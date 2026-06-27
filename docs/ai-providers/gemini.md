# Google Gemini

Use Google's Gemini models for the built-in Sophia builder. Gemini has its own
API shape, so Sophia routes it through the dedicated **`gemini`** adapter
(`POST {baseURL}/models/{model}:generateContent?key=…`).

---

## Prerequisites

- A deployed Sophia Stack (or local `sophia dev`).
- A Google AI (Gemini API) key.

## Get a key

Create one at <https://aistudio.google.com/app/apikey> (Google AI Studio).

- **Default base URL:** `https://generativelanguage.googleapis.com/v1beta`
- **Adapter `type`:** `gemini`
- **Example model:** `gemini-2.5-pro` (default)

---

## Setup — environment variables

```bash
GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-2.5-pro      # optional; this is the default
SOPHIA_AI_PROVIDER=gemini
```

## Setup — dashboard

1. `https://your-site.com/dashboard` → **Settings** → **AI key**.
2. Pick **Google Gemini**. Click **Get a key** if needed.
3. Click **Use** (fills base URL + `gemini-2.5-pro` + `type: gemini`).
4. Paste your key. **Save**.

---

## Verify

```bash
sophia ai:doctor    # should show: active: gemini
sophia ai:test      # sends a tiny prompt; prints the reply
```

Then chat with Sophia in the dashboard.

---

## Troubleshooting

- **`400` / "API key not valid"** — wrong key. The adapter passes it as the
  `?key=` query param; just provide the key.
- **"model not found"** — set `GEMINI_MODEL` to a model your key can access
  (e.g. `gemini-2.5-pro`, `gemini-2.5-flash`).
- **Region / access errors** — confirm the Gemini API is enabled for your Google
  account.

Related: [overview.md](./overview.md)
