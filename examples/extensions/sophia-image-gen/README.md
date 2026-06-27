# Image Studio (sophia-image-gen)

Generate images for the site you're building — and have the AI write prompts that **fit your site**.

## Providers (bring your own key)
- **OpenAI** — `gpt-image-1` (`/v1/images/generations`)
- **fal.ai** — FLUX schnell (fast + cheap)
- **Google Imagen 3** — `imagen-3.0-generate-002:predict`
- **Placeholder** — a free, key-free branded SVG (instant mockups / testing)

Add your key in the **Image Studio** tab (it's stored on your server only).

## Context-aware prompts
With **"Match my site"** on, the extension reads your Site Model (name, style, brief, sections) and uses
your configured AI (`ctx.ai.generate`) to rewrite your request into a prompt that fits the brand and
content — e.g. *"hero image for my coffee shop"* becomes a vivid, on-brand photographic prompt.

## How it works
1. You (or an agent with a `mykey-` token) POST `/api/extensions/sophia-image-gen/generate`
   `{ prompt, provider?, size?, contextual?, place?:{id,path} }`.
2. The image is generated, **saved to your media library** (`ctx.media.save`), and the URL returned.
3. Optionally `place` it straight into a block (`ctx.site.patch` — validated + reversible).

## Install
Copy this folder into `.sophia-data/extensions/`, or one-click install it from the **Extensions** tab
(`Chorozion/Sophia-Stack`, subdir `examples/extensions/sophia-image-gen`). Needs Sophia Stack ≥ 1.5.

> Demonstrates the `media:write` capability (`ctx.media.save`) + provider-agnostic image generation.
