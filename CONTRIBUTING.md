# Contributing to Sophia Stack

Thanks for your interest in improving Sophia Stack — an open-source, self-hosted AI app builder.
This guide gets you productive fast and keeps the project boring, reliable, and safe.

## Ground rules

- **Don't break existing deployments.** The deployed artifact (`package/app.js`) must keep
  booting on plain Node 18+ with zero `npm install` and must keep honoring `process.env.PORT`
  (numeric TCP **or** a Unix socket path for Passenger/Hostinger).
- **Safety is non-negotiable.** Never weaken validate-before-commit, the immutable core/footer,
  token-gated writes, the recovery flow, the brute-force guard, or the sandbox boundaries.
- **Be honest about status.** Don't document a feature as done if it's only planned — mark it
  `(planned)`. See `ROADMAP.md`.
- **Prefer boring, reliable code** over clever, fragile code.

## Local setup

```bash
git clone https://github.com/Chorozion/Sophia-Stack.git
cd Sophia-Stack
npm install
npm run build      # SSR + client bundles + catalog
npm test           # run the full in-process test suite (demo/run-all.mjs)
npm run package    # produce the deployable artifact in package/
npm run dev        # local dev server
```

`sophia doctor` (or `npm run doctor`) checks your environment.

## Project layout

| Path | What |
|---|---|
| `src/server.mjs` | The runtime: routes, auth, REST API, MCP, OpenAPI, agent loop |
| `src/store.mjs` · `data-store.mjs` · `media-store.mjs` | persistence (model/css/tokens, collections, media) |
| `src/patch.mjs` · `validate.mjs` | the patch engine + validate-before-commit |
| `src/sandbox.mjs` | the `vm` sandbox for server functions |
| `src/dashboard.mjs` | the owner control panel (chat builder, pages/data/media/keys/settings) |
| `src/blocks.jsx` · `styles.mjs` · `effects.mjs` | the design system |
| `scripts/` | build · catalog · package · dev · serve |
| `bin/sophia.mjs` | the `sophia` CLI |
| `demo/` | the test suite (`run-all.mjs` runs it) |
| `docs/` | documentation |
| `templates/` | starter templates |

## Tests

Every change should keep `npm test` green and not regress `npm run test:package`. If you add a
feature, add a `demo/*-test.mjs` for it and include it in `demo/run-all.mjs`. UI/inline-script
changes must keep `demo/ui-test.mjs` passing (it compiles every served inline script).

## Pull requests

1. Branch from `main`.
2. Keep changes focused; one logical change per PR.
3. Run `npm test` and `npm run build` locally; include the results in the PR.
4. Update docs and `CHANGELOG.md` (Unreleased section) for any user-facing change.
5. Fill out the PR template. No secrets, system paths, or `.sophia-data` in commits.

## Security

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md). Do not open public
issues for exploitable problems.

## License

By contributing, you agree your contributions are licensed under the project's
[Apache-2.0](LICENSE) license.

## Contribute an extension (community plugins)

Sophia Stack grows through community extensions. To build one:

```bash
sophia create-extension my-tool   # scaffolds a working extension
```

See **[docs/extensions/build-your-first.md](docs/extensions/build-your-first.md)**. Extensions are
permission-scoped and edit the site only through the validated patch pipeline (never directly), so they
can't corrupt a site. Publish to a public git repo and anyone installs it in one click from the
**Extensions** tab.

**Share it:** open a PR adding a one-line entry (name · repo · what it does) to a community list, or
just post your repo. Ideas: analytics, forms/CRM, blog/CMS, image optimization, i18n, A/B testing,
search, backups, comments, e-commerce, integrations. The **Sophia SEO Suite** is the first major example.
