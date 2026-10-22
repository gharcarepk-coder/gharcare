import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { callAuthHelper, normalizePhone, phoneEmail, supabase, useApp, waLink } from "../lib/data";
import { useI18n, TKey } from "../lib/i18n";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { t } = useI18n();
  const { session, settings } = useApp();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<TKey | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const p = normalizePhone(phone);
    if (mode === "signup" && name.trim().length < 2) return setErr("errName");
    if (!p) return setErr("errPhone");
    if (password.length < 6) return setErr("errPassword");
    setBusy(true);
    try {
      if (mode === "signup") {
        try {
          await callAuthHelper({ action: "signup", phone: p, password, full_name: name.trim() });
        } catch (ex) {
          const m = (ex as Error).message;
          setErr(m === "phone_taken" ? "errTaken" : m === "invalid_phone" ? "errPhone" : "errGeneric");
          setBusy(false);
          return;
        }
      }
      const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(p), password });
      if (error) { setErr(mode === "login" ? "errLogin" : "errGeneric"); setBusy(false); return; }
      nav(next, { replace: true });
    } catch {
      setErr("errGeneric");
      setBusy(false);
    }
  };

  const q = params.toString() ? `?${params.toString()}` : "";
  return (
    <section className="section">
      <div className="container narrow">
        <form className="card form" onSubmit={submit} noValidate>
          <h1 className="page-title">{mode === "login" ? t("login") : t("signup")}</h1>
          {mode === "signup" && (
            <label className="field">
              <span>{t("fullName")}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="field">
            <span>{t("phone")}</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder={t("phoneHint")} dir="ltr" required />
          </label>
          <label className="field">
            <span>{t("password")}</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={t("passwordHint")} dir="ltr" required />
          </label>
          {err && <p className="error" role="alert">{t(err)}</p>}
          <button className="btn btn-lg btn-block" disabled={busy}>{busy ? t("saving") : mode === "login" ? t("login") : t("signup")}</button>
          {mode === "login" ? (
            <>
              <p className="center muted">{t("noAccount")} <Link to={`/signup${q}`}>{t("signup")}</Link></p>
              <p className="center small"><a href={waLink(settings.whatsapp, "Please reset my GharCare password.")} target="_blank" rel="noreferrer">{t("forgot")}</a></p>
            </>
          ) : (
            <p className="center muted">{t("haveAccount")} <Link to={`/login${q}`}>{t("login")}</Link></p>
          )}
        </form>
      </div>
    </section>
  );
}
