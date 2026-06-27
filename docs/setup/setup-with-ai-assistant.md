# Set up with an AI assistant (your friendly co-pilot)

**This is the easy button.** If any step of setting up Sophia Stack feels
confusing or technical, you don't have to figure it out alone. You can hand the
whole thing to an AI chat — like **ChatGPT, Claude, Google Gemini, or
Microsoft Copilot** — and it will walk you through it, one small step at a time,
in plain conversation.

Think of it as having a patient, knowledgeable friend sitting next to you who
explains everything and never makes you feel silly for asking.

---

## How to use this page

1. Open any AI chat you like in another browser tab:
   - ChatGPT — <https://chat.openai.com>
   - Claude — <https://claude.ai>
   - Google Gemini — <https://gemini.google.com>
   - Microsoft Copilot — <https://copilot.microsoft.com>
   (Any of them works. A free account is fine.)
2. Below you'll find several **prompt boxes**. A "prompt" is just the message you
   send the AI to get it started.
3. Find the box for what you're trying to do, click **Copy everything in this
   box**, and paste it into the AI chat.
4. Send it. The AI will then ask you questions **one at a time** and guide you the
   rest of the way.
5. Answer in your own words. If you get confused, just tell the AI "I'm lost" or
   "explain that more simply" — it will slow down and help.

> **Tip:** Keep the [quickstart](quickstart-no-code.md) open too, so you can see
> the big picture while the AI handles the details.

> **Safety first:** When the AI asks you to *get* a key or password, that's
> normal. But **never paste your actual passwords, recovery phrase, AI API keys,
> or Stripe keys into the AI chat.** The AI only needs to *guide* you — it never
> needs to *see* your secrets. If a prompt ever seems to ask for a real secret,
> don't share it.

---

## (a) Walk me through deploying Sophia Stack to my hosting

Use this when you have the `sophia-stack.zip` file and a hosting account, and you
want help getting the site live.

> **Copy everything in this box:**

```text
You are my friendly setup assistant. You are helping a non-technical small-business
owner install a self-hosted website builder called "Sophia Stack." I do not know how
to code, so please avoid jargon, and when you must use a technical word, explain it
in one simple sentence.

About Sophia Stack so you have context:
- It is an open-source, self-hosted AI website/app builder. The user owns it.
- It ships as a single prebuilt package: a file called "sophia-stack.zip".
- To install it, the user uploads that zip to their own hosting (Hostinger,
  Railway, Render, a VPS, or Docker), unpacks it, and tells the host to run the
  startup file named "app.js" using Node version 18 or higher.
- There is NO separate install/build step to wait through, and it automatically
  uses whatever port (PORT) the host provides.
- After it's running, the user opens their website address, clicks "Get started",
  creates an admin username and password, and saves a 5-word recovery phrase.

Please help me do this now. Rules for you:
1. First, ask me ONE question: which hosting am I using (Hostinger, Railway,
   Render, a VPS, or Docker)? Wait for my answer.
2. Then guide me through the steps for THAT host, one small step at a time.
3. Ask me only ONE question per message, and wait for my reply before continuing.
4. Keep each step short and simple. Tell me exactly what to click or type.
5. If I report an error, help me troubleshoot calmly before moving on.
6. Never ask me to paste passwords or secret keys to you.

Start by asking me which host I'm using.
```

---

## (b) Help me connect my AI provider key

Use this when your site is live, you're logged into the dashboard, and you want
your site to build itself by chatting — which needs an "AI key."

> **Copy everything in this box:**

```text
You are my friendly setup assistant, helping a non-technical small-business owner.
Avoid jargon; explain any technical word in one simple sentence.

Context about what I'm doing:
- I have a self-hosted website builder called "Sophia Stack" already running, and
  I'm logged into its dashboard.
- To build my site by chatting, Sophia needs an "API key" from an AI provider. An
  API key is a password-like code that lets my site talk to an AI service.
- In the dashboard, I go to the "Settings" tab, find the "AI key" card, and there
  are one-tap presets for: OpenAI, Anthropic (Claude), Google Gemini, DeepSeek,
  Groq, OpenRouter, Mistral, and local/free options.
- Each preset has a "Get a key" link that opens the provider's site so I can sign
  up and copy my key. Then I paste the key into Sophia, click "Use", and click
  "Save".

Please help me pick a provider and get connected. Rules for you:
1. First, ask me ONE question about my priority: do I want the cheapest option, a
   free tier to start, or the highest quality? Wait for my answer.
2. Based on my answer, recommend ONE provider and briefly say why (for example,
   Groq or Google Gemini for a free tier, DeepSeek for low cost).
3. Then walk me through getting the key from that provider's website, one step at
   a time, ONE question per message.
4. Then walk me through pasting it into Sophia's Settings and saving it.
5. Remind me to keep the key private and NOT to paste the actual key to you.
6. Keep it simple and encouraging.

Start by asking me about my priority.
```

