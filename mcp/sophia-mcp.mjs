#!/usr/bin/env node
// sophia-mcp.mjs — MCP server: connect any agent to a deployed Sophia site.
//
// This is the handshake. Point your agent at this with two env vars and it gets
// a full toolset to read the catalog and build/edit the live site — no glue.
//
// MCP client config (any MCP client — e.g. Claude Desktop, Cursor, or a custom host):
//   {
//     "mcpServers": {
//       "sophia": {
//         "command": "node",
//         "args": ["/abs/path/to/sophia-stack/mcp/sophia-mcp.mjs"],
//         "env": { "SOPHIA_URL": "https://yourdomain/", "SOPHIA_TOKEN": "sx_..." }
//       }
//     }
//   }
//
// Zero dependencies: a minimal, compliant MCP stdio server (newline-delimited
// JSON-RPC 2.0). Reads writes from the live token API; read tools need no token.
const URL_ = (process.env.SOPHIA_URL || "http://localhost:3000").replace(/\/$/, "");
const TOKEN = process.env.SOPHIA_TOKEN || "";

const TOOLS = [
  { name: "sophia_catalog", description: "Read the site's capability catalog (block types + props, style presets, effects, patch ops). CALL THIS FIRST so you only use real blocks/styles.", inputSchema: { type: "object", properties: {} } },
  { name: "sophia_read_model", description: "Read the current Site Model — the compact JSON of the whole site (pages -> blocks). Cheap to load.", inputSchema: { type: "object", properties: {} } },
  { name: "sophia_patch", description: "Apply addressable edits to the Site Model. `ops` is an array of {op:'set'|'add'|'remove'|'move', ...}. Prefer many small patches over rewriting. Edits are validated; bad ones are rejected.", inputSchema: { type: "object", properties: { ops: { type: "array", description: "patch ops" } }, required: ["ops"] } },
  { name: "sophia_set_css", description: "Replace the live custom CSS layer (applies instantly, layered over the active preset). Use sparingly; prefer the style preset + block effects.", inputSchema: { type: "object", properties: { css: { type: "string" } }, required: ["css"] } },
  { name: "sophia_rollback", description: "Undo the last edit — restore the previous good version of the site.", inputSchema: { type: "object", properties: {} } },
];

async function callApi(name, args) {
  const hit = async (url, opts) => { const r = await fetch(url, opts); return { ok: r.ok, status: r.status, body: await r.text() }; };
  const auth = { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN };
  switch (name) {
    case "sophia_catalog": return hit(URL_ + "/api/sophia/catalog");
    case "sophia_read_model": return hit(URL_ + "/api/sophia/model");
    case "sophia_patch": return hit(URL_ + "/api/sophia/patch", { method: "POST", headers: auth, body: JSON.stringify({ ops: args.ops }) });
    case "sophia_set_css": return hit(URL_ + "/api/sophia/css", { method: "PUT", headers: auth, body: JSON.stringify({ css: args.css }) });
    case "sophia_rollback": return hit(URL_ + "/api/sophia/rollback", { method: "POST", headers: auth });
    default: throw new Error("unknown tool " + name);
  }
}

const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });

async function handle(msg) {
  const { id, method, params } = msg;
  if (method === "initialize") return reply(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "sophia-stack", version: "0.1.0" } });
  if (method && method.startsWith("notifications/")) return; // notifications get no response
  if (method === "tools/list") return reply(id, { tools: TOOLS });
  if (method === "tools/call") {
    const { name, arguments: args = {} } = params || {};
    try {
      const r = await callApi(name, args);
      return reply(id, { content: [{ type: "text", text: r.ok ? r.body : `error ${r.status}: ${r.body}` }], isError: !r.ok });
    } catch (e) {
      return reply(id, { content: [{ type: "text", text: String(e.message || e) }], isError: true });
    }
  }
  if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32601, message: "method not found: " + method } });
}

let buf = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
    if (line) { try { handle(JSON.parse(line)); } catch { /* skip non-JSON */ } }
  }
});
process.stderr.write(`sophia-mcp ready -> ${URL_}\n`);
