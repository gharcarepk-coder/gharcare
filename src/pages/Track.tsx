import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import LiveMap from "../components/LiveMap";
import { fmtDate, fmtTime, getPosition, supabase, waLink } from "../lib/data";
import { useI18n, TKey } from "../lib/i18n";
import { distanceKm, etaMinutes, LatLng } from "../lib/maps";

type TrackRow = {
  id: string; ref_no: number; service_en: string; service_ur: string; icon: string; status: string;
  work_date: string; start_time: string; address: string; customer_lat: number | null; customer_lng: number | null;
  created_at: string; confirmed: boolean; assigned: boolean; on_way_at: string | null; arrived_at: string | null;
  started_at: string | null; completed_at: string | null; staff_name: string | null; staff_phone: string | null;
  worker_lat: number | null; worker_lng: number | null; worker_heading: number | null; worker_updated_at: string | null;
};
type Pos = { lat: number; lng: number; heading: number | null; at: string };

const ORDER = ["pending", "confirmed", "assigned", "on_the_way", "arrived", "in_progress", "completed"];
const LIVE = ["on_the_way", "arrived", "in_progress"];
const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }) : "");

export default function Track() {
  const { id = "" } = useParams();
  const { t, pick } = useI18n();
  const [b, setB] = useState<TrackRow | null | undefined>(undefined);
  const [pos, setPos] = useState<Pos | null>(null);
  const [now, setNow] = useState(Date.now());
  const [locMsg, setLocMsg] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("track_booking", { p_id: id });
    const row = ((data as TrackRow[]) || [])[0] || null;
    setB(row);
    if (row?.worker_lat != null && row.worker_lng != null && row.worker_updated_at) {
      setPos({ lat: row.worker_lat, lng: row.worker_lng, heading: row.worker_heading, at: row.worker_updated_at });
    } else if (row && !LIVE.includes(row.status)) setPos(null);
  }, [id]);

  // Live updates: new GPS points and status changes are pushed instantly; a slow poll is the safety net.
  useEffect(() => {
    load();
    const ch = supabase.channel(`track-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "worker_locations", filter: `booking_id=eq.${id}` }, (p) => {
        const r = p.new as { lat?: number; lng?: number; heading?: number | null; updated_at?: string };
        if (p.eventType === "DELETE" || r.lat == null || r.lng == null) setPos(null);
        else setPos({ lat: r.lat, lng: r.lng, heading: r.heading ?? null, at: r.updated_at || new Date().toISOString() });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${id}` }, () => load())
      .subscribe();
    const poll = setInterval(load, 20000);
    const tick = setInterval(() => setNow(Date.now()), 10000);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { supabase.removeChannel(ch); clearInterval(poll); clearInterval(tick); document.removeEventListener("visibilitychange", onVis); };
  }, [id, load]);

  const pinHome = async () => {
    setLocMsg(t("saving"));
    try {
      const p = await getPosition();
      const { error } = await supabase.rpc("set_booking_location", { p_id: id, p_lat: p.coords.latitude, p_lng: p.coords.longitude });
      if (error) throw error;
      setLocMsg(t("locSaved"));
      load();
    } catch (e) {
      setLocMsg((e as Error).message === "denied" ? t("locDenied") : t("gpsError"));
    }
  };

  if (b === undefined) return <section className="section container"><div className="spinner" /></section>;
  if (b === null) {
    return (
      <section className="section"><div className="container narrow center">
        <h1 className="page-title">{t("notFound")}</h1>
        <Link to="/my-bookings" className="btn">{t("myBookings")}</Link>
      </div></section>
    );
  }

  const home: LatLng | null = b.customer_lat != null && b.customer_lng != null ? { lat: b.customer_lat, lng: b.customer_lng } : null;
  const live = LIVE.includes(b.status);
  const worker: LatLng | null = live && pos ? { lat: pos.lat, lng: pos.lng } : null;
  const ageMin = pos ? Math.floor((now - new Date(pos.at).getTime()) / 60000) : null;
  const km = worker && home ? distanceKm(worker, home) : null;
  const name = b.staff_name || t("worker");
  const idx = ORDER.indexOf(b.status);
  const cancelled = b.status === "cancelled";

  const headline: Record<string, string> = {
    pending: t("headPending"), confirmed: t("headConfirmed"), assigned: t("headAssigned", { name }),
    on_the_way: t("headOnWay", { name }), arrived: t("headArrived", { name }), in_progress: t("headInProgress", { name }),
    completed: t("headCompleted"), cancelled: t("headCancelled"),
  };
  const steps: { key: string; label: TKey; at: string | null }[] = [
    { key: "pending", label: "stepBooked", at: b.created_at },
    { key: "confirmed", label: "stepConfirmed", at: null },
    { key: "assigned", label: "stepAssigned", at: null },
    { key: "on_the_way", label: "stepOnWay", at: b.on_way_at },
    { key: "arrived", label: "stepArrived", at: b.arrived_at },
    { key: "in_progress", label: "stepStarted", at: b.started_at },
    { key: "completed", label: "stepDone", at: b.completed_at },
  ];

  return (
    <section className="section track">
      <div className="container narrow-wide">
        <div className={`card track-head ${cancelled ? "is-cancelled" : ""}`}>
          <div className="track-svc"><span className="bc-icon">{b.icon}</span>
            <div><b>{pick(b.service_en, b.service_ur)}</b><small>#{b.ref_no} · {fmtDate(b.work_date)} · {fmtTime(b.start_time)}</small></div>
          </div>
          <h1 className="track-title">{headline[b.status] || b.status}</h1>
          {b.status === "on_the_way" && (
            <p className="track-eta">
              {km != null ? (km < 0.15 ? t("etaNear") : t("etaText", { min: etaMinutes(km), km: km.toFixed(1) })) : worker ? "" : t("gpsWaiting")}
            </p>
          )}
          {live && pos && ageMin != null && (
            <p className={`track-age ${ageMin >= 3 ? "stale" : ""}`}><span className="live-dot" />{ageMin < 1 ? t("updatedJustNow") : t("updatedMin", { n: ageMin })}</p>
          )}
        </div>

        {(live || home) && !cancelled && b.status !== "completed" && (
          <div className="card track-map">
            <LiveMap home={home} worker={worker} heading={pos?.heading} />
            <div className="map-legend">
              <span><i className="lg-worker" /> {t("workerHere")}</span>
              <span><i className="lg-home" /> {t("youHere")}</span>
              {km != null && <span className="muted small">{t("mapApprox")}</span>}
            </div>
          </div>
        )}

        {!home && !cancelled && b.status !== "completed" && (
          <div className="card track-pin">
            <p>{t("shareLocHint")}</p>
            <button className="btn btn-ghost" onClick={pinHome}>{t("shareMyLocation")}</button>
            {locMsg && <p className="small muted">{locMsg}</p>}
          </div>
        )}

        {b.staff_name && b.staff_phone && (
          <div className="card track-worker">
            <div className="tw-avatar">👷</div>
            <div className="tw-info"><small>{t("worker")}</small><b>{b.staff_name}</b></div>
            <a className="btn btn-sm" href={`tel:${b.staff_phone}`}>📞 {t("callWorker")}</a>
            <a className="btn btn-sm btn-ghost" href={waLink(b.staff_phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>
          </div>
        )}

        {!cancelled && (
          <ol className="card timeline">
            {steps.map((s, i) => {
              const state = i < idx || (i === idx && s.key === "completed") ? "done" : i === idx ? "now" : "todo";
              return (
                <li key={s.key} className={`tl-${state}`}>
                  <span className="tl-dot">{state === "done" ? "✓" : ""}</span>
                  <span className="tl-label">{t(s.label)}</span>
                  {state !== "todo" && s.at && <small className="tl-time">{clock(s.at)}</small>}
                </li>
              );
            })}
          </ol>
        )}

        <p className="center small muted">📍 {b.address}</p>
        <p className="center"><Link to="/my-bookings">← {t("myBookings")}</Link></p>
      </div>
    </section>
  );
}
