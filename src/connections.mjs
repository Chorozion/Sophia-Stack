// connections.mjs — backend data connections for the Site Model.
//
// A site declares `connections` (named data sources). Blocks bind to them by
// id. The runtime resolves connections server-side (so SSR has real data) and
// re-resolves on an interval, pushing fresh data to live previews. Adapters are
// pluggable by `type`; v0 ships a generic `rest` adapter, which is enough to
// dogfood our own lab live feed.
//
// Connection shape:
//   { type: "rest", url, headers?, path?, limit?, pick? }
//     path  — dot path into the JSON response (e.g. "events")
//     limit — cap array length
//     pick  — keep only these keys from each array item (smaller payloads)

const ADAPTERS = {
  async rest(conn) {
    const res = await fetch(conn.url, { headers: conn.headers || {} });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    let data = conn.path
      ? conn.path.split(".").reduce((o, k) => (o == null ? o : o[k]), json)
      : json;
    if (Array.isArray(data)) {
      if (conn.limit) data = data.slice(0, conn.limit);
      if (conn.pick) data = data.map((it) => Object.fromEntries(conn.pick.map((k) => [k, it?.[k]])));
    }
    return data;
  },
};

// Resolve every connection in a model. Errors are captured per-connection as
// { error } so one bad source never breaks the whole render.
export async function resolveConnections(model, { timeoutMs = 8000 } = {}) {
  const conns = model?.connections || {};
  const out = {};
  await Promise.all(
    Object.entries(conns).map(async ([id, conn]) => {
      const adapter = ADAPTERS[conn.type];
      if (!adapter) { out[id] = { error: `unknown adapter: ${conn.type}` }; return; }
      try {
        out[id] = await withTimeout(adapter(conn), timeoutMs);
      } catch (e) {
        out[id] = { error: String(e?.message || e) };
      }
    })
  );
  return out;
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

export function registerAdapter(type, fn) { ADAPTERS[type] = fn; }
export { ADAPTERS };
