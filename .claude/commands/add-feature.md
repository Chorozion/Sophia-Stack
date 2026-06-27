---
description: Add a feature to Sophia Stack safely and test-first
---

Implement a new feature in the runtime. Args: a short description of the feature.

Process (keep it incremental and reliable):

1. **Inspect** the relevant `src/` files (read `CLAUDE.md` for the architecture map).
2. **Plan** a small, focused change. State the API surface, the data it touches, and the auth gate
   (owner session / Bearer token / public). Default to the most restrictive gate that works.
3. **Implement** in the smallest number of files. Reuse existing helpers
   (`doPatch`, `auth`, `canEdit`, `isAdmin`, `doSetCss`, `store.*`).
4. **Never regress the safety rules** in `CLAUDE.md` (validate-before-commit, immutable core/footer,
   auth, recovery, brute-force guard, sandbox, CommonJS artifact + `PORT` handling).
5. **Test** — add a `demo/<feature>-test.mjs`, wire it into `demo/run-all.mjs`, and run `npm test`.
   If it touches served HTML/inline JS, confirm `demo/ui-test.mjs` still passes.
6. **Rebuild the artifact** — `npm run build && node scripts/package.mjs` and boot-check `package/app.js`.
7. **Docs + changelog** — update `docs/` and `CHANGELOG.md`. Mark partial work `(planned)`.

If the feature is large, split into a minimal first slice plus well-scoped TODO issues.
