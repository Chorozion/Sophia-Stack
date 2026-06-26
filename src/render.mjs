// render.mjs — expand a compact Site Model into real HTML.
//
// The Site Model is the product; this renderer is one (swappable) expansion of
// it. Each block renders inside a wrapper carrying data-sid="<id>" so the live
// runtime can replace a single node's DOM in place (real-time surgical edits).

const THEMES = {
  dark: {
    bg: "#0a0a0f", fg: "#e8e8f0", muted: "#9aa0b4", accent: "#6c8cff",
    card: "#141420", border: "#222233",
  },
  light: {
    bg: "#ffffff", fg: "#16161d", muted: "#5b6170", accent: "#3358ff",
    card: "#f5f6fa", border: "#e3e6ef",
  },
};

const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const BLOCKS = {
  nav: (b, t) => `
    <nav style="display:flex;align-items:center;justify-content:space-between;padding:18px 32px;border-bottom:1px solid ${t.border}">
      <span style="font-weight:700;letter-spacing:-.02em">${esc(b.brand)}</span>
      <span style="display:flex;gap:24px;color:${t.muted}">
        ${(b.links || []).map((l) => `<a href="#" style="color:inherit;text-decoration:none">${esc(l)}</a>`).join("")}
      </span>
    </nav>`,

  hero: (b, t) => `
    <section style="padding:96px 32px;text-align:center;max-width:820px;margin:0 auto">
      <h1 style="font-size:56px;line-height:1.05;letter-spacing:-.03em;margin:0 0 16px">${esc(b.headline)}</h1>
      <p style="font-size:20px;color:${t.muted};margin:0 0 32px">${esc(b.sub)}</p>
      ${b.cta ? `<a href="${esc(b.cta.href)}" style="display:inline-block;background:${t.accent};color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600">${esc(b.cta.label)}</a>` : ""}
    </section>`,

  features: (b, t) => `
    <section style="display:grid;grid-template-columns:repeat(${(b.items || []).length || 1},1fr);gap:20px;padding:32px;max-width:1000px;margin:0 auto">
      ${(b.items || []).map((it) => `
        <div style="background:${t.card};border:1px solid ${t.border};border-radius:14px;padding:24px">
          <h3 style="margin:0 0 8px;font-size:18px">${esc(it.t)}</h3>
          <p style="margin:0;color:${t.muted};font-size:15px">${esc(it.d)}</p>
        </div>`).join("")}
    </section>`,

  cta: (b, t) => `
    <section style="text-align:center;padding:80px 32px">
      <h2 style="font-size:34px;letter-spacing:-.02em;margin:0 0 24px">${esc(b.headline)}</h2>
      ${b.button ? `<a href="${esc(b.button.href)}" style="display:inline-block;background:${t.accent};color:#fff;padding:14px 30px;border-radius:10px;text-decoration:none;font-weight:600">${esc(b.button.label)}</a>` : ""}
    </section>`,

  footer: (b, t) => `
    <footer style="padding:32px;text-align:center;color:${t.muted};border-top:1px solid ${t.border}">${esc(b.text)}</footer>`,
};

const themeOf = (model) => THEMES[model.theme] || THEMES.dark;

function renderBlockInner(block, theme) {
  const fn = BLOCKS[block.type];
  if (!fn) throw new Error(`unknown block type: ${block.type} (id=${block.id})`);
  return fn(block, theme);
}

// One block, wrapped with its stable data-sid so the live runtime can swap it.
export function renderBlockWrapped(block, theme) {
  return `<div data-sid="${esc(block.id)}">${renderBlockInner(block, theme)}</div>`;
}

// Re-render a single node by id — used for surgical, real-time "set" updates.
export function renderNode(model, id, route = "/") {
  const block = (model.pages?.[route]?.blocks || []).find((b) => b.id === id);
  if (!block) throw new Error(`renderNode: no block ${id} on ${route}`);
  return renderBlockWrapped(block, themeOf(model));
}

// Just the body content (#app inner) — used for structural updates.
export function renderBodyInner(model, route = "/") {
  const page = model.pages?.[route];
  if (!page) throw new Error(`no page at route ${route}`);
  const theme = themeOf(model);
  return (page.blocks || []).map((b) => renderBlockWrapped(b, theme)).join("\n");
}

// Full HTML document. injectHead lets the dev server add its live-reload client.
export function renderPage(model, route = "/", { injectHead = "" } = {}) {
  const page = model.pages?.[route];
  if (!page) throw new Error(`no page at route ${route}`);
  const theme = themeOf(model);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(page.title || model.site)}</title>${injectHead}</head>
<body style="margin:0;background:${theme.bg};color:${theme.fg};font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
<div id="app">${renderBodyInner(model, route)}</div>
</body></html>`;
}

export const BLOCK_TYPES = Object.keys(BLOCKS);
