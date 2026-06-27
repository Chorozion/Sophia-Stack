# Deploy on a VPS (pm2 + reverse proxy)

On a plain VPS you run the artifact as a long-lived Node process (via **pm2** or
systemd) and put a reverse proxy (nginx/Caddy) in front of it for the domain and
HTTPS. You pick the numeric `PORT`; the app binds it as a TCP socket.

## Prerequisites

- A VPS with **Node 18+** installed.
- SSH access.
- The deployable artifact (`app.js`, `public/`, `catalog.json`, `package.json`)
  from `package/` or the extracted `release/sophia-stack.zip`. See
  [installation.md](../installation.md).
- A domain pointed at the VPS (for the reverse-proxy step).

## Steps

1. **Copy the artifact to the server**, e.g. into `/var/www/sophia`:

   ```bash
   scp -r ./package/* user@your-vps:/var/www/sophia/
   # or upload + unzip release/sophia-stack.zip into that folder
   ```

2. **Quick smoke test:**

   ```bash
   cd /var/www/sophia
   PORT=3000 node app.js
   # visit http://YOUR-VPS-IP:3000  → Ctrl+C when it works
   ```

3. **Run it with pm2** (keeps it alive + restarts on reboot):

   ```bash
   npm install -g pm2
   cd /var/www/sophia
   PORT=3000 pm2 start app.js --name sophia
   pm2 save
   pm2 startup        # follow the printed command to enable boot persistence
   ```

   Useful: `pm2 logs sophia`, `pm2 restart sophia`, `pm2 status`.

4. **Put a reverse proxy in front** so your domain serves it over 80/443. Example
   nginx server block proxying to the app on `127.0.0.1:3000`:

   ```nginx
   server {
       server_name yourdomain.com;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Then reload nginx and add TLS with `certbot --nginx` (or use Caddy, which does
   HTTPS automatically). Keep the app bound to localhost and let the proxy handle
   the public port.

## Verify it works

- `pm2 status` shows `sophia` **online**.
- `https://yourdomain.com/` loads the default page (Admin / "Powered by Sophia Stack").
- Click **Get started** (or `/_setup`), create the admin account, save the
  five-word recovery phrase.
- `/dashboard` loads and you can log in.

## Troubleshooting

- **App not reachable:** confirm pm2 shows it online and that nginx `proxy_pass`
  points at the same `PORT` you started it with.
- **Boot error:** the app writes the stack trace to `startup-error.log` next to
  `app.js`; also check `pm2 logs sophia`.
- **Wrong Node version:** ensure `node -v` is **>=18** for the user pm2 runs as.
- **Updating:** copy the new `app.js`, `public/client.js`, and `catalog.json` over,
  then `pm2 restart sophia`. **Leave `.sophia-data`** (next to `app.js`) in place —
  it is your whole site. See [installation.md](../installation.md).
