// entry-server.jsx — server-side render of a Site Model to HTML.
// Bundled by scripts/build.mjs into dist/ssr.mjs (react kept external).
import React from "react";
import { renderToString } from "react-dom/server";
import { SiteRenderer } from "./SiteRenderer.jsx";

export function ssr(model, route = "/", data = {}) {
  return renderToString(<SiteRenderer model={model} route={route} data={data} />);
}
