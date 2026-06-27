// server.mjs — the self-contained Sophia runtime.
//
// Once uploaded, the stack is editable from within itself: it carries its own
// token-auth API, persists edits to its data dir (no redeploy), and broadcasts
// changes live. An LLM connects with a token, reads /api/sophia/catalog, then
// edits the model (/patch) and CSS (/css) in real time. Read endpoints are
// public; writes need a bearer token; token management needs an admin token.
import express from "express";
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
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
import { callProvider, resolveProvider, envProviders, embed, callProviderStream } from "./providers.mjs";
import { Memory, gatherSources } from "./memory.mjs";
import { SKILL } from "./skill-text.mjs";
import { installFromGit, uninstall as uninstallExt } from "./installer.mjs";
import { ExtensionHost } from "./extensions.mjs";
import { makeAudit } from "./audit.mjs";
import { AccountStore } from "./accounts.mjs";
import { resolvePayments, createCheckout, listProducts, createProduct, verifyWebhook } from "./payments.mjs";
import { VERSION as STACK_VERSION } from "./version.mjs";
import { migrate } from "./migrate.mjs";
import { cachedCheck } from "./updater.mjs";
import { safeApply, httpHealthCheck } from "./safe-update.mjs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

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

// Pull a {ops:[...]} patch out of an AI reply (handles code fences + prose).
function extractPatch(text) {
  if (!text) return null;
  let t = String(text).trim();
  const f = "```";
  const i = t.indexOf(f);
  if (i >= 0) { const j = t.indexOf(f, i + 3); if (j > i) t = t.slice(i + 3, j).replace(/^json/i, "").trim(); }
  try { return JSON.parse(t); } catch {}
  const s = t.indexOf("{"), e = t.lastIndexOf("}");
  if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch {} }
  const sa = t.indexOf("["), ea = t.lastIndexOf("]");
  if (sa >= 0 && ea > sa) { try { return JSON.parse(t.slice(sa, ea + 1)); } catch {} }
  return null;
}
// System prompt for the agent loop (the AI uses tools, not one-shot JSON).
function agentSystemPrompt(catalog, imageGen) {
  const blocks = Object.keys(catalog.blocks || {}).join(", ");
  const styles = (Array.isArray(catalog.styles) ? catalog.styles.map((s) => s.id || s.name || s) : Object.keys(catalog.styles || {})).join(", ");
  return [
    ...(imageGen ? ["IMAGES ARE PART OF BUILDING. When you create or restyle a visual page — a landing page, a hero, a gallery/feature section — PROACTIVELY call generate_image to make a fitting image and place it; do NOT wait to be asked. The hero block accepts a background image: generate one, then set the hero's `bg` prop to the returned url via apply_patch (op set, the block id, path \"bg\"). For other spots, add an html block with <img src='URL' style='width:100%'>. A polished site usually has at least a hero image. Always prefer a generated image over placeholder/stock URLs."] : []),
    "You are Sophia, a friendly AI web designer. You chat with the user and build/edit their live website by calling tools. Hold a natural back-and-forth: greet them, and if a request is vague, ask ONE quick clarifying question before building. Always explain in plain language what you did, and suggest a next step.",
    "When the user asks for something concrete, build it well: call read_model and read_catalog, then make changes with apply_patch. Produce complete, professional results — real content, multiple sections, good copy (no placeholders). If apply_patch returns validation errors, read them, fix, and retry. Use set_css for custom styling.",
    "If the user is only chatting or is unclear, reply conversationally and ask what they'd like to build — do NOT change the site until you understand. End every reply with a short, friendly note of what changed (if anything) and a suggested next step.",
    "Patch ops: set/add/remove/move target a block by id (path/value/index); mset/mdel target a model dot-path (e.g. style, pages./about, data.collections.x, functions.x). Keep every block id unique. Only use allowed block types and styles.",
    "Allowed block types: " + blocks,
    "Allowed styles: " + styles,
  ].join("\n");
}
// Tools the agent can call (OpenAI-compatible function-calling format).
const AGENT_TOOLS = [
  { type: "function", function: { name: "read_model", description: "Read the current site model JSON (pages, blocks, style, data, functions).", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "read_catalog", description: "Read allowed block types + their props, style presets, effects, and patch ops.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "apply_patch", description: "Apply patch ops to the live site. Returns ok + changed, or ok:false + validation errors to fix.", parameters: { type: "object", properties: { ops: { type: "array", items: { type: "object" } } }, required: ["ops"] } } },
  { type: "function", function: { name: "set_css", description: "Replace the live custom CSS layer.", parameters: { type: "object", properties: { css: { type: "string" } }, required: ["css"] } } },
];
// Offered to the agent only when the Image Studio extension is installed + active.
const IMAGE_TOOL = { type: "function", function: { name: "generate_image", description: "Generate an image for the site (saved to media) and get back a URL to use as a block's image/background via apply_patch. Provide a concise visual description; it's auto-tailored to the site.", parameters: { type: "object", properties: { prompt: { type: "string", description: "what the image should show, e.g. 'warm coffee-shop hero, golden hour'" } }, required: ["prompt"] } } };
const imageGenOn = (extHost) => extHost.list().some((e) => e.id === "sophia-image-gen" && e.active);
// Provider-agnostic: dispatches to the configured adapter (openai-compatible,
// anthropic, gemini, local, custom). See src/providers.mjs.
async function callLLM(llm, messages, tools = AGENT_TOOLS) {
  return callProvider(llm, messages, tools);
}
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

const AUTH_CSS = `*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(110% 60% at 50% -8%,#0d2036,transparent),#0a1626;color:#e6f0f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased}
.card{width:min(420px,92vw);background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:28px}
h1{margin:0 0 6px;font-size:21px;font-weight:600}p{color:#8499a8;margin:0 0 18px;font-size:13.5px;line-height:1.5}
input{width:100%;background:#0c1c2b;border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:10px}input:focus{outline:0;border-color:rgba(0,194,224,.5)}
button{width:100%;background:#00c2e0;color:#04212c;border:0;border-radius:8px;padding:11px;font-weight:600;font-size:14px;cursor:pointer;transition:.12s}button:hover{background:#1ccdec}
.out{margin-top:18px;display:none}.code{background:#0c1a28;border:1px dashed #FF6B35;border-radius:9px;padding:13px;font-family:ui-monospace,monospace;font-size:14px;word-break:break-all;color:#ffd9c2;letter-spacing:.02em}
.err{color:#ff7676;font-size:13px;margin-top:8px}.link{display:block;text-align:center;margin-top:14px;color:#7d93a8;font-size:13px}.warn{color:#FF6B35;font-weight:600}`;

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
  // Non-destructive forward migration BEFORE loading: an existing deployment booting
  // on newer code brings its stored data up to date safely (backs up, never deletes).
  const migration = migrate(dir, STACK_VERSION);
  if (migration.migrated) console.log(`[migrate] ${migration.from} -> ${migration.to} (applied: ${migration.applied.join(", ")})`);
  else if (migration.error) console.error(`[migrate] ${migration.error}`);
  const dataStore = new DataStore(dir);   // the app's contained backend (collections)
  const mediaStore = new MediaStore(dir); // photos / files / video, hosted in-instance
  const accounts = new AccountStore(dir); // end-user accounts (site visitors who sign up)
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
  // The end-user (site visitor) logged in via the `uid` cookie — NOT the owner.
  const currentUser = (req) => accounts.sessionUser(cookies(req).uid);
  const userCookie = (res, token) => res.setHeader("Set-Cookie", `uid=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);

  // Brute-force guard for login + recovery: lock an IP for 15 min after 8 fails.
  const authFails = new Map();
  const clientIp = (req) => (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "?";
  const guardOk = (req) => { const e = authFails.get(clientIp(req)); return !(e && e.until > Date.now()); };
  const guardFail = (req) => {
    const ip = clientIp(req); const e = authFails.get(ip) || { n: 0, until: 0 };
    if (++e.n >= 8) { e.until = Date.now() + 15 * 60 * 1000; e.n = 0; }
    if (authFails.size > 5000) authFails.clear();
    authFails.set(ip, e);
  };
  const guardClear = (req) => authFails.delete(clientIp(req));
  const setSessionCookie = (res) => {
    const sid = Store.addSession(tokens); store.saveTokens(tokens);
    res.setHeader("Set-Cookie", `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000`);
  };

  // ── Shared edit operations (one source of truth for REST + MCP) ──
  // Each validates / snapshots / persists / broadcasts and returns a result.
  function doPatch(ops, label = "") {
    const r = applyPatch(model, ops);
    const v = validateModel(r.model);
    if (!v.ok) return { ok: false, code: 422, error: "edit rejected — would break the site", details: v.errors };
    store.snapshot(model, css, label);
    model = r.model; store.saveModel(model); broadcast({ type: "ops", ops });
    return { ok: true, changed: r.changed };
  }
  // Restore a SPECIFIC past version by id (snapshots the current state first, so it's reversible).
  function doRollbackTo(id) {
    const v = store.getVersion(id);
    if (!v) return { ok: false, code: 404, error: "no such version" };
    store.snapshot(model, css, "before rollback to " + id);
    model = v.model; css = v.css; store.saveModel(model); store.saveCss(css);
    broadcast({ type: "model", model }); broadcast({ type: "css", css });
    return { ok: true, restored: true, id };
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

  // ── Extensions / plugins (optional, installable — e.g. the Sophia SEO Suite) ──
  // Extensions touch the site ONLY through doPatch (validate + rollback), get
  // provider-agnostic AI, and have every action audited. Trust model: extension
  // code runs in-process — install only ones you trust; permissions scope what we hand them.
  const audit = makeAudit(dir);
  const extHost = new ExtensionHost({
    stackVersion: STACK_VERSION,
    getModel: () => model,
    doPatch, doSetCss,
    versions: () => store.versions(), rollbackTo: doRollbackTo,
    store, dataStore, mediaStore, accounts,
    aiGenerate: async (opts) => {
      const llm = resolveProvider(tokens.llm);
      if (!llm) throw new Error("no AI provider configured");
      const messages = Array.isArray(opts.messages) ? opts.messages
        : [...(opts.system ? [{ role: "system", content: opts.system }] : []), { role: "user", content: String(opts.prompt || "") }];
      const r = await callProvider({ ...llm, temperature: opts.temperature, maxTokens: opts.maxTokens }, messages, []);
      return { text: r.content || "", provider: llm.type };
    },
    aiEmbed: (texts) => embedFn(texts),
    aiListProviders: () => Object.keys(envProviders()).concat(tokens.llm && tokens.llm.apiKey ? ["dashboard"] : []),
    aiDefaultProvider: () => { const p = resolveProvider(tokens.llm); return p ? { type: p.type, model: p.model || null } : null; },
    getExtSettings: (id) => (tokens.extSettings && tokens.extSettings[id]) || {},
    setExtSettings: (id, key, val) => { tokens.extSettings = tokens.extSettings || {}; tokens.extSettings[id] = tokens.extSettings[id] || {}; tokens.extSettings[id][key] = val; store.saveTokens(tokens); },
    getEnabled: () => tokens.extEnabled || {},
    setEnabled: (id, on) => { tokens.extEnabled = tokens.extEnabled || {}; tokens.extEnabled[id] = on; store.saveTokens(tokens); },
    audit,
  });
  const extensionsDir = opts.extensionsDir || process.env.SOPHIA_EXTENSIONS_DIR || join(dir, "extensions");

  // ── Builder memory (vector retrieval) — optional; needs an OpenAI-compatible embedder ──
  const embedProvider = () => {
    const e = process.env;
    if (e.EMBED_API_KEY || e.EMBED_BASE_URL) return { type: "openai", apiKey: e.EMBED_API_KEY, baseURL: e.EMBED_BASE_URL, embedModel: e.EMBED_MODEL };
    const p = resolveProvider(tokens.llm);
    if (p && ["openai", "openai-compatible", "compatible", "local"].includes(String(p.type || "openai").toLowerCase())) return { ...p, embedModel: e.EMBED_MODEL };
    if (e.OPENAI_API_KEY) return { type: "openai", apiKey: e.OPENAI_API_KEY, embedModel: e.EMBED_MODEL };
    return null;
  };
  const embedFn = async (texts) => { const ep = embedProvider(); if (!ep) throw new Error("no embedding provider"); return embed(ep, texts); };
  const memory = new Memory(join(dir, "vectors.json"), embedFn);
  const buildMemory = () => { let cat = {}; try { cat = JSON.parse(readFileSync(catalogPath, "utf8")); } catch {} return memory.build(gatherSources({ catalog: cat, skill: SKILL, versions: store.versions(), brief: model.brief })); };

  const shell = (routePath = route, reqOrigin = "") => {
    const title = model?.pages?.[routePath]?.title || model.site || "Sophia";
    const head = pageHead(model, routePath, css, { origin: reqOrigin });
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

    // CORS so browser-based MCP/tool clients can reach the API + MCP endpoint.
    if (p === "/mcp" || p.startsWith("/api/")) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    }
    if (m === "OPTIONS") { res.writeHead(204); return res.end(); }
    // Some MCP clients probe the endpoint with GET before POSTing JSON-RPC.
    if (m === "GET" && p === "/mcp") return send(res, 200, { name: "sophia-stack", transport: "http", protocolVersion: "2024-11-05", note: "POST JSON-RPC 2.0 here (initialize, tools/list, tools/call). Bearer token for writes." });

    // ── site + live preview ──────────────────────────────────────────────
    if (m === "GET" && p === "/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(shell("/", origin(req))); }
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
    // Health + token check: lets an AI verify its key/connection before editing.
    if (m === "GET" && p === "/api/sophia/ping") return send(res, 200, { ok: true, site: model.site || host(req), host: host(req), canWrite: canEdit(req) });
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
    // ── Extensions: installed plugins serve their own API under /api/extensions/<id>/* ──
    if (p.startsWith("/api/extensions/")) {
      const rest = p.slice("/api/extensions/".length);
      const slash = rest.indexOf("/");
      const id = slash === -1 ? rest : rest.slice(0, slash);
      const subpath = slash === -1 ? "" : rest.slice(slash + 1);
      const helpers = { send, readBody, origin: origin(req), isAdmin: isAdmin(req), canEdit: canEdit(req), hasToken: !!auth(req), user: currentUser(req), audit };
      if (await extHost.dispatchRoute(id, subpath, req, res, helpers)) return;
      return send(res, 404, { error: "no such extension route" });
    }
    // ── Extension management (admin): list, enable/disable ──
    if (p === "/api/sophia/extensions") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      if (m === "GET") return send(res, 200, { extensions: extHost.list(), nav: extHost.adminNav() });
      if (m === "POST") { const b = JSON.parse((await readBody(req)) || "{}"); if (!b.id) return send(res, 400, { error: "id required" }); return send(res, 200, await extHost.setEnabled(b.id, b.enabled !== false)); }
    }
    // One-click install straight from a public git repo (non-destructive; auto-rollback).
    if (m === "POST" && p === "/api/sophia/extensions/install") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const b = JSON.parse((await readBody(req)) || "{}");
      if (!b.repo && !b.url) return send(res, 400, { error: "repo required (owner/repo or a GitHub URL)" });
      const r = await installFromGit(b.repo || b.url, { extensionsDir, subdir: b.subdir });
      if (r.ok) { await extHost.reload(extensionsDir); audit.log("owner", "extension.install", { id: r.id, source: r.source || null }); }
      return send(res, r.ok ? 200 : 400, r);
    }
    // R4: run a registered extension job (owner-triggered).
    if (m === "POST" && p === "/api/sophia/jobs") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const b = JSON.parse((await readBody(req)) || "{}");
      if (!b.id || !b.name) return send(res, 400, { error: "id and name required" });
      return send(res, 200, await extHost.runJob(b.id, b.name, b.payload));
    }
    if (m === "POST" && p === "/api/sophia/extensions/uninstall") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const b = JSON.parse((await readBody(req)) || "{}");
      if (!b.id) return send(res, 400, { error: "id required" });
      await extHost.deactivate(b.id);
      const r = uninstallExt(extensionsDir, b.id);
      if (r.ok) { await extHost.reload(extensionsDir); audit.log("owner", "extension.uninstall", { id: b.id }); }
      return send(res, r.ok ? 200 : 400, r);
    }
    if (m === "GET" && p === "/api/sophia/audit") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      return send(res, 200, { entries: audit.tail(Number(url.searchParams.get("n")) || 200) });
    }
    // First-run onboarding state (owner-only): drives the welcome wizard.
    if (p === "/api/sophia/onboarding") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      if (m === "POST") { const b = JSON.parse((await readBody(req)) || "{}"); tokens.onboarded = !!b.done; store.saveTokens(tokens); return send(res, 200, { ok: true, done: tokens.onboarded }); }
      return send(res, 200, { done: !!tokens.onboarded, ai: !!resolveProvider(tokens.llm) });
    }
    // Builder memory (vector retrieval): status + rebuild (owner-only; optional feature)
    if (p === "/api/sophia/memory") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      if (m === "POST") { const built = await buildMemory(); return send(res, 200, { ...memory.status(), built }); }
      return send(res, 200, memory.status());
    }
    // Update awareness: is a newer Stack version available? (owner-only; opt-out via env)
    if (m === "GET" && p === "/api/sophia/update") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const info = await cachedCheck({ force: url.searchParams.get("force") === "1" });
      if (info.updateAvailable) extHost.emit("update.available", { current: info.current, latest: info.latest, releaseUrl: info.releaseUrl });
      return send(res, 200, info);
    }
    // In-dashboard "Update now" (owner/logged-in): runs the SAME tested safe engine —
    // backup → swap → health-check the new boot → AUTO-ROLLBACK on any failure. .sophia-data untouched.
    if (m === "POST" && p === "/api/sophia/update/apply") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const info = await cachedCheck({ force: true });
      if (info.enabled === false) return send(res, 400, { error: "update checks are disabled" });
      if (info.error) return send(res, 502, { error: "could not reach the update channel: " + info.error });
      if (!info.updateAvailable) return send(res, 200, { ok: true, upToDate: true, current: info.current });
      if (!info.asset) return send(res, 400, { error: "no downloadable release asset; update via `sophia update --apply`" });
      const installDir = opts.installDir || dirname(dir);
      if (!existsSync(join(installDir, "app.js"))) return send(res, 400, { error: "self-update needs the packaged app.js; use `sophia update --apply` for source checkouts" });
      const tmp = join(dir, ".sophia-update");
      try {
        rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
        const r = await fetch(info.asset.url); if (!r.ok) return send(res, 502, { error: "download failed: HTTP " + r.status });
        writeFileSync(join(tmp, "rel.zip"), Buffer.from(await r.arrayBuffer()));
        mkdirSync(join(tmp, "x"), { recursive: true });
        let t = spawnSync("unzip", ["-o", "rel.zip", "-d", "x"], { cwd: tmp, stdio: "ignore" });
        if (t.error || t.status !== 0) t = spawnSync("tar", ["-xf", "rel.zip", "-C", "x"], { cwd: tmp, stdio: "ignore" });
        if (t.error || t.status !== 0) return send(res, 500, { error: "could not extract the release (need unzip or tar)" });
        const freePort = () => new Promise((rs) => { const s = net.createServer(); s.listen(0, "127.0.0.1", () => { const pn = s.address().port; s.close(() => rs(pn)); }); });
        const FILES = ["app.js", "catalog.json"];
        const cp = (from, to) => { for (const f of FILES) if (existsSync(join(from, f))) cpSync(join(from, f), join(to, f)); if (existsSync(join(from, "public"))) cpSync(join(from, "public"), join(to, "public"), { recursive: true }); };
        const codeBak = join(tmp, "code-backup"), ex = join(tmp, "x");
        const result = await safeApply({
          backup: async () => { mkdirSync(codeBak, { recursive: true }); cp(installDir, codeBak); },
          applyNew: async () => cp(ex, installDir),
          healthCheck: async () => httpHealthCheck({ cwd: installDir, entry: "app.js", port: await freePort(), timeoutMs: 15000 }),
          restore: async () => cp(codeBak, installDir),
        });
        if (!result.ok) { audit.log("owner", "update.apply", { ok: false, error: result.error, rolledBack: result.rolledBack }); return send(res, 500, { error: result.error, rolledBack: !!result.rolledBack }); }
        audit.log("owner", "update.apply", { ok: true, to: info.latest });
        try { const rt = join(installDir, "tmp", "restart.txt"); mkdirSync(dirname(rt), { recursive: true }); writeFileSync(rt, new Date().toISOString()); } catch {} // Passenger auto-restart
        return send(res, 200, { ok: true, updated: true, latest: info.latest, changelog: info.notes || "", note: "Updated + health-checked. Restart to finish (Passenger auto-restarts; pm2/systemd: restart the service). Your data is untouched and auto-migrates on boot." });
      } catch (e) { return send(res, 500, { error: String(e.message || e) }); }
      finally { try { rmSync(tmp, { recursive: true, force: true }); } catch {} }
    }

    // ── End-user accounts (site visitors sign up / log in here) ──
    if (p.startsWith("/api/accounts")) {
      if (m === "POST" && p === "/api/accounts/signup") {
        if (!guardOk(req)) return send(res, 429, { error: "too many attempts" });
        const b = JSON.parse((await readBody(req)) || "{}");
        const r = accounts.create(b.email, b.password, b.meta);
        if (!r.ok) { guardFail(req); return send(res, 400, { error: r.error }); }
        userCookie(res, accounts.startSession(r.user.id));
        audit.log("account:" + r.user.id, "signup", { email: r.user.email });
        return send(res, 200, { ok: true, user: r.user });
      }
      if (m === "POST" && p === "/api/accounts/login") {
        if (!guardOk(req)) return send(res, 429, { error: "too many attempts" });
        const b = JSON.parse((await readBody(req)) || "{}");
        const r = accounts.verify(b.email, b.password);
        if (!r.ok) { guardFail(req); return send(res, 401, { error: r.error }); }
        guardClear(req); userCookie(res, accounts.startSession(r.user.id));
        return send(res, 200, { ok: true, user: r.user });
      }
      if (m === "POST" && p === "/api/accounts/logout") {
        accounts.endSession(cookies(req).uid);
        res.setHeader("Set-Cookie", "uid=; HttpOnly; Path=/; Max-Age=0");
        return send(res, 200, { ok: true });
      }
      if (m === "GET" && p === "/api/accounts/me") {
        const u = currentUser(req); return u ? send(res, 200, { user: u }) : send(res, 401, { error: "not signed in" });
      }
      if (m === "POST" && p === "/api/accounts/password") {
        const u = currentUser(req); if (!u) return send(res, 401, { error: "not signed in" });
        const b = JSON.parse((await readBody(req)) || "{}");
        if (!accounts.verify(u.email, b.current).ok) return send(res, 401, { error: "current password is wrong" });
        const r = accounts.setPassword(u.id, b.password); return send(res, r.ok ? 200 : 400, r);
      }
      // Owner-only: manage the member list.
      if (m === "GET" && p === "/api/accounts") {
        if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
        return send(res, 200, { users: accounts.list(), count: accounts.count() });
      }
      if (m === "DELETE" && p.startsWith("/api/accounts/")) {
        if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
        return send(res, 200, accounts.remove(p.slice("/api/accounts/".length)));
      }
      return send(res, 404, { error: "unknown accounts route" });
    }

    // ── Owner payments — the owner connects THEIR Stripe to sell to THEIR customers ──
    if (p.startsWith("/api/payments")) {
      const pay = () => resolvePayments(tokens.payments);
      if (p === "/api/payments/config") {
        if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
        if (m === "GET") { const c = pay(); return send(res, 200, { configured: !!c, publishableKey: (tokens.payments && tokens.payments.publishableKey) || (c && c.publishableKey) || "", currency: (c && c.currency) || "usd", fromEnv: !(tokens.payments && tokens.payments.secretKey) && !!c }); }
        if (m === "PUT") {
          const b = JSON.parse((await readBody(req)) || "{}");
          tokens.payments = { ...(tokens.payments || {}) };
          if (b.secretKey) tokens.payments.secretKey = b.secretKey;
          if (b.webhookSecret) tokens.payments.webhookSecret = b.webhookSecret;
          if (b.publishableKey !== undefined) tokens.payments.publishableKey = b.publishableKey;
          if (b.currency) tokens.payments.currency = b.currency;
          store.saveTokens(tokens);
          audit.log("owner", "payments.config", { configured: !!pay() });
          return send(res, 200, { ok: true, configured: !!pay() });
        }
      }
      if (m === "GET" && p === "/api/payments/products") {
        const c = pay(); if (!c) return send(res, 200, { products: [], configured: false });
        try { return send(res, 200, { products: await listProducts(c), configured: true }); } catch (e) { return send(res, 502, { error: String(e.message || e) }); }
      }
      if (m === "POST" && p === "/api/payments/products") {
        if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
        const c = pay(); if (!c) return send(res, 400, { error: "connect Stripe in Settings first" });
        try { return send(res, 200, await createProduct(c, JSON.parse((await readBody(req)) || "{}"))); } catch (e) { return send(res, 502, { error: String(e.message || e) }); }
      }
      if (m === "POST" && p === "/api/payments/checkout") {
        const c = pay(); if (!c) return send(res, 400, { error: "payments are not set up on this site" });
        const b = JSON.parse((await readBody(req)) || "{}");
        const u = currentUser(req);
        try {
          const r = await createCheckout(c, {
            priceId: b.priceId, amount: b.amount, name: b.name, mode: b.mode, quantity: b.quantity, currency: c.currency,
            successUrl: b.successUrl || origin(req) + "/?paid=1", cancelUrl: b.cancelUrl || origin(req) + "/?canceled=1",
            customerEmail: u ? u.email : b.email, metadata: { ...(u ? { memberId: u.id } : {}), ...(b.metadata || {}) },
          });
          return send(res, 200, r);
        } catch (e) { return send(res, 502, { error: String(e.message || e) }); }
      }
      if (m === "POST" && p === "/api/payments/webhook") {
        const c = pay(); const raw = await readBody(req);
        const v = verifyWebhook(raw, req.headers["stripe-signature"], c && c.webhookSecret);
        if (!v.ok) { audit.log("stripe", "webhook.rejected", { error: v.error }); return send(res, 400, { error: v.error }); }
        const ev = v.event, obj = (ev.data && ev.data.object) || {};
        const memberId = obj.metadata && obj.metadata.memberId;
        if (memberId && accounts.get(memberId)) {
          if (ev.type === "checkout.session.completed") accounts.update(memberId, { meta: { stripeCustomerId: obj.customer || null, lastPayment: new Date().toISOString(), ...(obj.mode === "subscription" ? { plan: "active" } : {}) } });
          if (ev.type === "customer.subscription.deleted") accounts.update(memberId, { meta: { plan: "canceled" } });
        }
        audit.log("stripe", "webhook." + ev.type, { id: ev.id, memberId: memberId || null });
        extHost.emit("payments.event", { type: ev.type, object: obj });
        return send(res, 200, { received: true });
      }
      return send(res, 404, { error: "unknown payments route" });
    }

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
          extHost.emit("media.afterUpload", { id: rec.id, url: rec.url, type: rec.type });
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
        if (!guardOk(req)) return send(res, 429, { error: "too many attempts — wait 15 minutes" });
        if (!Store.verifyAdmin(tokens, body.username, body.password)) { guardFail(req); return send(res, 401, { error: "wrong username or password" }); }
        guardClear(req); setSessionCookie(res);
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
      if (!guardOk(req)) return send(res, 429, { error: "too many attempts — wait 15 minutes" });
      if (!Store.hasRecovery(tokens)) return send(res, 400, { error: "nothing to recover" });
      if (!Store.verifyRecovery(tokens, body.code)) { guardFail(req); return send(res, 401, { error: "wrong recovery code" }); }
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

    // ── Built-in AI builder: the owner's key lets the STACK call an AI and apply ──
    if (m === "GET" && p === "/api/sophia/llm") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const l = tokens.llm || {};
      // env-detected providers (names only — never expose keys)
      const envFound = Object.keys(envProviders());
      return send(res, 200, { configured: !!resolveProvider(tokens.llm), type: l.type || "openai", provider: l.provider || "openai", baseURL: l.baseURL || "https://api.openai.com/v1", model: l.model || "gpt-4o-mini", envProviders: envFound });
    }
    if (m === "PUT" && p === "/api/sophia/llm") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const b = JSON.parse((await readBody(req)) || "{}");
      const prev = tokens.llm || {};
      tokens.llm = {
        type: String(b.type || prev.type || "openai").trim().slice(0, 40),       // openai | anthropic | gemini
        provider: String(b.provider || prev.provider || "openai").slice(0, 40),  // display label
        baseURL: String(b.baseURL || prev.baseURL || "https://api.openai.com/v1").trim().slice(0, 300),
        model: String(b.model || prev.model || "gpt-4o-mini").trim().slice(0, 100),
        apiKey: b.apiKey ? String(b.apiKey).trim().slice(0, 300) : prev.apiKey || "",
      };
      store.saveTokens(tokens);
      return send(res, 200, { ok: true });
    }
    // Conversational AI builder: a tool-using agent loop. The stack runs read/edit
    // tools on the AI's behalf until the task is done, self-correcting on errors.
    if (m === "POST" && p === "/api/sophia/agent") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const llm = resolveProvider(tokens.llm); // dashboard key OR env provider OR local endpoint
      if (!llm) return send(res, 400, { error: "no_llm", message: "Connect an AI provider in Settings (or set a provider env var)." });
      const body = JSON.parse((await readBody(req)) || "{}");
      const history = (Array.isArray(body.messages) ? body.messages : []).filter((x) => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string").slice(-20);
      if (!history.length) return send(res, 400, { error: "empty", message: "Tell Sophia what to build." });
      let catalog; try { catalog = JSON.parse(readFileSync(catalogPath, "utf8")); } catch { catalog = { blocks: {}, styles: [] }; }
      // Vector memory (optional): retrieve relevant project context for the request.
      let memHint = "";
      try {
        const lastUser = [...history].reverse().find((x) => x.role === "user");
        if (lastUser && memory.ready) {
          const hits = await memory.retrieve(lastUser.content, 5);
          if (hits.length) memHint = "\n\nRelevant context from this project (for grounding — use what helps):\n" + hits.map((h) => "- [" + h.kind + "] " + h.text.slice(0, 160)).join("\n");
        }
      } catch {}
      const imgOn = imageGenOn(extHost);
      const tools = imgOn ? [...AGENT_TOOLS, IMAGE_TOOL] : AGENT_TOOLS;
      const messages = [{ role: "system", content: agentSystemPrompt(catalog, imgOn) + memHint }, ...history];
      const applied = [];
      // VEX preview mode: stage edits against a clone (validated) WITHOUT committing,
      // so the builder can show them optimistically and the owner Applies or Discards.
      const preview = !!body.preview;
      let previewModel = model, previewCss = null; const previewOps = [];
      const stagePatch = (ops) => {
        const r = applyPatch(previewModel, ops || []);
        const v = validateModel(r.model);
        if (!v.ok) return { ok: false, code: 422, error: "edit rejected — would break the site", details: v.errors };
        previewModel = r.model; previewOps.push(...(ops || []));
        return { ok: true, changed: r.changed, preview: true };
      };
      const finish = (reply) => send(res, 200, preview ? { ok: true, reply, applied, preview: { ops: previewOps, css: previewCss } } : { ok: true, reply, applied });
      try {
        for (let step = 0; step < 10; step++) {
          const msg = await callLLM(llm, messages, tools);
          if (!msg) return send(res, 502, { error: "llm_error", message: "empty AI response" });
          messages.push(msg);
          const calls = msg.tool_calls || [];
          if (!calls.length) return finish(msg.content || "Done.");
          for (const tc of calls) {
            let args = {}; try { args = JSON.parse((tc.function && tc.function.arguments) || "{}"); } catch {}
            const name = tc.function && tc.function.name;
            let result;
            if (name === "read_model") result = JSON.stringify(preview ? previewModel : model);
            else if (name === "read_catalog") result = readFileSync(catalogPath, "utf8");
            else if (name === "generate_image") { const jr = await extHost.runJob("sophia-image-gen", "generate", { prompt: args.prompt }); const g = jr.ok ? jr.result : { ok: false, error: jr.error }; result = JSON.stringify(g && g.ok ? { ok: true, url: g.url } : { ok: false, error: (g && g.error) || "image generation unavailable" }); }
            else if (name === "apply_patch") { const r = preview ? stagePatch(args.ops || []) : doPatch(args.ops || []); if (r.ok && r.changed) applied.push(...r.changed); result = JSON.stringify(r); }
            else if (name === "set_css") {
              if (preview) { const s = sanitizeCss(args.css || ""); if (s.ok) { previewCss = s.css; result = JSON.stringify({ ok: true, preview: true }); } else result = JSON.stringify({ ok: false, error: "unsafe css", details: s.errors }); }
              else { const r = doSetCss(args.css || ""); if (r.ok) applied.push("css"); result = JSON.stringify(r); }
            }
            else result = "unknown tool";
            messages.push({ role: "tool", tool_call_id: tc.id, content: String(result).slice(0, 8000) });
          }
        }
        return finish("I made several changes (hit the step limit). Tell me to continue if there's more.");
      } catch (e) { return send(res, 502, { error: "llm_unreachable", message: String(e.message || e) }); }
    }

    // ── Streaming build (Lovable-style): tokens + tool steps stream over SSE ──
    if (m === "POST" && p === "/api/sophia/agent/stream") {
      if (!isAdmin(req)) return send(res, 401, { error: "owner only" });
      const llm = resolveProvider(tokens.llm);
      if (!llm) return send(res, 400, { error: "no_llm", message: "Connect an AI provider in Settings." });
      const body = JSON.parse((await readBody(req)) || "{}");
      const history = (Array.isArray(body.messages) ? body.messages : []).filter((x) => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string").slice(-20);
      if (!history.length) return send(res, 400, { error: "empty", message: "Tell Sophia what to build." });
      let catalog; try { catalog = JSON.parse(readFileSync(catalogPath, "utf8")); } catch { catalog = { blocks: {}, styles: [] }; }
      let memHint = "";
      try { const lastUser = [...history].reverse().find((x) => x.role === "user"); if (lastUser && memory.ready) { const hits = await memory.retrieve(lastUser.content, 5); if (hits.length) memHint = "\n\nRelevant context from this project:\n" + hits.map((h) => "- [" + h.kind + "] " + h.text.slice(0, 160)).join("\n"); } } catch {}
      const imgOn = imageGenOn(extHost);
      const tools = imgOn ? [...AGENT_TOOLS, IMAGE_TOOL] : AGENT_TOOLS;
      const messages = [{ role: "system", content: agentSystemPrompt(catalog, imgOn) + memHint }, ...history];
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      const sse = (o) => res.write("data: " + JSON.stringify(o) + "\n\n");
      const applied = [], preview = !!body.preview;
      let previewModel = model, previewCss = null; const previewOps = [];
      const stagePatch = (ops) => { const r = applyPatch(previewModel, ops || []); const v = validateModel(r.model); if (!v.ok) return { ok: false, code: 422, error: "edit rejected — would break the site", details: v.errors }; previewModel = r.model; previewOps.push(...(ops || [])); return { ok: true, changed: r.changed, preview: true }; };
      try {
        for (let step = 0; step < 10; step++) {
          const msg = await callProviderStream(llm, messages, tools, (t) => sse({ type: "token", text: t }));
          messages.push(msg);
          const calls = msg.tool_calls || [];
          if (!calls.length) { sse({ type: "done", reply: msg.content || "Done.", applied, ...(preview ? { preview: { ops: previewOps, css: previewCss } } : {}) }); return res.end(); }
          for (const tc of calls) {
            let args = {}; try { args = JSON.parse((tc.function && tc.function.arguments) || "{}"); } catch {}
            const name = tc.function && tc.function.name;
            sse({ type: "tool", name });
            let result;
            if (name === "read_model") result = JSON.stringify(preview ? previewModel : model);
            else if (name === "read_catalog") result = readFileSync(catalogPath, "utf8");
            else if (name === "generate_image") { const jr = await extHost.runJob("sophia-image-gen", "generate", { prompt: args.prompt }); const g = jr.ok ? jr.result : { ok: false, error: jr.error }; result = JSON.stringify(g && g.ok ? { ok: true, url: g.url } : { ok: false, error: (g && g.error) || "image generation unavailable" }); }
            else if (name === "apply_patch") { const r = preview ? stagePatch(args.ops || []) : doPatch(args.ops || []); if (r.ok && r.changed) applied.push(...r.changed); if (r.ok && !preview) { extHost.emit("site.afterPatch", { ops: args.ops, changed: r.changed }); extHost.emit("page.afterSave", { ops: args.ops, changed: r.changed }); extHost.emit("seo.audit.requested", { reason: "content-changed", changed: r.changed }); } result = JSON.stringify(r); }
            else if (name === "set_css") { if (preview) { const s = sanitizeCss(args.css || ""); if (s.ok) { previewCss = s.css; result = JSON.stringify({ ok: true, preview: true }); } else result = JSON.stringify({ ok: false, error: "unsafe css" }); } else { const r = doSetCss(args.css || ""); if (r.ok) applied.push("css"); result = JSON.stringify(r); } }
            else result = "unknown tool";
            messages.push({ role: "tool", tool_call_id: tc.id, content: String(result).slice(0, 8000) });
          }
        }
        sse({ type: "done", reply: "I made several changes (hit the step limit). Tell me to continue if there's more.", applied, ...(preview ? { preview: { ops: previewOps, css: previewCss } } : {}) }); res.end();
      } catch (e) { sse({ type: "error", message: String(e.message || e) }); res.end(); }
      return;
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
        const { ops, label } = JSON.parse((await readBody(req)) || "{}");
        extHost.emit("page.beforeSave", { ops }); extHost.emit("site.beforePublish", { ops }); // R3: pre-save/publish
        const r = doPatch(ops, label);
        if (r.ok) {
          extHost.emit("site.afterPatch", { ops, changed: r.changed });
          extHost.emit("page.afterSave", { ops, changed: r.changed });
          extHost.emit("site.afterPublish", { ops, changed: r.changed });           // R3: a push-to-live is a publish
          extHost.emit("seo.audit.requested", { reason: "content-changed", changed: r.changed }); // R3: content changed → re-audit
        }
        return send(res, r.ok ? 200 : (r.code || 400), r);
      } catch (e) { return send(res, 400, { error: String(e.message || e) }); }
    }
    if (m === "POST" && p === "/api/sophia/rollback") {
      if (!canEdit(req)) return send(res, 401, { error: "owner or key required" });
      let id = null; try { id = (JSON.parse((await readBody(req)) || "{}")).id || null; } catch {}
      const r = id ? doRollbackTo(id) : doRollback();
      return send(res, r.ok ? 200 : (r.code || 400), r);
    }
    if (m === "GET" && p === "/api/sophia/versions") {
      if (!canEdit(req)) return send(res, 401, { error: "owner or key required" });
      return send(res, 200, { versions: store.versions(), count: store.history().length });
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
      return res.end(shell(p, origin(req)));
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

  await extHost.loadDir(extensionsDir); // load installed extensions before serving
  if (embedProvider()) buildMemory().catch(() => {}); // warm the builder's memory index (optional)

  return new Promise((resolve) => {
    const onListen = () => {
      const addr = server.address();
      const actual = addr && typeof addr === "object" ? addr.port : port; // socket -> path
      resolve({
        // 127.0.0.1 (not "localhost") so fetch() reaches the IPv4 bind on Node 18,
        // where "localhost" resolves to ::1 first and would ECONNREFUSED.
        url: `http://127.0.0.1:${actual}/`,
        dashboardUrl: `http://127.0.0.1:${actual}/dashboard`,
        getModel: () => model, getCss: () => css, getTokens: () => tokens, getHost: () => extHost,
        close: () => { clearInterval(refresh); server.close(); },
        port: actual,
      });
    };
    // Numeric port -> bind all interfaces (proxies may connect on 127.0.0.1).
    // Non-numeric -> it's a Unix socket path (Passenger); bind it directly.
    const server = typeof port === "number" ? app.listen(port, "0.0.0.0", onListen) : app.listen(port, onListen);
  });
}
