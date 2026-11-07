import { useCallback, useEffect, useRef, useState } from "react";
import { fmtDate, fmtTime, prettyPhone, supabase, useApp, waLink } from "../lib/data";
import { useI18n, TKey } from "../lib/i18n";
import { directionsUrl, distanceKm } from "../lib/maps";

type Job = {
  id: string; ref_no: number; service_en: string; service_ur: string; icon: string; booking_type: "hourly" | "daily";
  work_date: string; start_time: string; quantity: number; workers: number; status: string;
  customer_name: string; customer_phone: string; address: string; area_name: string | null; notes: string | null;
  customer_lat: number | null; customer_lng: number | null;
};

// Location is shared only while travelling to the customer and at the door.
const SHARING = ["on_the_way", "arrived"];
const NEXT: Record<string, { to: string; label: TKey; confirm?: TKey }> = {
  assigned: { to: "on_the_way", label: "startTrip" },
  on_the_way: { to: "arrived", label: "iArrived" },
  arrived: { to: "in_progress", label: "startWork" },
  in_progress: { to: "completed", label: "finishWork", confirm: "finishConfirm" },
};
const SEND_EVERY_MS = 5000;

type WakeLock = { release: () => Promise<void> };

export default function Worker() {
  const { t, pick } = useI18n();
  const { workerName, authReady } = useApp();
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [gpsErr, setGpsErr] = useState("");
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const last = useRef<{ at: number; lat: number; lng: number } | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("worker_jobs");
    if (!error) setJobs((data as Job[]) || []);
  }, []);
  useEffect(() => {
    if (!workerName) return;
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, [workerName, load]);

  const sharingIds = (jobs || []).filter((j) => SHARING.includes(j.status)).map((j) => j.id).join(",");

  const send = useCallback(async (p: GeolocationPosition, force = false) => {
    const ids = sharingIds ? sharingIds.split(",") : [];
    if (!ids.length) return;
    const { latitude: lat, longitude: lng, heading, speed, accuracy } = p.coords;
    const prev = last.current;
    const moved = prev ? distanceKm(prev, { lat, lng }) * 1000 : Infinity;
    if (!force && prev && Date.now() - prev.at < SEND_EVERY_MS && moved < 25) return;
    last.current = { at: Date.now(), lat, lng };
    await Promise.all(ids.map((id) => supabase.rpc("worker_update_location", {
      p_id: id, p_lat: lat, p_lng: lng, p_heading: heading ?? null, p_speed: speed ?? null, p_accuracy: accuracy ?? null,
    })));
    setLastSent(new Date());
    setGpsErr("");
  }, [sharingIds]);

  // Watch GPS while any job is in "on the way" or "arrived", and keep the screen awake.
  useEffect(() => {
    if (!sharingIds || !("geolocation" in navigator)) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => { send(p); },
      (e) => setGpsErr(e.code === e.PERMISSION_DENIED ? tRef.current("locDenied") : tRef.current("gpsError")),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    // Some phones pause watchPosition when nothing moves; ask again every 15 s as a heartbeat.
    const beat = setInterval(() => navigator.geolocation.getCurrentPosition((p) => send(p, true), () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }), 15000);
    let lock: WakeLock | null = null;
    const nav = navigator as unknown as { wakeLock?: { request: (k: string) => Promise<WakeLock> } };
    const wake = () => nav.wakeLock?.request("screen").then((l) => { lock = l; }).catch(() => {});
    wake();
    const onVis = () => { if (document.visibilityState === "visible") wake(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      navigator.geolocation.clearWatch(watch);
      clearInterval(beat);
      document.removeEventListener("visibilitychange", onVis);
      lock?.release().catch(() => {});
    };
  }, [sharingIds, send]);

  const advance = async (j: Job) => {
    const n = NEXT[j.status];
    if (!n) return;
    if (n.confirm && !confirm(t(n.confirm))) return;
    setBusy(j.id); setErr("");
    const { error } = await supabase.rpc("worker_set_status", { p_id: j.id, p_status: n.to });
    if (error) { setErr(error.message); setBusy(null); return; }
    await load();
    setBusy(null);
    // Send a first point right away so the customer sees the worker immediately.
    if (n.to === "on_the_way" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => supabase.rpc("worker_update_location", {
          p_id: j.id, p_lat: p.coords.latitude, p_lng: p.coords.longitude,
          p_heading: p.coords.heading ?? null, p_speed: p.coords.speed ?? null, p_accuracy: p.coords.accuracy ?? null,
        }).then(() => { last.current = { at: Date.now(), lat: p.coords.latitude, lng: p.coords.longitude }; setLastSent(new Date()); }),
        (e) => setGpsErr(e.code === e.PERMISSION_DENIED ? t("locDenied") : t("gpsError")),
        { enableHighAccuracy: true, timeout: 20000 },
      );
    }
  };

  if (!authReady) return <section className="section container"><div className="spinner" /></section>;
  if (!workerName) {
    return <section className="section"><div className="container narrow"><div className="card center"><p>{t("workerOnly")}</p></div></div></section>;
  }

  return (
    <section className="section">
      <div className="container narrow-wide">
        <h1 className="page-title">{t("myJobs")}</h1>
        <p className="muted">👷 {workerName}</p>

        {sharingIds && (
          <div className="live-banner">
            <span className="live-dot" />
            <div><b>{t("liveOn")}</b>{lastSent && <small> · {t("liveSent", { t: lastSent.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }) })}</small>}</div>
          </div>
        )}
        {gpsErr && <p className="error" role="alert">{gpsErr}</p>}
        {err && <p className="error" role="alert">{err}</p>}

        {jobs === null && <div className="spinner" />}
        {jobs?.length === 0 && <div className="card center"><p className="muted">{t("noJobs")}</p></div>}

        <div className="booking-list">
          {jobs?.map((j) => {
            const n = NEXT[j.status];
            const dest = j.customer_lat != null && j.customer_lng != null ? { lat: j.customer_lat, lng: j.customer_lng } : null;
            return (
              <article key={j.id} className={`card booking-card job-card ${j.status === "completed" ? "job-done" : ""}`}>
                <div className="bc-head">
                  <span className="bc-icon">{j.icon}</span>
                  <div className="bc-title"><b>{pick(j.service_en, j.service_ur)}</b><small>#{j.ref_no}</small></div>
                  <em className={`pill pill-${j.status}`}>{t(`status_${j.status}` as TKey)}</em>
                </div>
                <div className="bc-meta">
                  <span>📅 {fmtDate(j.work_date)} · {fmtTime(j.start_time)}</span>
                  <span>⏱ {j.quantity} {j.booking_type === "hourly" ? t("hours") : t("days")} · 👷 {j.workers}</span>
                  <span>🙍 {t("customer")}: <b>{j.customer_name}</b></span>
                  <span>📍 {j.address}{j.area_name ? `, ${j.area_name}` : ""}</span>
                  {j.notes && <span>📝 {j.notes}</span>}
                </div>
                {j.status !== "completed" && (
                  <div className="btn-row">
                    <a className="btn btn-sm btn-ghost" href={`tel:${j.customer_phone}`}>📞 {prettyPhone(j.customer_phone)}</a>
                    <a className="btn btn-sm btn-ghost" href={waLink(j.customer_phone)} target="_blank" rel="noreferrer">💬 WhatsApp</a>
                    <a className="btn btn-sm btn-ghost" href={directionsUrl(dest, `${j.address} ${j.area_name || ""} Lahore`)} target="_blank" rel="noreferrer">{t("navigate")}</a>
                  </div>
                )}
                {n && (
                  <button className={`btn btn-lg btn-block job-next job-next-${n.to}`} disabled={busy === j.id} onClick={() => advance(j)}>
                    {busy === j.id ? t("saving") : t(n.label)}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
