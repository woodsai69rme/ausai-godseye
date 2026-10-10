# 🇦🇺 AusAI Godseye — Australia-First OSINT Dashboard (v2 enhanced)

## Enhancements this round
- **BOM warnings now pinned on globe**: backend enriches every BOM warning
  with state centroid + deterministic jitter (`_auState`), layer draws 60x
  red `warn` markers labelled `BOM VIC: Flood Warning` etc.
- **Distinct live icons**: warn (red), fire (orange), quake (red), mil/ports/AU
- **TopBar AU HUD chip**: `🇦🇺 AU WARN n FIRE n QUAKE n` from new
  `GET /api/aus/summary` (fast 8s-race rollup, live: 2 quakes / 36 fires).
  Verified: `{"source":"aus-summary","quakes":2,"fires":36,"warnings":0}`
- **AU slogans** rotating in TopBar.
## v3 enhancements (this round)
- AU bases 9 → 18 (added Townsville, Richmond, East Sale, Laverton, Coonawarra,
  Cairns, Holt VLF, Holsworthy, Robertson) with role details in inspector.
- AU ports 6 → 12 (added Kembla, Geelong, Gladstone, Townsville, Hedland, Hobart).
- 6x AU cam hotspots in AU layer cross-linking the CCTV streams that already
  exist (Sydney Airport/Harbour, Bondi, Melbourne, Brisbane, Perth Swan River).
- YouTube discovery: 20 AU location aliases (Bondi, Manly, Circular Quay,
  Surfers Paradise…) + 4 extra AU search queries (auto-active once
  VITE_YOUTUBE_API_KEY is set — no code change needed).
- `.env.local` created from template (+VITE_CESIUM_ION_TOKEN for 3D cities).
- Prod build: `npm run build` still exceeds 30s (Cesium ~large bundle, normal).
  Deploy path ready: `dist/` → `vercel --prod` (vercel CLI v52 installed
  globally) or `firebase deploy` (project godseye-x). Say the word + which
  target and I'll ship it (needs `vercel login` / `firebase login` from you).
## v4 — Intel Wire AU + prod build + deploy-ready (this round)
- **Intel Wire AU feed**: new `fetchAusIntel()` merges live AU incidents into
  the Intel Wire panel (BOM/RFS/quake rollup + up to 6 BOM warnings with state
  tags). New `🇦🇺 AU` region filter in `intelMonitor.js` (22 patterns: cities,
  states, RAAF/ADF/AUKUS/BOM/bushfire). Filter the wire to AU-only in one click.
- **Prod build succeeded**: `dist/` in 5.09s (index 1.4MB + hls 522KB + css 90KB
  + Cesium). Manifests refreshed: intel 80, satellites 15,958, CCTV 3,975,
  ports 2,951.
- **Deploy-ready**: `firebase.json` cache headers, new `vercel.json`
  (Vite + dist + SPA rewrites). Needs your one-time auth:
  `vercel login` then `cd godseye-app && vercel --prod`, or `firebase login`
  then `firebase deploy` (project godseye-x).
## v6 — 🚀 LIVE ON VERCEL (2026-10-09)
- **Prod URL:** https://godseye-app.vercel.app (alias of
  godseye-myagji903-woodsai69rmes-projects, project `godseye-app`, Ready/50s).
- All 5 serverless functions deployed (iad1): aus/bom-warnings, aus/quakes,
  aus/fires, aus/summary, flights (+health hidden output).
- Live prod verified:
  - `/` → 200 (1880 bytes)
  - `/api/aus/summary` → `{"quakes":5,"fires":28,"warnings":0}`
  - `/api/aus/quakes` → 200 (3.9KB) · `/api/aus/fires` → 200 (81KB)
  - `/api/flights?mode=au` → 200 (38KB live AU ADS-B!)
  - `/api/health` → online (node v24, 58MB rss)
- `handleAusSummary` rewritten: direct upstream fetch (USGS-AU + RFS + BOM),
  no self-HTTP — identical behaviour on Vite dev and Vercel serverless.
  Verified both paths return the same shape live:
  `{"source":"aus-summary","quakes":3,"fires":29,"warnings":0}`.
