# Glossary — plain-English words

A friendly, one-line explanation for every term you might bump into while setting
up Sophia Stack. No prior knowledge needed. When in doubt, come back here.

---

- **Hosting** — the "home" on the internet where your website lives, so people can
  visit it. You rent it from a hosting company (like Hostinger, Railway, or
  Render), usually for a few dollars a month.

- **Deploy** — a fancy word for "put your website onto your hosting and turn it
  on." When you "deploy," you make your site live for the world to see.

- **Package (the zip)** — `sophia-stack.zip` is your whole website in a single
  compressed file. Think of it as a website-in-a-box: you upload it, unpack it,
  and it's ready to go. ("Zip" just means a packed-up file.)

- **Admin** — that's you, the owner. The **admin account** is your private login
  to the dashboard, where you control and build your site. There's only one admin.

- **Dashboard** — your control panel after you log in. It's where you chat to
  build your site, manage members, change settings, and connect payments.

- **Recovery phrase** — five simple words shown once when you create your admin
  account. It's the **only** way back in if you forget your password — like a
  spare key. Save it somewhere safe and private.

- **AI provider** — the AI service that powers the "build my site by chatting"
  magic (for example OpenAI, Anthropic/Claude, or Google Gemini). You pick one and
  connect it. Sophia works with many, so you're never locked in.

- **API key** — a password-like code from your AI provider that lets your site
  talk to the AI. You copy it from the provider and paste it into Sophia's
  Settings. Keep it private, like a password.

- **Token** — another password-like code. In Sophia, a token can let an *outside*
  AI tool (like ChatGPT or Cursor) help edit your site. (Members and the AI also
  count "tokens" as units of text, but for setup, just think: a token is a secret
  access code — keep it private.)

- **Template** — a ready-made starter site (Sophia includes 10). Instead of
  starting from a blank page, you begin with a furnished layout and just chat to
  make it yours.

- **Member account** — a login that *your visitors* can create on your finished
  site. It's the foundation for memberships, client portals, and gated content.
  (Different from your single admin account.)

- **Stripe** — a trusted company that securely handles credit-card payments. You
  connect **your own** Stripe account to sell products or subscriptions; the money
  goes to you, and Sophia takes no cut.

- **Webhook** — a secure little message Stripe sends back to your site to confirm
  "yes, that payment really happened." You paste a "webhook signing secret" into
  Sophia so it can trust those messages. You don't have to understand the
  plumbing — just copy the value from Stripe.

- **Environment variable** — an optional behind-the-scenes setting (a name and a
  value) that some hosts let you set, used to store things like keys. Most people
  never need to touch these — Sophia's **Settings** screen handles it for you.

- **PORT** — the "door number" your hosting uses to reach your website. Sophia
  figures this out **automatically** from your host, so you almost never set it
  yourself. (If you ever do, the start file is always `app.js`.)

- **Node / Node 18+** — the engine that runs Sophia behind the scenes. When your
  host asks for a "Node version," choose **18 or higher**. That's the only thing
  you need to remember about it.

- **`app.js`** — the single startup file your host should run to launch Sophia.
  Whenever a host asks for a "startup file," the answer is `app.js`.

- **`.sophia-data`** — the folder on your host that holds your *entire* site:
  pages, images, members, settings, login, and recovery phrase. **Never delete
  it**, especially when updating.

- **Rollback** — a one-click "undo." If an AI edit isn't what you wanted, you can
  roll back to the previous version. This is why you can experiment freely without
  fear of breaking things.

- **HTTPS** — the secure (padlock) version of a web address. Most hosts turn it on
  for free; it keeps your visitors' connection safe. Always use it for a live
  site.

---

Still unsure about something? The
[AI assistant prompts](setup-with-ai-assistant.md) can explain any of these in
even more detail, and the [FAQ](faq.md) covers the most common questions. Back to
the [quickstart](quickstart-no-code.md) whenever you're ready.
