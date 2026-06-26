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
  // CommonJS output: the most compatible format for shared/Passenger Node hosts
  // (Hostinger). `require` is native here, so no createRequire shim is needed and
  // react-dom/server's require("stream") resolves directly.
  bundle: true, platform: "node", format: "cjs", jsx: "automatic",
  minify: true,
  // CJS has no import.meta.url; map it to this file's real URL via __filename so
  // module-level `new URL("../x", import.meta.url)` defaults resolve (don't crash).
  banner: { js: "const __sophiaMetaUrl=require('url').pathToFileURL(__filename).href;" },
  define: { "import.meta.url": "__sophiaMetaUrl" },
});

copyFileSync(join(root, "public/client.js"), join(out, "public/client.js"));
copyFileSync(join(root, "catalog.json"), join(out, "catalog.json"));

writeFileSync(join(out, "package.json"), JSON.stringify({
  // No "type":"module" -> app.js is CommonJS, the format Passenger loads reliably.
  name: "sophia-site", private: true, main: "app.js",
  scripts: { start: "node app.js" }, engines: { node: ">=18" },
  // Express is bundled into app.js (the app runs with no install); it's declared
  // here so framework-detecting hosts (Hostinger, etc.) recognize + accept it.
  dependencies: { express: "^5.2.1" },
}, null, 2) + "\n");

// Passenger / cPanel / Hostinger Node apps look for these entry names (CJS).
writeFileSync(join(out, "startup.js"), 'require("./app.js");\n');
writeFileSync(join(out, "server.js"), 'require("./app.js");\n');

writeFileSync(join(out, "README.txt"), `SOPHIA STACK — your self-hosted, AI-built website

WHAT THIS IS
  A website you own. After a one-time setup, you hand any AI (ChatGPT, Claude, Grok)
  a key + your URL and it builds the site live — no SSH, no redeploys. Your edits
  persist in ./.sophia-data (keep that folder across updates). Zero npm install.

DEPLOY ON HOSTINGER (Setup Node.js App)
  1. Upload this folder (or its .zip) into your domain's directory in hPanel File
     Manager, and Extract it there.
  2. hPanel -> Advanced -> Setup Node.js App:
       - Application root: the folder you extracted (the one containing app.js)
       - Application startup file: app.js
       - Node version: 18 or higher
     Create, then Start/Restart.
  3. Open https://yourdomain/ in a browser.
  (Same idea on Railway/Render/a VPS: start file = app.js, Node >= 18.)

FIRST RUN
  1. On your site, click "Get started".
  2. Create your admin username + password (stored automatically).
     -> SAVE the five-word recovery string shown ONCE. It is your only way back in
        if you lose the password or someone else gets it.
  3. You land in your Dashboard. On the "Connect" tab, "Mint a new key" (mykey-...).

PUT YOUR AI TO WORK (no CLI — just a chat)
  In ChatGPT / Claude / Grok, paste:
    "Read https://yourdomain/skill.md, then build my website using key mykey-XXXX."
  The AI reads the skill, connects with the key, and builds — pages, design, data,
  photos/video, even sandboxed backend logic. Watch it live at https://yourdomain/.

YOUR DASHBOARD (https://yourdomain/dashboard)
  Pages - Data - Media (upload photos/files/video) - Keys (revoke anytime) -
  Settings (site description + optional "Sign in with Google" with your own OAuth app).

SAFE BY DEFAULT
  Every edit is validated before it lands; bad edits are rejected. Version history +
  one-call rollback. The footer (Admin + "Powered by Sophia Stack") and the core
  cannot be edited away. SECURITY.txt explains exactly what the AI can and cannot do.
`);

// What the safety environment CAN and CANNOT do — ships with the artifact.
writeFileSync(join(out, "SECURITY.txt"), `SOPHIA STACK — what the AI can and cannot do (v1)

THE AI CAN
  - Add/edit/delete pages; write custom HTML / CSS / JS for the front end.
  - Define data collections + CRUD (real forms, lists, dynamic content).
  - Upload + use media (photos, files, video).
  - Write sandboxed backend functions (server logic at /api/fn/<name>).
  - Use built-in blocks, style presets, and effects; roll changes back.

THE AI CANNOT
  - Touch or break the framework core, or remove the footer / "Powered by Sophia Stack".
  - Read your password, recovery string, tokens, or any secret.
  - Reach the host OS, filesystem, network, or other sites — backend code runs in a
    locked-down sandbox (no require/process/fs/network, with a timeout).
  - Run arbitrary server code outside that sandbox.

YOUR SAFETY ENV
  - Runs in YOUR own contained instance (your host, your data dir).
  - Every edit validated before it lands; bad edits rejected; one-click rollback.
  - Token-gated writes; revoke any key instantly from the dashboard.
  - Recovery: a five-word string (shown once) resets your login AND revokes every
    key + session, locking out anyone who got in. Lose both password and string?
    Delete the "auth" block in .sophia-data/tokens.json on your host and re-run setup.

  NOTE: custom front-end JS the AI writes runs in your visitors' browsers (it's your
  site, your call). Keep your key private — anyone with it can edit your site.
`);

console.log("packaged -> " + out);
console.log("  app.js (bundled, no deps) + public/client.js + catalog.json + entry stubs");
