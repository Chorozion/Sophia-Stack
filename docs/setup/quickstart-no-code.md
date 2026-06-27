# Quickstart — no code needed (about 20 minutes)

Welcome! This is the friendliest, start-to-finish guide for getting your own
website up and running with Sophia Stack. **You don't need to know how to code.**
If you can fill in a web form and copy-and-paste, you can do this.

By the end you'll have a real, live website that you own — and you'll be able to
change it just by **chatting** with an AI, like texting a friend who builds your
site for you.

> **Feeling unsure about any step?** You're not stuck. Open
> [setup-with-ai-assistant.md](setup-with-ai-assistant.md) and copy one of the
> ready-made prompts into ChatGPT or Claude. It will walk you through that exact
> step, one question at a time. You can keep this guide and the AI helper open
> side by side.

---

## What you'll need

- **A hosting account** — this is the "home" your website lives in on the
  internet. Hostinger is the easiest for beginners, but Railway, Render, a VPS,
  or Docker all work too. (Don't worry, we link the exact guide below.)
- **The Sophia Stack package** — one file called **`sophia-stack.zip`**. Think of
  it as the whole website in a box, ready to unpack.
- **About 20 minutes** and a cup of coffee.
- *(A little later)* a free or paid **AI account** (like OpenAI or Google
  Gemini) so your site can build itself when you chat with it. We'll get to that.

You do **not** need: a credit card for Sophia itself (it's free and open-source),
any coding tools, a designer, or a database. It's all included.

New words in this guide are explained in plain English in the
[glossary](glossary.md).

---

## Step 1 — Get the package and put it on your hosting

The "package" is the file **`sophia-stack.zip`**. You'll upload it to your
hosting account and unpack it there.

Every host works a little differently, so pick yours and follow its short guide.
They all come down to the same three things: **upload the zip, unpack it, and
tell the host to start the file named `app.js`.**

- **[Hostinger](../deploy/hostinger.md)** — easiest for most people (uses the
  "Setup Node.js App" button)
- **[Railway](../deploy/railway.md)**
- **[Render](../deploy/render.md)**
- **[VPS](../deploy/vps.md)** — a plain server you control
- **[Docker](../deploy/docker.md)** — for the technically curious

When you set things up, you'll be asked for a **"startup file"** (sometimes
called the start command). The answer is always **`app.js`**, and the **Node
version** should be **18 or higher**. That's it — there's no lengthy "install"
step to wait through.

When it's running, open your website's address (your domain) in a browser. You
should see a simple starter page with an **Admin** link and a small
"Powered by Sophia Stack" line at the bottom.

> **If something goes wrong:** the two most common fixes are (1) make sure the
> startup file is spelled exactly `app.js`, and (2) make sure the Node version is
> 18 or newer. If the page still won't load, your host has a **File Manager** —
> look for a file called `startup-error.log` next to `app.js`; it explains what
> happened in plain text. Or paste the "Help me fix a problem" prompt from
> [setup-with-ai-assistant.md](setup-with-ai-assistant.md) into an AI chat.

---

## Step 2 — Create your admin account (your way in)

Now you'll claim ownership of your site by creating the one account that runs it.

1. On your live site, click **Get started**.
2. Choose an **admin username** and a **password** (at least 8 characters). Pick
   a password you don't use anywhere else.
3. Click **Create account**.

That's your private control panel login. There's no outside company holding your
account — it lives entirely on your hosting, with you.

---

## Step 3 — Save your 5-word recovery phrase (very important!)

Right after you create your account, the screen shows a **five-word recovery
phrase** — five simple words in a row.

> **Write these five words down right now and keep them somewhere safe** (a
> password manager is perfect). They are shown **only once**. This phrase is the
> **only way back in** if you ever forget your password. Treat it like the spare
> key to your house: keep it private, never post it or email it to anyone.

Once you've saved it, click **I saved it — open my dashboard**. You'll land in
your **dashboard** — the control panel where everything happens.

---

## Step 4 — Connect an AI so your site can build itself

Here's the magic part. To build your site by chatting, your site needs to borrow
some "brain power" from an AI service. You connect it with a short **API key** (a
password-like code that lets your site talk to the AI).

1. In your dashboard, open the **Settings** tab.
2. Find the **AI key** card. You'll see one-tap presets for popular choices —
   **OpenAI**, **Anthropic (Claude)**, **Google Gemini**, **DeepSeek** (often the
   cheapest), **Groq** (has a free tier), and more.
3. Click **Get a key** next to the one you want. That opens the provider's
   website, where you sign up and copy your key. (You only do this once.)
4. Paste the key back into Sophia, click **Use** (this fills in the technical
   settings for you), then click **Save**.

Not sure which AI to choose? Any of them works great for building a site. **Groq
or Google Gemini** are friendly starting points because they have free tiers. See
the [FAQ](faq.md#which-ai-should-i-pick) for a quick comparison.

> **Want a hand?** Paste the "Help me connect my AI provider key" prompt from
> [setup-with-ai-assistant.md](setup-with-ai-assistant.md) into an AI chat and it
> will guide you through getting and pasting the key.

---

## Step 5 — Build your first page by chatting

This is the fun part. No code, no drag-and-drop fiddling — just describe what you
want.

1. In the dashboard, open the **Build** tab.
2. Type what you want in plain English, for example:
   - *"Build me a coffee shop landing page with a menu and a contact form."*
   - *"Make a simple one-page site for my dog-walking business."*
3. Press send and watch. Sophia reads your site, makes the changes, checks its
   own work, and shows you the result.

**Prefer a head start?** Sophia comes with **10 ready-made templates** (a
local-service business, a portfolio, and more). Starting from one of those is
like beginning with a furnished room instead of an empty one — then you just chat
to make it yours.

Don't love a change? Every edit is checked before it goes live, and there's
**one-click rollback** to undo. You really can't break it — experiment freely.

---

## Step 6 — You're live!

Your site is already on the internet at your domain — there's no separate
"publish" button to hunt for. Anything you build shows up at your address right
away. Share the link!

A few nice things you can do next, whenever you're ready:

- **Let visitors sign up.** Your finished site can have **member accounts** so
  people can create logins — the foundation for memberships and gated content.
- **Sell things.** You can connect **your own Stripe account** to take payments
  for products or subscriptions. Sophia never takes a cut — every dollar goes to
  you. See the Stripe walkthrough in
  [setup-with-ai-assistant.md](setup-with-ai-assistant.md#c-set-up-stripe-payments)
  or the [FAQ](faq.md#how-do-payments-work--does-sophia-take-a-fee).
- **Keep building.** Just keep chatting in the **Build** tab.

---

## A quick safety reminder

Keep these four things **private**, like the keys and PIN to your bank:

1. Your **password**
2. Your **5-word recovery phrase**
3. Your **AI API key**
4. *(If you set up selling)* your **Stripe keys**

Never share them, never post them in a screenshot, never paste them into a public
chat. Sophia stores them safely on your own hosting.

---

## Where to go next

- **Got stuck anywhere?** → [setup-with-ai-assistant.md](setup-with-ai-assistant.md)
  (copy-paste prompts that turn any AI into your setup helper)
- **Common questions** → [faq.md](faq.md)
- **Confused by a word?** → [glossary.md](glossary.md)
- **Deploy details for your specific host** → the
  [deploy guides](../deploy/) (Hostinger, Railway, Render, VPS, Docker)
- **The slightly more technical 10-minute path** →
  [getting-started.md](../getting-started.md)

You've got this. 🎉
