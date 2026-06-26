// styles-demo.mjs — render the SAME Site Model through every style preset.
// Proves the "huge range / wow / no-slop" claim: one model, radically different
// premium designs, just by changing `style`. Run: node demo/styles-demo.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { ssr } from "../dist/ssr.mjs";
import { pageHead, PRESET_NAMES } from "../src/styles.mjs";
import { resolveConnections } from "../src/connections.mjs";
import { SAMPLE } from "./sample-model.mjs";

mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
const data = await resolveConnections(SAMPLE); // shared live data

for (const style of PRESET_NAMES) {
  const model = { ...SAMPLE, style };
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sophia Stack — ${style}</title>${pageHead(model, "/")}</head>
<body><div id="root">${ssr(model, "/", data)}</div></body></html>`;
  const out = new URL(`./out/style-${style}.html`, import.meta.url);
  writeFileSync(out, html);
  console.log(`  ${style.padEnd(12)} -> ${out.pathname}  (${html.length} chars)`);
}
console.log(`\nSame model, ${PRESET_NAMES.length} presets, ${data.labFeed?.length || 0} live feed items each.`);
