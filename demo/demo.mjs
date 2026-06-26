// demo.mjs — prove the Sophia Stack thesis end-to-end:
//   compact Site Model  ->  rendered site  ->  surgical live patches  ->  re-render
// and measure the token cost of authoring + editing vs hand-written HTML.
//
// Run: npm run demo   (from D:/sophiaxt/sophia-stack)

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPage } from "../src/render.mjs";
import { applyPatch } from "../src/patch.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "out");
mkdirSync(out, { recursive: true });

// crude token estimate (~4 chars/token) — directional, good enough to show the gap
const tok = (s) => Math.round((typeof s === "string" ? s : JSON.stringify(s)).length / 4);

// ── 1. A whole landing page as a compact Site Model ──────────────────────────
const model = {
  site: "sophia-stack",
  theme: "dark",
  pages: {
    "/": {
      title: "Sophia Stack",
      blocks: [
        { id: "nav", type: "nav", brand: "Sophia", links: ["Product", "Docs", "Pricing"] },
        { id: "hero", type: "hero",
          headline: "Ship sites in tokens, not files",
          sub: "An AI-optimized stack: build, edit, and deploy at minimal token cost.",
          cta: { label: "Get started", href: "/start" } },
        { id: "feat", type: "features", items: [
          { t: "Token-efficient", d: "Author whole sites in a compact, addressable model." },
          { t: "Real-time edits", d: "Surgical patches apply live — no rebuilds." },
          { t: "Safe deploys", d: "Non-destructive releases with backup + rollback." },
        ] },
        { id: "cta", type: "cta", headline: "Build with Sophia",
          button: { label: "Start free", href: "/start" } },
        { id: "foot", type: "footer", text: "(c) SOPHIA XT" },
      ],
    },
  },
};

const html1 = renderPage(model, "/");
writeFileSync(join(out, "page-v1.html"), html1);

// ── 2. Three iterative edits — as surgical, addressable patches ──────────────
const patches = [
  { op: "set", id: "hero", path: "headline", value: "Build websites the way AI thinks" },
  { op: "set", id: "feat", path: "items.3", value: { t: "Multi-site", d: "One toolchain runs many sites." } },
  { op: "add", route: "/", index: 4, value: { id: "cta2", type: "cta", headline: "See the token numbers",
    button: { label: "Read more", href: "/benchmark" } } },
];
const { model: model2, changed } = applyPatch(model, patches);
const html2 = renderPage(model2, "/");
writeFileSync(join(out, "page-v2.html"), html2);

// ── 3. Report the token economics ────────────────────────────────────────────
const modelTokens = tok(model);
const htmlTokens = tok(html1);
const patchTokens = tok(patches);

const line = (s = "") => process.stdout.write(s + "\n");
line("\n==================  SOPHIA STACK — v0 PROOF  ==================\n");
line("AUTHORING a full landing page:");
line(`  Site Model:        ${JSON.stringify(model).length.toString().padStart(6)} chars  (~${modelTokens} tokens)`);
line(`  Rendered HTML:     ${html1.length.toString().padStart(6)} chars  (~${htmlTokens} tokens)`);
line(`  -> the AI writes ~${(htmlTokens / modelTokens).toFixed(1)}x fewer tokens than the hand-coded equivalent`);
line("");
line("EDITING (3 changes: rewrite headline, add a feature, insert a section):");
line(`  Patch payload:     ${JSON.stringify(patches).length.toString().padStart(6)} chars  (~${patchTokens} tokens)`);
line(`  Re-emitting HTML:  ${html2.length.toString().padStart(6)} chars  (~${tok(html2)} tokens)`);
line(`  -> editing costs ~${(tok(html2) / patchTokens).toFixed(0)}x fewer tokens than re-writing the file`);
line(`  changed nodes (for live partial re-render): ${changed.join(", ")}`);
line("");
line("Output written:");
line(`  ${join(out, "page-v1.html")}`);
line(`  ${join(out, "page-v2.html")}`);
line("\n==============================================================\n");
