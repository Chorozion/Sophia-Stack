// default-site.mjs — the starter Site Model a fresh deploy ships with.
// Shows something premium immediately; the agent edits out from here.
export const DEFAULT_SITE = {
  site: "my-site",
  style: "sophia",
  pages: {
    "/": {
      title: "My Site",
      blocks: [
        { id: "nav", type: "nav", brand: "My Site", links: ["Home", "About", "Contact"] },
        { id: "hero", type: "hero", fx: ["reveal-up"], kicker: "Built by an agent",
          headline: "Your site, built live by your AI",
          sub: "This is a fresh Sophia stack. Create your admin account, then connect your AI and watch it build.",
          cta: { label: "Get started", href: "/_setup" } },
        { id: "steps", type: "steps", items: [
          { t: "Get started", d: "Create your admin login (username + password)." },
          { t: "Connect your AI", d: "We hand you a skill link, your URL, and a token — paste them into ChatGPT, Claude, or Grok." },
          { t: "Watch it build", d: "Your AI reads the skill and builds your site live. You own everything." },
        ] },
        { id: "cta", type: "cta", headline: "Ready? Create your admin account.",
          button: { label: "Get started", href: "/_setup" } },
        { id: "foot", type: "footer", text: "Powered by Sophia Stack" },
      ],
    },
  },
};
