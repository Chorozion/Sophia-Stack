// pkg-entry.mjs — the entry that boots a deployed Sophia site.
// Bundled by scripts/package.mjs into package/app.js (React + all code inlined),
// so the uploaded artifact runs on plain Node with NO npm install.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createServer } from "./server.mjs";
import { DEFAULT_SITE } from "./default-site.mjs";

const here = dirname(fileURLToPath(import.meta.url)); // resolves to the package dir
const port = Number(process.env.PORT) || 3000;

const srv = await createServer({
  dir: join(here, ".sophia-data"),          // edits persist here (survive restart)
  port,
  route: "/",
  seedModel: DEFAULT_SITE,
  clientJs: join(here, "public", "client.js"),
  catalogPath: join(here, "catalog.json"),
  quiet: true,
});

console.log(`Sophia stack running on ${srv.url}`);
console.log(`First-run setup (set a password, get your agent token): ${srv.url}_setup`);
console.log(`Live editor: ${srv.editUrl}`);
