// server.mjs — the self-contained Sophia runtime.
//
// Once uploaded, the stack is editable from within itself: it carries its own
// token-auth API, persists edits to its data dir (no redeploy), and broadcasts
// changes live. An LLM connects with a token, reads /api/sophia/catalog, then
// edits the model (/patch) and CSS (/css) in real time. Read endpoints are
// public; writes need a bearer token; token management needs an admin token.
import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ssr } from "../dist/ssr.mjs";
import { applyPatch } from "./patch.mjs";
import { pageHead } from "./styles.mjs";
import { resolveConnections } from "./connections.mjs";
import { Store } from "./store.mjs";
import { EDIT_PANEL } from "./edit-panel.mjs";
import { validateModel, sanitizeCss } from "./validate.mjs";
import { DataStore, sanitizeRecord } from "./data-store.mjs";

const DEFAULT_CLIENT_JS = fileURLToPath(new URL("../public/client.js", import.meta.url));
const DEFAULT_CATALOG = fileURLToPath(new URL("../catalog.json", import.meta.url));

// MCP tools exposed at the remote /mcp endpoint (and mirrored by the stdio wrapper).
const MCP_TOOLS = [
  { name: "sophia_catalog", description: "Read the site's capability catalog (blocks + props, style presets, effects, patch ops). Call this FIRST.", inputSchema: { type: "object", properties: {} } },
  { name: "sophia_read_model", description: "Read the current Site Model (compact JSON of the whole site).", inputSchema: { type: "object", properties: {} } },
  { name: "sophia_patch", description: "Apply addressable edits. ops: [{op:'set'|'add'|'remove'|'move',...}]. Validated; bad edits rejected. Prefer small patches.", inputSchema: { type: "object", properties: { ops: { type: "array" } }, required: ["ops"] } },
  { name: "sophia_set_css", description: "Replace the live custom CSS layer (applies instantly).", inputSchema: { type: "object", properties: { css: { type: "string" } }, required: ["css"] } },
  { name: "sophia_rollback", description: "Undo the last edit — restore the previous good version.", inputSchema: { type: "object", properties: {} } },
];

const readBody = (req) => new Promise((res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => res(b)); });
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