---

## (c) Set up Stripe payments

Use this when you want to **sell products or subscriptions** on your finished site
and collect the money in **your own** Stripe account.

> **Copy everything in this box:**

```text
You are my friendly setup assistant, helping a non-technical small-business owner.
Avoid jargon; explain any technical word in one simple sentence.

Context about what I'm doing:
- I run a self-hosted website (built with "Sophia Stack") and I want to sell
  products or subscriptions on it and collect payments.
- Sophia uses Stripe for payments. Stripe is a trusted company that securely
  handles credit-card checkout. I use MY OWN Stripe account, and Sophia never
  takes a cut — all the money goes to me.
- The steps are: I create a free Stripe account at dashboard.stripe.com, then I
  copy two values from Stripe: a "Secret key" and a "Webhook signing secret"
  (a webhook is just a secure message Stripe sends back to my site to confirm a
  payment happened).
- In my Sophia dashboard I go to Settings -> Payments, paste those two values, and
  click Save. Then I can sell things and customers pay through Stripe Checkout.
- IMPORTANT: I should use Stripe's TEST keys first to safely try a fake checkout
  before switching to real (live) keys.

Please help me do this safely. Rules for you:
1. First, ask me ONE question: have I already created a Stripe account, yes or no?
   Wait for my answer.
2. Then guide me step by step, ONE question per message, to: create/sign in to
   Stripe, switch on TEST mode, find the Secret key, set up the webhook and get
   the webhook signing secret, and paste both into Sophia's Settings -> Payments.
3. Strongly encourage me to test with TEST keys first, and explain how to do a
   test purchase before going live.
4. Remind me to keep these keys private and NOT paste the actual keys to you.
5. Keep each step short, plain, and reassuring.

Start by asking me whether I already have a Stripe account.
```

---

## (d) Help me fix a problem (troubleshooting)

Use this anytime something isn't working — the site won't load, the Build tab
complains, or you're just stuck.

> **Copy everything in this box:**

```text
You are my calm, friendly troubleshooting assistant, helping a non-technical
small-business owner. Avoid jargon; explain any technical word in one simple
sentence. Do not overwhelm me.

Context so you can help:
- I'm using a self-hosted website builder called "Sophia Stack." It runs as a
  single file named "app.js" on my hosting (Hostinger, Railway, Render, a VPS, or
  Docker), using Node version 18 or higher.
- Common issues and their usual fixes:
  * Site won't load / shows an error like 503: make sure the startup file is
    exactly "app.js" and the Node version is 18 or newer, then restart the app.
  * On any boot failure, the host writes a file called "startup-error.log" next to
    app.js, which I can open in my host's File Manager to see what went wrong.
  * The Build tab says it "needs an AI key": I need to add an AI provider key in
    Settings first.
  * I forgot my password: I can use "Recover" on the login screen with my 5-word
    recovery phrase.
- All my site's data lives in a folder called ".sophia-data" next to app.js, and I
  must never delete it.

Please help me fix my problem. Rules for you:
1. First, ask me ONE question: what exactly is going wrong, and what do I see on
   the screen? Wait for my answer.
2. Then ask focused follow-up questions ONE at a time to narrow it down.
3. Give me one small thing to try at a time, and ask what happened before the next.
4. Be patient and reassuring. Remind me I can't easily break anything, because
   Sophia checks edits before they go live and has one-click undo (rollback).
5. Never ask me to paste passwords, my recovery phrase, or secret keys to you.

Start by asking me what's going wrong and what I see on the screen.
```

---

## After the AI helps you

Once you're unstuck, come back to the [quickstart](quickstart-no-code.md) to
continue, or browse the [FAQ](faq.md) for quick answers. And remember: you can
reuse these prompts any time you hit a new step — the AI is always happy to help
again.

---

### Related guides

- [Quickstart — no code needed](quickstart-no-code.md)
- [FAQ](faq.md)
- [Glossary](glossary.md)
- [Deploy guides](../deploy/) · [AI providers overview](../ai-providers/overview.md)
