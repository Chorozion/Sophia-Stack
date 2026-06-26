// dev-server-react.mjs — the real-time edit runtime, React edition.
//
// SSR the model -> serve HTML + hydrating client bundle. A patch POSTed to
// /patch is applied to the authoritative server model AND broadcast as ops over
// SSE; each client applies the same ops to its React state, so React reconciles
// and only the changed nodes touch the DOM. Requires `npm run build` first
// (produces dist/ssr.mjs + public/client.js).
import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ssr } from "../dist/ssr.mjs";
import { applyPatch } from "./patch.mjs";
import { pageHead } from "./styles.mjs";
import { resolveConnections } from "./connections.mjs";

const CLIENT_JS = fileURLToPath(new URL("../public/client.js", import.meta.url));

export async function createDevServer(initialModel, { port = 4321, route = "/", refreshMs = 15000 } = {}) {
  let model = initialModel;
  let data = await resolveConnections(model); // resolve before first SSR so it has real data
  const clients = new Set();
  const broadcast = (event) => {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    for (const r of clients) r.write(line);
  };

  // Keep bound data fresh and push it to live previews (backend stays live).
  const refresh = setInterval(async () => {
    if (clients.size === 0) return;
    try { data = await resolveConnections(model); broadcast({ type: "data", data }); } catch { /* keep last good */ }
  }, refreshMs);
  if (typeof refresh.unref === "function") refresh.unref();

  const renderShell = () => {
    const title = model?.pages?.[route]?.title || model.site || "Sophia";
    const html = ssr(model, route, data);
    const head = pageHead(model, route);
    const boot = JSON.stringify({ model, route, data }).replace(/</g, "\\u003c");
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${head}</head>
<body>
<div id="root">${html}</div>
<script>window.__SOPHIA__=${boot}</script>
<script src="/client.js"></script>
</body></html>`;
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderShell());
      return;
    }
    if (req.method === "GET" && url.pathname === "/client.js") {
      res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" });
      res.end(readFileSync(CLIENT_JS));
      return;
    }
    if (req.method === "GET" && url.pathname === "/live") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      res.write("event: hello\ndata: {}\n\n");
      clients.add(res);
      const ping = setInterval(() => res.write(": ping\n\n"), 20000);
      req.on("close", () => { clearInterval(ping); clients.delete(res); });
      return;
    }
    if (req.method === "GET" && url.pathname === "/model") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(model));
      return;
    }
    if (req.method === "GET" && url.pathname === "/data") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
      return;
    }
    if (req.method === "POST" && url.pathname === "/patch") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { ops } = JSON.parse(body || "{}");
          const { model: next, changed } = applyPatch(model, ops);
          model = next;
          broadcast({ type: "ops", ops });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, changed }));
        } catch (err) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: String(err.message || err) }));
        }
      });
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve({
      url: `http://localhost:${port}/`,
      getModel: () => model,
      patch: (ops) => { const r = applyPatch(model, ops); model = r.model; broadcast({ type: "ops", ops }); return r.changed; },
      getData: () => data,
      close: () => { clearInterval(refresh); server.close(); },
      port,
    }));
  });
}
