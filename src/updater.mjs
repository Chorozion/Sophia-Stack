// updater.mjs — check the public release channel for a newer Stack version.
//
// Pull-based by design: each deployment asks the channel; nothing phones home with
// identifying data, and there is no central registry of deployments. The check sends
// only a plain GET (no site data) and can be disabled with SOPHIA_UPDATE_CHECK=off.
import { VERSION } from "./version.mjs";

const DEFAULT_CHANNEL = "https://api.github.com/repos/Chorozion/Sophia-Stack/releases/latest";

// Compare semver-ish strings: -1 (a<b), 0 (equal), 1 (a>b). Ignores pre-release tags.
export function cmpVersion(a, b) {
  const p = (s) => String(s || "0").replace(/^v/, "").split("-")[0].split(".").map((n) => parseInt(n, 10) || 0);
  const x = p(a), y = p(b);
  for (let i = 0; i < 3; i++) { if ((x[i] || 0) > (y[i] || 0)) return 1; if ((x[i] || 0) < (y[i] || 0)) return -1; }
  return 0;
}

export async function checkForUpdate(opts = {}) {
  const env = opts.env || process.env;
  const current = opts.current || VERSION;
  if (String(env.SOPHIA_UPDATE_CHECK || "").toLowerCase() === "off") return { enabled: false, current };
  const url = opts.url || env.SOPHIA_UPDATE_URL || DEFAULT_CHANNEL;
  try {
    const ctrl = AbortSignal.timeout ? AbortSignal.timeout(opts.timeoutMs || 8000) : undefined;
    const res = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "sophia-stack/" + current }, signal: ctrl });
    if (!res.ok) return { enabled: true, current, error: "channel " + res.status };
    const j = await res.json();
    const latest = String(j.tag_name || j.version || j.name || "").replace(/^v/, "") || current;
    const assets = (j.assets || []).map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size })).filter((a) => a.url);
    const zip = assets.find((a) => /\.zip$/i.test(a.name));
    return {
      enabled: true, current, latest,
      updateAvailable: cmpVersion(latest, current) > 0,
      notes: j.body || "", releaseUrl: j.html_url || "", publishedAt: j.published_at || null,
      asset: zip || assets[0] || null,
    };
  } catch (e) { return { enabled: true, current, error: String(e.message || e) }; }
}

// A tiny TTL cache so the dashboard/CLI don't hammer the channel.
let _cache = null;
export async function cachedCheck(opts = {}, ttlMs = 3600000, nowMs = Date.now()) {
  if (_cache && nowMs - _cache.at < ttlMs && !opts.force) return _cache.result;
  const result = await checkForUpdate(opts);
  if (!result.error) _cache = { at: nowMs, result };
  return result;
}
