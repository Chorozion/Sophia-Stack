# Connect ChatGPT to your Sophia site (Custom GPT Action)

A deployed Sophia site serves an **OpenAPI 3.1 schema** at `/openapi.json`, with
the server URL preset to your deployment's origin. That schema is exactly what a
**ChatGPT Custom GPT Action** imports. Build the Action once, then chat to edit
your live site.

> **Why an Action and not a plain chat?** A normal ChatGPT chat can't send
> commands to your site. A Custom GPT with an Action is the official switch that
> grants that ability. The token is the auth; the Action is what gives ChatGPT
> the ability to make the HTTP calls.

For a click-by-click, no-experience-needed version of this same setup, see
[../Connect-ChatGPT.md](../Connect-ChatGPT.md). This page is the condensed
reference.

---

## Prerequisites

1. **A deployed Sophia site**, e.g. `https://your-site.com`.
2. **A minted token.** Dashboard → **Keys** tab → **Mint a new key** → copy the
   `mykey-...` token (role **editor** or **admin**).
3. **ChatGPT Plus, Pro, or Team** — Custom GPTs are not on the free plan. Set up
   in a web browser at chatgpt.com (the phone app can't fully configure Actions).

---

## Step 1 — Create the Custom GPT

1. Go to **chatgpt.com**, open **GPTs**, click **+ Create**.
2. At the top, switch from **Create** to the **Configure** tab.
3. **Name:** `Sophia Site Editor`. Description optional.
4. **Instructions** — paste:

   > Use sophiaPing first to confirm the connection and that the token can write.
   > Then call sophiaCatalog (allowed blocks, styles, ops) and sophiaReadModel
   > (the current site). Make changes with small sophiaPatch calls, using only
   > block types and styles from the catalog. Use sophiaSetCss for custom CSS and
   > sophiaRollback to undo. Confirm before large or destructive changes.

---

## Step 2 — Add the Action and import the schema

1. Scroll to **Actions** → **Create new action**.
2. In the **Schema** box, click **Import from URL** and enter:

   ```
   https://your-site.com/openapi.json
   ```

   (Or paste the full JSON contents directly.)
3. ChatGPT should list **6** available actions:
   `sophiaPing`, `sophiaCatalog`, `sophiaReadModel`, `sophiaPatch`,
   `sophiaSetCss`, `sophiaRollback`.

---

## Step 3 — Set authentication (the step people miss)

1. Next to **Authentication**, click the gear and choose **API Key**.
2. **API Key** field: paste your `mykey-...` token.
3. **Auth Type:** choose **Bearer** (not Basic, not Custom).
4. **Save.** Authentication should now read "API Key".

> Skip this and every write comes back unauthorized. `sophiaCatalog` and
> `sophiaReadModel` are public reads and would still work, but `sophiaPatch` /
> `sophiaSetCss` / `sophiaRollback` need the Bearer token.

If a **Privacy policy URL** is required to save, use your site URL:
`https://your-site.com/`.

---

## Step 4 — Test sophiaPing before saving

1. In the actions list, find **sophiaPing** → **Test**.
2. Approve the "Allow … to talk to your-site.com?" prompt.
3. Expected response:

   ```json
   { "ok": true, "site": "…", "canWrite": true }
   ```

   - `canWrite: true` → token works, it can edit.
   - `canWrite: false` → the token didn't save; redo Step 3.

---

## Step 5 — Save and chat

1. Top right → **Create / Save** → **Only me** (private).
2. Open the GPT and ask for changes, e.g.:
   - "Change the style to dark-tech and rewrite my homepage hero for a coffee shop."
   - "Add an About page with a short bio and opening hours."
   - "Make a contact form that saves messages."
3. The first action shows an **Allow** popup → approve (or **Always Allow**).
4. Open your site — the change is live.

---

## The 6 operations (from the OpenAPI schema)

| operationId | Method + path | Auth | Purpose |
|-------------|---------------|------|---------|
| `sophiaPing` | GET `/api/sophia/ping` | optional | health + `canWrite` check (call first) |
| `sophiaCatalog` | GET `/api/sophia/catalog` | public | capability catalog |
| `sophiaReadModel` | GET `/api/sophia/model` | public | current site model |
| `sophiaPatch` | POST `/api/sophia/patch` | Bearer | apply `{ops:[...]}` edits |
| `sophiaSetCss` | PUT `/api/sophia/css` | Bearer | replace custom CSS layer |
| `sophiaRollback` | POST `/api/sophia/rollback` | Bearer | undo last edit |

---

## Troubleshooting

- **Replies with text but nothing changes** → the Action didn't run. Approve the
  "Allow" popup and re-prompt: "Use the sophiaPatch action to make that change now."
- **Unauthorized / 401 / `canWrite:false`** → token not saved in Authentication
  (Step 3) or it's a revoked key. Mint a fresh key and re-paste.
- **"Could not import / parse the schema"** → import from the URL again, or paste
  the **whole** `/openapi.json` contents.
- **ping returns 404** → deploy the latest build (it adds the ping endpoint); the
  other 5 actions still work.
- **No "+ Create"** → you're on free ChatGPT; Custom GPTs need Plus / Pro / Team.
- **Changed the wrong thing** → "rollback the last change" (runs sophiaRollback),
  then rephrase.

---

See also: [openapi.md](./openapi.md) for the raw schema surface, and
[mcp.md](./mcp.md) for the MCP alternative.
