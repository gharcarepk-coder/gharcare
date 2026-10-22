import { Link } from "react-router-dom";
import { rs, useApp } from "../lib/data";
import { useI18n } from "../lib/i18n";

export default function Services() {
  const { t, pick } = useI18n();
  const { categories, services, catalogReady, settings } = useApp();
  return (
    <section className="section">
      <div className="container">
        <h1 className="page-title">{t("ourServices")}</h1>
        {!catalogReady && <div className="svc-card skeleton" style={{ height: 120 }} />}
        {categories.map((c) => {
          const list = services.filter((s) => s.category_id === c.id);
          if (!list.length) return null;
          return (
            <div key={c.id} className="svc-group">
              <h2 className="svc-group-title">{c.image_url ? <img className="svc-group-img" src={c.image_url} alt="" /> : <span>{c.icon}</span>} {pick(c.name_en, c.name_ur)}</h2>
              <div className="svc-grid">
                {list.map((s) => (
                  <div key={s.id} className="svc-card">
                    {s.image_url && <img className="svc-img" src={s.image_url} alt="" loading="lazy" />}
                    <div>
                      <h3>{pick(s.name_en, s.name_ur)}</h3>
                      <p className="muted">{pick(s.description_en, s.description_ur)}</p>
                    </div>
                    <div className="svc-foot">
                      <div className="rates">{settings.show_prices && (<>
                        {s.hourly_rate > 0 && <span><b>{rs(s.hourly_rate)}</b>{t("perHour")}</span>}
                        {s.daily_rate > 0 && <span><b>{rs(s.daily_rate)}</b>{t("perDay")}</span>}</>)}
                      </div>
                      <Link to={`/book?service=${s.id}`} className="btn btn-sm">{t("bookNow")}</Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
