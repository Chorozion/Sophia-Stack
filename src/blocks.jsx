// blocks.jsx — block vocabulary as React components.
//
// Blocks emit STRUCTURE + semantic classNames (sx-*). They carry no look of
// their own — the active style PRESET supplies all visuals via those classes,
// so one Site Model renders as radically different premium designs per preset.
// Author-chosen effects (block.fx) are applied to the wrapper by SiteRenderer.
import React from "react";

export function Nav({ brand, links = [] }) {
  return (
    <nav className="sx-nav">
      <span className="sx-brand">{brand}</span>
      <span className="sx-links">
        {links.map((l, i) => (<a key={i} href="#" className="sx-link">{l}</a>))}
      </span>
    </nav>
  );
}

export function Hero({ headline, sub, cta, kicker, bg, image }) {
  const src = bg || image;
  const style = src ? { backgroundImage: "linear-gradient(rgba(8,16,26,.5),rgba(8,16,26,.55)), url(" + src + ")", backgroundSize: "cover", backgroundPosition: "center" } : undefined;
  return (
    <section className={"sx-hero" + (src ? " sx-hero-bg" : "")} style={style}>
      {kicker && <span className="sx-kicker">{kicker}</span>}
      <h1 className="sx-h1">{headline}</h1>
      {sub && <p className="sx-sub">{sub}</p>}
      {cta && <a href={cta.href} className="sx-btn sx-btn-primary">{cta.label}</a>}
    </section>
  );
}

export function Features({ items = [] }) {
  return (
    <section className="sx-features">
      {items.map((it, i) => (
        <div key={i} className="sx-card">
          <h3 className="sx-card-t">{it.t}</h3>
          <p className="sx-card-d">{it.d}</p>
        </div>
      ))}
    </section>
  );
}

export function Cta({ headline, button }) {
  return (
    <section className="sx-cta">
      <h2 className="sx-cta-h">{headline}</h2>
      {button && <a href={button.href} className="sx-btn sx-btn-primary">{button.label}</a>}
    </section>
  );
}

export function Footer({ text }) {
  return <footer className="sx-foot">{text}</footer>;
}

// Data-bound block — renders items from a backend connection (block.connection).
export function Feed({ heading, _data, limit = 5 }) {
  const error = _data && !Array.isArray(_data) ? _data.error : null;
  const items = Array.isArray(_data) ? _data.slice(0, limit) : [];
  return (
    <section className="sx-feed">
      {heading && <h2 className="sx-feed-h">{heading}</h2>}
      {error ? (
        <p className="sx-feed-err">connection error: {String(error)}</p>
      ) : items.length === 0 ? (
        <p className="sx-feed-empty">no data yet</p>
      ) : (
        <div className="sx-feed-list">
          {items.map((it, i) => (
            <div key={i} className="sx-feed-item">
              <span className="sx-kind">{it.kind || "event"}</span>
              <div className="sx-feed-title">{it.title}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function Stats({ items = [] }) {
  return (
    <section className="sx-stats">
      {items.map((it, i) => (
        <div key={i} className="sx-stat">
          <div className="sx-stat-v">{it.v}</div>
          <div className="sx-stat-l">{it.l}</div>
        </div>
      ))}
    </section>
  );
}

export function Logos({ heading, items = [] }) {
  return (
    <section className="sx-logos">
      {heading && <span className="sx-logos-h">{heading}</span>}
      <div className="sx-logos-row">
        {items.map((l, i) => (<span key={i} className="sx-logo">{l}</span>))}
      </div>
    </section>
  );
}

export function Steps({ items = [] }) {
  return (
    <section className="sx-steps">
      {items.map((it, i) => (
        <div key={i} className="sx-step">
          <div className="sx-step-n">{i + 1}</div>
          <h3 className="sx-step-t">{it.t}</h3>
          <p className="sx-step-d">{it.d}</p>
        </div>
      ))}
    </section>
  );
}

export function Pricing({ tiers = [] }) {
  return (
    <section className="sx-pricing">
      {tiers.map((t, i) => (
        <div key={i} className="sx-tier">
          <div className="sx-tier-name">{t.name}</div>
          <div className="sx-tier-price">{t.price}</div>
          <ul className="sx-tier-feats">
            {(t.features || []).map((f, j) => (<li key={j}>{f}</li>))}
          </ul>
          {t.cta && <a href={t.cta.href} className="sx-btn sx-btn-primary">{t.cta.label}</a>}
        </div>
      ))}
    </section>
  );
}

export function Quote({ text, author }) {
  return (
    <section className="sx-quote">
      <p className="sx-quote-t">{text}</p>
      {author && <span className="sx-quote-a">{author}</span>}
    </section>
  );
}

// Fully-custom block: raw HTML + CSS + JS the agent authors. This is the escape
// hatch to "build anything" — custom markup, custom styles, custom client logic.
// It runs in the owner's OWN self-hosted site (their risk, per SECURITY.md); the
// framework core stays immutable regardless.
export function Html({ html = "", css, js }) {
  React.useEffect(() => {
    if (!js) return;
    try { new Function(js)(); } catch (e) { console.error("[sophia] custom js error:", e); }
  }, [js]);
  return (
    <section className="sx-html">
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </section>
  );
}

export const BLOCKS = {
  nav: Nav, hero: Hero, features: Features, cta: Cta, footer: Footer, feed: Feed,
  stats: Stats, logos: Logos, steps: Steps, pricing: Pricing, quote: Quote,
  html: Html,
};
export const BLOCK_TYPES = Object.keys(BLOCKS);
