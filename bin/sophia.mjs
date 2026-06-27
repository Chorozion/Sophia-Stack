#!/usr/bin/env node
// sophia — the Sophia Stack CLI.
// Build/dev/package commands run against the repo source; data commands
// (template/backup/restore) operate on a deployment's ./.sophia-data.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename } from "node:path";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CWD = process.cwd();
const NODE = process.execPath;
const argv = process.argv.slice(2);
const cmd = argv[0];

const c = { gray: (s) => `\x1b[90m${s}\x1b[0m`, cyan: (s) => `\x1b[36m${s}\x1b[0m`, red: (s) => `\x1b[31m${s}\x1b[0m`, green: (s) => `\x1b[32m${s}\x1b[0m`, yellow: (s) => `\x1b[33m${s}\x1b[0m` };
const ok = (m) => console.log(c.green("✓ ") + m);
const info = (m) => console.log("  " + m);
const die = (m, hint) => { console.error(c.red("✗ ") + m); if (hint) console.error(c.gray("  → " + hint)); process.exit(1); };

function runScript(script, extra = []) {
  const path = join(REPO, "scripts", script);
  if (!existsSync(path)) die(`missing scripts/${script} — run this from the Sophia Stack repo.`);
  const r = spawnSync(NODE, [path, ...extra], { stdio: "inherit", cwd: REPO });
  if (r.status !== 0) die(`scripts/${script} failed (exit ${r.status}).`);
}
function needDeps() {
  if (!existsSync(join(REPO, "node_modules"))) die("dependencies not installed.", "run: npm install");
}
function dataDir() { return join(CWD, ".sophia-data"); }

const HELP = `${c.cyan("sophia")} — Sophia Stack CLI

${c.gray("Project (run inside the repo / a clone):")}
  sophia doctor              check your environment
  sophia build               build SSR + client bundles + catalog
  sophia package             produce the deployable artifact in package/
  sophia dev                 run the local dev server
  sophia init <dir>          build + package into a fresh deployable folder

${c.gray("AI providers (provider-agnostic — OpenAI/Anthropic/Gemini/local/custom):")}
  sophia ai:list             list AI providers detected from your env
  sophia ai:doctor           check which providers are configured
  sophia ai:test             send a tiny test prompt to the active provider
  sophia ai:set-default <p>  set the default provider in .env

${c.gray("Templates:")}
  sophia template list       list available starter templates
  sophia template create <slug>   seed ./.sophia-data with a template's model

${c.gray("Deployment data (run next to a deployment's .sophia-data):")}
  sophia backup [--out FILE]      back up ./.sophia-data to a .tgz
  sophia restore <FILE>           restore ./.sophia-data from a backup
  sophia deploy                   build the artifact + print deploy guidance

  sophia help                this help`;

function doctor() {
  console.log(c.cyan("sophia doctor\n"));
  const major = +process.versions.node.split(".")[0];
  major >= 18 ? ok(`Node ${process.versions.node} (>= 18)`) : die(`Node ${process.versions.node} is too old.`, "install Node 18+");
  existsSync(join(REPO, "node_modules")) ? ok("dependencies installed") : info(c.yellow("dependencies NOT installed — run: npm install"));
  existsSync(join(REPO, "dist", "ssr.mjs")) && existsSync(join(REPO, "public", "client.js")) ? ok("build artifacts present") : info(c.yellow("not built yet — run: sophia build"));
  existsSync(join(REPO, "package", "app.js")) ? ok("packaged artifact present") : info(c.gray("no package yet — run: sophia package"));
  const tcount = existsSync(join(REPO, "templates")) ? readdirSync(join(REPO, "templates")).filter((d) => existsSync(join(REPO, "templates", d, "template.json"))).length : 0;
  ok(`${tcount} template(s) available`);
  console.log("\n" + c.gray("All good? Try: sophia init mysite   (or)   sophia dev"));
}

function listTemplates() {
  const dir = join(REPO, "templates");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((d) => existsSync(join(dir, d, "template.json"))).map((slug) => {
    try { return { slug, ...JSON.parse(readFileSync(join(dir, slug, "template.json"), "utf8")) }; }
    catch { return { slug, name: slug, description: "(invalid template.json)" }; }
  });
}

function template(sub, arg) {
  if (sub === "list" || !sub) {
    const ts = listTemplates();
    if (!ts.length) return info("no templates found in templates/.");
    console.log(c.cyan("Available templates:\n"));
    for (const t of ts) console.log("  " + c.green((t.slug || "").padEnd(22)) + (t.description || t.name || ""));
    console.log("\n" + c.gray("Use one:  sophia template create <slug>"));
    return;
  }
  if (sub === "create") {
    if (!arg) die("which template?", "sophia template create <slug>   (see: sophia template list)");
    const mpath = join(REPO, "templates", arg, "model.json");
    if (!existsSync(mpath)) die(`template "${arg}" not found.`, "sophia template list");
    const model = readFileSync(mpath, "utf8");
    mkdirSync(dataDir(), { recursive: true });
    const target = join(dataDir(), "model.json");
    if (existsSync(target)) info(c.yellow("overwriting existing .sophia-data/model.json"));
    writeFileSync(target, model);
    ok(`seeded ./.sophia-data/model.json from template "${arg}".`);
    info("start it: node app.js   (or)   sophia dev");
    return;
  }
  die(`unknown template command "${sub}".`, "sophia template list | create <slug>");
}

