// _helpers.mjs — shared test helper for the new flow:
// Get started (create admin -> session cookie) -> mint a key in the dashboard.
export async function claimAndMint(base, username = "admin", password = "ownerpass1") {
  const r = await fetch(base + "/_setup", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const sid = (r.headers.get("set-cookie") || "").split(";")[0]; // "sid=..."
  const t = await fetch(base + "/api/sophia/tokens", {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: sid },
    body: JSON.stringify({ label: "agent" }),
  });
  const j = await t.json();
  return { token: j.token, sid };
}
