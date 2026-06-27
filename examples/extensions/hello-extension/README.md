# hello-extension

A minimal, working Sophia Stack extension you can copy as a starting point.

## What it does
- Registers an admin nav item and a `greeting` setting.
- Serves `GET /api/extensions/hello-extension/ping` (reads the site + lists AI providers).
- Serves `POST /api/extensions/hello-extension/stamp` (makes a **safe** patch — validated + rollback-able).
- Listens to the `page.afterSave` hook and writes to the audit log.

## Install (dev)
Copy this folder into your deployment's extension directory and restart:

```bash
cp -r examples/extensions/hello-extension <your-deploy>/.sophia-data/extensions/
# or run the server with: SOPHIA_EXTENSIONS_DIR=examples/extensions
```

Then: dashboard owner → `GET /api/sophia/extensions` shows it active, and
`curl http://localhost:3000/api/extensions/hello-extension/ping` returns the greeting.

See [docs/extensions/overview.md](../../../docs/extensions/overview.md).
