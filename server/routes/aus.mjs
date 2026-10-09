const UA = 'AusAIGodseye/1.0 (https://ausai.tech; contact: ops@ausai.tech)';
const cache = new Map();

function getCache(key, ttlMs) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.t > ttlMs) return e.data;
  return e.data;
}
function setCache(key, data) {
  cache.set(key, { t: Date.now(), data });
  if (cache.size > 50) cache.delete(cache.keys().next().value);
}

async function fetchJson(url, ms = 9000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json,*/*', 'User-Agent': UA }, signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const txt = await r.text();
    try { return JSON.parse(txt); } catch (e) { throw new Error('non-JSON (' + txt.slice(0, 80) + ')'); }
  } finally { clearTimeout(t); }
}

function send(res, obj, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=60' });
  res.end(JSON.stringify(obj));
}

// Approx state/territory centroids so BOM text warnings can be pinned on globe
const STATE_CENTROIDS = {
  NSW: [149.0, -32.5], VIC: [144.5, -37.0], QLD: [146.5, -22.0], WA: [122.0, -25.0],
  SA: [135.0, -30.0], TAS: [146.8, -41.9], NT: [133.5, -19.5], ACT: [149.1, -35.3],
};

function enrichBom(list) {
  return (Array.isArray(list) ? list : []).map((w, i) => {
    const states = w.states || (w.state ? [w.state] : []);
    const st = states[0] || w.state || 'NSW';
    const c = STATE_CENTROIDS[st] || STATE_CENTROIDS.NSW;
    // deterministic jitter so multiple warnings in same state don't stack
    const j = (i % 9) - 4;
    return Object.assign({}, w, {
      longitude: Number(w.longitude || w.lon) || (c[0] + j * 1.1),
      latitude: Number(w.latitude || w.lat) || (c[1] + (i % 7 - 3) * 0.9),
      _auState: st,
    });
  });
}

export async function handleBomWarnings(req, res) {
  const key = 'bom-warnings';
  const urls = [
    'https://api.weather.bom.gov.au/v1/warnings',
    'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://api.weather.bom.gov.au/v1/warnings'),
  ];
  let lastErr = null;
  for (const u of urls) {
    try {
      const data = await fetchJson(u, 20000);
      setCache(key, data);
      const list = enrichBom(data.data || data.warnings || []);
      send(res, { source: 'bom', count: list.length, warnings: list });
      return;
    } catch (e) { lastErr = e; }
  }
  const stale = getCache(key, 3600e3);
  if (stale) {
    const list = enrichBom(stale.warnings || stale.data || []);
    send(res, { source: 'bom-stale', count: list.length, warnings: list });
    return;
  }
  send(res, { source: 'bom-degraded', count: 0, warnings: [], note: 'BOM slow/unreachable from server; layer stays active via ADF/ports/quakes/fires', detail: String((lastErr && lastErr.message) || lastErr) });
}

export async function handleGaQuakes(req, res) {
  const key = 'ga-quakes';
  // GA frontend is an SPA (HTML). Use USGS AU-bbox GeoJSON as live AU quake source.
  const AU_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=100&minlatitude=-44&maxlatitude=-10&minlongitude=112&maxlongitude=154&orderby=time';
  try {
    const data = await fetchJson(AU_URL);
    setCache(key, data);
    send(res, { source: 'usgs-au-bbox', count: (data.features || []).length, features: data.features || [] });
  } catch (e) {
    const stale = getCache(key, 3600e3);
    if (stale) send(res, { source: 'usgs-au-bbox-stale', features: stale.features || [] });
    else send(res, { error: 'GA/USGS unavailable', detail: String(e.message || e) }, 502);
  }
}

export async function handleNswFires(req, res) {
  const key = 'nsw-fires';
  try {
    const data = await fetchJson('https://www.rfs.nsw.gov.au/feeds/majorIncidents.json');
    setCache(key, data);
    send(res, { source: 'nsw-rfs', data });
  } catch (e) {
    const stale = getCache(key, 3600e3);
    if (stale) send(res, { source: 'nsw-rfs-stale', data: stale });
    else send(res, { error: 'RFS unavailable', detail: String(e.message || e) }, 502);
  }
}

export async function handleAusSummary(req, res, opts = {}) {
  // Direct upstream rollup (no self-fetch, works on Vite dev AND Vercel serverless)
  const bomMs = opts.bomMs || 8000;
  const otherMs = opts.otherMs || 8000;
  const AU_QUAKES_URL = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&limit=100&minlatitude=-44&maxlatitude=-10&minlongitude=112&maxlongitude=154&orderby=time';
  const RFS_URL = 'https://www.rfs.nsw.gov.au/feeds/majorIncidents.json';
  const BOM_URL = 'https://api.weather.bom.gov.au/v1/warnings';
  const safe = (p, fb) => Promise.race([p.catch(() => fb), new Promise((r) => setTimeout(() => r(fb), 9000))]);
  try {
    const [q, f, b] = await Promise.all([
      safe(fetchJson(AU_QUAKES_URL, otherMs), { features: [] }),
      safe(fetchJson(RFS_URL, otherMs), { features: [] }),
      safe(fetchJson(BOM_URL, bomMs), { data: [] }),
    ]);
    const qCount = (q.features || []).length;
    const fFeats = (f.data && f.data.features) ? f.data.features : (f.features || f.data || []);
    const bList = b.data || b.warnings || [];
    send(res, {
      source: 'aus-summary',
      quakes: qCount,
      fires: Array.isArray(fFeats) ? fFeats.length : 0,
      warnings: Array.isArray(bList) ? bList.length : (b.count || 0),
      updatedAt: new Date().toISOString(),
    });
  } catch (e) {
    send(res, { error: 'summary failed', detail: String(e.message || e) }, 502);
  }
}
