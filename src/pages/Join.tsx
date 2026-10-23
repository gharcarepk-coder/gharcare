import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { normalizePhone, supabase, useApp } from "../lib/data";
import { useI18n } from "../lib/i18n";

const empty = { full_name: "", phone: "", cnic: "", category_id: "", area_id: "", address: "", experience: "", emergency_name: "", emergency_phone: "" };

export default function Join() {
  const { categories, areas, catalogReady } = useApp();
  const { pick } = useI18n();
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof empty, v: string) => setF({ ...f, [k]: v });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    const p = normalizePhone(f.phone);
    if (f.full_name.trim().length < 2) return setErr(pick("Please enter your full name.", "براہ کرم اپنا پورا نام لکھیں۔"));
    if (!p) return setErr(pick("Please enter a valid mobile number, e.g. 0300 1234567.", "درست موبائل نمبر لکھیں، مثلاً 0300 1234567۔"));
    if (!f.category_id) return setErr(pick("Please choose the work you do.", "براہ کرم اپنا کام منتخب کریں۔"));
    const cnicDigits = f.cnic.replace(/\D/g, "");
    if (f.cnic && cnicDigits.length !== 13) return setErr(pick("CNIC must have 13 digits, e.g. 35202-1234567-1.", "شناختی کارڈ نمبر 13 ہندسوں کا ہو، مثلاً 35202-1234567-1۔"));
    const cnic = cnicDigits ? `${cnicDigits.slice(0, 5)}-${cnicDigits.slice(5, 12)}-${cnicDigits.slice(12)}` : "";
    const ep = f.emergency_phone ? normalizePhone(f.emergency_phone) : null;
    setBusy(true);
    const { error } = await supabase.rpc("submit_worker_application", {
      p_full_name: f.full_name.trim(), p_phone: "+" + p, p_cnic: cnic,
      p_category_id: f.category_id, p_area_id: f.area_id || null,
      p_address: f.address, p_experience: f.experience,
      p_emergency_name: f.emergency_name, p_emergency_phone: ep ? "+" + ep : "",
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
  };

  if (done) {
    return (
      <section className="section">
        <div className="container narrow">
          <div className="card center">
            <div className="big-check">✓</div>
            <h1 className="page-title">{pick("Application received", "درخواست موصول ہو گئی")}</h1>
            <p className="muted">{pick("Thank you. Our team will call you within 2–3 days for an interview and CNIC verification.", "شکریہ۔ ہماری ٹیم 2–3 دن میں انٹرویو اور شناختی کارڈ کی تصدیق کے لیے آپ کو فون کرے گی۔")}</p>
            <Link to="/" className="btn">{pick("Back to home", "ہوم پیج")}</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container narrow">
        <form className="card form" onSubmit={submit} noValidate>
          <h1 className="page-title">{pick("Work with GharCare", "گھر کیئر کے ساتھ کام کریں")}</h1>
          <p className="muted">{pick("Are you a cleaner, plumber, electrician, mechanic, painter, carpenter or helper? Apply here for regular work with fixed daily pay.", "کیا آپ صفائی، پلمبر، الیکٹریشن، مکینک، پینٹر، کارپینٹر یا ہیلپر ہیں؟ مقررہ روزانہ اجرت پر باقاعدہ کام کے لیے یہاں درخواست دیں۔")}</p>

          <label className="field"><span>{pick("Full name", "پورا نام")} *</span>
            <input value={f.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" required /></label>
          <div className="row2">
            <label className="field"><span>{pick("Mobile number", "موبائل نمبر")} *</span>
              <input value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0300 1234567" inputMode="tel" autoComplete="tel" required /></label>
            <label className="field"><span>{pick("CNIC number", "شناختی کارڈ نمبر")}</span>
              <input value={f.cnic} onChange={(e) => set("cnic", e.target.value)} placeholder="35202-1234567-1" inputMode="numeric" /></label>
          </div>
          <div className="row2">
            <label className="field"><span>{pick("Your work", "آپ کا کام")} *</span>
              <select value={f.category_id} onChange={(e) => set("category_id", e.target.value)} disabled={!catalogReady} required>
                <option value="">{pick("Choose…", "منتخب کریں…")}</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {pick(c.name_en, c.name_ur)}</option>)}
              </select></label>
            <label className="field"><span>{pick("Area", "علاقہ")}</span>
              <select value={f.area_id} onChange={(e) => set("area_id", e.target.value)} disabled={!catalogReady}>
                <option value="">{pick("Choose…", "منتخب کریں…")}</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select></label>
          </div>
          <label className="field"><span>{pick("Home address", "گھر کا پتہ")}</span>
            <textarea rows={2} value={f.address} onChange={(e) => set("address", e.target.value)} /></label>
          <label className="field"><span>{pick("Experience", "تجربہ")}</span>
            <textarea rows={2} value={f.experience} onChange={(e) => set("experience", e.target.value)} placeholder={pick("e.g. 5 years plumbing, worked at …", "مثلاً 5 سال پلمبنگ کا تجربہ…")} /></label>
          <div className="row2">
            <label className="field"><span>{pick("Emergency contact name", "ایمرجنسی رابطہ (نام)")}</span>
              <input value={f.emergency_name} onChange={(e) => set("emergency_name", e.target.value)} /></label>
            <label className="field"><span>{pick("Emergency contact mobile", "ایمرجنسی رابطہ (موبائل)")}</span>
              <input value={f.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} placeholder="0300 1234567" inputMode="tel" /></label>
          </div>
          {err && <p className="error">{err}</p>}
          <button className="btn btn-lg btn-block" disabled={busy}>{busy ? pick("Sending…", "بھیجا جا رہا ہے…") : pick("Send application", "درخواست بھیجیں")}</button>
          <p className="muted small">{pick("We only use these details to contact and verify you.", "یہ معلومات صرف آپ سے رابطے اور تصدیق کے لیے استعمال ہوں گی۔")}</p>
        </form>
      </div>
    </section>
  );
}
