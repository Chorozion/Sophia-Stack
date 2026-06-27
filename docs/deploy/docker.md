# Deploy with Docker

You can run Sophia Stack in a container. The artifact is a single CommonJS
`app.js` with no runtime install, so the image is tiny.

> **Note:** there is **no Dockerfile shipped in this repo yet** — a bundled
> Dockerfile is **(planned)**. Until then, copy the working Dockerfile below into
> your project and build from it.

## Prerequisites

- [Docker](https://www.docker.com/) installed.
- The deployable artifact (`app.js`, `public/`, `catalog.json`, `package.json`)
  from `package/` or the extracted `release/sophia-stack.zip`. See
  [installation.md](../installation.md).

## Steps

1. **Lay out the build context.** Put the artifact in a `package/` folder next to
   the Dockerfile you're about to create:

   ```
   my-sophia-deploy/
     Dockerfile
     package/
       app.js
       public/client.js
       catalog.json
       package.json
   ```

2. **Create the `Dockerfile`** (copy this exactly):

   ```dockerfile
   FROM node:20-alpine
   WORKDIR /app

   # The artifact has no runtime deps to install — just copy it in.
   COPY package/ ./

   # Persist the site between runs (pages, media, login, keys).
   VOLUME ["/app/.sophia-data"]

   ENV PORT=3000
   EXPOSE 3000

   CMD ["node", "app.js"]
   ```

3. **Build the image:**

   ```bash
   docker build -t sophia-stack .
   ```

4. **Run it,** publishing the port and persisting the data dir:

   ```bash
   docker run -d --name sophia \
     -p 3000:3000 \
     -v sophia-data:/app/.sophia-data \
     sophia-stack
   ```

   The named volume `sophia-data` keeps your whole site across container
   recreations. (You can swap it for a bind mount like
   `-v "$PWD/.sophia-data:/app/.sophia-data"` if you prefer a host folder.)

## Verify it works

- `docker ps` shows the `sophia` container **Up**.
- `http://localhost:3000/` loads the default page (Admin / "Powered by Sophia Stack").
- Click **Get started** (or `/_setup`), create the admin account, save the
  five-word recovery phrase.
- `http://localhost:3000/dashboard` loads and you can log in.

## Troubleshooting

- **Container exits immediately:** check `docker logs sophia`. The app also writes
  the boot stack trace to `/app/startup-error.log` inside the container.
- **Can't reach it:** confirm the `-p 3000:3000` mapping and that `EXPOSE`/`PORT`
  match. The app reads `process.env.PORT` (numeric → TCP on `0.0.0.0`).
- **Site reset after recreating the container:** you didn't mount a volume at
  `/app/.sophia-data`. Re-run with `-v sophia-data:/app/.sophia-data` so your
  pages, media, and login persist.
- **Updating:** rebuild the image with the new `package/` contents and recreate
  the container — keep the same `-v sophia-data:/app/.sophia-data` volume so your
  site survives. See [installation.md](../installation.md).
