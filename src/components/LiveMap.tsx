import { useEffect, useRef, useState } from "react";
import { createMap, LatLng, MapHandle } from "../lib/maps";

const LAHORE: LatLng = { lat: 31.5204, lng: 74.3587 };

/** Map with the worker's live marker and the customer's home pin. */
export default function LiveMap({ home, worker, heading, height = 340 }: {
  home: LatLng | null; worker: LatLng | null; heading?: number | null; height?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MapHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const shown = useRef("");

  useEffect(() => {
    let alive = true;
    if (!el.current) return;
    createMap(el.current, worker || home || LAHORE)
      .then((m) => { if (alive) { map.current = m; setReady(true); } else m.destroy(); })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; map.current?.destroy(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    m.setHome(home);
    m.setWorker(worker, heading);
    // Re-zoom only when a marker appears or disappears, so the customer can pan freely.
    const key = `${!!home}${!!worker}`;
    if (key !== shown.current) { shown.current = key; m.fit(); }
  }, [ready, home?.lat, home?.lng, worker?.lat, worker?.lng, heading]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="live-map" style={{ height }}>
      <div ref={el} className="live-map-canvas" />
      {!ready && !failed && <div className="live-map-overlay"><div className="spinner" /></div>}
      {failed && <div className="live-map-overlay muted">Map could not load. Check your internet.</div>}
      {ready && (home || worker) && (
        <button type="button" className="live-map-fit" onClick={() => map.current?.fit()} aria-label="Re-center">◎</button>
      )}
    </div>
  );
}
