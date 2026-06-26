// default-site.mjs — the v1 Sophia Stack homepage a fresh deploy ships with:
// the brand logo, a two-line "what it is", and a Get started CTA. This IS the
// product's face; the owner's AI rebuilds from here.
const LOGO = `<svg viewBox="0 0 440 250" xmlns="http://www.w3.org/2000/svg" font-family="'Segoe UI',system-ui,sans-serif" style="width:100%;height:auto">
  <defs>
    <linearGradient id="cy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4DFFFF"/><stop offset="1" stop-color="#0066FF"/></linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12283f"/><stop offset="1" stop-color="#0A1628"/></linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect x="174" y="24" width="92" height="92" rx="24" fill="url(#tile)" stroke="url(#cy)" stroke-width="2.5"/>
  <rect x="196" y="46" width="48" height="12" rx="6" fill="url(#cy)" filter="url(#glow)"/>
  <rect x="196" y="64" width="48" height="12" rx="6" fill="#3a7bb5"/>
  <rect x="196" y="82" width="48" height="12" rx="6" fill="#24517a"/>
  <circle cx="252" cy="34" r="6.5" fill="#FF6B35"/>
  <text x="220" y="165" text-anchor="middle" font-size="38" font-weight="800" letter-spacing="1.5" fill="#e8f4f8">SOPHIA <tspan fill="#00D4FF">STACK</tspan></text>
  <text x="220" y="194" text-anchor="middle" font-size="11.5" letter-spacing="4.5" fill="#7d93a8">YOUR SITE &#183; BUILT BY AI &#183; OWNED BY YOU</text>
</svg>`;

export const DEFAULT_SITE = {
  site: "Sophia Stack",
  style: "sophia",
  pages: {
    "/": {
      title: "Sophia Stack",
      blocks: [
        { id: "logo", type: "html", html: `<div style="text-align:center;padding:46px 20px 4px"><div style="max-width:360px;margin:0 auto">${LOGO}</div></div>` },
        { id: "hero", type: "hero", fx: ["reveal-up"],
          headline: "Describe it. Your AI builds it. You own it.",
          sub: "Sophia Stack is a complete website you own — one upload to your own hosting, no developers and no monthly platform. Describe what you want in plain words and your site changes in real time.",
          cta: { label: "Get started", href: "/_setup" } },
        { id: "about", type: "html", html: `<div style="max-width:660px;margin:0 auto;padding:4px 24px 56px;text-align:center;color:#cfe6f0;font-size:17px;line-height:1.7">Any AI can run it with zero setup — ChatGPT, Claude, Grok — because the stack does the editing itself. A real app platform, not a template: pages, custom design, photos, video, even a database and backend. Every change is instant, validated, reversible, and the whole thing stays contained and yours.</div>` },
      ],
    },
  },
};
