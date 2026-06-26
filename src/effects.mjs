// effects.mjs — the CSS effects catalog.
//
// A growing library of premium, composable visual effects. An AI references an
// effect by name on a block (`fx: ["glass","glow"]`); the renderer collects only
// the used effects and injects their CSS — so the page ships only what it uses.
// This is half of the "no-slop, wow by default" engine (presets are the other).
//
// Each effect contributes a `.fx-<name>` class (+ any @keyframes, uniquely named).

export const EFFECTS = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  glass: `.fx-glass{background:rgba(255,255,255,.06);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.12);box-shadow:0 8px 40px rgba(0,0,0,.35)}`,
  glow: `.fx-glow{box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 40%,transparent),0 0 48px color-mix(in srgb,var(--accent) 35%,transparent)}`,
  "neon-border": `.fx-neon-border{border:1px solid var(--accent);box-shadow:inset 0 0 18px color-mix(in srgb,var(--accent) 25%,transparent),0 0 18px color-mix(in srgb,var(--accent) 45%,transparent)}`,
  "inner-glow": `.fx-inner-glow{box-shadow:inset 0 1px 0 rgba(255,255,255,.08),inset 0 0 60px color-mix(in srgb,var(--accent) 10%,transparent)}`,
  "soft-shadow": `.fx-soft-shadow{box-shadow:0 24px 60px -20px rgba(0,0,0,.5)}`,
  "animated-border": `@keyframes sx-spin-border{to{--sx-ang:360deg}}@property --sx-ang{syntax:'<angle>';inherits:false;initial-value:0deg}.fx-animated-border{position:relative;isolation:isolate}.fx-animated-border::before{content:"";position:absolute;inset:-1px;border-radius:inherit;padding:1px;background:conic-gradient(from var(--sx-ang),transparent,var(--accent),transparent 30%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:sx-spin-border 4s linear infinite;z-index:-1}`,

  // ── Backgrounds ───────────────────────────────────────────────────────────
  "aurora-bg": `@keyframes sx-aurora{0%,100%{transform:translate(-10%,-10%) rotate(0)}50%{transform:translate(10%,10%) rotate(20deg)}}.fx-aurora-bg{position:relative;overflow:hidden;isolation:isolate}.fx-aurora-bg::before{content:"";position:absolute;inset:-40%;z-index:-1;background:radial-gradient(40% 40% at 30% 30%,color-mix(in srgb,var(--accent) 55%,transparent),transparent),radial-gradient(40% 40% at 70% 60%,color-mix(in srgb,var(--accent2,#b06cff) 50%,transparent),transparent);filter:blur(60px);animation:sx-aurora 18s ease-in-out infinite}`,
  grain: `.fx-grain{position:relative}.fx-grain::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.05;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}`,
  "grid-bg": `.fx-grid-bg{background-image:linear-gradient(color-mix(in srgb,var(--fg) 7%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--fg) 7%,transparent) 1px,transparent 1px);background-size:44px 44px}`,
  "dot-bg": `.fx-dot-bg{background-image:radial-gradient(color-mix(in srgb,var(--fg) 12%,transparent) 1px,transparent 1px);background-size:22px 22px}`,
  "spotlight-bg": `.fx-spotlight-bg{background:radial-gradient(60% 60% at 50% 0%,color-mix(in srgb,var(--accent) 22%,transparent),transparent)}`,

  // ── Text ──────────────────────────────────────────────────────────────────
  "gradient-text": `.fx-gradient-text{background:linear-gradient(120deg,var(--fg),var(--accent));-webkit-background-clip:text;background-clip:text;color:transparent}`,
  shimmer: `@keyframes sx-shimmer{to{background-position:200% center}}.fx-shimmer{background:linear-gradient(90deg,var(--fg) 30%,var(--accent),var(--fg) 70%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sx-shimmer 4s linear infinite}`,

  // ── Motion ────────────────────────────────────────────────────────────────
  "reveal-up": `@keyframes sx-reveal{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}.fx-reveal-up{animation:sx-reveal .7s cubic-bezier(.2,.7,.2,1) both}`,
  float: `@keyframes sx-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.fx-float{animation:sx-float 5s ease-in-out infinite}`,
  pulse: `@keyframes sx-pulse{0%,100%{box-shadow:0 0 0 0 color-mix(in srgb,var(--accent) 50%,transparent)}50%{box-shadow:0 0 0 14px transparent}}.fx-pulse{animation:sx-pulse 2.6s ease-out infinite}`,
  tilt: `.fx-tilt{transition:transform .25s ease}.fx-tilt:hover{transform:perspective(800px) rotateX(4deg) rotateY(-4deg) translateY(-4px)}`,
  shine: `.fx-shine{position:relative;overflow:hidden}.fx-shine::after{content:"";position:absolute;top:0;left:-150%;width:60%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.18),transparent);transform:skewX(-20deg);transition:left .6s}.fx-shine:hover::after{left:150%}`,
  "lift-hover": `.fx-lift-hover{transition:transform .2s ease,box-shadow .2s ease}.fx-lift-hover:hover{transform:translateY(-4px);box-shadow:0 18px 50px -16px rgba(0,0,0,.55)}`,
};

export const EFFECT_NAMES = Object.keys(EFFECTS);

// Combine CSS for the given effect names (deduped, only what's used).
export function collectEffectCss(names = []) {
  const seen = new Set();
  let css = "";
  for (const n of names) {
    if (seen.has(n) || !EFFECTS[n]) continue;
    seen.add(n);
    css += EFFECTS[n] + "\n";
  }
  return css;
}