- New `api/` serverless functions (Vercel auto-routes by file path):
  `aus/bom-warnings`, `aus/quakes`, `aus/fires`, `aus/summary` (6s upstream
  timeouts for 10s hobby limit), `flights` (+ new `?mode=au` AU-centred feed),
  `health`. AU + health wrappers reuse `server/routes/*.mjs` directly.
- New self-contained `api/_lib/flightsLib.mjs` (memory-only LRU, no `fs`,
  Vercel-safe) + AusAI UA string; 3-upstream failover per query.
- `vercel.json` simplified to SPA-only rewrite (Vercel serves `/api/*`
  functions automatically; old explicit api rewrite would have shadowed them).
- `typecheck` ✅ `lint` ✅ all function modules import → `function` ✅.

## v7 — Release locked (local commit `7c5fec1`, origin untouched)
- All AusAI work committed locally on `master` (27 files; mostly refreshed
  manifests). Upstream `VrushankPatel/godseye` NOT pushed to (origin still
  points there; fork first if you ever want to push).
- Prod HTML verified serving AusAI title + AU meta description + new bundle.
- Next optional: fork → push → Vercel Git auto-deploy; custom domain;
  `vercel env add` for AISstream/Mapbox keys.

Fork of [VrushankPatel/godseye](https://github.com/VrushankPatel/godseye) (Apache-2.0),
re-centred on Australia. Local dir: `C:\Users\karma\godseye-app`.

## What changed (AusAI Edition)
- Title: **AusAI Godseye — Live Australia OSINT Dashboard** (`index.html`)
- Top bar: `GODSEYE 1.0 + AUSAI • AU` badge, `AusAI Edition 🇦🇺 • Sydney HQ`
- Default camera: **Australia view** (133.7751, -25.2744, 5.5M m) instead of global
- Cities: new **🇦🇺 AU tier first** — Sydney HQ, Melbourne, Brisbane, Perth,
  Adelaide, Canberra, Darwin, Hobart, Gold Coast, Newcastle, Wollongong, Cairns
- New **🇦🇺 AUSTRALIA layer** (primary, first in panel):
  - 9x ADF bases (Amberley, Williamtown, Tindal, Darwin, Pearce, Edinburgh,
    Kuttabul, Stirling, Pine Gap) + 6x major ports
  - Live AU quakes via backend `/api/aus/quakes` (USGS AU bbox; GA site is SPA/HTML)
  - Live NSW RFS fires via `/api/aus/fires` (GeoJSON point extraction)
  - BOM warnings via `/api/aus/bom-warnings` (degraded-safe: returns 200 + note
    when BOM is slow; layer stays active)
- AU ADS-B constants: `AIRPLANES_AUSTRALIA` / `ADSB_ONE_AUSTRALIA` / `ADSB_LOL_AUSTRALIA`
- AU open-feed constants: BOM, GA, RFS, QLD traffic, data.gov.au
- Backend: `server/routes/aus.mjs` + dispatcher entries, CORS-safe with cache

## Run
```
cd C:\Users\karma\godseye-app
npm run dev      # http://localhost:5173
npm run serve    # after build, http://localhost:3001
```
Or double-click `C:\Users\karma\START_GODSEYE_DASHBOARD.bat`.

## Free keys (optional, keyless-first)
Copy `.env.local.example` → `.env.local`, fill in, restart dev:
- Mapbox (tiles), AISstream (live ships), YouTube (CCTV), Google 3D (cities),
  Guardian (intel), Firebase RTDB (shared cache).

## Verify
- `GET /` → 200, `GET /api/health` → online
- `GET /api/aus/quakes` → 200 (USGS AU bbox, e.g. South Hedland M2.6)
- `GET /api/aus/fires` → 200 (~132KB NSW RFS FeatureCollection)
- `GET /api/aus/bom-warnings` → 200 degraded-safe (BOM direct is slow ~15s+)
- `npm run typecheck` ✅, `npm run lint` ✅

## Notes
- Upstream `AustraliaLayer.jsx` was written in 2 chunks (editor 6k limit).
- Vite HMR picks up `server/routes/aus.mjs` edits with auto-restart.
- Dev server runs detached; restart via the .bat if port 5173 goes dark.