function init(dir) {
  if (!dir) die("where?", "sophia init <dir>   e.g. sophia init mysite");
  const target = resolve(CWD, dir);
  if (existsSync(target) && readdirSync(target).length) die(`"${dir}" exists and is not empty.`);
  needDeps();
  ok("building + packaging…");
  runScript("build.mjs"); runScript("package.mjs");
  mkdirSync(target, { recursive: true });
  cpSync(join(REPO, "package"), target, { recursive: true });
  ok(`created ${dir}/ — a deployable Sophia Stack.`);
  console.log("\nNext:\n  cd " + dir + "\n  node app.js          " + c.gray("# local: http://localhost:3000") + "\n  " + c.gray("…or upload this folder to your host (start file: app.js, Node 18+).") + "\n  " + c.gray("Deploy guides: docs/deploy/"));
}

function backup() {
  if (!existsSync(dataDir())) die("no ./.sophia-data here.", "run this next to a deployment's data folder.");
  const out = (argv.includes("--out") && argv[argv.indexOf("--out") + 1]) || `sophia-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.tgz`;
  const r = spawnSync("tar", ["-czf", out, "-C", CWD, ".sophia-data"], { stdio: "inherit" });
  if (r.status !== 0) die("backup failed (is `tar` available?).");
  ok(`backed up ./.sophia-data -> ${out}`);
}
function restore(file) {
  if (!file) die("restore which file?", "sophia restore <backup.tgz>");
  if (!existsSync(file)) die(`"${file}" not found.`);
  if (existsSync(dataDir())) info(c.yellow("this will overwrite ./.sophia-data"));
  const r = spawnSync("tar", ["-xzf", file, "-C", CWD], { stdio: "inherit" });
  if (r.status !== 0) die("restore failed.");
  ok(`restored ./.sophia-data from ${file}`);
}
function deploy() {
  needDeps(); runScript("build.mjs"); runScript("package.mjs");
  ok("artifact ready in package/.");
  console.log("\nUpload the contents of package/ to your host (start file: app.js, Node 18+).");
  console.log(c.gray("  Hostinger: docs/deploy/hostinger.md   Railway: docs/deploy/railway.md"));
  console.log(c.gray("  Render: docs/deploy/render.md   VPS: docs/deploy/vps.md   Docker: docs/deploy/docker.md"));
  console.log(c.gray("  (One-command auto-deploy is planned — see ROADMAP.md.)"));
}

function loadEnv() {
  const f = join(CWD, ".env");
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
async function aiCmd(sub) {
  loadEnv();
  const { envProviders, resolveProvider, callProvider } = await import("../src/providers.mjs");
  const found = envProviders();
  if (sub === "list" || !sub) {
    console.log(c.cyan("AI providers (detected from env):\n"));
    const names = Object.keys(found);
    if (!names.length) info(c.yellow("none configured — copy .env.example to .env and add a key/endpoint."));
    for (const n of names) console.log("  " + c.green(n.padEnd(12)) + c.gray(found[n].type.padEnd(10) + (found[n].baseURL || "(default)") + "  " + (found[n].model || "")));
    if (process.env.SOPHIA_AI_PROVIDER) console.log("\n  default: " + c.cyan(process.env.SOPHIA_AI_PROVIDER));
    console.log("\n" + c.gray("Adapters: openai (+ every OpenAI-compatible host), anthropic, gemini"));
    return;
  }
  if (sub === "doctor") {
    console.log(c.cyan("sophia ai:doctor\n"));
    const names = Object.keys(found);
    names.length ? ok(`${names.length} provider(s): ${names.join(", ")}`) : info(c.yellow("no providers configured (see .env.example)"));
    const active = resolveProvider(null);
    active ? ok(`active: ${active.type} ${c.gray(active.model || "default model")}`) : info(c.yellow("no active provider — set one, or configure it in the dashboard"));
    return;
  }
  if (sub === "test") {
    const active = resolveProvider(null);
    if (!active) die("no provider configured.", "add a key to .env (see .env.example), then: sophia ai:test");
    info(`testing ${active.type} (${active.model || "default"})…`);
    try { const r = await callProvider(active, [{ role: "user", content: "Reply with one word: ready" }], []); ok("provider replied: " + JSON.stringify(String(r.content || "").slice(0, 80))); }
    catch (e) { die("provider call failed: " + e.message, "check the key, model name, and base URL"); }
    return;
  }
  if (sub === "set-default") {
    const name = argv[1];
    if (!name) die("which provider?", "sophia ai:set-default <name>");
    const f = join(CWD, ".env");
    let txt = existsSync(f) ? readFileSync(f, "utf8") : "";
    txt = /^SOPHIA_AI_PROVIDER=.*$/m.test(txt) ? txt.replace(/^SOPHIA_AI_PROVIDER=.*$/m, "SOPHIA_AI_PROVIDER=" + name) : "SOPHIA_AI_PROVIDER=" + name + "\n" + txt;
    writeFileSync(f, txt);
    ok(`default provider set to "${name}" in .env`);
    return;
  }
  die(`unknown ai command "${sub}".`, "sophia ai:list | ai:doctor | ai:test | ai:set-default <name>");
}

if (cmd === "ai" || (cmd && cmd.startsWith("ai:"))) { await aiCmd(cmd.startsWith("ai:") ? cmd.slice(3) : argv[1]); process.exit(0); }

switch (cmd) {
  case "doctor": doctor(); break;
  case "build": needDeps(); runScript("build.mjs"); break;
  case "package": needDeps(); runScript("package.mjs"); break;
  case "dev": needDeps(); runScript("dev.mjs"); break;
  case "init": init(argv[1]); break;
  case "template": template(argv[1], argv[2]); break;
  case "backup": backup(); break;
  case "restore": restore(argv[1]); break;
  case "deploy": deploy(); break;
  case "help": case "--help": case "-h": case undefined: console.log(HELP); break;
  default: die(`unknown command "${cmd}".`, "sophia help");
}
