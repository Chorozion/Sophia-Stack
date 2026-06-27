# Deploy on Hostinger ("Setup Node.js App")

Hostinger runs Node apps under **Passenger**. Sophia Stack ships as a CommonJS
`app.js` specifically so it loads reliably here. This is a one-time setup.

## Prerequisites

- A Hostinger plan with **Setup Node.js App** in hPanel (Advanced section).
- The artifact: **`release/sophia-stack.zip`** (or `package/` built from source —
  see [installation.md](../installation.md)).
- A domain (or subdomain) pointed at the hosting.

## Steps

1. **Upload the zip.** In hPanel → **Files → File Manager**, open your domain's
   directory and upload **`sophia-stack.zip`**, then **Extract** it there. You
   should end up with a folder containing **`app.js`**, `public/`, `catalog.json`,
   and `package.json`.

2. **Open Setup Node.js App.** hPanel → **Advanced → Setup Node.js App**
   (or **Website → Node.js**) → **Create application**.

3. **Fill in the form:**
   - **Application root:** the folder you extracted (the one that contains `app.js`).
   - **Application startup file:** `app.js`
   - **Application URL:** your domain (or subdomain).
   - **Node.js version:** **18** or higher.

4. **Create** the application.

5. **NPM install (optional but harmless).** Use the **Run NPM Install** button if
   shown. The app has no runtime dependencies bundled separately — Express is
   already inside `app.js` — but `package.json` declares Express so Hostinger's
   framework detection is happy. Install is fine to run and not required to work.

6. **Start / Restart** the application.

7. Open **`https://yourdomain/`** in a browser.

## Verify it works

- `https://yourdomain/` loads the default page (with the **Admin** /
  "Powered by Sophia Stack" footer).
- Click **Get started** (or open `https://yourdomain/_setup`) and create your
  admin account — then save your five-word recovery phrase.
- `https://yourdomain/dashboard` loads and you can log in.

## Troubleshooting

- **503 Service Unavailable / app won't start.** Confirm:
  - the **startup file** is exactly `app.js`, and
  - the **Node version** is **18+**.

  This was the classic 503 cause — an ESM/top-level-await combined with Passenger
  passing `PORT` as a **Unix socket path** rather than a number. That is **fixed**:
  the app is now CommonJS and binds the socket path when `PORT` isn't numeric, so
  it boots correctly under Passenger. If you still see 503 after fixing the two
  settings above, restart the app and check the log below.

- **Read the boot error.** On any startup failure the app writes the full stack
  trace to **`startup-error.log`** next to `app.js`. Open it in File Manager.

- **Changes not taking effect.** Passenger caches the running process — hit
  **Restart** in Setup Node.js App after replacing files.

- **Updating later.** Replace `app.js`, `public/client.js`, and `catalog.json`,
  but **leave the `.sophia-data` folder** (next to `app.js`) in place — it holds
  your whole site. Then Restart. See [installation.md](../installation.md).