function setupPage(configured) {
  const intro = configured
    ? "This site is already set up. Enter your owner password to mint a fresh agent token."
    : "Welcome. Set an owner password to claim this site — you'll get an agent token to hand to your AI.";
  const btn = configured ? "Get a new agent token" : "Claim this site";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sophia · Setup</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(120% 80% at 50% -10%,#15152e,transparent),#070710;color:#e8e8f0;font-family:system-ui,sans-serif}
.card{width:min(560px,92vw);background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:32px;backdrop-filter:blur(10px)}
h1{margin:0 0 6px;font-size:22px}p{color:#9aa0b8;margin:0 0 20px;font-size:14px}
input{width:100%;background:#13131f;border:1px solid #2a2a3a;color:#fff;border-radius:10px;padding:12px;font-size:15px;margin-bottom:12px}
button{width:100%;background:linear-gradient(120deg,#7c8cff,#c06cff);color:#fff;border:0;border-radius:10px;padding:13px;font-weight:600;font-size:15px;cursor:pointer}
.out{margin-top:18px;display:none}.field{background:#0c0c16;border:1px solid #2a2a3a;border-radius:10px;padding:12px;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;margin-bottom:10px}
.label{color:#6f7590;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}.hand{background:#10101c;border-left:3px solid #7c8cff;padding:12px;border-radius:8px;font-size:13px;color:#cbd0e6;margin-top:8px}.err{color:#ff7676;font-size:13px;margin-top:8px}</style></head>
<body><div class="card">
  <h1>Sophia Stack</h1><p>${intro}</p>
  <input id="pw" type="password" placeholder="owner password (min 8 chars)" />
  <button id="go">${btn}</button>
  <div id="err" class="err"></div>
  <div id="out" class="out">
    <div class="label">Agent token</div><div class="field" id="tok"></div>
    <div class="label">Address</div><div class="field" id="addr"></div>
    <div class="hand">Hand your AI agent this one line:<br/><b id="hand"></b></div>
  </div>
</div>
<script>
  const $=(id)=>document.getElementById(id);
  $('go').onclick=async()=>{
    $('err').textContent='';
    const r=await fetch('/_setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:$('pw').value})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){$('err').textContent=j.error||('error '+r.status);return;}
    const addr=location.origin+'/';
    $('tok').textContent=j.agentToken;$('addr').textContent=addr;
    $('hand').textContent='Connect to '+addr+' with token '+j.agentToken+' and build my site.';
    $('out').style.display='block';
  };
</script></body></html>`;
}

export async function createServer(opts = {}) {
  const { dir, port = 4321, route = "/", seedModel = null, refreshMs = 15000, quiet = false } = opts;
  const clientJs = opts.clientJs || DEFAULT_CLIENT_JS;
  const catalogPath = opts.catalogPath || DEFAULT_CATALOG;
  const store = new Store(dir);
  const dataStore = new DataStore(dir);   // the app's contained backend (collections)
  const loaded = store.load(seedModel);
  let model = loaded.model;
  let css = loaded.css;
  const tokens = loaded.tokens;

  const bootToken = store.ensureAdminToken(tokens);
  if (bootToken && !quiet) {
    console.log("\n  [sophia] first run — admin token (store it; shown once):");
    console.log("  " + bootToken + "\n");
  }

  let data = await resolveConnections(model);
  const clients = new Set();
  const broadcast = (e) => { const line = `data: ${JSON.stringify(e)}\n\n`; for (const r of clients) r.write(line); };

  const refresh = setInterval(async () => {
    if (!clients.size) return;
    try { data = await resolveConnections(model); broadcast({ type: "data", data }); } catch {}
  }, refreshMs);
  if (refresh.unref) refresh.unref();

  // Bearer-token auth. roleNeeded: undefined (any valid token) or "admin".
  const auth = (req, roleNeeded) => {
    const h = req.headers.authorization || "";
    const tok = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!tok) return null;
    const rec = (tokens.tokens || []).find((t) => t.token === tok);
    if (!rec) return null;
    if (roleNeeded === "admin" && rec.role !== "admin") return null;
    return rec;
  };

  // ── Shared edit operations (one source of truth for REST + MCP) ──
  // Each validates / snapshots / persists / broadcasts and returns a result.
  function doPatch(ops) {
    const r = applyPatch(model, ops);
    const v = validateModel(r.model);
    if (!v.ok) return { ok: false, code: 422, error: "edit rejected — would break the site", details: v.errors };
    store.snapshot(model, css);
    model = r.model; store.saveModel(model); broadcast({ type: "ops", ops });
    return { ok: true, changed: r.changed };
  }
  function doSetCss(cssIn) {
    const s = sanitizeCss(cssIn);
    if (!s.ok) return { ok: false, code: 422, error: "unsafe css rejected", details: s.errors };
    store.snapshot(model, css);
    css = s.css; store.saveCss(css); broadcast({ type: "css", css });
    return { ok: true, bytes: css.length };
  }
  function doRollback() {
    const prev = store.popVersion();
    if (!prev) return { ok: false, code: 409, error: "no version to roll back to" };
    model = prev.model; css = prev.css; store.saveModel(model); store.saveCss(css);
    broadcast({ type: "model", model }); broadcast({ type: "css", css });
    return { ok: true, restored: true, remaining: store.history().length };
  }

  const shell = (routePath = route) => {
    const title = model?.pages?.[routePath]?.title || model.site || "Sophia";
    const head = pageHead(model, routePath, css);
    const boot = JSON.stringify({ model, route: routePath, data }).replace(/</g, "\\u003c");
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${head}</head>
<body><div id="root">${ssr(model, routePath, data)}</div>
<script>window.__SOPHIA__=${boot}</script><script src="/client.js"></script></body></html>`;
  };

  const host = (req) => (req.headers["x-forwarded-host"] || req.headers.host || "localhost");
  const proto = (req) => (req.headers["x-forwarded-proto"] || "https");
  const origin = (req) => `${proto(req)}://${host(req)}`;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const p = url.pathname;
    const m = req.method;

    // ── site + live preview ──────────────────────────────────────────────
    if (m === "GET" && p === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(shell("/")); }
    if (m === "GET" && p === "/client.js") { res.writeHead(200, { "Content-Type": "text/javascript; charset=utf-8" }); return res.end(readFileSync(clientJs)); }

    // ── auto-generated production files (SEO + AI discovery) ──
    if (m === "GET" && p === "/sitemap.xml") {
      const o = origin(req);
      const urls = Object.keys(model.pages || {}).map((r) => `  <url><loc>${o}${r === "/" ? "/" : r}</loc></url>`).join("\n");
      res.writeHead(200, { "Content-Type": "application/xml" });
      return res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
    }
    if (m === "GET" && p === "/robots.txt") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(`User-agent: *\nAllow: /\nSitemap: ${origin(req)}/sitemap.xml\n`);
    }
    if (m === "GET" && p === "/llms.txt") {
      const o = origin(req);
      const pages = Object.entries(model.pages || {}).map(([r, pg]) => `- [${pg.title || r}](${o}${r})`).join("\n");
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(`# ${model.site || "Site"}\n\n> Built with Sophia Stack.\n\n## Pages\n${pages}\n`);
    }
    if (m === "GET" && p === "/_edit") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(EDIT_PANEL); }
    if (m === "GET" && p === "/live") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      res.write("event: hello\ndata: {}\n\n"); clients.add(res);
      const ping = setInterval(() => res.write(": ping\n\n"), 20000);
      req.on("close", () => { clearInterval(ping); clients.delete(res); });
      return;
    }

    // ── public read API ──────────────────────────────────────────────────
    if (m === "GET" && p === "/api/sophia/model") return send(res, 200, model);
    if (m === "GET" && p === "/api/sophia/data") return send(res, 200, data);
    if (m === "GET" && p === "/api/sophia/css") return send(res, 200, { css });
    if (m === "GET" && p === "/api/sophia/catalog") {
      try { res.writeHead(200, { "Content-Type": "application/json" }); return res.end(readFileSync(catalogPath)); }
      catch { return send(res, 404, { error: "catalog not built" }); }
    }

    // ── Remote MCP endpoint (JSON-RPC over HTTP) ──
    // Any agent over the internet — including phone apps — connects here with the
    // site URL + a bearer token. Read tools are open; write tools need the token.
    if (m === "POST" && p === "/mcp") {
      let rpc; try { rpc = JSON.parse((await readBody(req)) || "{}"); }
      catch { return send(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }); }
      const { id, method, params } = rpc;
      if (method === "initialize") return send(res, 200, { jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "sophia-stack", version: "0.1.0" } } });
      if (method && method.startsWith("notifications/")) { res.writeHead(202); return res.end(); }
      if (method === "tools/list") return send(res, 200, { jsonrpc: "2.0", id, result: { tools: MCP_TOOLS } });
      if (method === "tools/call") {
        const { name, arguments: a = {} } = params || {};
        const tc = (text, isError = false) => send(res, 200, { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], isError } });
        const writeTool = name === "sophia_patch" || name === "sophia_set_css" || name === "sophia_rollback";
        if (writeTool && !auth(req)) return tc("error: editor token required (Authorization: Bearer <token>)", true);
        try {
          if (name === "sophia_catalog") return tc(readFileSync(catalogPath, "utf8"));
          if (name === "sophia_read_model") return tc(JSON.stringify(model));
          if (name === "sophia_patch") { const r = doPatch(a.ops); return tc(JSON.stringify(r), !r.ok); }
          if (name === "sophia_set_css") { const r = doSetCss(a.css); return tc(JSON.stringify(r), !r.ok); }
          if (name === "sophia_rollback") { const r = doRollback(); return tc(JSON.stringify(r), !r.ok); }
          return tc("unknown tool: " + name, true);
        } catch (e) { return tc(String(e.message || e), true); }
      }
      return send(res, 200, { jsonrpc: "2.0", id, error: { code: -32601, message: "method not found: " + method } });
    }

    // ── App backend: CRUD over agent-defined collections ──
    // /api/data/:collection[/:id]. Access policy comes from the App Model:
    // model.data.collections[col].access = { create: "public"|"token", read: "public"|"token" }.
    // Only declared collections are reachable. Update/delete always require a token.
    if (p.startsWith("/api/data/")) {
      const parts = p.slice("/api/data/".length).split("/").filter(Boolean);
      const col = parts[0], itemId = parts[1];
      const def = model.data?.collections?.[col];
      if (!def) return send(res, 404, { error: "unknown collection" });
      const acc = def.access || {};
      const tokenOk = !!auth(req);
      const can = (action, fallback = "token") => {
        const pol = acc[action] || fallback;
        return pol === "public" || (pol === "token" && tokenOk);
      };
      if (m === "GET" && !itemId) {
        if (!can("read")) return send(res, 401, { error: "read denied" });
        return send(res, 200, { items: dataStore.list(col, { sort: "newest", limit: 200 }) });
      }
      if (m === "GET" && itemId) {
        if (!can("read")) return send(res, 401, { error: "read denied" });
        const r = dataStore.get(col, itemId); return r ? send(res, 200, r) : send(res, 404, { error: "not found" });
      }
      if (m === "POST" && !itemId) {
        if (!can("create")) return send(res, 401, { error: "create denied" });
        const body = JSON.parse((await readBody(req)) || "{}");
        return send(res, 200, { ok: true, item: dataStore.create(col, sanitizeRecord(body, def)) });
      }
      if (m === "PUT" && itemId) {
        if (!tokenOk) return send(res, 401, { error: "token required" });
        const body = JSON.parse((await readBody(req)) || "{}");
        const r = dataStore.update(col, itemId, sanitizeRecord(body, def));
        return r ? send(res, 200, { ok: true, item: r }) : send(res, 404, { error: "not found" });
      }
      if (m === "DELETE" && itemId) {
        if (!tokenOk) return send(res, 401, { error: "token required" });
        return send(res, 200, { ok: true, removed: dataStore.remove(col, itemId) });
      }
      return send(res, 405, { error: "method not allowed" });
    }

    // ── first-run setup: claim ownership with a password, get your agent token ──
    if (m === "GET" && p === "/_setup") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(setupPage(Store.hasPassword(tokens)));
    }
    if (m === "POST" && p === "/_setup") {
      const body = JSON.parse((await readBody(req)) || "{}");
      if (Store.hasPassword(tokens)) {
        if (!Store.verifyPassword(tokens, body.password)) return send(res, 401, { error: "already configured; wrong password" });
        const agentToken = Store.mintToken(tokens, { label: body.label || "agent", role: "editor" });
        store.saveTokens(tokens);
        return send(res, 200, { ok: true, agentToken, address: `http://localhost:${port}/` });
      }
      if (!body.password || String(body.password).length < 8) return send(res, 400, { error: "password must be at least 8 characters" });
      Store.setPassword(tokens, body.password);
      const admin = (tokens.tokens || []).find((t) => t.role === "admin");
      const agentToken = Store.mintToken(tokens, { label: "agent", role: "editor" });
      store.saveTokens(tokens);
      return send(res, 200, { ok: true, first: true, adminToken: admin?.token, agentToken, address: `http://localhost:${port}/` });
    }

    // ── write API (token required) ───────────────────────────────────────
    if (m === "PUT" && p === "/api/sophia/css") {
      if (!auth(req)) return send(res, 401, { error: "editor token required" });
      const body = JSON.parse((await readBody(req)) || "{}");
      const r = doSetCss(body.css);
      return send(res, r.ok ? 200 : (r.code || 400), r);
    }
    if (m === "POST" && p === "/api/sophia/patch") {
      if (!auth(req)) return send(res, 401, { error: "editor token required" });
      try {
        const { ops } = JSON.parse((await readBody(req)) || "{}");
        const r = doPatch(ops);
        return send(res, r.ok ? 200 : (r.code || 400), r);
      } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
    }
    if (m === "POST" && p === "/api/sophia/rollback") {
      if (!auth(req)) return send(res, 401, { error: "editor token required" });
      const r = doRollback();
      return send(res, r.ok ? 200 : (r.code || 400), r);
    }
    if (m === "GET" && p === "/api/sophia/versions") {
      if (!auth(req)) return send(res, 401, { error: "token required" });
      return send(res, 200, { count: store.history().length });
    }

    // ── token management (admin required) ────────────────────────────────
    if (p === "/api/sophia/tokens") {
      if (!auth(req, "admin")) return send(res, 401, { error: "admin token required" });
      if (m === "GET") return send(res, 200, { tokens: (tokens.tokens || []).map((t) => ({ preview: t.token.slice(0, 12) + "…", label: t.label, role: t.role })) });
      if (m === "POST") {
        const body = JSON.parse((await readBody(req)) || "{}");
        const token = Store.mintToken(tokens, { label: body.label || "editor", role: body.role === "admin" ? "admin" : "editor" });
        store.saveTokens(tokens);
        return send(res, 200, { ok: true, token });
      }
      if (m === "DELETE") {
        const body = JSON.parse((await readBody(req)) || "{}");
        const before = (tokens.tokens || []).length;
        tokens.tokens = (tokens.tokens || []).filter((t) => t.token !== body.token && !t.token.startsWith(String(body.token || "\0")));
        store.saveTokens(tokens);
        return send(res, 200, { ok: true, removed: before - tokens.tokens.length });
      }
    }

    // ── multi-page: serve any route the agent has added to model.pages ──
    if (m === "GET" && model.pages && model.pages[p]) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(shell(p));
    }

    res.writeHead(404); res.end("not found");
  });

  return new Promise((resolve) => server.listen(port, () => {
    const actual = server.address().port; // honors port:0 (OS-assigned, collision-free)
    resolve({
      url: `http://localhost:${actual}/`,
      editUrl: `http://localhost:${actual}/_edit`,
      getModel: () => model, getCss: () => css, getTokens: () => tokens,
      close: () => { clearInterval(refresh); server.close(); },
      port: actual,
    });
  }));
}
