# Builder memory (vector retrieval)

An **optional** long-term memory for the AI builder. It indexes your project — the block **catalog**,
the runtime **skill**, your **site brief**, and recent **versions** — into a small vector store, then
retrieves the most relevant snippets for each request so the builder plans edits with context.

It's entirely opt-in and fail-safe: **without an embedding-capable provider, nothing changes** — the
builder works exactly as before. No external vector DB to run; the index is a small JSON file in
`.sophia-data/`.

## Enable it

The embedder defaults to your chat provider **if it's OpenAI-compatible** (OpenAI, Together,
Fireworks, Ollama, LM Studio, vLLM, custom). To use a dedicated embeddings endpoint, set in `.env`:

```bash
EMBED_API_KEY=...
EMBED_BASE_URL=https://api.openai.com/v1
EMBED_MODEL=text-embedding-3-small
```

The index builds automatically on startup (when an embedder is available) and can be rebuilt anytime.

## API (owner-only)

| Method & path | Purpose |
|---|---|
| `GET /api/sophia/memory` | `{ enabled, ready, count, error }` |
| `POST /api/sophia/memory` | rebuild the index now |

When the builder agent runs, it retrieves the top matches for your message and prepends them to its
system context as "Relevant context from this project". Low-relevance matches are filtered out.

## For extensions

With `ai:use`, extensions can embed text directly: `await ctx.ai.embed([ "text", … ])` → vectors
(OpenAI-compatible providers). Useful for semantic search, keyword/content mapping, and recommendations.

> **(planned)** Indexing of media alt-text and per-page content, an ANN index for very large sites,
> and `ctx.vector` for extensions to keep their own namespaces. Track in [ROADMAP.md](../../ROADMAP.md).
