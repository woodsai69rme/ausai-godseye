import React, { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import useStore from '../store/useStore';

const AU_BASES = [
  { id: 'aus-base-amberley', name: 'RAAF Amberley', lon: 152.711, lat: -27.641, detail: 'F/A-18F + KC-30A' },
  { id: 'aus-base-williamtown', name: 'RAAF Williamtown', lon: 151.833, lat: -32.796, detail: 'F-35A hub' },
  { id: 'aus-base-tindal', name: 'RAAF Tindal', lon: 133.378, lat: -14.521, detail: 'Northern bare base' },
  { id: 'aus-base-darwin', name: 'RAAF Darwin', lon: 130.567, lat: -12.408, detail: 'NW air defence' },
  { id: 'aus-base-pearce', name: 'RAAF Pearce', lon: 116.015, lat: -31.668, detail: 'Pilot training' },
  { id: 'aus-base-edinburgh', name: 'RAAF Edinburgh', lon: 138.621, lat: -31.094, detail: 'P-8A Poseidon' },
  { id: 'aus-base-townsville', name: 'RAAF Townsville', lon: 146.765, lat: -19.253, detail: 'Army aviation' },
  { id: 'aus-base-richmond', name: 'RAAF Richmond', lon: 150.782, lat: -33.601, detail: 'C-130J Hercules' },
  { id: 'aus-base-east-sale', name: 'RAAF East Sale', lon: 147.005, lat: -38.092, detail: 'Training school' },
  { id: 'aus-base-laverton', name: 'RAAF Laverton', lon: 144.747, lat: -37.863, detail: 'HQ + logistics' },
  { id: 'aus-base-kuttabul', name: 'HMAS Kuttabul SYD', lon: 151.229, lat: -33.86, detail: 'Fleet Base East' },
  { id: 'aus-base-stirling', name: 'HMAS Stirling WA', lon: 115.69, lat: -32.24, detail: 'Fleet Base West' },
  { id: 'aus-base-coonawarra', name: 'HMAS Coonawarra DRW', lon: 130.844, lat: -12.466, detail: 'Patrol boats' },
  { id: 'aus-base-cairns', name: 'HMAS Cairns', lon: 145.77, lat: -16.92, detail: 'Armidale class' },
  { id: 'aus-base-pinegap', name: 'Pine Gap', lon: 133.731, lat: -23.799, detail: 'Joint Defence Facility' },
  { id: 'aus-base-holt', name: 'Naval Comm Harold Holt', lon: 114.165, lat: -21.815, detail: 'VLF Exmouth' },
  { id: 'aus-base-holsworthy', name: 'Holsworthy Barracks', lon: 150.948, lat: -33.957, detail: 'Army Sydney' },
  { id: 'aus-base-robertson', name: 'Robertson Barracks DRW', lon: 130.976, lat: -12.444, detail: '1st Brigade' },
];
const AU_PORTS = [
  { id: 'aus-port-botany', name: 'Port Botany SYD', lon: 151.21, lat: -33.98 },
  { id: 'aus-port-kembla', name: 'Port Kembla', lon: 150.9, lat: -34.47 },
  { id: 'aus-port-melb', name: 'Port Melbourne', lon: 144.9, lat: -37.81 },
  { id: 'aus-port-geelong', name: 'Port Geelong', lon: 144.37, lat: -38.09 },
  { id: 'aus-port-bris', name: 'Port Brisbane', lon: 153.17, lat: -27.38 },
  { id: 'aus-port-gladstone', name: 'Port Gladstone', lon: 151.26, lat: -23.82 },
  { id: 'aus-port-townsville', name: 'Port Townsville', lon: 146.83, lat: -19.25 },
  { id: 'aus-port-fre', name: 'Fremantle Port', lon: 115.75, lat: -32.05 },
  { id: 'aus-port-hedland', name: 'Port Hedland', lon: 118.58, lat: -20.31 },
  { id: 'aus-port-dar', name: 'Port Darwin', lon: 130.85, lat: -12.47 },
  { id: 'aus-port-new', name: 'Port Newcastle', lon: 151.79, lat: -32.92 },
  { id: 'aus-port-hobart', name: 'Port Hobart', lon: 147.34, lat: -42.88 },
];
const AU_CAM_HOTSPOTS = [
  { id: 'aus-cam-syd-airport', name: 'Sydney Airport Cam', lon: 151.177, lat: -33.946 },
  { id: 'aus-cam-syd-harbour', name: 'Sydney Harbour Cam', lon: 151.21, lat: -33.852 },
  { id: 'aus-cam-bondi', name: 'Bondi Beach Cam', lon: 151.277, lat: -33.892 },
  { id: 'aus-cam-melb', name: 'Melbourne Skyline Cam', lon: 144.963, lat: -37.814 },
  { id: 'aus-cam-bris', name: 'Brisbane Airport Cam', lon: 153.124, lat: -27.395 },
  { id: 'aus-cam-perth', name: 'Perth Swan River Cam', lon: 115.86, lat: -31.955 },
];
function dot(color) {
  const c = document.createElement('canvas'); c.width = 28; c.height = 28;
  const g = c.getContext('2d'); if (!g) return null;
  g.beginPath(); g.arc(14, 14, 9, 0, Math.PI * 2);
  g.fillStyle = color + '55'; g.fill();
  g.lineWidth = 2; g.strokeStyle = color; g.stroke();
  g.beginPath(); g.arc(14, 14, 3.5, 0, Math.PI * 2);
  g.fillStyle = '#fff'; g.fill();
  return c.toDataURL();
}
async function getJson(url, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms || 10000);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

export default function AustraliaLayer({ viewer }) {
  const isEnabled = useStore((s) => s.layers.australia.enabled);
  const updateData = useStore((s) => s.updateLayerData);
  const setStatus = useStore((s) => s.setLayerStatus);
  const ents = useRef([]);
  const iconsRef = useRef(null);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    if (!iconsRef.current) {
      iconsRef.current = {
        au: dot('#ffd166'), mil: dot('#f7c15a'), port: dot('#00ffd5'),
        warn: dot('#ff4d6d'), fire: dot('#ff5b24'), quake: dot('#ff3333'),
      };
    }
    if (!isEnabled) {
      ents.current.forEach((e) => { try { viewer.entities.remove(e); } catch (err) {} });
      ents.current = [];
      setStatus('australia', 'idle');
      updateData('australia', []);
      return undefined;
    }
    let dead = false;
    setStatus('australia', 'loading');
    (async () => {
      const rows = [];
      const ic = iconsRef.current;
      const add = (id, lon, lat, name, kind, extra) => {
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
        try {
          const e = viewer.entities.add({
            id, position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
            billboard: { image: ic[kind] || ic.au, scale: 1.0, disableDepthTestDistance: 1e7 },
            label: { text: name, font: '10px JetBrains Mono', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -14), disableDepthTestDistance: 1e7 },
            properties: Object.assign({ _layerType: 'australia', _title: name, source: 'AusAI AU layer' }, extra || {}),
          });
          ents.current.push(e);
          rows.push({ id, name, kind, lat, lon });
        } catch (err) {}
      };
      AU_BASES.forEach((b) => add(b.id, b.lon, b.lat, b.name, 'mil', { category: 'ADF base', detail: b.detail || '' }));
      AU_PORTS.forEach((p) => add(p.id, p.lon, p.lat, p.name, 'port', { category: 'Major port' }));
      AU_CAM_HOTSPOTS.forEach((c) => add(c.id, c.lon, c.lat, c.name, 'au', { category: 'AU cam hotspot (CCTV layer has stream)' }));
      try {
        const bw = await getJson('/api/aus/bom-warnings', 25000);
        (bw.warnings || []).slice(0, 60).forEach((w, i) => {
          const lon = Number(w.longitude); const lat = Number(w.latitude);
          if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
          const title = 'BOM ' + (w._auState || w.state || '') + ': ' + String(w.short_title || w.type || 'warning').slice(0, 60);
          ic.warn = ic.warn || ic.au;
          try {
            const e = viewer.entities.add({
              id: 'aus-bom-' + i, position: Cesium.Cartesian3.fromDegrees(lon, lat, 0),
              billboard: { image: ic.warn, scale: 1.1, disableDepthTestDistance: 1e7 },
              label: { text: title, font: '10px JetBrains Mono', fillColor: Cesium.Color.WHITE, outlineColor: Cesium.Color.BLACK, outlineWidth: 2, style: Cesium.LabelStyle.FILL_AND_OUTLINE, verticalOrigin: Cesium.VerticalOrigin.BOTTOM, pixelOffset: new Cesium.Cartesian2(0, -14), disableDepthTestDistance: 1e7 },
              properties: { _layerType: 'australia', _title: title, source: 'BOM', category: 'BOM warning', state: w._auState || w.state },
            });
            ents.current.push(e);
            rows.push({ id: 'aus-bom-' + i, name: title, kind: 'warn', lat, lon });
          } catch (err2) {}
        });
      } catch (err) {}
      try {
        const q = await getJson('/api/aus/quakes', 12000);
        (q.features || []).slice(0, 60).forEach((f, i) => {
          const c = f.geometry && f.geometry.coordinates;
          if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) {
            const mag = (f.properties && (f.properties.mag || f.properties.magnitude)) || '?';
            add('aus-quake-' + i, c[0], c[1], 'M' + mag + ' AU', 'quake', { category: 'AU quake', mag: String(mag) });
          }
        });
      } catch (err) {}
      try {
        const f = await getJson('/api/aus/fires', 10000);
        const feats = (f.data && f.data.features) ? f.data.features : (f.features || f.data || []);
        (Array.isArray(feats) ? feats.slice(0, 40) : []).forEach((ft, i) => {
          const geoms = ft.geometry && ft.geometry.geometries ? ft.geometry.geometries : [ft.geometry];
          let pt = null;
          (geoms || []).forEach((g) => { if (g && g.type === 'Point' && Array.isArray(g.coordinates)) pt = g.coordinates; });
          if (pt) add('aus-fire-' + i, pt[0], pt[1], String((ft.properties && (ft.properties.title || ft.properties.name)) || 'NSW Fire'), 'fire', { category: 'NSW RFS fire' });
        });
      } catch (err) {}
      if (dead) return;
      updateData('australia', rows, { sourceName: 'BOM + USGS-AU + RFS + ADF/ports', status: 'active' });
      setStatus('australia', 'active');
      try { viewer.scene.requestRender(); } catch (err) {}
    })();
    return () => { dead = true; };
  }, [isEnabled, viewer, updateData, setStatus]);

  useEffect(() => () => {
    const v = viewer;
    ents.current.forEach((e) => { try { if (v && !v.isDestroyed()) v.entities.remove(e); } catch (err) {} });
    ents.current = [];
  }, [viewer]);

  return null;
}

