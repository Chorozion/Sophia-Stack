// styles.mjs — baked-in design "skills": a token-driven design system.
//
// SX_CORE styles every block's semantic classes (sx-*) using DESIGN TOKENS
// (CSS vars). A PRESET is just a small token set (+ optional signature CSS for
// character). So: one Site Model -> radically different premium designs by name;
// new presets are cheap (tokens only); new components are added once in SX_CORE
// and work across every preset. Author effects (block.fx) layer on top.
import { collectEffectCss } from "./effects.mjs";

const RESET = `*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}a{text-decoration:none;color:inherit}img{max-width:100%}.sx-node{display:block}.sx-unknown{padding:16px;color:#f66}`;

// Token-driven styles for ALL blocks. Tokens (set per preset on :root):
// --bg --fg --muted --accent --accent2 --card --border --radius --shadow
// --font-display --font-body --btn-bg --btn-fg --btn-radius --maxw
// --hero-align --sub-mx --head-transform
const SX_CORE = `
body{background:var(--bg);color:var(--fg);font-family:var(--font-body);line-height:1.55;min-height:100vh}
.sx-nav{display:flex;align-items:center;justify-content:space-between;padding:18px 32px;border-bottom:1px solid var(--border);position:sticky;top:0;background:color-mix(in srgb,var(--bg) 80%,transparent);backdrop-filter:blur(8px);z-index:10}
.sx-brand{font-family:var(--font-display);font-weight:700;font-size:20px;text-transform:var(--head-transform,none)}
.sx-links{display:flex;gap:26px}.sx-link{color:var(--muted);font-size:14px;font-weight:500;transition:color .2s}.sx-link:hover{color:var(--accent)}
.sx-hero{position:relative;padding:114px 32px 84px;max-width:var(--maxw);margin:0 auto;text-align:var(--hero-align,center);overflow:hidden}
.sx-hero-bg{border-radius:18px;min-height:440px;display:flex;flex-direction:column;justify-content:center;align-items:center;color:#fff;margin-top:10px;box-shadow:0 18px 54px rgba(0,0,0,.2)}
.sx-hero-bg .sx-h1,.sx-hero-bg .sx-sub{color:#fff;-webkit-text-fill-color:#fff;background:none;text-shadow:0 2px 18px rgba(0,0,0,.35)}
.sx-hero-bg::before{display:none}
.sx-kicker{display:inline-block;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);border:1px solid var(--border);border-radius:999px;padding:6px 14px;margin-bottom:22px}
.sx-h1{font-family:var(--font-display);font-weight:700;font-size:clamp(42px,6.4vw,74px);line-height:1.03;letter-spacing:-.03em;margin:0 0 18px;color:var(--fg);text-transform:var(--head-transform,none)}
.sx-sub{font-size:clamp(17px,2vw,21px);color:var(--muted);max-width:60ch;margin:0 var(--sub-mx,0) 32px}
.sx-btn{display:inline-block;font-weight:600;font-size:15px;padding:14px 28px;border-radius:var(--btn-radius,12px);transition:transform .15s,box-shadow .15s,background .2s}
.sx-btn-primary{color:var(--btn-fg,#fff);background:var(--btn-bg,var(--accent));box-shadow:var(--btn-shadow,none)}.sx-btn-primary:hover{transform:translateY(-2px)}
.sx-features{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;max-width:var(--maxw);margin:0 auto;padding:42px 32px}
.sx-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:26px;box-shadow:var(--shadow);transition:transform .2s,box-shadow .2s}.sx-card:hover{transform:translateY(-4px)}
.sx-card-t{font-family:var(--font-display);margin:0 0 8px;font-size:18px;font-weight:600}.sx-card-d{margin:0;color:var(--muted);font-size:15px}
.sx-cta{position:relative;text-align:center;padding:90px 32px}
.sx-cta-h{font-family:var(--font-display);font-weight:700;font-size:clamp(28px,4vw,42px);letter-spacing:-.02em;margin:0 0 26px;text-transform:var(--head-transform,none)}
.sx-stats{display:flex;flex-wrap:wrap;gap:48px;justify-content:center;max-width:var(--maxw);margin:0 auto;padding:46px 32px;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}
.sx-stat{text-align:center}.sx-stat-v{font-family:var(--font-display);font-weight:700;font-size:clamp(30px,5vw,52px);line-height:1;color:var(--accent)}.sx-stat-l{margin-top:8px;color:var(--muted);font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.sx-logos{text-align:center;padding:40px 32px}.sx-logos-h{display:block;color:var(--muted);font-size:12px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:18px}.sx-logos-row{display:flex;flex-wrap:wrap;gap:36px;justify-content:center;align-items:center}.sx-logo{font-family:var(--font-display);font-weight:700;font-size:19px;color:var(--fg);opacity:.55}
.sx-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;max-width:var(--maxw);margin:0 auto;padding:46px 32px}
.sx-step{position:relative;padding-left:8px}.sx-step-n{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:var(--radius);background:var(--card);border:1px solid var(--border);color:var(--accent);font-family:var(--font-display);font-weight:700;margin-bottom:14px}.sx-step-t{font-family:var(--font-display);font-weight:600;font-size:17px;margin:0 0 6px}.sx-step-d{margin:0;color:var(--muted);font-size:15px}
.sx-pricing{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;max-width:var(--maxw);margin:0 auto;padding:46px 32px}
.sx-tier{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);padding:30px}.sx-tier-name{font-family:var(--font-display);font-weight:600;font-size:16px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted)}.sx-tier-price{font-family:var(--font-display);font-weight:700;font-size:42px;margin:10px 0 18px}.sx-tier-feats{list-style:none;margin:0 0 22px;padding:0}.sx-tier-feats li{color:var(--muted);font-size:15px;padding:6px 0;border-bottom:1px solid var(--border)}
.sx-quote{max-width:760px;margin:0 auto;padding:70px 32px;text-align:center}.sx-quote-t{font-family:var(--font-display);font-size:clamp(22px,3vw,30px);line-height:1.4;letter-spacing:-.01em;margin:0 0 20px}.sx-quote-a{color:var(--muted);font-size:14px;letter-spacing:.08em;text-transform:uppercase}
.sx-feed{max-width:var(--maxw);margin:0 auto;padding:30px 32px 56px}.sx-feed-h{font-family:var(--font-display);font-weight:700;font-size:24px;letter-spacing:-.01em;margin:0 0 20px;text-transform:var(--head-transform,none)}
.sx-feed-list{display:grid;gap:12px}.sx-feed-item{display:flex;align-items:center;gap:14px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:14px 18px}
.sx-kind{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);border-radius:6px;padding:4px 8px;white-space:nowrap}.sx-feed-title{font-size:15px}
.sx-foot{text-align:center;color:var(--muted);padding:36px;border-top:1px solid var(--border);font-size:14px}`;

