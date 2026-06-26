// pkg-entry.mjs — the entry that boots a deployed Sophia site.
// Bundled by scripts/package.mjs into package/app.js (React + all code inlined),
// so the uploaded artifact runs on plain Node — no top-level await (works as CJS),
// and any boot failure is written to startup-error.log you can open in File Manager.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync } from "node:fs";
import { createServer } from "./server.mjs";
import { DEFAULT_SITE } from "./default-site.mjs";

const here = dirname(fileURLToPath(import.meta.url)); // resolves to the package dir
// Passenger (Hostinger) passes PORT as a Unix SOCKET PATH; container hosts pass a
// numeric port. Honor both: numeric -> TCP port, anything else -> bind that socket.
const pEnv = process.env.PORT;
const port = pEnv && /^\d+$/.test(pEnv) ? Number(pEnv) : (pEnv || 3000);

(async () => {
  try {
    const srv = await createServer({
      dir: join(here, ".sophia-data"),        // edits persist here (survive restart)
      port,
      route: "/",
      seedModel: DEFAULT_SITE,
      clientJs: join(here, "public", "client.js"),
      catalogPath: join(here, "catalog.json"),
      quiet: true,
    });
    console.log(`Sophia stack running on ${srv.url} (PORT=${String(pEnv)})`);
    console.log(`Get started: ${srv.url}_setup   Dashboard: ${srv.url}dashboard`);
  } catch (err) {
    const msg = `[Sophia boot error ${new Date().toISOString()}] PORT=${String(pEnv)}\n` +
      (err && err.stack ? err.stack : String(err)) + "\n";
    try { writeFileSync(join(here, "startup-error.log"), msg); } catch {}
    console.error(msg);
    process.exit(1);
  }
})();
