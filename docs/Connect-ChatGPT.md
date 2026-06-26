# Connect ChatGPT to your Sophia Stack site
### A complete, no-experience-needed walkthrough (~10 minutes, one time)

---

## What this is and why you do it once
A normal ChatGPT chat **cannot** edit your website — OpenAI blocks chats from sending
commands to outside sites for safety. A **Custom GPT with an Action** is the official
switch that turns that ability on. You build it one time. After that, you just open
your GPT, type what you want, and it edits your live site. This is the exact same
mechanism behind every other "ChatGPT that calls an app/API" you've seen.

---

## PART 0 — Three things to have ready
1. **ChatGPT Plus, Pro, or Team.** Custom GPTs are not on the free plan.
   - Not sure? On chatgpt.com, if you see **"+ Create"** under GPTs, you're good.
2. **Use a web browser at chatgpt.com** — a computer is easiest; a phone browser works.
   The phone **app** cannot fully set up Actions, so use the browser.
3. **The file `sophia-openapi.json`** (the one Sophia gave you) saved where you can open
   and copy from it.

---

## PART 1 — Get your secret key from your own site
1. Open your dashboard: **https://YOUR-SITE/dashboard** and log in.
2. Click the **Keys** tab.
3. Click **Mint a new key**. A code starting with **`mykey-`** appears.
4. **Copy it** and keep it handy for a few minutes.
5. If you ever pasted a key into a chat before, **revoke** that old one here (tap revoke next to it).
6. Note your **site URL** too (e.g. `https://YOUR-SITE`).

---

## PART 2 — Start building the Custom GPT
1. Go to **chatgpt.com** and sign in.
2. In the left sidebar click **GPTs** (or go straight to **chatgpt.com/gpts**).
3. Click **+ Create** (top right).
4. At the very top you'll see two tabs: **Create** and **Configure**.
   Click **Configure**. *(Create is a chatbot that interviews you; Configure is the
   form we want.)*

---

## PART 3 — Name and instructions
1. **Name:** type `Sophia Site Editor`
2. **Description** (optional): `Edits my Sophia Stack website.`
3. **Instructions** — paste this exactly:
   > Use sophiaPing first to confirm the connection and that the token can write.
   > Then call sophiaCatalog (allowed blocks, styles, ops) and sophiaReadModel
   > (the current site). Make changes with small sophiaPatch calls, using only block
   > types and styles from the catalog. Use sophiaSetCss for custom CSS and
   > sophiaRollback to undo. Confirm with me before large or destructive changes.
4. Ignore Conversation starters, Knowledge, Capabilities — not needed.

---

## PART 4 — Add the Action (the important part)
Scroll down to **Actions** → click **Create new action**.
You'll now see three sections: **Authentication**, **Schema**, **Privacy policy**.

### 4a. Authentication  ← the step people miss
1. Click the **gear ⚙️** next to Authentication (it says "None").
2. Choose **API Key**.
3. **API Key** field: paste your **`mykey-…`** token.
4. **Auth Type:** choose **Bearer**. *(Not Basic. Not Custom.)*
5. Click **Save**. It should now read "API Key".
   > If you skip this, every edit comes back "unauthorized" and nothing changes.

### 4b. Schema
1. Clear any sample text in the big **Schema** box.
2. Paste the **entire contents** of `sophia-openapi.json`.
   - On a phone: open the file → Select All → Copy → paste here.
   - Or click **Import from URL** and enter **https://YOUR-SITE/openapi.json**
3. Underneath, ChatGPT lists **Available actions**. You should see **6**:
   `sophiaPing, sophiaCatalog, sophiaReadModel, sophiaPatch, sophiaSetCss, sophiaRollback`.
   - See an error or 0 actions? Your paste was partial or it's the old file — copy the whole new file again.

### 4c. Privacy policy
- If it requires a **Privacy policy URL** (often needed to save), paste your site URL:
  **https://YOUR-SITE/**

---

## PART 5 — Test BEFORE you save
1. In the Available actions list, find **sophiaPing** → click **Test**.
2. The first time it may ask permission ("Allow … to talk to YOUR-SITE?") → **Allow**.
3. You want this response:
   ```
   { "ok": true, "site": "…", "canWrite": true }
   ```
   - **canWrite: true** → token works, it can edit. 🎉
   - **canWrite: false** → the token didn't save right → redo step 4a.
   - **Error / 404** → site unreachable or the latest version isn't deployed (see troubleshooting).

---

## PART 6 — Save it
1. Top right → **Create** (or **Save**).
2. Choose **Only me** (private).
3. Confirm. It now lives under **My GPTs**.

---

## PART 7 — Use it (the payoff)
1. Open **Sophia Site Editor** from My GPTs.
2. Type a request, for example:
   - "Change the style to dark-tech and rewrite my homepage hero for a coffee shop."
   - "Add an About page with a short bio and my opening hours."
   - "Make a contact form that saves messages."
3. The first action shows **"Allow … to run sophiaPatch?"** → tap **Allow** (or **Always Allow** so it stops asking).
4. Open your site → the change is live.

---

## TROUBLESHOOTING — by symptom
- **It replies with text but nothing changes** → it didn't run the action. Approve the
  "Allow" popup, and re-prompt: *"Use the sophiaPatch action to make that change now."*
- **Unauthorized / 401 / canWrite:false** → token not saved in Authentication (4a) or it's
  a revoked key. Mint a fresh key, re-paste, Save.
- **"Could not import / parse the schema"** → you pasted partial text or the old file.
  Copy the **whole** new `sophia-openapi.json` again.
- **ping returns 404 / not found** → deploy the latest Sophia zip to your `/nodejs/` folder
  (it adds the ping endpoint). The other 5 actions still work without it.
- **No "+ Create" / no GPTs option** → you're on **free** ChatGPT; Custom GPTs need Plus/Pro/Team.
- **It changed the wrong thing** → tell it *"rollback the last change"* (uses sophiaRollback), then rephrase.

---

## What it can do once connected
Rewrite any text, change styles and colors, add/remove/reorder pages and sections,
add photos and video by URL, create data collections and forms, and write sandboxed
backend functions — all by chatting. Every edit is validated before it lands and can
be rolled back, and the footer + core can't be removed.
