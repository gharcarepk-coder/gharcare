import { Link } from "react-router-dom";
import { useI18n } from "../lib/i18n";

export const APK_URL = "https://github.com/gharcarepk-coder/gharcare/releases/download/android-latest/GharCare.apk";

export default function AppDownload() {
  const { lang } = useI18n();
  const ur = lang === "ur";
  return (
    <section className="section">
      <div className="container narrow center">
        <img src="/icons/icon-512.png" alt="GharCare PK app icon" width={96} height={96} style={{ margin: "0 auto 16px", borderRadius: 22 }} />
        <h1 className="page-title">{ur ? "گھر کیئر پی کے ایپ ڈاؤن لوڈ کریں" : "GharCare PK App — Download for Android"}</h1>
        <p className="lead" style={{ margin: "0 auto 24px" }}>
          {ur
            ? "لاہور میں صفائی، پلمبر، الیکٹریشن، اے سی، مکینک، پینٹر اور ہیلپر — ایک ٹچ میں بُک کریں۔"
            : "Book cleaners, plumbers, electricians, AC technicians, mechanics, painters and helpers in Lahore in one tap."}
        </p>

        <div className="card form" style={{ textAlign: "start" }}>
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>🤖 {ur ? "اینڈرائیڈ (APK)" : "Android (APK)"}</h2>
          <a className="btn btn-lg btn-block" href={APK_URL}>{ur ? "گھر کیئر پی کے ایپ ڈاؤن لوڈ کریں" : "Download GharCare PK APK"}</a>
          <p className="muted small">{ur ? "مفت · تقریباً 10 MB · اینڈرائیڈ 6 یا نیا" : "Free · about 10 MB · Android 6 or newer"}</p>
          <ol className="muted small" style={{ paddingInlineStart: 18, margin: 0, display: "grid", gap: 4 }}>
            <li>{ur ? "اوپر والا بٹن دبائیں اور فائل ڈاؤن لوڈ ہونے دیں۔" : "Tap the button above and let the file download."}</li>
            <li>{ur ? "ڈاؤن لوڈ شدہ GharCare.apk کھولیں اور Install دبائیں۔" : "Open the downloaded GharCare.apk and tap Install."}</li>
            <li>{ur ? "اگر فون پوچھے تو اس سورس سے انسٹال کی اجازت دیں۔" : "If your phone asks, allow installing from this source."}</li>
            <li>{ur ? "اگر Play Protect وارننگ آئے تو “More details” پھر “Install anyway” دبائیں۔ یہ گھر کیئر کی اپنی ایپ ہے۔" : "If Play Protect shows a warning, tap “More details”, then “Install anyway”. This is GharCare's own official app."}</li>
          </ol>
          <p className="note-box small" style={{ margin: 0 }}>
            {ur ? "گوگل پلے اسٹور پر جلد آ رہی ہے۔" : "Coming soon on Google Play."}
          </p>
        </div>

        <div className="card form" style={{ textAlign: "start", marginTop: 16 }}>
          <h2 style={{ fontSize: "1.2rem", margin: 0 }}>🍎 iPhone</h2>
          <p className="muted small">
            {ur
              ? "Safari میں www.gharcarepk.com کھولیں، شیئر بٹن دبائیں، پھر \"Add to Home Screen\"۔"
              : "Open www.gharcarepk.com in Safari, tap Share, then “Add to Home Screen”."}
          </p>
        </div>

        <div className="card" style={{ textAlign: "start", marginTop: 16 }}>
          <h2 style={{ fontSize: "1.2rem", marginTop: 0 }}>{ur ? "ایپ میں کیا ہے" : "What you can do in the app"}</h2>
          <ul className="muted small" style={{ paddingInlineStart: 18, display: "grid", gap: 4 }}>
            <li>{ur ? "گھنٹے یا پورے دن کے لیے کاریگر بُک کریں" : "Book a worker by the hour or for full days"}</li>
            <li>{ur ? "بکنگ سے پہلے قیمت دیکھیں" : "See the price before you book"}</li>
            <li>{ur ? "اپنی بکنگز اور کاریگر کا نام و نمبر دیکھیں" : "Track your bookings and see your worker's name and number"}</li>
            <li>{ur ? "کام کے بعد جاز کیش یا ایزی پیسہ سے ادائیگی" : "Pay by JazzCash or Easypaisa after the job"}</li>
            <li>{ur ? "اردو اور انگریزی دونوں میں" : "Works in Urdu and English"}</li>
          </ul>
          <p className="muted small" style={{ marginBottom: 0 }}>
            <Link to="/privacy/">{ur ? "پرائیویسی پالیسی" : "Privacy policy"}</Link> · <Link to="/delete-account/">{ur ? "اکاؤنٹ ڈیلیٹ کریں" : "Delete your account"}</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
