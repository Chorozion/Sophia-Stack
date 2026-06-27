# Deploy on Railway

Railway runs the artifact as a long-lived Node service. It injects a numeric
`PORT`, which Sophia Stack binds as a TCP socket on `0.0.0.0` automatically.

## Prerequisites

- A [Railway](https://railway.app) account.
- The deployable artifact: the contents of **`package/`** (built from source) or
  the extracted **`release/sophia-stack.zip`**. You want `app.js` at the service
  root. See [installation.md](../installation.md).
- Node **18+** (set on the service).

## Steps

1. **Create a project.** In Railway, **New Project → Empty Project** (or deploy
   from a repo that contains `app.js`, `public/`, and `catalog.json` at its root).

2. **Get the artifact into the service.** Easiest path: put the contents of
   `package/` (i.e. `app.js`, `public/client.js`, `catalog.json`, `package.json`)
   at the repo root that Railway builds from, and push.

3. **Set the start command** (Service → **Settings → Deploy → Start Command**):

   ```
   node app.js
   ```

4. **Set the Node version** to **18+**. Railway respects the `engines.node`
   field in `package.json` (the artifact declares `>=18`); you can also pin it
   with a `NIXPACKS_NODE_VERSION` variable or a `.nvmrc` if you prefer.

5. **`PORT` is automatic.** Railway sets `PORT` for you — do **not** hard-code a
   port. The app reads `process.env.PORT` and binds it.

6. **Deploy.** Railway builds and starts the service. Open the generated public
   URL (Service → **Settings → Networking → Generate Domain** if you don't have
   one yet).

## Verify it works

- The public URL loads the default page (Admin / "Powered by Sophia Stack" footer).
- Click **Get started** (or `/_setup`) and create your admin account; save the
  five-word recovery phrase.
- `/dashboard` loads and you can log in.

## Troubleshooting

- **Crash / no listen:** make sure the start command is `node app.js` and you did
  **not** set `PORT` to a fixed value — let Railway inject it.
- **Build can't find `app.js`:** the artifact must be at the path Railway builds
  from. Deploy the *contents* of `package/`, not the repo's `src/`.
- **Wrong Node version:** set Node to 18+ via `engines`, `.nvmrc`, or a Railway
  variable.
- **Boot error:** the app writes the stack trace to `startup-error.log` next to
  `app.js`; view it from the deployment's file shell/logs.
- **Data persistence:** your site lives in `.sophia-data` next to `app.js`. On
  ephemeral filesystems, attach a **Railway Volume** mounted at that path so your
  pages, media, and login survive redeploys.
