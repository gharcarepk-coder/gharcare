import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { supabase, useApp, waLink, prettyPhone } from "../lib/data";
import { useI18n } from "../lib/i18n";

export function Logo({ light = false }: { light?: boolean }) {
  const { settings } = useApp();
  return (
    <Link to="/" className={`logo ${light ? "logo-light" : ""}`} aria-label="GharCare home">
      <img className="brand-logo" src={settings.logo_url || "/brand-logo.webp"} alt="GharCare گھر کیئر" />
    </Link>
  );
}

function WaIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2z" />
    </svg>
  );
}
export { WaIcon };

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function InstallBanner() {
  const { t } = useI18n();
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem("gc_install_dismissed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone) { setHidden(true); return; }
    const onBip = (e: Event) => { e.preventDefault(); setEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onBip);
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua)) setIos(true);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);
  if (hidden || (!evt && !ios)) return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem("gc_install_dismissed", "1"); } catch { /* */ } };
  return (
    <div className="install-banner" role="dialog" aria-label={t("installApp")}>
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="install-text">
        <b>{t("installApp")}</b>
        <span>{ios && !evt ? t("iosInstall") : t("installText")}</span>
      </div>
      {evt && (
        <button className="btn btn-sm" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); dismiss(); }}>
          {t("install")}
        </button>
      )}
      <button className="icon-btn" onClick={dismiss} aria-label={t("notNow")}>✕</button>
    </div>
  );
}

export default function Layout() {
  const { t, lang, setLang, pick } = useI18n();
  const { session, profile, settings } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const announcement = pick(settings.announcement_en, settings.announcement_ur);

  const logout = async () => { await supabase.auth.signOut(); setOpen(false); nav("/"); };

  return (
    <div className="site">
      {announcement && <div className="announce">{announcement}</div>}
      <header className="header">
        <div className="container header-inner">
          <Logo />
          <nav className={`nav ${open ? "nav-open" : ""}`} onClick={() => setOpen(false)}>
            <NavLink to="/services/">{t("ourServices")}</NavLink>
            {session && <NavLink to="/my-bookings">{t("myBookings")}</NavLink>}
            {profile?.role === "admin" && <NavLink to="/admin">{t("admin")}</NavLink>}
            {session ? (
              <>
                <NavLink to="/account">{t("account")}</NavLink>
                <button className="link-btn" onClick={logout}>{t("logout")}</button>
              </>
            ) : (
              <NavLink to="/login">{t("login")}</NavLink>
            )}
            <Link to="/book/" className="btn btn-sm nav-cta">{t("bookNow")}</Link>
          </nav>
          <div className="header-tools">
            <button className="lang-btn" onClick={() => setLang(lang === "en" ? "ur" : "en")}>{t("language")}</button>
            <button className="icon-btn menu-btn" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      <main><Outlet /></main>

      <footer className="footer">
        <div className="container footer-grid">
          <div>
            <Logo light />
            <p className="muted-light">{t("tagline")}</p>
            {settings.town && <p className="muted-light">{t("serviceArea")}: {settings.town}</p>}
          </div>
          <div>
            <h4>{t("contact")}</h4>
            <p><a href={`tel:${settings.phone}`}>📞 {prettyPhone(settings.phone)}</a></p>
            <p><a href={waLink(settings.whatsapp)} target="_blank" rel="noreferrer">💬 WhatsApp</a></p>
            <p><a href={`mailto:${settings.email}`}>✉️ {settings.email}</a></p>
          </div>
          <div>
            <h4>{t("hoursLabel")}</h4>
            <p className="muted-light">{settings.hours_text}</p>
            <p><Link to="/services/">{t("allServices")}</Link></p>
            <p><Link to="/book/">{t("bookNow")}</Link></p>
            <p><Link to="/app/">📱 {t("installApp")}</Link></p>
            <p><Link to="/join/">🧰 {pick("Work with GharCare", "گھر کیئر کے ساتھ کام کریں")}</Link></p>
          </div>
        </div>
        <div className="container footer-bottom">© {new Date().getFullYear()} GharCare PK. {t("rights")} · <Link to="/privacy/">Privacy</Link> · <Link to="/delete-account/">Delete account</Link></div>
      </footer>

      <a className="wa-fab" href={waLink(settings.whatsapp, "Assalam o Alaikum GharCare, I need a worker.")} target="_blank" rel="noreferrer" aria-label={t("whatsappUs")}>
        <WaIcon />
      </a>
      <InstallBanner />
    </div>
  );
}
