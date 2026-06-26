// app-test.mjs — prove the contained full-stack backend: the agent defines a
// collection (data model), gets CRUD + access policy for free, data persists.
import { rmSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { DEFAULT_SITE } from "../src/default-site.mjs";

const dir = fileURLToPath(new URL("./out/_app-test", import.meta.url));
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const srv = await createServer({ dir, port: 0, seedModel: DEFAULT_SITE, quiet: true });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

const token = (await (await fetch(base + "/_setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: "ownerpass1" }) })).json()).agentToken;
const patch = (ops) => fetch(base + "/api/sophia/patch", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ ops }) }).then((r) => r.json());
const api = (m, path, body, tok) => fetch(base + path, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

// 1. Agent defines a collection (a public contact form store) via a model-level patch.
const def = await patch([{ op: "mset", path: "data.collections.messages", value: { fields: [{ name: "name" }, { name: "msg" }], access: { create: "public", read: "token" } } }]);
ok(def.ok, "agent defines a collection via mset (model-level patch)");

// 2. Unknown collection -> 404 (only declared collections are reachable)
ok((await api("GET", "/api/data/nope")).status === 404, "unknown collection -> 404");

// 3. Public create works without a token (end-user form submission); junk stripped
const created = await api("POST", "/api/data/messages", { name: "Ann", msg: "hello", junk: "x" });
ok(created.body.ok && created.body.item.id && created.body.item.name === "Ann" && !("junk" in created.body.item), "public create works; record whitelisted to declared fields");

// 4. Read is token-gated per the access policy
ok((await api("GET", "/api/data/messages")).status === 401, "read without token -> 401 (access policy)");
const listed = await api("GET", "/api/data/messages", null, token);
ok(listed.body.items?.length === 1 && listed.body.items[0].msg === "hello", "read with token returns the record");

// 5. A token-only collection refuses public create
await patch([{ op: "mset", path: "data.collections.private", value: { fields: [{ name: "x" }], access: { create: "token", read: "token" } } }]);
ok((await api("POST", "/api/data/private", { x: 1 })).status === 401, "create denied on token-only collection without a token");
ok((await api("POST", "/api/data/private", { x: 1 }, token)).body.ok, "create allowed with token");

// 6. Safe autonomy on the data layer: an invalid collection definition is rejected
const bad = await patch([{ op: "mset", path: "data.collections.bad name", value: { fields: [] } }]);
ok(!bad.ok, "invalid collection name -> rejected (validate-before-commit)");

// 7. Contained + persisted on disk
ok(existsSync(join(dir, "collections", "messages.json")), "collection persisted to the contained data dir");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close();
await new Promise((r) => setTimeout(r, 200));
try { rmSync(dir, { recursive: true, force: true }); } catch {}
process.exit(fail ? 1 : 0);
