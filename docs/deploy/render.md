# Deploy on Render

Render runs the artifact as a **Web Service**. It provides a numeric `PORT`,
which Sophia Stack binds as a TCP socket on `0.0.0.0` automatically.

## Prerequisites

- A [Render](https://render.com) account.
- The deployable artifact at the repo/service root: `app.js`, `public/client.js`,
  `catalog.json`, `package.json` (from `package/` or the extracted
  `release/sophia-stack.zip`). See [installation.md](../installation.md).
- Node **18+**.

## Steps

1. **New → Web Service.** Connect the repo that has `app.js` at its root (or the
   subdirectory you point Render at via **Root Directory**).

2. **Configure the service:**
   - **Environment:** `Node`.
   - **Build Command:** leave empty (the artifact has no runtime install). If you
     deploy `src/` instead of the built artifact, use
     `npm install && npm run build && node scripts/package.mjs` and set the Root
     Directory to `package`.
   - **Start Command:**

     ```
     node app.js
     ```

3. **Set the Node version to 18+.** Either rely on the artifact's
   `engines.node` (`>=18`) or add an env var **`NODE_VERSION`** = `20`.

4. **`PORT` is automatic.** Render sets `PORT`; the app reads it. Do not hard-code
   a port.

5. **Create Web Service.** Render builds and starts it, then gives you an
   `onrender.com` URL (add a custom domain later if you want).

## Verify it works

- The `onrender.com` URL loads the default page (Admin / "Powered by Sophia Stack").
- Click **Get started** (or `/_setup`), create the admin account, save the
  five-word recovery phrase.
- `/dashboard` loads and you can log in.

## Troubleshooting

- **502 / "no open ports detected":** ensure the start command is `node app.js`
  and you let Render set `PORT` (don't override it).
- **Wrong Node version:** set `NODE_VERSION=20` or rely on `engines.node>=18`.
- **Boot error:** the app writes the stack trace to `startup-error.log` next to
  `app.js`; check the service **Logs**.
- **Data persistence:** your site lives in `.sophia-data` next to `app.js`.
  Render's default disk is ephemeral — attach a **Persistent Disk** mounted at the
  directory containing `app.js` (or at `.sophia-data`) so pages, media, and login
  survive deploys and restarts.
