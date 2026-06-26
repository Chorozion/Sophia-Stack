// dev-server.mjs — the real-time edit runtime.
//
// Holds the Site Model in memory and serves a live preview. A patch POSTed to
// /patch is applied to the model, then the server pushes ONLY the changed nodes
// to every connected browser over SSE — the browser swaps those DOM nodes in
// place (no reload, no rebuild). Structural edits (add/remove/move) push the
// rebuilt body. This is "real-time edits": read compact model -> small patch ->
// instant surgical update.

import http from "node:http";
import { renderPage, renderNode, renderBodyInner } from "./render.mjs";
import { applyPatch } from "./patch.mjs";

const CLIENT = `
<script>
(() => {
  const flash = (el) => {
    if (!el || !el.style) return;
    el.style.transition = "box-shadow .15s";
    el.style.boxShadow = "0 0 0 2px #6c8cff, 0 0 24px #6c8cff88";
    setTimeout(() => { el.style.boxShadow = "none"; }, 500);
  };
  const es = new EventSource("/live");
  es.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.type === "nodes") {
      for (const n of m.nodes) {
        const el = document.querySelector('[data-sid="' + n.id + '"]');
        if (el) { el.outerHTML = n.html; flash(document.querySelector('[data-sid="' + n.id + '"]')); }
      }
    } else if (m.type === "body") {
      document.getElementById("app").innerHTML = m.html;
    }
  };
  es.addEventListener("hello", () => console.log("[sophia] live runtime connected"));
})();
</script>`;

export function createDevServer(initialModel, { port = 4321, route = "/" } = {}) {
  let model = initialModel;
  const clients = new Set();

  const broadcast = (event) => {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of clients) res.write(line);
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(renderPage(model, route, { injectHead: CLIENT }));
      return;
    }

    if (req.method === "GET" && url.pathname === "/live") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("event: hello\ndata: {}\n\n");
      clients.add(res);
      const ping = setInterval(() => res.write(": ping\n\n"), 20000);
      req.on("close", () => { clearInterval(ping); clients.delete(res); });
      return;
    }

    // Read the current model cheaply (for an agent loading context).
    if (req.method === "GET" && url.pathname === "/model") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(model));
      return;
    }

    // Apply a patch and push surgical updates to all live previews.
    if (req.method === "POST" && url.pathname === "/patch") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { ops } = JSON.parse(body || "{}");
          const { model: next, changed } = applyPatch(model, ops);
          model = next;
          const structural = (Array.isArray(ops) ? ops : [ops]).some((o) => o.op !== "set");
          if (structural) {
            broadcast({ type: "body", html: renderBodyInner(model, route) });
          } else {
            broadcast({
              type: "nodes",
              nodes: changed.map((id) => ({ id, html: renderNode(model, id, route) })),
            });
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, changed, structural }));
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
    server.listen(port, () => {
      resolve({
        url: `http://localhost:${port}/`,
        patch: (ops) => { const r = applyPatch(model, ops); model = r.model;
          const structural = (Array.isArray(ops) ? ops : [ops]).some((o) => o.op !== "set");
          broadcast(structural ? { type: "body", html: renderBodyInner(model, route) }
                               : { type: "nodes", nodes: r.changed.map((id) => ({ id, html: renderNode(model, id, route) })) });
          return r.changed; },
        getModel: () => model,
        close: () => server.close(),
        port,
      });
    });
  });
}
