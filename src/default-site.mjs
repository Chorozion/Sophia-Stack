// default-site.mjs — the starter Site Model a fresh deploy ships with.
// Shows something premium immediately; the agent edits out from here.
export const DEFAULT_SITE = {
  site: "my-site",
  style: "dark-tech",
  pages: {
    "/": {
      title: "My Site",
      blocks: [
        { id: "nav", type: "nav", brand: "My Site", links: ["Home", "About", "Contact"] },
        { id: "hero", type: "hero", fx: ["reveal-up"], kicker: "Built by an agent",
          headline: "Your site, built live by your AI",
          sub: "This is a fresh Sophia stack. Hand your agent the token + address and watch it build.",
          cta: { label: "Get started", href: "#" } },
        { id: "feat", type: "features", items: [
          { t: "You own it", d: "Self-hosted on your server. No platform lock-in." },
          { t: "Live edits", d: "Your AI edits in real time — no redeploy, no staging." },
          { t: "Safe by default", d: "Validated edits, version history, instant rollback." },
        ] },
        { id: "cta", type: "cta", headline: "Tell your agent what to build",
          button: { label: "Open editor", href: "/_edit" } },
        { id: "foot", type: "footer", text: "Powered by Sophia Stack" },
      ],
    },
  },
};
