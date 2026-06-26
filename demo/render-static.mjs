import { writeFileSync, mkdirSync } from "node:fs";
import { ssr } from "../dist/ssr.mjs";
import { themeOf } from "../src/theme.mjs";
import { resolveConnections } from "../src/connections.mjs";
import { SAMPLE } from "./sample-model.mjs";
mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
const t = themeOf(SAMPLE);
const data = await resolveConnections(SAMPLE);   // pull real lab-feed data
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Sophia Stack — full-stack (React SSR + live data)</title></head>
<body style="margin:0;background:${t.bg};color:${t.fg};font-family:system-ui,Segoe UI,Roboto,sans-serif">
<div id="root">${ssr(SAMPLE, "/", data)}</div></body></html>`;
const out = new URL("./out/react-ssr-live.html", import.meta.url);
writeFileSync(out, html);
console.log("wrote", out.pathname, "with", (data.labFeed||[]).length, "live feed items");
