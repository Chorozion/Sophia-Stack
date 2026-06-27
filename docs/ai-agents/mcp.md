# Connect to your Sophia site via MCP

Every deployed Sophia site speaks **MCP** (Model Context Protocol), so MCP-aware
agents get a clean toolset to read the catalog and build/edit the live site — no
glue code. There are two ways in:

1. **Remote MCP endpoint** — `POST /mcp` on your site, for clients that accept a
   remote MCP URL + Bearer token.
2. **Stdio wrapper** — `mcp/sophia-mcp.mjs`, a zero-dependency local bridge for
   desktop MCP clients (e.g. Claude Desktop) that launch a `command`.

Both expose the same five tools:

| Tool | Write? | Purpose |
|------|--------|---------|
| `sophia_catalog` | no | read the capability catalog — **call first** |
| `sophia_read_model` | no | read the current Site Model (compact JSON) |
| `sophia_patch` | **yes** | apply `{ops:[...]}` addressable edits |
| `sophia_set_css` | **yes** | replace the live custom CSS layer |
| `sophia_rollback` | **yes** | undo the last edit |

Read tools need no token; **write tools require a Bearer token**.

---

## Prerequisites

1. **A deployed Sophia site**, e.g. `https://your-site.com`.
2. **A minted token.** Dashboard → **Keys** → **Mint a new key** → copy the
   `mykey-...` token (role **editor** or **admin**).

---

## Option A — Remote MCP endpoint (`/mcp`)

The endpoint speaks **JSON-RPC 2.0 over HTTP POST** at `https://your-site.com/mcp`
(methods: `initialize`, `tools/list`, `tools/call`). CORS is enabled, so
browser-based MCP clients can reach it. A `GET /mcp` returns a probe descriptor
(some clients check it before POSTing).

In an MCP client that accepts a **remote/HTTP MCP server**, configure:

- **URL:** `https://your-site.com/mcp`
- **Authorization header:** `Bearer mykey-...`

### Verify it by hand

Probe:

```bash
curl https://your-site.com/mcp
```

List tools:

```bash
curl -X POST https://your-site.com/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Call a write tool (needs the Bearer token):

```bash
curl -X POST https://your-site.com/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mykey-..." \
  -d '{
    "jsonrpc": "2.0", "id": 2, "method": "tools/call",
    "params": {
      "name": "sophia_patch",
      "arguments": { "ops": [ { "op": "mset", "path": "style", "value": "dark-tech" } ] }
    }
  }'
```

Without the token, write tools return
`error: editor token required (Authorization: Bearer <token>)`.

---

## Option B — Stdio wrapper (`mcp/sophia-mcp.mjs`)

For desktop MCP clients that spawn a local `command`, use the bundled wrapper. It
is zero-dependency (Node 18+ for built-in `fetch`) and reads two **environment
variables**:

- `SOPHIA_URL` — your site origin, e.g. `https://your-site.com/`
  (defaults to `http://localhost:3000`)
- `SOPHIA_TOKEN` — your `mykey-...` token (empty = read-only tools only)

### Claude Desktop config

Add this to your Claude Desktop MCP config (the `mcpServers` block). Use the
**absolute path** to `sophia-mcp.mjs` in your clone of this repo:

```json
{
  "mcpServers": {
    "sophia": {
      "command": "node",
      "args": ["/abs/path/to/sophia-stack/mcp/sophia-mcp.mjs"],
      "env": {
        "SOPHIA_URL": "https://your-site.com/",
        "SOPHIA_TOKEN": "mykey-..."
      }
    }
  }
}
```

On Windows, escape backslashes in the path, e.g.
`"C:\\path\\to\\sophia-stack\\mcp\\sophia-mcp.mjs"`.

Restart the client. The five `sophia_*` tools appear. Tell the agent to call
`sophia_catalog` first, then `sophia_read_model`, then edit with `sophia_patch`.

### Test the wrapper standalone

You can pipe JSON-RPC lines straight into it:

```bash
SOPHIA_URL="https://your-site.com/" SOPHIA_TOKEN="mykey-..." \
  node mcp/sophia-mcp.mjs <<'EOF'
{"jsonrpc":"2.0","id":1,"method":"initialize"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
EOF
```

It prints newline-delimited JSON-RPC responses and logs
`sophia-mcp ready -> https://your-site.com` to stderr.

---

## Troubleshooting

- **Write tool returns "editor token required"** → no/invalid Bearer token. For
  the remote endpoint, set the `Authorization` header; for the wrapper, set
  `SOPHIA_TOKEN`.
- **Wrapper hits localhost instead of your site** → `SOPHIA_URL` is unset; it
  defaults to `http://localhost:3000`. Set it in the `env` block.
- **`node: command not found` in Claude Desktop** → use an absolute path to the
  `node` binary in `command`, or ensure Node is on the launcher's PATH.
- **Edits rejected** → the patch would break the site; the tool result has
  `isError: true` and the validation `details`. Read them, fix, retry.
- **Used an unknown block/style** → call `sophia_catalog` and only use what it
  lists.

---

See also: [claude-code.md](./claude-code.md) for the plain-`curl` path and
[openapi.md](./openapi.md) for the ChatGPT/OpenAPI surface.
