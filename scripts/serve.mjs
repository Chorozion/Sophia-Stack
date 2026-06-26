// serve.mjs — run the self-contained Sophia server. Run: npm run serve
import { fileURLToPath } from "node:url";
import { createServer } from "../src/server.mjs";
import { SAMPLE } from "../demo/sample-model.mjs";

const dir = process.env.SOPHIA_DIR || fileURLToPath(new URL("../.sophia-data", import.meta.url));
const srv = await createServer({ dir, port: Number(process.env.PORT) || 4321, seedModel: SAMPLE });

console.log(`\n  Sophia (self-contained)  ->  ${srv.url}`);
console.log(`  Live CSS editor          ->  ${srv.editUrl}`);
console.log(`  Catalog (for an LLM)     ->  ${srv.url}api/sophia/catalog`);
console.log(`  Edits persist to:            ${dir}  (survive restart, no redeploy)`);
console.log(`  Write API needs:  Authorization: Bearer <token>   (POST /api/sophia/patch, PUT /api/sophia/css)\n`);
