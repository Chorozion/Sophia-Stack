## What & why

Briefly describe the change and the problem it solves.

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Docs
- [ ] Refactor / chore

## Checklist

- [ ] `npm run build` succeeds
- [ ] `npm test` is green (and I added/updated a `demo/*-test.mjs` if I changed behavior)
- [ ] `npm run package` still produces a bootable `package/app.js` (if I touched the runtime)
- [ ] Docs and `CHANGELOG.md` (Unreleased) updated for any user-facing change
- [ ] No secrets, tokens, system paths, or `.sophia-data` committed
- [ ] I did not weaken validate-before-commit, the immutable core/footer, token auth,
      recovery, the brute-force guard, or the sandbox boundaries
- [ ] Any not-yet-implemented behavior is marked `(planned)`, not described as done

## Notes for reviewers
