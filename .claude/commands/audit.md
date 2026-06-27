---
description: Full health audit of the repo (tests, build, package, links, secrets)
---

Run a complete audit of the Sophia Stack repo and report findings. Do not change code unless asked.

1. `npm run build` — must succeed.
2. `npm test` — must be green.
3. `node scripts/package.mjs` then verify `package/app.js` boots on a port and serves `/` + `/api/sophia/catalog`.
4. Check README and `docs/` for broken relative links and stale `(planned)` vs shipped claims.
5. Secret scan: `git grep -nIE 'sk-[A-Za-z0-9]{20}|mykey-[A-Za-z0-9_-]{16}|BEGIN .*PRIVATE KEY'` over tracked files — must be empty.
6. Confirm `package.json` license/private/version are consistent with `LICENSE` and `CHANGELOG.md`.
7. Confirm no `.sophia-data`, machine paths, or live deployment URLs are committed.

Summarize: what passed, what failed, and a prioritized list of fixes. Mark anything not implemented as `(planned)`.
