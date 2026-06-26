// connections-test.mjs — verify the backend connection layer end-to-end.
// Dogfoods the real lab live feed (network read). Requires `npm run build`.
import { resolveConnections } from "../src/connections.mjs";
import { createDevServer } from "../src/dev-server-react.mjs";
import { SAMPLE } from "./sample-model.mjs";

let pass = 0, fail = 0;
const ok = (c, m) => (c ? (pass++, console.log("  PASS", m)) : (fail++, console.log("  FAIL", m)));

// 1. resolve the lab-feed connection directly
const data = await resolveConnections(SAMPLE);
const feed = data.labFeed;
ok(Array.isArray(feed), "labFeed resolved to an array");
ok(Array.isArray(feed) && feed.length > 0, `labFeed returned items (${Array.isArray(feed) ? feed.length : "n/a"})`);
ok(Array.isArray(feed) && feed.every((x) => "title" in x && "kind" in x), "items shaped by pick: {title, kind}");
const firstTitle = Array.isArray(feed) && feed[0] && feed[0].title;

// 2. SSR includes the live data (server-rendered, not client-fetched)
const srv = await createDevServer(SAMPLE, { port: 4397, refreshMs: 999999 });
const base = srv.url.replace(/\/$/, "");
const page = await (await fetch(base + "/")).text();
ok(page.includes("From the lab"), "feed block heading server-rendered");
ok(firstTitle ? page.includes(esc(firstTitle).slice(0, 24)) : true, "live feed item server-rendered into HTML");

// 3. /data endpoint exposes resolved connection data
const exposed = await (await fetch(base + "/data")).json();
ok(Array.isArray(exposed.labFeed) && exposed.labFeed.length > 0, "/data exposes resolved connection data");

console.log(`\n  ${pass} passed, ${fail} failed`);
srv.close();
process.exit(fail ? 1 : 0);

function esc(s = "") {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
