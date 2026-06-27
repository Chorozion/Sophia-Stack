# Updates & auto-migration

Sophia Stack keeps existing deployments current **without losing data**. The design is **pull-based**:
each deployment checks the public release channel, alerts the owner, and — the important part — **migrates
its own stored data forward, non-destructively, when it boots on newer code.**

> Why pull, not push? It's private and safe: no deployment "phones home" with identifying data, and
> there's no central registry of who runs Sophia. Each site asks the channel; nothing is tracked.

## How an existing stack stays up to date

1. **Awareness.** On the dashboard (**Settings → Updates**) and via `GET /api/sophia/update`, a
   deployment compares its version to the latest release and shows "Update available → vX.Y.Z" with a
   link to the notes. Extensions can react to the `update.available` hook. (Disable with
   `SOPHIA_UPDATE_CHECK=off`; point elsewhere with `SOPHIA_UPDATE_URL`.)
2. **Update the code.** Either:
   - `sophia update --apply` — downloads the latest release, **backs up your current code**, swaps
     `app.js` / `public/` / `catalog.json`, and **leaves `.sophia-data` untouched**; or
   - replace those same files manually from the release zip (keep `.sophia-data`).
   Then restart (Passenger: `touch tmp/restart.txt`; pm2: `pm2 restart all`; systemd: `systemctl restart`).
3. **Auto-migration on boot (non-destructive).** When the new code starts, it brings your stored data
   up to the new version automatically:
   - It **backs up your state first** (`.sophia-data/backups/pre-<version>-<ts>/` — model, CSS, tokens,
     accounts, history).
   - It runs only **forward, additive** migrations (never deletes data).
   - It stamps `.sophia-data/.sophia-version` **only after success**. If a migration fails, your data is
     left exactly as it was (and retried next boot) — nothing is half-applied.

Your model, members, payment config, media, and history all carry forward.

## CLI

```bash
sophia update           # is there a newer version? (shows notes; never changes anything)
sophia update --apply   # download + back up code + swap files (keeps .sophia-data) + restart hint
```

## Configuration (env)

| Variable | Default | Purpose |
|---|---|---|
| `SOPHIA_UPDATE_CHECK` | on | set `off` to disable update checks entirely |
| `SOPHIA_UPDATE_URL` | official GitHub releases | point at your own release channel/mirror |

## For maintainers: publishing an update

Bump `src/version.mjs` (and `package.json`), add any needed migration to `MIGRATIONS` in
`src/migrate.mjs` (forward + idempotent + additive only), update `CHANGELOG.md`, then tag `vX.Y.Z` —
the release workflow builds and publishes the artifact that deployments will detect.

> **(planned)** Release-asset **signature/checksum verification** before `--apply` swaps files, and a
> one-click in-dashboard updater for self-managed hosts. Until then, `--apply` downloads over HTTPS from
> the configured channel and keeps a backup of the previous code so you can revert.
