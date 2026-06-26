// sample-model.mjs — a landing page as a compact Site Model (shared by dev + tests).
export const SAMPLE = {
  site: "sophia-stack",
  style: "dark-tech",
  // Backend connections — named data sources blocks can bind to.
  connections: {
    labFeed: {
      type: "rest",
      url: "https://api.example.com/items",
      path: "events",
      limit: 5,
      pick: ["title", "kind"],
    },
  },
  pages: {
    "/": {
      title: "Sophia Stack",
      blocks: [
        { id: "nav", type: "nav", brand: "Sophia", links: ["Product", "Docs", "Pricing"] },
        { id: "hero", type: "hero", fx: ["reveal-up"],
          kicker: "AI-native web stack",
          headline: "Build websites the way AI thinks",
          sub: "An AI-optimized full-stack: build, connect, edit, and deploy at minimal token cost.",
          cta: { label: "Get started", href: "/start" } },
        { id: "logos", type: "logos", heading: "Trusted by teams shipping fast",
          items: ["Northwind", "Acme", "Helios", "Vantage", "Quanta"] },
        { id: "feat", type: "features", items: [
          { t: "Token-efficient", d: "Author whole sites in a compact, addressable model." },
          { t: "Real-time edits", d: "Surgical patches apply live — React reconciles." },
          { t: "Safe deploys", d: "Non-destructive releases with backup + rollback." },
        ] },
        { id: "stats", type: "stats", items: [
          { v: "10x", l: "cheaper edits" },
          { v: "0", l: "config to start" },
          { v: "1", l: "command to ship" },
        ] },
        { id: "steps", type: "steps", items: [
          { t: "Describe", d: "Write a compact Site Model — blocks, content, connections." },
          { t: "Connect", d: "Bind blocks to live backends with one line." },
          { t: "Ship", d: "Deploy safely; rollback anytime." },
        ] },
        // Data-bound block — live content from a backend connection.
        { id: "live", type: "feed", heading: "From the lab — live", connection: "labFeed", limit: 5 },
        { id: "quote", type: "quote",
          text: "It feels like the framework already knows what good looks like.",
          author: "An AI agent, probably" },
        { id: "pricing", type: "pricing", tiers: [
          { name: "Hobby", price: "$0", features: ["1 site", "Real-time edits", "Community"], cta: { label: "Start", href: "/start" } },
          { name: "Pro", price: "$19", features: ["Unlimited sites", "Connections", "Safe deploys"], cta: { label: "Go Pro", href: "/pro" } },
        ] },
        { id: "cta", type: "cta", headline: "Build with Sophia",
          button: { label: "Start free", href: "/start" } },
        { id: "foot", type: "footer", text: "(c) SOPHIA XT" },
      ],
    },
  },
};
