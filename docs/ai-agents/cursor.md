# Drive your Sophia site from Cursor

A deployed Sophia site is **agent-operable**: it ships its own token-gated REST
API, so any AI coding tool that can run shell commands — Cursor, Claude Code,
Cline — can read and edit your live site by `curl`-ing the API directly. Cursor's
agent runs the terminal, so you just hand it the skill URL and a token and let it
work.

This is the plain-HTTP path (same one as
[claude-code.md](./claude-code.md)). For a structured tool integration instead,
see [mcp.md](./mcp.md).

---

## Prerequisites

1. **A deployed Sophia site** at some origin, e.g. `https://your-site.com`.
2. **A minted token.** Open `https://your-site.com/dashboard`, log in, go to the
   **Keys** tab, and **Mint a new key**. A token starting with `mykey-` appears —
   copy it. Roles: **editor** (read + write the site) or **admin** (also manages
   tokens). For building the site, **editor** is enough.

> Reads are mostly public; **writes require** `Authorization: Bearer mykey-...`.

---

## Step 1 — Give the agent its operating manual

Every deployed site serves an LLM operating manual at `/skill.md`. In Cursor's
chat (Agent mode), paste a prompt like:

> Read https://your-site.com/skill.md . Then connect to my Sophia site at
> https://your-site.com using this token: `mykey-...` . Call the catalog and the
> model first, then make the edits I describe.

The skill explains the connect flow, the block types, the patch ops, and the
quality rules. You (or the agent) can fetch it directly:

```bash
curl https://your-site.com/skill.md
```

---

## Step 2 — Verify the connection (ping)

`GET /api/sophia/ping` confirms reachability and whether your token can write. It
never changes the site.

```bash
curl https://your-site.com/api/sophia/ping \
  -H "Authorization: Bearer mykey-..."
```

Expected:

```json
{ "ok": true, "site": "Your Site", "host": "your-site.com", "canWrite": true }
```

- `canWrite: true` — token is valid and can edit.
- `canWrite: false` — token missing/revoked; mint a fresh one in **Keys**.

---

## Step 3 — Read the catalog, then the model

Always read the capability catalog before editing so the agent only uses real
blocks and styles, then read the current site model.

```bash
curl https://your-site.com/api/sophia/catalog    # allowed blocks, styles, patch ops
curl https://your-site.com/api/sophia/model      # the whole site as JSON
```

Reads are public (no token needed).

---

## Step 4 — Edit with a patch

`POST /api/sophia/patch` with `{ "ops": [...] }`. Writes need the Bearer token.
Patches are validated — a patch that would break the site is rejected (HTTP 422)
and the previous good state is kept.

```bash
curl -X POST https://your-site.com/api/sophia/patch \
  -H "Authorization: Bearer mykey-..." \
  -H "Content-Type: application/json" \
  -d '{"ops":[{"op":"mset","path":"style","value":"dark-tech"}]}'
```

A success looks like `{ "ok": true, "changed": [...] }`. A rejection returns
`{ "ok": false, "error": "edit rejected — would break the site", "details": [...] }` —
read `details`, fix, retry.

For the full endpoint list and patch-op shapes, see [rest.md](./rest.md).

---

## Step 5 — Roll back if needed

```bash
curl -X POST https://your-site.com/api/sophia/rollback \
  -H "Authorization: Bearer mykey-..."
```

---

## Troubleshooting

- **`401` / "owner or key required"** — the `Authorization: Bearer mykey-...`
  header is missing or the token was revoked. Mint a fresh key in **Keys**.
- **`canWrite: false`** on ping — same cause: invalid/missing token.
- **`422` "edit rejected"** — the patch would break the site. Read `details`,
  correct the op, retry. Nothing was changed.
- **Used a block type or style that errored** — re-read
  `/api/sophia/catalog`; only the types listed there are allowed.

---

Cursor is just one of many editors that can do this — **Cline**, **Claude Code**,
and any agent that can run `curl` follow the exact same steps. Paste the skill URL
+ token into the chat and let the agent run the commands above. To wire a
structured tool integration instead, use [MCP](./mcp.md); for the raw API, see
[rest.md](./rest.md).
