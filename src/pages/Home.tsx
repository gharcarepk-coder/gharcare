import { Link } from "react-router-dom";
import { rs, useApp, waLink } from "../lib/data";
import { useI18n } from "../lib/i18n";
import { WaIcon } from "../components/Layout";

export default function Home() {
  const { t, pick } = useI18n();
  const { categories, services, settings, catalogReady } = useApp();

  const minRate = (catId: string) => {
    const r = services.filter((s) => s.category_id === catId && s.hourly_rate > 0).map((s) => s.hourly_rate);
    return r.length ? Math.min(...r) : 0;
  };
  const firstService = (catId: string) => services.find((s) => s.category_id === catId)?.id;

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">{t("tagline")}</span>
            <h1>{t("heroTitle")}</h1>
            <p className="lead">{t("heroSub")}</p>
            <div className="hero-actions">
              <Link to="/book" className="btn btn-lg">{t("bookNow")}</Link>
              <a href={waLink(settings.whatsapp, "Assalam o Alaikum GharCare, I need a worker.")} target="_blank" rel="noreferrer" className="btn btn-lg btn-ghost">
                <WaIcon /> {t("whatsappUs")}
              </a>
            </div>
            <div className="hero-badges">
              <span>✔ {t("why1")}</span><span>✔ {t("why2")}</span><span>✔ {t("why3")}</span>
            </div>
          </div>
          <div className="hero-card" aria-hidden="true">
            <div className="hc-row hc-head"><span>🧹</span><div><b>{pick("House Cleaning", "گھر کی صفائی")}</b><small>{pick("2 workers · 4 hours", "2 کاریگر · 4 گھنٹے")}</small></div><em className="pill pill-assigned">{t("status_assigned")}</em></div>
            <div className="hc-row"><span>🔧</span><div><b>{pick("Plumber", "پلمبر")}</b><small>{pick("Today · 11:00 AM", "آج · 11:00 AM")}</small></div><em className="pill pill-confirmed">{t("status_confirmed")}</em></div>
            <div className="hc-row"><span>💡</span><div><b>{pick("Electrician", "الیکٹریشن")}</b><small>{pick("1 day · full day", "1 دن · پورا دن")}</small></div><em className="pill pill-completed">{t("status_completed")}</em></div>
            <div className="hc-foot"><span>{t("payCash")}</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>{t("ourServices")}</h2>
            <Link to="/services" className="link-arrow">{t("allServices")} →</Link>
          </div>
          <div className="cat-grid">
            {!catalogReady && Array.from({ length: 8 }).map((_, i) => <div key={i} className="cat-card skeleton" />)}
            {categories.map((c) => (
              <Link key={c.id} to={firstService(c.id) ? `/book?service=${firstService(c.id)}` : "/services"} className="cat-card">
                {c.image_url ? <img className="cat-img" src={c.image_url} alt="" loading="lazy" /> : <span className="cat-icon">{c.icon}</span>}
                <b>{pick(c.name_en, c.name_ur)}</b>
                {settings.show_prices && minRate(c.id) > 0 && <small>{t("from")} {rs(minRate(c.id))}{t("perHour")}</small>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-tint">
        <div className="container">
          <h2 className="center">{t("howItWorks")}</h2>
          <ol className="steps">
            {([1, 2, 3, 4] as const).map((n) => (
              <li key={n} className="step">
                <span className="step-num">{n}</span>
                <b>{t(`step${n}` as "step1")}</b>
                <p>{t(`step${n}d` as "step1d")}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="center">{t("why")}</h2>
          <div className="why-grid">
            {([["🪪", 1], ["⏱️", 2], ["💵", 3], ["📞", 4]] as const).map(([ic, n]) => (
              <div key={n} className="why-card">
                <span className="why-icon">{ic}</span>
                <b>{t(`why${n}` as "why1")}</b>
                <p>{t(`why${n}d` as "why1d")}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="container cta-inner">
          <div>
            <h2>{t("ctaTitle")}</h2>
            <p>{t("ctaSub")}</p>
          </div>
          <div className="hero-actions">
            <Link to="/book" className="btn btn-lg btn-light">{t("bookNow")}</Link>
            <a href={`tel:${settings.phone}`} className="btn btn-lg btn-outline-light">📞 {settings.phone}</a>
          </div>
        </div>
      </section>
    </>
  );
}
