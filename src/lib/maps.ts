// Small map wrapper used by the live tracking screens.
// Uses Google Maps when VITE_GOOGLE_MAPS_KEY is set; otherwise falls back to OpenStreetMap
// (Leaflet), so tracking works even before a Google key is added.
/* eslint-disable @typescript-eslint/no-explicit-any */

export type LatLng = { lat: number; lng: number };
export type MapHandle = {
  /** Move the worker marker (animated). `null` hides it. */
  setWorker: (p: LatLng | null, heading?: number | null) => void;
  /** Place the customer's home pin. `null` hides it. */
  setHome: (p: LatLng | null) => void;
  /** Zoom so both markers are visible. */
  fit: () => void;
  destroy: () => void;
};

const GOOGLE_KEY = (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined)?.trim();
export const usingGoogle = !!GOOGLE_KEY;
const w = window as any;

const scripts: Record<string, Promise<void>> = {};
function loadScript(src: string): Promise<void> {
  if (!scripts[src]) {
    scripts[src] = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { delete scripts[src]; reject(new Error("map_load_failed")); };
      document.head.appendChild(s);
    });
  }
  return scripts[src];
}
function loadCss(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet"; l.href = href;
  document.head.appendChild(l);
}

export function distanceKm(a: LatLng, b: LatLng) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** Rough city travel time on a bike: straight-line distance × 1.3 for roads, at ~20 km/h. */
export const etaMinutes = (km: number) => Math.max(1, Math.round(((km * 1.3) / 20) * 60));

export const directionsUrl = (dest: LatLng | null, address?: string) =>
  dest ? `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`
       : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || "")}`;

const WORKER_SVG = (deg: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="21" fill="#0E7C61" stroke="#fff" stroke-width="4"/>
  <g transform="rotate(${deg} 24 24)"><path d="M24 9 L31 27 L24 23 L17 27 Z" fill="#fff"/></g></svg>`;
const HOME_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52">
  <path d="M20 51 C20 51 3 31 3 19 A17 17 0 0 1 37 19 C37 31 20 51 20 51 Z" fill="#E8590C" stroke="#fff" stroke-width="3"/>
  <path d="M11 21 L20 13 L29 21 V30 H23 V24 H17 V30 H11 Z" fill="#fff"/></svg>`;
const svgUrl = (svg: string) => "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);

/** Glide a marker from its old position to the new one, like delivery apps do. */
function animator(apply: (p: LatLng) => void) {
  let cur: LatLng | null = null, raf = 0;
  return (to: LatLng) => {
    cancelAnimationFrame(raf);
    const from = cur;
    if (!from || distanceKm(from, to) > 2) { cur = to; apply(to); return; }
    const t0 = performance.now(), dur = 1200;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = k * (2 - k);
      cur = { lat: from.lat + (to.lat - from.lat) * e, lng: from.lng + (to.lng - from.lng) * e };
      apply(cur);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
}

export async function createMap(el: HTMLElement, center: LatLng): Promise<MapHandle> {
  return GOOGLE_KEY ? googleMap(el, center) : leafletMap(el, center);
}

async function googleMap(el: HTMLElement, center: LatLng): Promise<MapHandle> {
  if (!w.google?.maps?.Map) {
    await loadScript(`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&v=weekly`);
  }
  const g = w.google.maps;
  const map = new g.Map(el, {
    center, zoom: 14, disableDefaultUI: true, zoomControl: true, gestureHandling: "greedy", clickableIcons: false,
  });
  let worker: any = null, home: any = null, line: any = null, heading = 0;
  const workerIcon = () => ({ url: svgUrl(WORKER_SVG(heading)), scaledSize: new g.Size(44, 44), anchor: new g.Point(22, 22) });
  const updateLine = () => {
    if (worker && home) {
      const path = [worker.getPosition(), home.getPosition()];
      if (!line) line = new g.Polyline({ map, path, strokeOpacity: 0, icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.8, strokeColor: "#0E7C61", scale: 3 }, offset: "0", repeat: "14px" }] });
      else line.setPath(path);
    } else if (line) { line.setMap(null); line = null; }
  };
  const move = animator((p) => { worker?.setPosition(p); updateLine(); });
  return {
    setWorker(p, h) {
      if (!p) { worker?.setMap(null); worker = null; updateLine(); return; }
      if (typeof h === "number" && !Number.isNaN(h)) heading = h;
      if (!worker) worker = new g.Marker({ map, position: p, icon: workerIcon(), zIndex: 2 });
      else worker.setIcon(workerIcon());
      move(p);
    },
    setHome(p) {
      if (!p) { home?.setMap(null); home = null; updateLine(); return; }
      if (!home) home = new g.Marker({ map, position: p, icon: { url: svgUrl(HOME_SVG), scaledSize: new g.Size(36, 47), anchor: new g.Point(18, 47) }, zIndex: 1 });
      else home.setPosition(p);
      updateLine();
    },
    fit() {
      const pts = [worker?.getPosition(), home?.getPosition()].filter(Boolean);
      if (pts.length === 2) { const b = new g.LatLngBounds(); pts.forEach((x: any) => b.extend(x)); map.fitBounds(b, 70); }
      else if (pts.length === 1) { map.setCenter(pts[0]); map.setZoom(15); }
    },
    destroy() { worker?.setMap(null); home?.setMap(null); line?.setMap(null); },
  };
}

async function leafletMap(el: HTMLElement, center: LatLng): Promise<MapHandle> {
  loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
  if (!w.L) await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
  const L = w.L;
  const map = L.map(el, { zoomControl: true, attributionControl: true }).setView([center.lat, center.lng], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19, attribution: "© OpenStreetMap",
  }).addTo(map);
  let worker: any = null, home: any = null, line: any = null, heading = 0;
  const workerIcon = () => L.icon({ iconUrl: svgUrl(WORKER_SVG(heading)), iconSize: [44, 44], iconAnchor: [22, 22] });
  const updateLine = () => {
    if (worker && home) {
      const path = [worker.getLatLng(), home.getLatLng()];
      if (!line) line = L.polyline(path, { color: "#0E7C61", weight: 4, dashArray: "6 10", opacity: 0.8 }).addTo(map);
      else line.setLatLngs(path);
    } else if (line) { line.remove(); line = null; }
  };
  const move = animator((p) => { worker?.setLatLng([p.lat, p.lng]); updateLine(); });
  return {
    setWorker(p, h) {
      if (!p) { worker?.remove(); worker = null; updateLine(); return; }
      if (typeof h === "number" && !Number.isNaN(h)) heading = h;
      if (!worker) worker = L.marker([p.lat, p.lng], { icon: workerIcon(), zIndexOffset: 1000 }).addTo(map);
      else worker.setIcon(workerIcon());
      move(p);
    },
    setHome(p) {
      if (!p) { home?.remove(); home = null; updateLine(); return; }
      if (!home) home = L.marker([p.lat, p.lng], { icon: L.icon({ iconUrl: svgUrl(HOME_SVG), iconSize: [36, 47], iconAnchor: [18, 47] }) }).addTo(map);
      else home.setLatLng([p.lat, p.lng]);
      updateLine();
    },
    fit() {
      const pts = [worker?.getLatLng(), home?.getLatLng()].filter(Boolean);
      if (pts.length === 2) map.fitBounds(L.latLngBounds(pts), { padding: [60, 60] });
      else if (pts.length === 1) map.setView(pts[0], 15);
    },
    destroy() { map.remove(); },
  };
}
