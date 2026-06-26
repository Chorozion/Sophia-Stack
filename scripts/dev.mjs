// dev.mjs — start the real-time React edit runtime. Run: npm run dev
import { createDevServer } from "../src/dev-server-react.mjs";
import { SAMPLE } from "../demo/sample-model.mjs";

const srv = await createDevServer(SAMPLE, { port: Number(process.env.PORT) || 4321 });
console.log(`\n  Sophia dev runtime  ->  ${srv.url}`);
console.log(`  Open it, then POST patches to ${srv.url}patch to watch live edits, e.g.:`);
console.log(`    curl -X POST ${srv.url}patch -H "Content-Type: application/json" \\`);
console.log(`      -d '{"ops":[{"op":"set","id":"hero","path":"headline","value":"Edited live!"}]}'`);
console.log(`\n  Ctrl-C to stop.\n`);
