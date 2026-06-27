# Installation

Sophia Stack runs as a single self-contained CommonJS Express app
(`app.js`) that needs **zero `npm install` at runtime**. You can either grab the
prebuilt zip or build the artifact from source.

## Prerequisites

- **Node 18 or newer** on the host that runs the site (this is enforced by the
  artifact's `engines` field).
- **For building from source only:** Node 18+ and `npm` on your machine.
- A host that can run a Node start command (Hostinger, Railway, Render, a VPS,
  Docker — see the [deploy guides](deploy/)).

There is **no external database** and no other services to provision. All state
lives in a local data directory (see [Where your data lives](#where-your-data-lives)).

## Option 1 — Get the prebuilt zip (no build needed)

1. Download **`release/sophia-stack.zip`** from this repo.
2. Upload it to your host and extract it.
3. Set the start file to **`app.js`** (Node 18+) and start it.

The zip contains:

```
app.js          # the whole server (React + all src bundled, no deps to install)
public/client.js
catalog.json
package.json    # main: app.js, start: node app.js, engines node>=18
startup.js      # require("./app.js")  — alt entry some hosts look for
server.js       # require("./app.js")  — alt entry some hosts look for
README.txt      # deploy steps
SECURITY.txt    # what the AI can and cannot do
```

The zip's own **`README.txt`** has host-specific deploy steps as well.

## Option 2 — Build the artifact from source

From the repo root:

```bash
npm install                  # install dev/build deps (esbuild, react)
npm run build                # produce the SSR + client bundles
npm test                     # optional: full demo test suite
node scripts/package.mjs     # produce package/ — the deployable artifact
```

`node scripts/package.mjs` (or `npm run package`) writes everything listed above
into a **`package/`** directory. That folder is exactly what you upload and run;
zip it up if your host wants an archive.

### Useful npm scripts

| Script | What it does |
|---|---|
| `npm run build` | Build the SSR + client bundles (`scripts/build.mjs`). |
| `npm run catalog` | Regenerate `catalog.json` (`scripts/catalog.mjs`). |
| `npm run package` | Build everything into `package/` — the deployable artifact. |
| `npm run dev` | Local dev server (`scripts/dev.mjs`). |
| `npm run serve` | Serve a built artifact locally (`scripts/serve.mjs`). |
| `npm test` | Run the demo test suite. |

## Running it

The app listens on **`process.env.PORT`** and supports both forms:

- A **numeric** port (e.g. `3000`) → it binds a TCP socket on `0.0.0.0`.
  This is what Railway, Render, Docker, and a VPS use.
- A **Unix socket path** → it binds that socket. This is what Passenger
  (Hostinger / cPanel "Node.js App") passes.

If `PORT` is unset it defaults to `3000`. To run locally from the built artifact:

```bash
cd package
PORT=3000 node app.js
# open http://localhost:3000  → click "Get started"
```

## Where your data lives

All of your site's state persists in a **`.sophia-data`** directory created next
to `app.js` on the host. This includes your pages/site model, custom CSS, data
collections, uploaded media, auth (hashed password + recovery), and the
`tokens.json` with your minted keys.

> **Keep `.sophia-data` across updates.** It is your entire site. There is no
> external DB to fall back on.

## Updating without losing your site

Because all state is in `.sophia-data`, updating is just replacing the code files
and leaving that folder in place:

1. Build (or download) the new artifact.
2. Replace `app.js`, `public/client.js`, and `catalog.json` (and the entry stubs)
   on the host.
3. **Do not delete `.sophia-data`** — leave it exactly where it is, next to `app.js`.
4. Restart the app.

Your pages, media, keys, login, and recovery phrase all survive the update.

## Troubleshooting

- **App won't boot:** the entry writes any startup error's stack trace to
  `startup-error.log` next to `app.js`. Open it in your host's File Manager.
- **"Cannot find module" / needs install:** you're likely running `src/` instead
  of the packaged artifact. Run `node scripts/package.mjs` and deploy `package/`
  (or the zip) — the bundled `app.js` has no runtime dependencies.
- **Wrong Node version:** the artifact requires Node **>=18**. Set the host's
  Node version to 18 or newer.
- **Data disappeared after update:** you replaced or wiped `.sophia-data`. Restore
  it from a backup; always preserve that folder across updates.
