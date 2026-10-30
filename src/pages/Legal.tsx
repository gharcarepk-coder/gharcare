import { Link } from "react-router-dom";
import { prettyPhone, useApp, waLink } from "../lib/data";

const UPDATED = "30 October 2026";

export function Privacy() {
  const { settings } = useApp();
  return (
    <section className="section">
      <div className="container narrow legal">
        <h1 className="page-title">Privacy Policy</h1>
        <p className="muted small">GharCare PK (GharCare (Private) Limited), Lahore, Pakistan · Last updated {UPDATED}</p>
        <p>This policy explains what information the GharCare PK website (www.gharcarepk.com) and the GharCare PK Android app collect, why, and how you can control it.</p>

        <h2>Information we collect</h2>
        <ul>
          <li><b>Customers:</b> your name, mobile number and password when you create an account; the address, area, date, time and job details you enter when you book; and the status and price of your bookings.</li>
          <li><b>Workers who apply:</b> name, mobile number, CNIC number, type of work, area, home address, experience and an emergency contact.</li>
          <li><b>Technical data:</b> your language choice and basic login information stored on your device so you stay signed in.</li>
        </ul>
        <p>We do not collect your location, contacts, photos or payment card details. Payments are made directly by JazzCash or Easypaisa.</p>

        <h2>How we use it</h2>
        <ul>
          <li>To confirm bookings, send the right worker to your address, and contact you by phone or WhatsApp about your job.</li>
          <li>To verify, hire and pay our workers.</li>
          <li>To keep records of jobs and payments, and to improve our service.</li>
        </ul>
        <p>We do not sell your information or use it for advertising.</p>

        <h2>Who we share it with</h2>
        <ul>
          <li>The worker assigned to your booking sees your name, phone number and address so they can reach you.</li>
          <li>Our data is stored securely with our hosting and database providers (Supabase and Render), who process it only on our behalf.</li>
          <li>We may share information if required by Pakistani law.</li>
        </ul>

        <h2>How long we keep it</h2>
        <p>We keep account and booking records while your account is active and for as long as needed for accounting and legal purposes. Rejected worker applications are deleted on request.</p>

        <h2>Your choices</h2>
        <p>You can view and update your details in your account. You can ask us to delete your account and personal data at any time. See <Link to="/delete-account/">Delete your account</Link>.</p>

        <h2>Children</h2>
        <p>Our service is for adults. We do not knowingly collect information from anyone under 18.</p>

        <h2>Contact</h2>
        <p>Email {settings.email} · Phone/WhatsApp {prettyPhone(settings.phone)}</p>
      </div>
    </section>
  );
}

export function DeleteAccount() {
  const { settings } = useApp();
  const msg = "Assalam o Alaikum GharCare, please delete my account. My registered mobile number is: ";
  return (
    <section className="section">
      <div className="container narrow legal">
        <h1 className="page-title">Delete your GharCare PK account</h1>
        <p>You can ask us to delete your GharCare PK account and the personal data linked to it, from the website or the Android app.</p>
        <h2>How to request deletion</h2>
        <ol>
          <li>Send us a message on <a href={waLink(settings.whatsapp, msg)} target="_blank" rel="noreferrer">WhatsApp ({prettyPhone(settings.whatsapp)})</a> or email <b>{settings.email}</b> with the subject “Delete my account”.</li>
          <li>Send it from, or include, the mobile number you registered with.</li>
          <li>We confirm by phone and delete the account within 7 days.</li>
        </ol>
        <h2>What is deleted</h2>
        <p>Your name, mobile number, password, saved addresses and login are deleted. Records of completed jobs and payments are kept for up to 5 years only where needed for accounting or legal reasons, then deleted.</p>
        <p className="muted small">گھر کیئر اکاؤنٹ ڈیلیٹ کرنے کے لیے اپنے رجسٹرڈ نمبر سے واٹس ایپ پر پیغام بھیجیں۔ ہم 7 دن میں اکاؤنٹ ڈیلیٹ کر دیں گے۔</p>
        <p><Link to="/privacy/">Privacy policy</Link></p>
      </div>
    </section>
  );
}
