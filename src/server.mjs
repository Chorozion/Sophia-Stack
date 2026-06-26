// server.mjs — the self-contained Sophia runtime.
//
// Once uploaded, the stack is editable from within itself: it carries its own
// token-auth API, persists edits to its data dir (no redeploy), and broadcasts
// changes live. An LLM connects with a token, reads /api/sophia/catalog, then
// edits the model (/patch) and CSS (/css) in real time. Read endpoints are
// public; writes need a bearer token; token management needs an admin token.
import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ssr } from "../dist/ssr.mjs";
import { applyPatch } from "./patch.mjs";
import { pageHead } from "./styles.mjs";
import { resolveConnections } from "./connections.mjs";
import { Store } from "./store.mjs";
import { validateModel, sanitizeCss } from "./validate.mjs";
import { DataStore, sanitizeRecord } from "./data-store.mjs";
import { renderSkill } from "./skill-text.mjs";
import { openapiSpec } from "./openapi.mjs";
import { MediaStore } from "./media-store.mjs";
import { runFunction } from "./sandbox.mjs";
import { dashboardPage } from "./dashboard.mjs";

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

// Immutable footer the CORE injects on every page (outside the React root, so the
// AI's model edits can't touch it). Admin link + "Powered by Sophia Stack".
const CORE_FOOTER = `<footer class="sx-core-footer" style="text-align:center;padding:16px;font-size:12px;color:#7d93a8;border-top:1px solid rgba(0,212,255,.14);font-family:system-ui,sans-serif;background:#0A1628 !important;display:block !important">
<a href="/dashboard" style="color:#00D4FF;text-decoration:none">Admin</a> &nbsp;·&nbsp; Powered by <a href="https://sophiaxt.com" target="_blank" rel="noopener" style="color:#7d93a8;text-decoration:none">Sophia Stack</a>
</footer>`;

const readBody = (req) => new Promise((res) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => res(b)); });
const readBodyBuffer = (req) => new Promise((res) => { const cs = []; req.on("data", (c) => cs.push(c)); req.on("end", () => res(Buffer.concat(cs))); });
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

const AUTH_CSS = `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(120% 80% at 50% -10%,#0d2036,transparent),#0A1628;color:#e8f4f8;font-family:system-ui,sans-serif}
.card{width:min(560px,92vw);background:rgba(0,212,255,.04);border:1px solid rgba(0,212,255,.18);border-radius:18px;padding:32px;backdrop-filter:blur(10px)}
h1{margin:0 0 6px;font-size:24px}p{color:#7d93a8;margin:0 0 20px;font-size:14px}
input{width:100%;background:#0d1f30;border:1px solid rgba(0,212,255,.2);color:#fff;border-radius:10px;padding:13px;font-size:15px;margin-bottom:12px}
button{width:100%;background:linear-gradient(120deg,#00D4FF,#0066FF);color:#04121a;border:0;border-radius:10px;padding:14px;font-weight:700;font-size:16px;cursor:pointer}
.out{margin-top:18px;display:none}.code{background:#0c1a28;border:1px dashed #FF6B35;border-radius:10px;padding:14px;font-family:ui-monospace,monospace;font-size:14px;word-break:break-all;color:#ffd9c2}
.err{color:#ff7676;font-size:13px;margin-top:8px}.link{display:block;text-align:center;margin-top:16px;color:#7d93a8;font-size:13px}.warn{color:#FF6B35;font-weight:600}`;

