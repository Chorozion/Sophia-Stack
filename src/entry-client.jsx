// entry-client.jsx — hydrate the SSR'd tree and wire real-time edits.
//
// The client holds the Site Model in React state and subscribes to /live. When
// a patch arrives it applies the same ops the server applied, then React
// reconciles — so only the changed nodes touch the DOM. No reload, no rebuild.
import React, { useState, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { SiteRenderer } from "./SiteRenderer.jsx";
import { applyPatch } from "./patch.mjs";

function App({ initialModel, initialData, route }) {
  const [model, setModel] = useState(initialModel);
  const [data, setData] = useState(initialData || {});
  useEffect(() => {
    const es = new EventSource("/live");
    es.onmessage = (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch { return; }
      if (m && m.type === "ops") setModel((cur) => applyPatch(cur, m.ops).model);
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
  return <SiteRenderer model={model} route={route} data={data} />;
}

const boot = window.__SOPHIA__ || { model: { pages: {} }, route: "/", data: {} };
hydrateRoot(
  document.getElementById("root"),
  <App initialModel={boot.model} initialData={boot.data} route={boot.route} />
);
