// live-test.mjs — functional check of the real-time edit runtime (self-terminating).
import { createDevServer } from "../src/dev-server.mjs";

const model = {
  site: "t", theme: "dark",
  pages: { "/": { title: "t", blocks: [
    { id: "hero", type: "hero", headline: "Before", sub: "s", cta: { label: "x", href: "/" } },
    { id: "foot", type: "footer", text: "f" },
  ] } },
};

const srv = await createDevServer(model, { port: 4399 });
const base = srv.url.replace(/\/$/, "");
let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// 1. page served with client + data-sid wrappers
const page = await (await fetch(base + "/")).text();
ok(page.includes('data-sid="hero"'), "page wraps nodes with data-sid");
ok(page.includes("EventSource"), "live client injected");

// 2. SSE receives a surgical node update when a 'set' patch is applied
const events = [];
const es = await fetch(base + "/live");
const reader = es.body.getReader();
const dec = new TextDecoder();
(async () => { while (true) { const { value, done } = await reader.read(); if (done) break; events.push(dec.decode(value)); } })();

await new Promise((r) => setTimeout(r, 100));
const pr = await (await fetch(base + "/patch", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ops: [{ op: "set", id: "hero", path: "headline", value: "After" }] }),
})).json();
ok(pr.ok && pr.changed.includes("hero") && !pr.structural, "set patch -> changed=[hero], non-structural");

await new Promise((r) => setTimeout(r, 100));
const blob = events.join("");
ok(blob.includes('"type":"nodes"') && blob.includes("After"), "SSE pushed surgical node update with new content");

// 3. model reflects the edit
const m = await (await fetch(base + "/model")).json();
ok(m.pages["/"].blocks[0].headline === "After", "in-memory model updated");

// 4. structural patch -> body broadcast
await (await fetch(base + "/patch", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ops: [{ op: "add", route: "/", index: 1, value: { id: "cta9", type: "cta", headline: "New", button: { label: "go", href: "/" } } }] }),
})).json();
await new Promise((r) => setTimeout(r, 100));
ok(events.join("").includes('"type":"body"'), "structural patch -> body re-render broadcast");

console.log(`\n  ${pass} passed, ${fail} failed`);
es.body.cancel().catch(() => {});
srv.close();
process.exit(fail ? 1 : 0);