function setupPage(configured, googleOn) {
  const title = configured ? "Access your dashboard" : "Get started";
  const intro = configured ? "Enter your admin username and password." : "Create your admin account to claim this site.";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sophia · ${title}</title><style>${AUTH_CSS}</style></head>
<body><div class="card">
  <div id="form">
    <h1>${title}</h1><p>${intro}</p>
    <input id="user" autocomplete="username" placeholder="admin username" />
    <input id="pw" type="password" autocomplete="${configured ? "current-password" : "new-password"}" placeholder="${configured ? "password" : "password (min 8 chars)"}" />
    <button id="go">${configured ? "Open dashboard" : "Create account"}</button>
    <div id="err" class="err"></div>
    ${configured && googleOn ? '<a class="link" href="/auth/google" style="display:block;text-align:center;margin-top:10px;padding:11px;border:1px solid rgba(0,212,255,.3);border-radius:10px;color:#00D4FF;text-decoration:none">Sign in with Google</a>' : ""}
    <a class="link" href="/_recover">Lost access, or someone else got in? Recover →</a>
  </div>
  <div id="out" class="out">
    <h1 style="font-size:20px">⚠ <span class="warn">Save your recovery code</span></h1>
    <p>This is the <b>only</b> way back in if you lose your password — or to lock out anyone who gets it. Store it somewhere safe. It won't be shown again.</p>
    <div class="code" id="rec"></div>
    <button id="cont" style="margin-top:14px">I saved it — open my dashboard</button>
  </div>
</div>
<script>
  const $=(id)=>document.getElementById(id);
  $('go').onclick=async()=>{
    $('err').textContent='';
    const r=await fetch('/_setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('user').value,password:$('pw').value})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){$('err').textContent=j.error||('error '+r.status);return;}
    if(j.first&&j.recoveryCode){$('rec').textContent=j.recoveryCode;$('form').style.display='none';$('out').style.display='block';$('cont').onclick=()=>location.href=j.redirect||'/dashboard';}
    else location.href=j.redirect||'/dashboard';
  };
</script></body></html>`;
}

function recoverPage() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sophia · Recover</title><style>${AUTH_CSS}</style></head>
<body><div class="card">
  <div id="form">
    <h1>Recover ownership</h1><p>Enter your recovery code and set a new admin login. This <b class="warn">logs out everyone and revokes all keys</b> — instantly locking out anyone who had access.</p>
    <input id="code" placeholder="your five-word recovery string" />
    <input id="user" autocomplete="username" placeholder="new admin username" />
    <input id="pw" type="password" autocomplete="new-password" placeholder="new password (min 8 chars)" />
    <button id="go">Recover & lock it down</button>
    <div id="err" class="err"></div>
    <a class="link" href="/_setup">Back</a>
  </div>
  <div id="out" class="out">
    <h1 style="font-size:20px">✓ Recovered. <span class="warn">New recovery code</span></h1>
    <p>Your old code is now dead. Save this new one.</p>
    <div class="code" id="rec"></div>
    <button id="cont" style="margin-top:14px">Open my dashboard</button>
  </div>
</div>
<script>
  const $=(id)=>document.getElementById(id);
  $('go').onclick=async()=>{
    $('err').textContent='';
    const r=await fetch('/_recover',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:$('code').value,username:$('user').value,password:$('pw').value})});
    const j=await r.json().catch(()=>({}));
    if(!r.ok){$('err').textContent=j.error||('error '+r.status);return;}
    $('rec').textContent=j.recoveryCode;$('form').style.display='none';$('out').style.display='block';
    $('cont').onclick=()=>location.href=j.redirect||'/dashboard';
  };
</script></body></html>`;
}


export async function createServer(opts = {}) {
  const { dir, port = 4321, route = "/", seedModel = null, refreshMs = 15000, quiet = false } = opts;
  const clientJs = opts.clientJs || DEFAULT_CLIENT_JS;
  const catalogPath = opts.catalogPath || DEFAULT_CATALOG;
  const store = new Store(dir);
  const dataStore = new DataStore(dir);   // the app's contained backend (collections)
  const mediaStore = new MediaStore(dir); // photos / files / video, hosted in-instance
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

  // Owner browser session via cookie (how you reach your dashboard).
  const cookies = (req) => Object.fromEntries((req.headers.cookie || "").split(";").map((c) => c.trim().split("=").map(decodeURIComponent)).filter((x) => x[0]));
  const sessionOk = (req) => Store.hasSession(tokens, cookies(req).sid);
  // Admin = a logged-in owner session OR an admin bearer token (sensitive ops).
  const isAdmin = (req) => sessionOk(req) || !!auth(req, "admin");
  // canEdit = owner session OR any valid key (editor/admin) — for building the site.
  const canEdit = (req) => sessionOk(req) || !!auth(req);
  const setSessionCookie = (res) => {
    const sid = Store.addSession(tokens); store.saveTokens(tokens);
    res.setHeader("Set-Cookie", `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);
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
${CORE_FOOTER}
<script>window.__SOPHIA__=${boot}</script><script src="/client.js"></script></body></html>`;
  };

  const host = (req) => (req.headers["x-forwarded-host"] || req.headers.host || "localhost");
  const proto = (req) => (req.headers["x-forwarded-proto"] || "https");
  const origin = (req) => `${proto(req)}://${host(req)}`;

  const requestHandler = async (req, res) => {
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
    if (m === "GET" && (p === "/skill.md" || p === "/skill")) {
      res.writeHead(200, { "Content-Type": "text/markdown; charset=utf-8" });
      return res.end(renderSkill(origin(req)));
    }
    // OpenAPI schema for a ChatGPT Custom GPT Action (server URL = this deployment).
    if (m === "GET" && (p === "/openapi.json" || p === "/openapi")) {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      return res.end(JSON.stringify(openapiSpec(origin(req))));
    }
    if (m === "GET" && p === "/llms.txt") {
      const o = origin(req);
      const pages = Object.entries(model.pages || {}).map(([r, pg]) => `- [${pg.title || r}](${o}${r})`).join("\n");
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(`# ${model.site || "Site"}\n\n> Built with Sophia Stack.\n\n## Pages\n${pages}\n`);
    }
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
      const tokenOk = canEdit(req);
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

    // ── Media: photos / files / video hosted in the contained instance ──
    if (m === "GET" && p.startsWith("/media/")) {
      const got = mediaStore.resolve(p.slice("/media/".length));
      if (!got) { res.writeHead(404); return res.end("not found"); }
      res.writeHead(200, { "Content-Type": got.type, "Cache-Control": "public, max-age=86400" });
      return res.end(got.bytes);
    }
    if (p === "/api/media") {
      if (!canEdit(req)) return send(res, 401, { error: "owner or key required" });
      if (m === "GET") return send(res, 200, { items: mediaStore.list() });
      if (m === "POST") {
        try {
          const buf = await readBodyBuffer(req);
          const rec = mediaStore.save(buf, { name: req.headers["x-filename"], type: req.headers["content-type"] });
          return send(res, 200, { ok: true, ...rec });
        } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
      }
    }
    if (m === "DELETE" && p.startsWith("/api/media/")) {
      if (!canEdit(req)) return send(res, 401, { error: "owner or key required" });
      return send(res, 200, { ok: true, removed: mediaStore.remove(p.slice("/api/media/".length)) });
    }

    // ── Custom functions: AI/owner-written server logic, run in a vm sandbox ──
    if (p.startsWith("/api/fn/")) {
      const name = p.slice("/api/fn/".length);
      const fn = model.functions?.[name];
      if (!fn || typeof fn.code !== "string") return send(res, 404, { error: "no such function" });
      let input;
      try { input = m === "GET" ? Object.fromEntries(url.searchParams) : JSON.parse((await readBody(req)) || "{}"); }
      catch { input = {}; }
      try {
        const result = runFunction(fn.code, { input, dataStore, model });
        return send(res, 200, { ok: true, result });
      } catch (e) { return send(res, 400, { ok: false, error: String(e.message || e) }); }
    }

    // ── first-run setup: claim ownership with a password, get your agent token ──
    if (m === "GET" && p === "/_setup") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(setupPage(Store.hasAdmin(tokens), !!(tokens.oauth?.enabled && tokens.oauth?.clientId)));
    }
    if (m === "POST" && p === "/_setup") {
      const body = JSON.parse((await readBody(req)) || "{}");
      // Returning owner -> verify and open the dashboard (no separate "login").
      if (Store.hasAdmin(tokens)) {
        if (!Store.verifyAdmin(tokens, body.username, body.password)) return send(res, 401, { error: "wrong username or password" });
        setSessionCookie(res);
        return send(res, 200, { ok: true, redirect: "/dashboard" });
      }
      // First run -> "Get started": create the admin account (auto-stored).
      if (!body.username || String(body.username).trim().length < 2) return send(res, 400, { error: "choose a username (2+ characters)" });
      if (!body.password || String(body.password).length < 8) return send(res, 400, { error: "password must be at least 8 characters" });
      Store.setAdmin(tokens, body.username, body.password);
      const recoveryCode = Store.newRecoveryCode(tokens);
      setSessionCookie(res);
      return send(res, 200, { ok: true, first: true, recoveryCode, redirect: "/dashboard" });
    }
    // Recover ownership with the one-time code (lost password OR someone got in).
    if (m === "GET" && p === "/_recover") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(recoverPage());
    }
    if (m === "POST" && p === "/_recover") {
      const body = JSON.parse((await readBody(req)) || "{}");
      if (!Store.hasRecovery(tokens)) return send(res, 400, { error: "nothing to recover" });
      if (!Store.verifyRecovery(tokens, body.code)) return send(res, 401, { error: "wrong recovery code" });
      if (!body.username || String(body.username).trim().length < 2) return send(res, 400, { error: "choose a username" });
      if (!body.password || String(body.password).length < 8) return send(res, 400, { error: "password must be at least 8 characters" });
      Store.setAdmin(tokens, body.username, body.password);
      Store.revokeAllAccess(tokens);                 // kick out any intruder: all keys + sessions
      const recoveryCode = Store.newRecoveryCode(tokens); // old code is now dead
      setSessionCookie(res);
      return send(res, 200, { ok: true, recoveryCode, redirect: "/dashboard" });
    }
    if (m === "POST" && p === "/_logout") {
      Store.clearSession(tokens, cookies(req).sid); store.saveTokens(tokens);
      res.setHeader("Set-Cookie", "sid=; HttpOnly; Path=/; Max-Age=0");
      return send(res, 200, { ok: true });
    }
    if (m === "GET" && p === "/dashboard") {
      if (!sessionOk(req)) { res.writeHead(302, { Location: "/_setup" }); return res.end(); }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(dashboardPage(Store.adminUsername(tokens)));
    }
    // Site brief: what the owner wants the site to be (the LLM reads this).
    if (m === "GET" && p === "/api/sophia/brief") return send(res, 200, { brief: model.brief || "" });
    if (m === "PUT" && p === "/api/sophia/brief") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const r = doPatch([{ op: "mset", path: "brief", value: String(JSON.parse((await readBody(req)) || "{}").brief || "").slice(0, 4000) }]);
      return send(res, r.ok ? 200 : 400, r);
    }

    // ── Optional Google sign-in (Option A: owner brings their own OAuth app) ──
    if (m === "GET" && p === "/api/sophia/oauth") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const o = tokens.oauth || {};
      return send(res, 200, { enabled: !!o.enabled, provider: "google", clientId: o.clientId || "", allowedEmail: o.allowedEmail || "" });
    }
    if (m === "PUT" && p === "/api/sophia/oauth") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const b = JSON.parse((await readBody(req)) || "{}");
      const prev = tokens.oauth || {};
      tokens.oauth = {
        enabled: !!b.enabled, provider: "google",
        clientId: String(b.clientId || "").trim().slice(0, 300),
        clientSecret: b.clientSecret ? String(b.clientSecret).trim().slice(0, 300) : prev.clientSecret || "",
        allowedEmail: String(b.allowedEmail || "").trim().toLowerCase().slice(0, 200),
      };
      store.saveTokens(tokens);
      return send(res, 200, { ok: true });
    }
    if (m === "GET" && p === "/auth/google") {
      const o = tokens.oauth || {};
      if (!o.enabled || !o.clientId) return send(res, 400, { error: "Google sign-in is not configured" });
      const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      u.searchParams.set("client_id", o.clientId);
      u.searchParams.set("redirect_uri", origin(req) + "auth/google/callback");
      u.searchParams.set("response_type", "code");
      u.searchParams.set("scope", "openid email");
      res.writeHead(302, { Location: u.toString() }); return res.end();
    }
    if (m === "GET" && p === "/auth/google/callback") {
      const o = tokens.oauth || {};
      const code = url.searchParams.get("code");
      if (!o.enabled || !o.clientId || !code) { res.writeHead(302, { Location: "/_setup" }); return res.end(); }
      try {
        const tok = await (await fetch("https://oauth2.googleapis.com/token", {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id: o.clientId, client_secret: o.clientSecret, redirect_uri: origin(req) + "auth/google/callback", grant_type: "authorization_code" }),
        })).json();
        // id_token came straight from Google's authenticated token endpoint -> trust its payload.
        const claims = tok.id_token ? JSON.parse(Buffer.from(tok.id_token.split(".")[1], "base64").toString()) : null;
        const email = claims && claims.email_verified !== false ? String(claims.email || "").toLowerCase() : "";
        if (email && email === o.allowedEmail) { setSessionCookie(res); res.writeHead(302, { Location: "/dashboard" }); return res.end(); }
      } catch {}
      res.writeHead(302, { Location: "/_setup?oauth=denied" }); return res.end();
    }

    // ── write API (token required) ───────────────────────────────────────
    if (m === "PUT" && p === "/api/sophia/css") {
      if (!canEdit(req)) return send(res, 401, { error: "owner or key required" });
      const body = JSON.parse((await readBody(req)) || "{}");
      const r = doSetCss(body.css);
      return send(res, r.ok ? 200 : (r.code || 400), r);
    }
    if (m === "POST" && p === "/api/sophia/patch") {
      if (!canEdit(req)) return send(res, 401, { error: "owner or key required" });
      try {
        const { ops } = JSON.parse((await readBody(req)) || "{}");
        const r = doPatch(ops);
        return send(res, r.ok ? 200 : (r.code || 400), r);
      } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
    }
    if (m === "POST" && p === "/api/sophia/rollback") {
      if (!canEdit(req)) return send(res, 401, { error: "owner or key required" });
      const r = doRollback();
      return send(res, r.ok ? 200 : (r.code || 400), r);
    }
    if (m === "GET" && p === "/api/sophia/versions") {
      if (!auth(req)) return send(res, 401, { error: "token required" });
      return send(res, 200, { count: store.history().length });
    }

    // ── token management (admin required) ────────────────────────────────
    if (p === "/api/sophia/tokens") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
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
  };

  // Express app (Hostinger + most Node hosts detect this as the framework).
  // It's a thin shell: every request flows straight into our handler, which
  // owns all routing/auth/SSR. We add NO body parser, so the raw request stream
  // stays intact for our own readBody/readBodyBuffer (incl. binary media uploads).
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res) => {
    requestHandler(req, res).catch(() => { if (!res.headersSent) { res.writeHead(500); res.end("server error"); } });
  });

  return new Promise((resolve) => {
    const onListen = () => {
      const addr = server.address();
      const actual = addr && typeof addr === "object" ? addr.port : port; // socket -> path
      resolve({
        url: `http://localhost:${actual}/`,
        dashboardUrl: `http://localhost:${actual}/dashboard`,
        getModel: () => model, getCss: () => css, getTokens: () => tokens,
        close: () => { clearInterval(refresh); server.close(); },
        port: actual,
      });
    };
    // Numeric port -> bind all interfaces (proxies may connect on 127.0.0.1).
    // Non-numeric -> it's a Unix socket path (Passenger); bind it directly.
    const server = typeof port === "number" ? app.listen(port, "0.0.0.0", onListen) : app.listen(port, onListen);
  });
}
