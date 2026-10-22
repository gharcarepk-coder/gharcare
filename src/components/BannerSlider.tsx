import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/data";
import { useI18n } from "../lib/i18n";

export type Banner = {
  id: string; image_url: string; title_en: string; title_ur: string; subtitle_en: string; subtitle_ur: string;
  link: string; sort_order: number; is_active: boolean;
};

export default function BannerSlider() {
  const { pick, t } = useI18n();
  const [items, setItems] = useState<Banner[]>([]);
  const [i, setI] = useState(0);
  const timer = useRef<number>();
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    supabase.from("banners").select("*").eq("is_active", true).order("sort_order").then(({ data }) => setItems((data as Banner[]) || []));
  }, []);
  useEffect(() => {
    if (items.length < 2) return;
    timer.current = window.setInterval(() => setI((x) => (x + 1) % items.length), 5000);
    return () => window.clearInterval(timer.current);
  }, [items.length, i]);

  if (!items.length) return null;
  const go = (n: number) => setI((n + items.length) % items.length);

  return (
    <section className="banners" aria-roledescription="carousel"
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}>
      <div className="banner-track" style={{ transform: `translateX(${document.documentElement.dir === "rtl" ? i * 100 : -i * 100}%)` }}>
        {items.map((b, n) => {
          const title = pick(b.title_en, b.title_ur);
          const sub = pick(b.subtitle_en, b.subtitle_ur);
          const inner = (
            <>
              <img src={b.image_url} alt={title || "GharCare"} loading={n === 0 ? "eager" : "lazy"} />
              {(title || sub) && (
                <div className="banner-text">
                  {title && <h2>{title}</h2>}
                  {sub && <p>{sub}</p>}
                  <span className="btn btn-sm btn-light">{t("bookNow")}</span>
                </div>
              )}
            </>
          );
          return (
            <div className="banner-slide" key={b.id} aria-hidden={n !== i}>
              {b.link.startsWith("http") ? <a href={b.link} target="_blank" rel="noreferrer">{inner}</a> : <Link to={b.link || "/book"}>{inner}</Link>}
            </div>
          );
        })}
      </div>
      {items.length > 1 && (
        <>
          <button className="banner-nav prev" aria-label="Previous" onClick={() => go(i - 1)}>‹</button>
          <button className="banner-nav next" aria-label="Next" onClick={() => go(i + 1)}>›</button>
          <div className="banner-dots">
            {items.map((b, n) => <button key={b.id} className={n === i ? "on" : ""} aria-label={`Banner ${n + 1}`} onClick={() => go(n)} />)}
          </div>
        </>
      )}
    </section>
  );
}
