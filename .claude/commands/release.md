---
description: Cut a release (version bump, changelog, tag, artifact)
---

Cut a Sophia Stack release. Args: the new version (e.g. `1.1.0`).

1. **Green check** — `npm run build`, `npm test`, `node scripts/package.mjs`, boot-check `package/app.js`.
2. **Run** `/security-review` and `/audit`; fix anything critical/high first.
3. **Version** — bump `package.json` `version`.
4. **Changelog** — move the `Unreleased` items into a new `## [<version>] - <date>` section and add
   the compare/tag links at the bottom of `CHANGELOG.md`.
5. **Refresh the artifact** — rebuild `release/sophia-stack.zip` from `package/`.
6. **Commit** — `release: vX.Y.Z` (follow the repo's commit attribution).
7. **Tag + push** — `git tag vX.Y.Z && git push origin main --tags`. The `release` GitHub Action
   builds, tests, packages, zips, and creates the GitHub Release with generated notes.

Never tag a red build. Never include secrets in the artifact or release notes.
