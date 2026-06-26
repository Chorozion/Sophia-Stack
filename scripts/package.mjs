// package.mjs — produce the self-contained, uploadable artifact.
// Output: package/  (app.js + public/client.js + catalog.json + entry stubs).
// Upload it to any Node cloud host, start it, visit /_setup. No npm install.
import { build } from "esbuild";
import { mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Ensure the SSR + client bundles and the catalog exist (these modules run on import).
await import("./build.mjs");
await import("./catalog.mjs");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "package");
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "public"), { recursive: true });

// Bundle the whole server (React + all src) into one file — zero runtime deps.
await build({
  entryPoints: [join(root, "src/pkg-entry.mjs")],
  outfile: join(out, "app.js"),
  bundle: true, platform: "node", format: "esm", jsx: "automatic",
  minify: true,
  // react-dom/server is CJS and does require("stream"); give the ESM bundle a
  // real require so Node builtins resolve (avoids "Dynamic require not supported").
  banner: { js: "import{createRequire as __cr}from'node:module';const require=__cr(import.meta.url);" },
});

copyFileSync(join(root, "public/client.js"), join(out, "public/client.js"));
copyFileSync(join(root, "catalog.json"), join(out, "catalog.json"));

writeFileSync(join(out, "package.json"), JSON.stringify({
  name: "sophia-site", private: true, type: "module", main: "app.js",
  scripts: { start: "node app.js" }, engines: { node: ">=18" },
}, null, 2) + "\n");

// Passenger / cPanel / Hostinger Node apps look for these entry names.
writeFileSync(join(out, "startup.mjs"), 'import "./app.js";\n');
writeFileSync(join(out, "server.js"), 'import "./app.js";\n');

writeFileSync(join(out, "README.txt"), `SOPHIA STACK — self-hosted site

WHAT THIS IS
  A self-contained website you own. An AI agent builds it live via a token API.
  No SSH redeploys, no staging. Edits persist in ./.sophia-data (keep it across updates).

DEPLOY (any Node cloud host — Hostinger, Railway, Render, a VPS, etc.)
  1. Upload this folder (or its zip) to your host.
  2. Set the Node app's start file to "app.js" (or startup.mjs) and Node >= 18.
  3. Start it. Point your domain at it.
  4. Visit  https://yourdomain/_setup  — set an owner password.
  5. Copy the agent token it shows you.

PUT YOUR AI TO WORK
  Hand your agent one line:
    "Connect to https://yourdomain/ with token <agent-token> and build my site."
  It reads /api/sophia/catalog, then edits live via /api/sophia/patch and /api/sophia/css.
  Watch it build in real time at  https://yourdomain/   — open the editor at /_edit.

SAFE BY DEFAULT
  Every edit is validated before it lands; bad edits are rejected. Version history +
  one-call rollback (/api/sophia/rollback). The core structure cannot be edited away.
`);

console.log("packaged -> " + out);
console.log("  app.js (bundled, no deps) + public/client.js + catalog.json + entry stubs");
