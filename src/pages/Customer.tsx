import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { fmtDate, fmtTime, prettyPhone, rs, supabase, useApp } from "../lib/data";
import { useI18n, TKey } from "../lib/i18n";

type MyBooking = {
  id: string; ref_no: number; service_en: string; service_ur: string; icon: string; booking_type: "hourly" | "daily";
  work_date: string; start_time: string; quantity: number; workers: number; est_total: number; final_amount: number | null;
  status: string; address: string; staff_name: string | null; staff_phone: string | null; created_at: string;
};

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, authReady } = useApp();
  if (!authReady) return <div className="section container"><div className="spinner" /></div>;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}

export function MyBookings() {
  const { t, pick } = useI18n();
  const [rows, setRows] = useState<MyBooking[] | null>(null);

  const load = async () => {
    const { data } = await supabase.rpc("my_bookings");
    setRows((data as MyBooking[]) || []);
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id: string) => {
    if (!confirm(t("cancelConfirm"))) return;
    await supabase.rpc("cancel_my_booking", { p_id: id });
    load();
  };

  return (
    <section className="section">
      <div className="container narrow-wide">
        <div className="section-head">
          <h1 className="page-title">{t("myBookings")}</h1>
          <Link to="/book" className="btn btn-sm">{t("bookNow")}</Link>
        </div>
        {rows === null && <div className="spinner" />}
        {rows?.length === 0 && <div className="card center"><p className="muted">{t("noBookings")}</p><Link to="/book" className="btn">{t("bookNow")}</Link></div>}
        <div className="booking-list">
          {rows?.map((b) => (
            <article key={b.id} className="card booking-card">
              <div className="bc-head">
                <span className="bc-icon">{b.icon}</span>
                <div className="bc-title">
                  <b>{pick(b.service_en, b.service_ur)}</b>
                  <small>#{b.ref_no}</small>
                </div>
                <em className={`pill pill-${b.status}`}>{t(`status_${b.status}` as TKey)}</em>
              </div>
              <div className="bc-meta">
                <span>📅 {fmtDate(b.work_date)} · {fmtTime(b.start_time)}</span>
                <span>⏱ {b.quantity} {b.booking_type === "hourly" ? t("hours") : t("days")} · 👷 {b.workers}</span>
                <span>📍 {b.address}</span>
              </div>
              {b.staff_name && (
                <div className="bc-worker">
                  <span>{t("worker")}: <b>{b.staff_name}</b></span>
                  {b.staff_phone && <a className="btn btn-sm btn-ghost" href={`tel:${b.staff_phone}`}>📞 {t("callWorker")} {prettyPhone(b.staff_phone)}</a>}
                </div>
              )}
              <div className="bc-foot">
                <span>{t("total")}: <b>{rs(b.final_amount ?? b.est_total)}</b></span>
                {(b.status === "pending" || b.status === "confirmed") && (
                  <button className="link-btn danger" onClick={() => cancel(b.id)}>{t("cancel")}</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Account() {
  const { t } = useI18n();
  const { profile, refreshProfile } = useApp();
  const [name, setName] = useState(profile?.full_name || "");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  useEffect(() => { setName(profile?.full_name || ""); }, [profile?.full_name]);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || name.trim().length < 2) return;
    const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", profile.id);
    setMsg(error ? t("errGeneric") : t("saved"));
    refreshProfile();
  };
  const savePw = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return setPwMsg(t("errPassword"));
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwMsg(error ? t("errGeneric") : t("saved"));
    setPw("");
  };

  return (
    <section className="section">
      <div className="container narrow">
        <h1 className="page-title">{t("account")}</h1>
        <form className="card form" onSubmit={saveName}>
          <label className="field"><span>{t("fullName")}</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span>{t("phone")}</span><input value={prettyPhone(profile?.phone)} disabled dir="ltr" /></label>
          {msg && <p className="ok">{msg}</p>}
          <button className="btn">{t("save")}</button>
        </form>
        <form className="card form" onSubmit={savePw} style={{ marginTop: 16 }}>
          <h3>{t("changePassword")}</h3>
          <label className="field"><span>{t("newPassword")}</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" dir="ltr" /></label>
          {pwMsg && <p className="ok">{pwMsg}</p>}
          <button className="btn">{t("save")}</button>
        </form>
      </div>
    </section>
  );
}

export function NotFound() {
  const { t } = useI18n();
  return (
    <section className="section"><div className="container narrow center">
      <h1 className="page-title">{t("notFound")}</h1>
      <Link to="/" className="btn">{t("goHome")}</Link>
    </div></section>
  );
}
