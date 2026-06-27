# Frequently asked questions

Plain answers to the questions most people have before (and while) setting up
Sophia Stack. New to all this? Start with the
[no-code quickstart](quickstart-no-code.md), and keep the
[glossary](glossary.md) handy for any unfamiliar words.

---

## Do I need to know how to code?

**No.** Sophia Stack is designed so you build and edit your site by **chatting**
in plain English — "build me a bakery landing page with a menu and hours." You
also get **10 ready-made templates** to start from. The only "technical" moment
is the one-time setup of putting the package on your hosting, and even that is
mostly clicking buttons and filling in a form. If it feels hard, the
[AI assistant prompts](setup-with-ai-assistant.md) will walk you through it
conversationally.

---

## What will this cost?

Sophia Stack itself is **free and open-source** — there's no license fee and no
subscription to SophiaXT. You pay only for two ordinary things:

1. **Hosting** — the "home" your site lives in. Beginner-friendly plans
   (like Hostinger) typically run a few dollars a month.
2. **Your own AI usage** — when you chat to build your site, Sophia uses an AI
   provider you choose. Many have **free tiers** to start (such as Groq or Google
   Gemini), and paid usage is usually pay-as-you-go and inexpensive for normal
   building.

There's no hidden middle-man fee. Sophia never charges you per site, per visitor,
or per sale.

---

## Which AI should I pick?

Any of the supported providers works well for building a site. A quick guide:

- **Just want to start free?** → **Groq** or **Google Gemini** (both have free
  tiers).
- **Want the lowest cost as you grow?** → **DeepSeek** is often the cheapest.
- **Want top-tier quality?** → **OpenAI** or **Anthropic (Claude)**.
- **Want to run it on your own computer with no key at all?** → local options like
  **Ollama** or **LM Studio** (a bit more advanced).

You can change your mind anytime in **Settings → AI key** — you're never locked
in. For the full list and details, see the
[AI providers overview](../ai-providers/overview.md).

---

## Is my data mine?

**Yes, completely.** Sophia Stack is **self-hosted**, which means your entire site
— your pages, images, member list, and settings — lives on **your** hosting, in a
folder called `.sophia-data`. There's no SophiaXT cloud holding your content
hostage, and no company that can lock you out or gate your data. You own it.

---

## How do I update to a new version?

Updating is simple and safe because all your content stays in the `.sophia-data`
folder:

1. Get the new package.
2. Replace the program files (`app.js`, `public/client.js`, `catalog.json`) on
   your host.
3. **Leave the `.sophia-data` folder exactly where it is** — that's your whole
   site.
4. Restart the app.

Your pages, members, login, and recovery phrase all survive the update. Full
details: [installation guide](../installation.md#updating-without-losing-your-site).

> **The golden rule:** never delete `.sophia-data`. It's your site.

---

## How do payments work — does Sophia take a fee?

Payments run through **Stripe**, using **your own** Stripe account. The setup:

1. Create a free account at <https://dashboard.stripe.com>.
2. In Sophia, go to **Settings → Payments** and paste your Stripe **Secret key**
   and **Webhook signing secret** (both come from your Stripe dashboard), then
   **Save**.
3. Now you can sell products and subscriptions, and customers pay through
   **Stripe Checkout**.

**Sophia never takes a cut.** Every payment goes straight into your Stripe
account; only Stripe's normal processing fee applies. Each site owner uses their
own Stripe account.

> **Try it safely first:** use Stripe's **TEST keys** to run a pretend checkout
> before switching to real (live) keys. Need a hand?
> [Use the Stripe AI prompt](setup-with-ai-assistant.md#c-set-up-stripe-payments).

---

## Can visitors create accounts on my site?

**Yes.** Your finished site has a built-in **member account** system — visitors
can sign up and log in. This is the foundation for memberships, client portals,
gated content, and subscriptions. You can see and manage your members from the
dashboard.

---

## Is it secure?

Sophia takes security seriously. A few of the protections built in:

- Your password is **scrambled (hashed)**, never stored as plain text.
- Logins are **rate-limited** to block password-guessing attacks.
- Every AI edit is **checked before it goes live**, with **one-click undo
  (rollback)** and a core part of your site the AI can't remove.

Your part of the bargain: use a **strong, unique password**, run your site over
**HTTPS** (secure web address — most hosts offer this for free), **save your
recovery phrase**, and keep your keys private. For the full picture, see the
[production checklist](../security/production-checklist.md).

---

## How do I get back in if I forget my password?

This is exactly what your **5-word recovery phrase** is for. On the login screen,
click **Recover** and enter your five words. (For extra safety, recovering also
signs out any other sessions and revokes keys.)

> Lost **both** your password and your recovery phrase? You can still regain
> access by editing your data on the host, but it's a more technical step — paste
> the [troubleshooting prompt](setup-with-ai-assistant.md#d-help-me-fix-a-problem-troubleshooting)
> into an AI chat and it'll guide you. This is why saving the phrase up front
> matters so much!

---

## Do I have to use Claude or any specific AI?

**No.** Sophia is **provider-agnostic** — it works with OpenAI, Anthropic
(Claude), Google Gemini, and many others, including free and local options. Pick
whatever you like and switch anytime.

---

## Where can I get more help?

- **Stuck on a step?** → [Set up with an AI assistant](setup-with-ai-assistant.md)
- **Confused by a word?** → [Glossary](glossary.md)
- **The full walkthrough** → [No-code quickstart](quickstart-no-code.md)
- **Host-specific instructions** → [Deploy guides](../deploy/)
