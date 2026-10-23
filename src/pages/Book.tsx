import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { rs, supabase, todayISO, useApp } from "../lib/data";
import { useI18n } from "../lib/i18n";

type Draft = {
  serviceId: string; type: "hourly" | "daily"; qty: number; workers: number;
  date: string; time: string; areaId: string; address: string; notes: string;
};

const DRAFT_KEY = "gc_booking_draft";
function loadDraft(): Partial<Draft> {
  try { return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}

export default function Book() {
  const { t, pick } = useI18n();
  const { services, categories, areas, session, profile, catalogReady } = useApp();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const saved = loadDraft();

  const [d, setD] = useState<Draft>({
    serviceId: params.get("service") || saved.serviceId || "",
    type: saved.type || "hourly",
    qty: saved.qty || 2,
    workers: saved.workers || 1,
    date: saved.date && saved.date >= todayISO() ? saved.date : todayISO(),
    time: saved.time || "10:00",
    areaId: saved.areaId || "",
    address: saved.address || "",
    notes: saved.notes || "",
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const svc = services.find((s) => s.id === d.serviceId);

  useEffect(() => {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* ignore */ }
  }, [d]);

  // keep qty valid for the chosen service/type
  useEffect(() => {
    if (!svc) return;
    if (d.type === "hourly" && svc.hourly_rate <= 0 && svc.daily_rate > 0) set("type", "daily");
    if (d.type === "daily" && svc.daily_rate <= 0 && svc.hourly_rate > 0) set("type", "hourly");
    if (d.type === "hourly" && d.qty < svc.min_hours) set("qty", svc.min_hours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svc?.id, d.type]);

  const rate = svc ? (d.type === "hourly" ? svc.hourly_rate : svc.daily_rate) : 0;
  const total = Math.round(rate * d.qty * d.workers);
  const grouped = useMemo(
    () => categories.map((c) => ({ c, list: services.filter((s) => s.category_id === c.id) })).filter((g) => g.list.length),
    [categories, services],
  );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!session) { nav(`/login?next=${encodeURIComponent("/book")}`); return; }
    if (!svc) return setErr(t("chooseService"));
    if (areas.length && !d.areaId) return setErr(t("chooseArea"));
    if (d.address.trim().length < 5) return setErr(t("addressHint"));
    setBusy(true);
    const { data, error } = await supabase.from("bookings").insert({
      customer_name: profile?.full_name || "Customer",
      customer_phone: profile?.phone || "",
      service_id: svc.id,
      area_id: d.areaId || null,
      address: d.address.trim(),
      booking_type: d.type,
      work_date: d.date,
      start_time: d.time,
      quantity: d.qty,
      workers: d.workers,
      notes: d.notes.trim() || null,
    }).select("ref_no").single();
    setBusy(false);
    if (error) { setErr(t("errGeneric")); console.error(error); return; }
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setDone(data.ref_no as number);
    window.scrollTo({ top: 0 });
  };

  if (done) {
    return (
      <section className="section">
        <div className="container narrow">
          <div className="card center success-card">
            <div className="big-check">✓</div>
            <h1 className="page-title">{t("booked")}</h1>
            <p className="lead">{t("bookedSub", { ref: done })}</p>
            <Link to="/my-bookings" className="btn btn-lg">{t("viewBookings")}</Link>
          </div>
        </div>
      </section>
    );
  }

  const qtyOptions = d.type === "hourly"
    ? Array.from({ length: 12 }, (_, i) => i + 1).filter((n) => !svc || n >= svc.min_hours)
    : [1, 2, 3, 4, 5, 6, 7, 10, 14, 15, 20, 26, 30];

  return (
    <section className="section">
      <div className="container book-grid">
        <form className="card form" onSubmit={submit} noValidate>
          <h1 className="page-title">{t("bookTitle")}</h1>

          <label className="field">
            <span>{t("service")}</span>
            <select value={d.serviceId} onChange={(e) => set("serviceId", e.target.value)} required disabled={!catalogReady}>
              <option value="">{t("chooseService")}</option>
              {grouped.map(({ c, list }) => (
                <optgroup key={c.id} label={`${c.icon} ${pick(c.name_en, c.name_ur)}`}>
                  {list.map((s) => <option key={s.id} value={s.id}>{pick(s.name_en, s.name_ur)}</option>)}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="field">
            <span>{t("bookingType")}</span>
            <div className="seg">
              <button type="button" className={d.type === "hourly" ? "on" : ""} disabled={!!svc && svc.hourly_rate <= 0}
                onClick={() => { set("type", "hourly"); set("qty", Math.max(svc?.min_hours || 2, 2)); }}>
                {t("hourly")}{svc && svc.hourly_rate > 0 && <small>{rs(svc.hourly_rate)}{t("perHour")}</small>}
              </button>
              <button type="button" className={d.type === "daily" ? "on" : ""} disabled={!!svc && svc.daily_rate <= 0}
                onClick={() => { set("type", "daily"); set("qty", 1); }}>
                {t("daily")}{svc && svc.daily_rate > 0 && <small>{rs(svc.daily_rate)}{t("perDay")}</small>}
              </button>
            </div>
          </div>

          <div className="row2">
            <label className="field">
              <span>{d.type === "hourly" ? t("hours") : t("days")}</span>
              <select value={d.qty} onChange={(e) => set("qty", Number(e.target.value))}>
                {qtyOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {d.type === "hourly" && svc && svc.min_hours > 1 && <small className="muted">{t("minHours", { n: svc.min_hours })}</small>}
            </label>
            <label className="field">
              <span>{t("workers")}</span>
              <select value={d.workers} onChange={(e) => set("workers", Number(e.target.value))}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>

          <div className="row2">
            <label className="field">
              <span>{t("date")}</span>
              <input type="date" min={todayISO()} value={d.date} onChange={(e) => set("date", e.target.value)} required />
            </label>
            <label className="field">
              <span>{t("time")}</span>
              <input type="time" value={d.time} step={1800} onChange={(e) => set("time", e.target.value)} required />
            </label>
          </div>

          {areas.length > 0 && (
            <label className="field">
              <span>{t("area")}</span>
              <select value={d.areaId} onChange={(e) => set("areaId", e.target.value)} required>
                <option value="">{t("chooseArea")}</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}

          <label className="field">
            <span>{t("address")}</span>
            <textarea rows={2} value={d.address} onChange={(e) => set("address", e.target.value)} placeholder={t("addressHint")} required />
          </label>

          <label className="field">
            <span>{t("notes")}</span>
            <textarea rows={2} value={d.notes} onChange={(e) => set("notes", e.target.value)} placeholder={t("notesHint")} />
          </label>

          {err && <p className="error" role="alert">{err}</p>}

          <div className="mobile-total">
            <span>{t("estimate")}</span><b>{rs(total)}</b>
          </div>
          <button className="btn btn-lg btn-block" disabled={busy}>
            {busy ? t("saving") : session ? t("confirmBooking") : t("loginToBook")}
          </button>
        </form>

        <aside className="card summary">
          <h3>{t("estimate")}</h3>
          {svc ? (
            <>
              <p className="summary-svc">{pick(svc.name_en, svc.name_ur)}</p>
              <div className="sum-row"><span>{rs(rate)} × {d.qty} {d.type === "hourly" ? t("hours") : t("days")}</span></div>
              <div className="sum-row"><span>× {d.workers} {t("workers")}</span></div>
              <div className="sum-total"><span>{t("total")}</span><b>{rs(total)}</b></div>
            </>
          ) : <p className="muted">{t("chooseService")}</p>}
          <p className="muted small">📱 {t("payCash")}</p>
        </aside>
      </div>
    </section>
  );
}
