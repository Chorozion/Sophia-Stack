// mcp-test.mjs — verify the remote /mcp endpoint: the over-the-internet handshake
// an agent (incl. a phone app) uses. Self-terminating.
import { rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

const dir = fileURLToPath(new URL("./out/_mcp-test", import.meta.url));
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const srv = await createServer({ dir, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// Mint an agent token via the real setup flow (what a user does once).
const setup = await (await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "ownerpass1" }) })).json();
const token = setup.agentToken;
ok(token && token.startsWith("sx_"), "minted an agent token via /_setup");

const rpc = (body, token) => fetch(base + "/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
  body: JSON.stringify({ jsonrpc: "2.0", id: 1, ...body }),
}).then((r) => r.json());

// 1. initialize handshake
const init = await rpc({ method: "initialize" });
ok(init.result?.serverInfo?.name === "sophia-stack", "MCP initialize handshake");

// 2. tools/list
const list = await rpc({ method: "tools/list" });
const names = (list.result?.tools || []).map((t) => t.name);
ok(names.includes("sophia_catalog") && names.includes("sophia_patch") && names.length === 5, "tools/list returns the 5 tools");

// 3. read tools work without a token
const cat = await rpc({ method: "tools/call", params: { name: "sophia_catalog", arguments: {} } });
ok(!cat.result.isError && cat.result.content[0].text.includes("blocks"), "sophia_catalog (no token) returns catalog");

// 4. write tool refused without a token
const noTok = await rpc({ method: "tools/call", params: { name: "sophia_patch", arguments: { ops: [{ op: "set", id: "hero", path: "headline", value: "x" }] } } });
ok(noTok.result.isError && /token/i.test(noTok.result.content[0].text), "sophia_patch without token -> refused");

// 5. write tool works with the agent token + actually edits the site
const patched = await rpc({ method: "tools/call", params: { name: "sophia_patch", arguments: { ops: [{ op: "set", id: "hero", path: "headline", value: "Built over MCP" }] } } }, token);
ok(!patched.result.isError, "sophia_patch with token -> ok");
const m = await (await fetch(base + "/api/sophia/model")).json();
ok(m.pages["/"].blocks.find((b) => b.id === "hero").headline === "Built over MCP", "the live site changed via MCP");

// 6. invalid edit rejected through MCP too (safe autonomy holds on this path)
const bad = await rpc({ method: "tools/call", params: { name: "sophia_patch", arguments: { ops: [{ op: "add", route: "/", value: { id: "z", type: "bogus" } }] } } }, token);
ok(bad.result.isError, "invalid edit via MCP -> rejected (safe autonomy)");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close();
await new Promise((r) => setTimeout(r, 200));
try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
