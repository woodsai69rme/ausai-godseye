// Self-contained MemoryCache (Vercel-safe: no fs, memory-only)
class MemoryCache {
  constructor(maxEntries = 500) {
    this.maxEntries = maxEntries;
    this.store = new Map();
  }
  get(key) {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) { this.store.delete(key); return null; }
    this.store.delete(key);
    this.store.set(key, item);
    return item.value;
  }
  getStale(key) {
    const item = this.store.get(key);
    return item ? item.value : null;
  }
  set(key, value, ttlMs) {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs, cachedAt: Date.now() });
  }
}

const flightCache = new MemoryCache(40);
const CACHE_TTL_MS = 8000; // 8 seconds

const USER_AGENT = 'AusAIGodseye/1.0 (https://ausai.tech; contact: ops@ausai.tech)';

function send(res, obj, code = 200, cacheHdr = 'MISS') {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'X-Cache': cacheHdr, 'Cache-Control': 'public, max-age=8' });
  res.end(JSON.stringify(obj));
}

export async function handleFlights(req, res, searchParams) {
  const mode = (searchParams.get('mode') || 'all').toLowerCase();
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const radius = searchParams.get('radius');
  const cacheKey = lat && lon && radius ? 'flights:point:' + lat + ':' + lon + ':' + radius : 'flights:' + mode;

  const cached = flightCache.get(cacheKey);
  if (cached) { send(res, cached, 200, 'HIT'); return; }

  let urls = [];
  if (lat && lon && radius) {
    urls = [
      'https://api.adsb.lol/v2/point/' + lat + '/' + lon + '/' + radius,
      'https://api.adsb.one/v2/point/' + lat + '/' + lon + '/' + radius,
      'https://api.airplanes.live/v2/point/' + lat + '/' + lon + '/' + radius,
    ];
  } else if (mode === 'mil') {
    urls = ['https://api.adsb.lol/v2/mil', 'https://api.airplanes.live/v2/mil', 'https://api.adsb.one/v2/mil'];
  } else if (mode === 'au') {
    // AusAI: Australia-centred point feed (Sydney, 1600NM radius)
    urls = [
      'https://api.adsb.lol/v2/point/-25.2744/133.7751/1600',
      'https://api.adsb.one/v2/point/-25.2744/133.7751/1600',
      'https://api.airplanes.live/v2/point/-25.2744/133.7751/1600',
    ];
  } else {
    urls = ['https://api.adsb.lol/v2/point/0/0/10000', 'https://api.adsb.lol/v2/mil'];
  }

  let result = null;
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const resp = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }, signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const data = await resp.json();
        if (data && (Array.isArray(data.ac) || Array.isArray(data.aircraft))) { result = data; break; }
      }
    } catch (e) { /* next upstream */ }
  }

  if (result) {
    flightCache.set(cacheKey, result, CACHE_TTL_MS);
    send(res, result, 200, 'MISS');
    return;
  }
  const stale = flightCache.getStale(cacheKey);
  if (stale) { send(res, stale, 200, 'STALE'); return; }
  send(res, { error: 'All flight data upstreams failed' }, 502, 'MISS');
}
