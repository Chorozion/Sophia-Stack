// react-test.mjs — verify SSR + client serving + real-time broadcast (self-terminating).
// Requires `npm run build` first (dist/ssr.mjs + public/client.js).
import { createDevServer } from "../src/dev-server-react.mjs";
import { SAMPLE } from "./sample-model.mjs";

const srv = await createDevServer(SAMPLE, { port: 4398 });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// 1. SSR'd page
const page = await (await fetch(base + "/")).text();
ok(page.includes("Build websites the way AI thinks"), "SSR rendered hero headline into HTML");
ok(page.includes('id="root"'), "hydration root present");
ok(page.includes("window.__SOPHIA__"), "boot model injected for hydration");
ok(page.includes('data-sid="hero"'), "nodes carry data-sid");
ok(page.includes('src="/client.js"'), "client bundle linked");

// 2. client bundle served + real (contains hydrate + our code)
const client = await (await fetch(base + "/client.js")).text();
ok(client.length > 1000, "client bundle is non-trivial");
ok(/hydrateRoot|hydrate/.test(client), "client bundle hydrates");

// 3. real-time: SSE receives the ops broadcast on patch
const events = [];
const es = await fetch(base + "/live");
const reader = es.body.getReader();
const dec = new TextDecoder();
(async () => { while (true) { const { value, done } = await reader.read(); if (done) break; events.push(dec.decode(value)); } })();
await new Promise((r) => setTimeout(r, 100));

const pr = await (await fetch(base + "/patch", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "headline", value: "Edited live" }] }),
})).json();
ok(pr.ok && pr.changed.includes("hero"), "patch applied, changed=[hero]");

await new Promise((r) => setTimeout(r, 100));
ok(events.join("").includes('"type":"ops"') && events.join("").includes("Edited live"), "ops broadcast over SSE for client to apply");

// 4. authoritative model updated
const m = await (await fetch(base + "/model")).json();
ok(m.pages["/"].blocks[1].headline === "Edited live", "server model updated");

console.log(`\n  ${pass} passed, ${fail} failed`);
es.body.cancel().catch(() => {});
srv.close();
process.exit(fail ? 1 : 0);