const G = "https://fonts.googleapis.com/css2?";

// Each preset: { label, fonts:[urls], vars:":root token css", sig:"signature overrides" }
export const PRESETS = {
  sophia: {
    label: "Sophia",
    fonts: [G + "family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"],
    vars: `--bg:#0A1628;--fg:#e8f4f8;--muted:#7d93a8;--accent:#00D4FF;--accent2:#0066FF;--card:rgba(0,212,255,.05);--border:rgba(0,212,255,.18);--radius:14px;--shadow:0 18px 50px -24px rgba(0,0,0,.7);--font-display:'Space Grotesk',Inter,sans-serif;--font-body:Inter,system-ui,sans-serif;--btn-bg:linear-gradient(120deg,#00D4FF,#0066FF);--btn-fg:#04121a;--btn-shadow:0 8px 30px -6px rgba(0,212,255,.5);--maxw:1080px;--sub-mx:auto`,
    sig: `body{background:radial-gradient(120% 80% at 50% -10%,#0d2036,transparent),var(--bg)}.sx-brand,.sx-h1,.sx-cta-h{background:linear-gradient(120deg,var(--fg) 40%,var(--accent));-webkit-background-clip:text;background-clip:text;color:transparent}.sx-card{backdrop-filter:blur(8px)}.sx-card:hover{border-color:var(--accent);box-shadow:0 0 36px -8px rgba(0,212,255,.4)}.sx-kicker{color:#FF6B35;border-color:rgba(255,107,53,.4)}.sx-stat-v{color:var(--accent)}.sx-hero::before{content:"";position:absolute;inset:-30% -20% auto;height:520px;z-index:-1;background:radial-gradient(40% 50% at 30% 30%,rgba(0,212,255,.35),transparent),radial-gradient(40% 50% at 70% 40%,rgba(255,107,53,.22),transparent);filter:blur(72px)}`,
  },
  "dark-tech": {
    label: "Dark Tech",
    fonts: [G + "family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"],
    vars: `--bg:#070710;--fg:#eef0f8;--muted:#9aa0b8;--accent:#7c8cff;--accent2:#c06cff;--card:rgba(255,255,255,.04);--border:rgba(255,255,255,.10);--radius:16px;--shadow:0 18px 50px -24px rgba(0,0,0,.6);--font-display:'Space Grotesk',Inter,sans-serif;--font-body:Inter,system-ui,sans-serif;--btn-bg:linear-gradient(120deg,#7c8cff,#c06cff);--btn-fg:#fff;--btn-shadow:0 8px 30px -6px rgba(124,140,255,.6);--maxw:1080px;--sub-mx:auto`,
    sig: `body{background:radial-gradient(120% 80% at 50% -10%,#15152e,transparent),var(--bg)}.sx-brand,.sx-h1,.sx-cta-h{background:linear-gradient(120deg,var(--fg) 42%,var(--accent));-webkit-background-clip:text;background-clip:text;color:transparent}.sx-card{backdrop-filter:blur(8px)}.sx-card:hover{border-color:color-mix(in srgb,var(--accent) 50%,var(--border))}.sx-hero::before{content:"";position:absolute;inset:-30% -20% auto;height:520px;z-index:-1;background:radial-gradient(40% 50% at 30% 30%,color-mix(in srgb,var(--accent) 45%,transparent),transparent),radial-gradient(40% 50% at 70% 40%,color-mix(in srgb,var(--accent2) 42%,transparent),transparent);filter:blur(72px)}`,
  },
  editorial: {
    label: "Editorial",
    fonts: [G + "family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Spectral:wght@400;500&display=swap"],
    vars: `--bg:#f6f2ea;--fg:#1c1814;--muted:#6e655a;--accent:#a83b2c;--accent2:#a83b2c;--card:#fffdf8;--border:#e0d8c8;--radius:2px;--shadow:none;--font-display:'Fraunces',serif;--font-body:'Spectral',Georgia,serif;--btn-bg:#1c1814;--btn-fg:#f6f2ea;--btn-radius:2px;--maxw:1080px;--hero-align:left;--sub-mx:0`,
    sig: `.sx-hero{padding-top:96px}.sx-h1{max-width:14ch}.sx-features{border-top:1px solid var(--border)}.sx-card{background:none;box-shadow:none;border:none;border-right:1px solid var(--border);border-radius:0;padding-left:0}.sx-card:hover{transform:none}.sx-card:last-child{border-right:none}.sx-btn-primary:hover{background:var(--accent)}.sx-link{letter-spacing:.12em;text-transform:uppercase;font-size:13px}`,
  },
  brutalist: {
    label: "Brutalist",
    fonts: [G + "family=Archivo+Black&family=Space+Mono:wght@400;700&display=swap"],
    vars: `--bg:#f5f5f0;--fg:#0a0a0a;--muted:#444;--accent:#ff3c00;--accent2:#ff3c00;--card:#fff;--border:#0a0a0a;--radius:0;--shadow:6px 6px 0 #0a0a0a;--font-display:'Archivo Black',sans-serif;--font-body:'Space Mono',monospace;--btn-bg:#ff3c00;--btn-fg:#fff;--btn-radius:0;--btn-shadow:6px 6px 0 #0a0a0a;--maxw:1100px;--head-transform:uppercase;--hero-align:left;--sub-mx:0`,
    sig: `.sx-nav{border-bottom-width:3px}.sx-card{border-width:3px}.sx-tier{border-width:3px}.sx-btn-primary{border:3px solid var(--fg)}.sx-btn-primary:hover{transform:translate(3px,3px);box-shadow:3px 3px 0 var(--fg)}.sx-link:hover{border-bottom:2px solid var(--accent)}`,
  },
  soft: {
    label: "Soft / Luxury",
    fonts: [G + "family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"],
    vars: `--bg:#fbf7f4;--fg:#2a2420;--muted:#8a7f76;--accent:#c08552;--accent2:#e0a96d;--card:#ffffff;--border:#efe7e0;--radius:22px;--shadow:0 24px 60px -28px rgba(120,90,60,.35);--font-display:'Plus Jakarta Sans',system-ui,sans-serif;--font-body:'Plus Jakarta Sans',system-ui,sans-serif;--btn-bg:linear-gradient(120deg,#c08552,#e0a96d);--btn-fg:#fff;--btn-radius:999px;--btn-shadow:0 10px 30px -8px rgba(192,133,82,.5);--maxw:1060px;--sub-mx:auto`,
    sig: `body{background:radial-gradient(100% 60% at 50% 0%,#fff,transparent),var(--bg)}.sx-card:hover{box-shadow:0 30px 70px -28px rgba(120,90,60,.4)}`,
  },
  neon: {
    label: "Neon / Cyber",
    fonts: [G + "family=Orbitron:wght@500;700&family=Rajdhani:wght@400;500;600&display=swap"],
    vars: `--bg:#05060a;--fg:#d6f5ff;--muted:#6f8aa0;--accent:#22e3ff;--accent2:#ff2bd6;--card:rgba(34,227,255,.05);--border:rgba(34,227,255,.22);--radius:8px;--shadow:0 0 30px -6px rgba(34,227,255,.35);--font-display:'Orbitron',sans-serif;--font-body:'Rajdhani',system-ui,sans-serif;--btn-bg:linear-gradient(120deg,#22e3ff,#ff2bd6);--btn-fg:#04121a;--btn-radius:8px;--btn-shadow:0 0 24px -2px rgba(34,227,255,.6);--maxw:1080px;--head-transform:uppercase;--sub-mx:auto`,
    sig: `body{background:linear-gradient(rgba(34,227,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(34,227,255,.04) 1px,transparent 1px) ,var(--bg);background-size:42px 42px,42px 42px,auto}.sx-h1{text-shadow:0 0 28px rgba(34,227,255,.5)}.sx-card:hover{border-color:var(--accent);box-shadow:0 0 36px -6px rgba(34,227,255,.5)}.sx-stat-v{text-shadow:0 0 24px rgba(34,227,255,.5)}`,
  },
  minimal: {
    label: "Minimal / Swiss",
    fonts: [G + "family=Inter:wght@400;500;600;700&display=swap"],
    vars: `--bg:#ffffff;--fg:#111111;--muted:#777;--accent:#111111;--accent2:#111111;--card:#fff;--border:#e8e8e8;--radius:0;--shadow:none;--font-display:Inter,system-ui,sans-serif;--font-body:Inter,system-ui,sans-serif;--btn-bg:#111;--btn-fg:#fff;--btn-radius:0;--maxw:980px;--hero-align:left;--sub-mx:0`,
    sig: `.sx-hero{padding-top:130px;padding-bottom:100px}.sx-h1{font-weight:600;letter-spacing:-.04em}.sx-card{padding-left:0;border:none;border-top:2px solid var(--fg)}.sx-card:hover{transform:none}.sx-kicker{border:none;padding-left:0;color:var(--muted)}.sx-stat-v{color:var(--fg)}`,
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);

// Assemble <head> CSS for a page: fonts + reset + core + preset tokens/sig + used
// effects, plus a SEPARATE live-editable custom CSS layer (id=sx-custom-live) the
// running stack can update in real time (CSS editor, no redeploy).
// Render SEO metadata into <head>. Merges site-wide `model.seo` defaults with
// per-page `pages.<route>.seo`. All values are escaped; JSON-LD is script-safe.
export function seoTags(model, route = "/", opts = {}) {
  const e = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const site = (model && model.seo) || {};
  const page = (model && model.pages && model.pages[route] && model.pages[route].seo) || {};
  const pick = (k) => (page[k] !== undefined ? page[k] : site[k]);
  const title = opts.title || (model && model.pages && model.pages[route] && model.pages[route].title) || (model && model.site) || "";
  const desc = pick("description");
  const canonical = page.canonical || site.canonical || (opts.origin ? String(opts.origin).replace(/\/$/, "") + route : null);
  const og = { title, description: desc, ...(site.openGraph || {}), ...(page.openGraph || {}) };
  const tw = { ...(site.twitter || {}), ...(page.twitter || {}) };
  const out = [];
  if (desc) out.push(`<meta name="description" content="${e(desc)}">`);
  const robots = pick("robots");
  if (robots) out.push(`<meta name="robots" content="${e(robots)}">`);
  if (canonical) out.push(`<link rel="canonical" href="${e(canonical)}">`);
  if (og.title) out.push(`<meta property="og:title" content="${e(og.title)}">`);
  if (og.description) out.push(`<meta property="og:description" content="${e(og.description)}">`);
  out.push(`<meta property="og:type" content="${e(og.type || "website")}">`);
  if (canonical) out.push(`<meta property="og:url" content="${e(canonical)}">`);
  if (og.image) out.push(`<meta property="og:image" content="${e(og.image)}">`);
  if (og.siteName || (model && model.site)) out.push(`<meta property="og:site_name" content="${e(og.siteName || model.site)}">`);
  out.push(`<meta name="twitter:card" content="${e(tw.card || (og.image ? "summary_large_image" : "summary"))}">`);
  if (og.title) out.push(`<meta name="twitter:title" content="${e(og.title)}">`);
  if (og.description) out.push(`<meta name="twitter:description" content="${e(og.description)}">`);
  if (og.image) out.push(`<meta name="twitter:image" content="${e(og.image)}">`);
  if (tw.site) out.push(`<meta name="twitter:site" content="${e(tw.site)}">`);
  for (const node of [].concat(site.jsonLd || [], page.jsonLd || []).filter(Boolean)) {
    try { out.push(`<script type="application/ld+json">${JSON.stringify(node).replace(/</g, "\\u003c")}</script>`); } catch {}
  }
  return out.join("");
}

export function pageHead(model, route = "/", customCss = "", opts = {}) {
  const preset = PRESETS[model?.style] || PRESETS["sophia"];
  const used = new Set();
  for (const b of model?.pages?.[route]?.blocks || []) (b.fx || []).forEach((f) => used.add(f));
  const fxCss = collectEffectCss([...used]);
  const fonts = (preset.fonts || [])
    .map((h) => `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${h}">`)
    .join("");
  const safeCustom = String(customCss || "").replace(/<\/style/gi, "<\\/style");
  return `${seoTags(model, route, opts)}${fonts}<style>${RESET}\n${SX_CORE}\n:root{${preset.vars}}\n${preset.sig || ""}\n${fxCss}</style>` +
    `<style id="sx-custom-live">${safeCustom}</style>`;
}
