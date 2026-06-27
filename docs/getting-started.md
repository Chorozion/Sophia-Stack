# Getting started — the 10-minute path

This is the fastest route from zero to a live, AI-built website you own:
**deploy → Get started → save your recovery phrase → build with AI.**

Sophia Stack ships as a single zip that runs on plain Node (no `npm install` at
runtime). You deploy it once to a host you control, then build and edit the site
by **talking to an AI** — either the built-in builder (add your own API key) or
any external AI agent you hand a token to.

## Prerequisites

- A Node host (Node **18 or newer**). Any of: Hostinger "Setup Node.js App",
  Railway, Render, or a VPS. See the deploy guides linked below.
- The artifact: **`release/sophia-stack.zip`** from this repo (or build it — see
  [installation.md](installation.md)).
- 10 minutes.

## Step 1 — Deploy the zip

Pick your host and follow its guide. Each one boils down to the same thing:
upload the zip, set the start file to **`app.js`**, use **Node 18+**, start it.

- [Hostinger](deploy/hostinger.md) — "Setup Node.js App" (Passenger)
- [Railway](deploy/railway.md)
- [Render](deploy/render.md)
- [VPS](deploy/vps.md) — pm2 + reverse proxy
- [Docker](deploy/docker.md) — write your own Dockerfile (one is provided to copy)

When it's running, open your site URL in a browser. You should see the default
landing page with an **Admin** link and "Powered by Sophia Stack" in the footer.

## Step 2 — Get started (create your admin account)

1. On your live site, click **Get started** (or go to `https://YOUR-SITE/_setup`).
2. Enter an **admin username** and a **password** (minimum 8 characters).
3. Click **Create account**.

The password is hashed (scrypt) and stored in your data dir — there is no
external account and no company in the middle.

## Step 3 — Save your recovery phrase (shown once)

After you create the account, the screen shows a **five-word recovery phrase**.

> **Save it now.** It is shown **only once**. It is the only way back in if you
> lose your password — and using it also **revokes every key and session**, so
> it locks out anyone who got in. Store it somewhere safe (a password manager).

Click **I saved it — open my dashboard**. You land in `/dashboard`.

## Step 4 — Build with AI (two ways)

You don't write code or use a CLI. You build by chatting. Pick whichever fits:

### Option A — Built-in builder (bring your own key)

Best if you just want to chat inside your own dashboard.

1. In the dashboard, open the **Settings** tab.
2. Under **AI key**, pick a provider (one-tap presets with "get a key" links):
   **OpenAI**, **DeepSeek** (cheapest), **Groq** (fast, free tier),
   **OpenRouter**, **Together**, or **Mistral**.
3. Tap **Get a key**, sign up at the provider, copy the key, paste it in.
4. Tap **Use** to auto-fill the model + base URL, then **Save**.
5. Go to the **Build** tab and chat: *"Build me a coffee shop landing page."*

A real agent loop reads your site, makes the changes, fixes its own mistakes,
and iterates. Every edit is validated before it lands, with one-click rollback.

### Option B — Hand an external AI the token

Best if you already use ChatGPT, Claude, Cursor, Cline, or Claude Code.

1. In the dashboard, open the **Connect** (or **Keys**) tab.
2. Click **Mint a new key**. A token starting with **`mykey-`** appears — copy it.
3. Give a web-capable AI the **skill + your URL + the token**. For example, paste
   into the AI:
   > Read `https://YOUR-SITE/skill.md`, then build my website using key `mykey-XXXX`.

The deployed site is itself an agent-operable endpoint: a token-gated **REST API**,
an **MCP server** at `/mcp`, and an **OpenAPI schema** at `/openapi.json`.

- **ChatGPT (Custom GPT Action):** [docs/Connect-ChatGPT.md](Connect-ChatGPT.md)
- **Claude / MCP clients:** add `/mcp` as a custom connector with a Bearer token.
- **Cursor / Cline / Claude Code:** hand it the skill + URL + token; it edits via
  the REST API directly.

> A plain chat with **no web tool** (e.g. the basic Grok app) can *read* your
> site but can't *send* the edit request — that's the app's limit, not the token.

## Verify it works

- Your site URL loads the page (with the Admin / "Powered by Sophia Stack" footer).
- `https://YOUR-SITE/dashboard` loads and you can log in.
- After a build prompt, refresh your site — the change is live.
- (External AI) the AI's first call returns `"canWrite": true`.

## Troubleshooting

- **Site shows 503 / won't start (Hostinger):** make sure the startup file is
  `app.js` and Node is 18+. This was a known cause (an ESM/top-level-await +
  PORT-as-socket issue) that is now fixed — the app is CommonJS and honors a
  Unix-socket `PORT`. See [deploy/hostinger.md](deploy/hostinger.md).
- **Boot fails on any host:** the app writes the stack trace to
  `startup-error.log` next to `app.js` — open it in your host's File Manager.
- **Build tab says "needs an AI key":** add a key in **Settings** first
  (Option A), or use Option B (hand an external AI the `mykey-` token).
- **External AI returns "unauthorized" / `canWrite:false`:** the token wasn't
  saved as a **Bearer** token, or it was revoked. Mint a fresh key and re-paste.
- **Lost your password:** use **Recover** on the login screen with your five-word
  phrase. Lost both password and phrase? Delete the `auth` block in
  `.sophia-data/tokens.json` on your host and re-run setup.

## Next steps

- [Installation & updating](installation.md) — build from source, where data
  lives, and how to update without losing your site.
- [Connect ChatGPT](Connect-ChatGPT.md) — full Custom GPT walkthrough.
