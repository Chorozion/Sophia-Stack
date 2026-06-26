// build.mjs — compile the SSR bundle (node) + the client bundle (browser).
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "dist"), { recursive: true });
mkdirSync(join(root, "public"), { recursive: true });

// Server SSR bundle — react/react-dom resolved at runtime from node_modules.
await build({
  entryPoints: [join(root, "src/entry-server.jsx")],
  outfile: join(root, "dist/ssr.mjs"),
  bundle: true, platform: "node", format: "esm", jsx: "automatic",
  external: ["react", "react-dom"],
});

// Client bundle — react bundled in for the browser.
await build({
  entryPoints: [join(root, "src/entry-client.jsx")],
  outfile: join(root, "public/client.js"),
  bundle: true, platform: "browser", format: "iife", jsx: "automatic",
  minify: true, sourcemap: false,
});

console.log("build OK -> dist/ssr.mjs + public/client.js");
