// entry-client.jsx — hydrate the SSR'd tree and wire real-time edits.
//
// The client holds the Site Model in React state and subscribes to /live. When
// a patch arrives it applies the same ops the server applied, then React
// reconciles — so only the changed nodes touch the DOM. No reload, no rebuild.
//
// VEX: when loaded as the builder's preview pane (?vex=1), it also accepts
// optimistic preview ops from the parent dashboard via postMessage, and it
// briefly highlights whatever blocks just changed.
import React, { useState, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { SiteRenderer } from "./SiteRenderer.jsx";
import { applyPatch } from "./patch.mjs";

const VEX_STYLE = "@keyframes vexflash{0%{outline-color:#00D4FF;background:rgba(0,212,255,.10)}100%{outline-color:transparent;background:transparent}}.vex-changed{outline:2px solid #00D4FF;outline-offset:3px;border-radius:6px;animation:vexflash 1.3s ease-out}";

function changedIds(ops) {
  const ids = new Set();
  for (const o of ops || []) if (o && o.id) ids.add(o.id);
  return [...ids];
}
function flash(ids) {
  for (const id of ids || []) {
    let el; try { el = document.querySelector(`[data-sid="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`); } catch { el = null; }
    if (!el) continue;
    el.classList.remove("vex-changed"); void el.offsetWidth; el.classList.add("vex-changed");
    setTimeout(() => { if (el) el.classList.remove("vex-changed"); }, 1400);
  }
}

function App({ initialModel, initialData, route }) {
  const [model, setModel] = useState(initialModel);
  const [data, setData] = useState(initialData || {});
  const vex = typeof location !== "undefined" && new URLSearchParams(location.search).get("vex");

  useEffect(() => {
    const es = new EventSource("/live");
    es.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m && m.type === "ops") { setModel((cur) => applyPatch(cur, m.ops).model); flash(changedIds(m.ops)); }
      else if (m && m.type === "model") setModel(m.model);   // full swap (rollback)
      else if (m && m.type === "data") setData(m.data);
      else if (m && m.type === "css") {
        // Live CSS editor: replace the custom layer in place (no reload).
        let el = document.getElementById("sx-custom-live");
        if (!el) { el = document.createElement("style"); el.id = "sx-custom-live"; document.head.appendChild(el); }
        el.textContent = m.css || "";
      }
    };
    return () => es.close();
  }, [route]);

  // VEX preview pane: accept optimistic ops from the parent dashboard (same-origin only).
  useEffect(() => {
    if (!vex) return;
    const s = document.createElement("style"); s.textContent = VEX_STYLE; document.head.appendChild(s);
    const onMsg = (e) => {
      if (e.origin !== location.origin) return;
      const d = e.data || {};
      if (d.__vex === "preview") {
        if (Array.isArray(d.ops) && d.ops.length) { setModel((cur) => applyPatch(cur, d.ops).model); flash(changedIds(d.ops)); }
        if (typeof d.css === "string") { let el = document.getElementById("sx-custom-live"); if (!el) { el = document.createElement("style"); el.id = "sx-custom-live"; document.head.appendChild(el); } el.textContent = d.css; }
      } else if (d.__vex === "reset") location.reload();
    };
    window.addEventListener("message", onMsg);
    try { window.parent.postMessage({ __vex: "ready" }, location.origin); } catch {}
    return () => window.removeEventListener("message", onMsg);
  }, [vex]);

  return <SiteRenderer model={model} route={route} data={data} />;
}

const boot = window.__SOPHIA__ || { model: { pages: {} }, route: "/", data: {} };
hydrateRoot(
  document.getElementById("root"),
  <App initialModel={boot.model} initialData={boot.data} route={boot.route} />
);
