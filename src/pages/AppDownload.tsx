import { useI18n } from "../lib/i18n";

const APK = "https://github.com/gharcarepk-coder/gharcare/releases/download/android-latest/GharCare.apk";

export default function AppDownload() {
  const { lang } = useI18n();
  const ur = lang === "ur";
  return (
    <section className="section">
      <div className="container narrow center">
        <img src="/icons/icon-512.png" alt="GharCare" width={96} height={96} style={{ margin: "0 auto 16px", borderRadius: 22 }} />
        <h1 className="page-title">{ur ? "گھر کیئر ایپ ڈاؤن لوڈ کریں" : "Download the GharCare app"}</h1>
        <p className="lead" style={{ margin: "0 auto 24px" }}>
          {ur ? "صفائی، پلمبر، الیکٹریشن، مکینک — ایک ٹچ میں بُک کریں۔" : "Book cleaners, plumbers, electricians and mechanics in one tap."}
        </p>
        <div className="card form" style={{ textAlign: "start" }}>
          <h3>🤖 Android</h3>
          <a className="btn btn-lg btn-block" href={APK}>{ur ? "اینڈرائیڈ ایپ ڈاؤن لوڈ کریں" : "Download Android app"}</a>
          <p className="muted small">
            {ur
              ? "ڈاؤن لوڈ کے بعد فائل کھولیں اور Install دبائیں۔ اگر فون پوچھے تو \"Allow from this source\" کی اجازت دیں۔"
              : "After download, open the file and tap Install. If your phone asks, allow installing from this source."}
          </p>
        </div>
        <div className="card form" style={{ textAlign: "start", marginTop: 16 }}>
          <h3>🍎 iPhone</h3>
          <p className="muted small">
            {ur
              ? "Safari میں gharcarepk.com کھولیں، شیئر بٹن دبائیں، پھر \"Add to Home Screen\"۔"
              : "Open gharcarepk.com in Safari, tap Share, then “Add to Home Screen”."}
          </p>
        </div>
      </div>
    </section>
  );
}
