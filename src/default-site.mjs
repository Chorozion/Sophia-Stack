// default-site.mjs — the blank vanilla state a fresh deploy ships with.
// One clean placeholder + a path to claim the site. The owner's AI builds
// everything else from here.
export const DEFAULT_SITE = {
  site: "my-site",
  style: "sophia",
  pages: {
    "/": {
      title: "My Site",
      blocks: [
        { id: "hero", type: "hero", fx: ["reveal-up"],
          headline: "Your site is ready",
          sub: "Create your admin account, then connect your AI to build it.",
          cta: { label: "Get started", href: "/_setup" } },
      ],
    },
  },
};
