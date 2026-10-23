import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "en" | "ur";

const en = {
  brand: "GharCare",
  tagline: "Trusted home workers — by the hour or by the day",
  heroTitle: "Skilled hands at your door, when you need them",
  heroSub: "Book our own verified cleaners, plumbers, electricians, mechanics and helpers. Hourly or full-day — we send the right person.",
  bookNow: "Book a worker",
  whatsappUs: "WhatsApp us",
  ourServices: "Our services",
  allServices: "All services",
  perHour: "/hour",
  perDay: "/day",
  from: "from",
  howItWorks: "How it works",
  step1: "Choose a service", step1d: "Pick what you need — cleaning, plumbing, electrical and more.",
  step2: "Pick hourly or daily", step2d: "Select date, time and how many workers. See the price upfront.",
  step3: "We send our worker", step3d: "We confirm by phone and send our own trained worker to your home.",
  step4: "Pay after work", step4d: "Pay by JazzCash or Easypaisa once the job is done. No hidden labour charges.",
  why: "Why GharCare",
  why1: "Our own staff", why1d: "Every worker is recruited, CNIC-verified and managed by GharCare — not random freelancers.",
  why2: "Hourly or daily", why2d: "Need two hours of help or a worker for a whole week? Both work.",
  why3: "Fixed, clear rates", why3d: "Prices are shown before you book and cover labour only; materials and parts are paid by the customer. Pay by JazzCash or Easypaisa after the job.",
  why4: "Quick support", why4d: "Talk to a real person on WhatsApp or phone, in Urdu or English.",
  ctaTitle: "Need a worker today?",
  ctaSub: "Book online in a minute or message us on WhatsApp.",
  login: "Log in", signup: "Create account", logout: "Log out",
  myBookings: "My bookings", account: "Account", admin: "Admin",
  phone: "Mobile number", password: "Password", fullName: "Full name",
  phoneHint: "e.g. 0300 1234567",
  passwordHint: "At least 6 characters",
  noAccount: "New to GharCare?", haveAccount: "Already have an account?",
  forgot: "Forgot password? Message us on WhatsApp and we will reset it.",
  errPhone: "Enter a valid Pakistani mobile number (03XX XXXXXXX).",
  errPassword: "Password must be at least 6 characters.",
  errName: "Please enter your name.",
  errTaken: "This number already has an account. Please log in.",
  errLogin: "Wrong mobile number or password.",
  errGeneric: "Something went wrong. Please try again.",
  bookTitle: "Book a worker",
  service: "Service", chooseService: "Choose a service",
  bookingType: "Booking type", hourly: "Hourly", daily: "Daily (8 hours)",
  hours: "Hours", days: "Days", workers: "Number of workers",
  date: "Date", time: "Start time", area: "Area", chooseArea: "Select area",
  address: "Full address", addressHint: "House #, street, block, landmark",
  notes: "Details (optional)", notesHint: "Describe the work, e.g. kitchen tap leaking",
  estimate: "Estimated price", payCash: "Pay by JazzCash or Easypaisa after the job.",
  materialsNote: "Our rates cover labour only. Any materials or parts needed (pipes, taps, fittings, wires, switches, paint, spare parts) are paid for by the customer.",
  minHours: "Minimum {n} hours",
  confirmBooking: "Confirm booking",
  loginToBook: "Log in or create an account to book",
  booked: "Booking received!",
  bookedSub: "Booking #{ref}. We will call you shortly to confirm and assign a worker.",
  viewBookings: "View my bookings",
  noBookings: "You have no bookings yet.",
  cancel: "Cancel booking", cancelConfirm: "Cancel this booking?",
  worker: "Worker", callWorker: "Call",
  status_pending: "Received", status_confirmed: "Confirmed", status_assigned: "Worker assigned",
  status_in_progress: "In progress", status_completed: "Completed", status_cancelled: "Cancelled",
  total: "Total", saving: "Please wait…",
  save: "Save", saved: "Saved",
  changePassword: "Change password", newPassword: "New password",
  installApp: "Install app", installText: "Add GharCare to your home screen for one-tap booking.",
  install: "Install", notNow: "Not now",
  iosInstall: "Tap Share, then “Add to Home Screen”.",
  contact: "Contact", hoursLabel: "Working hours",
  rights: "All rights reserved.",
  language: "اردو",
  serviceArea: "Serving",
  notFound: "Page not found", goHome: "Go home",
};

type Dict = typeof en;

const ur: Dict = {
  brand: "گھر کیئر",
  tagline: "قابلِ اعتماد گھریلو کاریگر — گھنٹے یا دن کے حساب سے",
  heroTitle: "ہنرمند کاریگر آپ کے دروازے پر، جب آپ چاہیں",
  heroSub: "ہمارے اپنے تصدیق شدہ صفائی والے، پلمبر، الیکٹریشن، مکینک اور مددگار بُک کریں۔ گھنٹے یا پورے دن کے لیے — ہم صحیح بندہ بھیجتے ہیں۔",
  bookNow: "کاریگر بُک کریں",
  whatsappUs: "واٹس ایپ کریں",
  ourServices: "ہماری خدمات",
  allServices: "تمام خدمات",
  perHour: "/گھنٹہ",
  perDay: "/دن",
  from: "سے",
  howItWorks: "طریقہ کار",
  step1: "سروس منتخب کریں", step1d: "اپنی ضرورت چنیں — صفائی، پلمبنگ، بجلی اور بہت کچھ۔",
  step2: "گھنٹہ یا دن چنیں", step2d: "تاریخ، وقت اور کاریگروں کی تعداد منتخب کریں۔ قیمت پہلے دیکھیں۔",
  step3: "ہم کاریگر بھیجتے ہیں", step3d: "ہم فون پر تصدیق کر کے اپنا تربیت یافتہ کاریگر بھیجتے ہیں۔",
  step4: "کام کے بعد ادائیگی", step4d: "کام مکمل ہونے پر جاز کیش یا ایزی پیسہ سے ادائیگی کریں۔ مزدوری پر کوئی چھپی فیس نہیں۔",
  why: "گھر کیئر کیوں؟",
  why1: "ہمارا اپنا عملہ", why1d: "ہر کاریگر گھر کیئر کا بھرتی شدہ، شناختی کارڈ سے تصدیق شدہ ہے۔",
  why2: "گھنٹہ یا دن", why2d: "دو گھنٹے کا کام ہو یا پورا ہفتہ — دونوں ممکن۔",
  why3: "واضح ریٹ", why3d: "بکنگ سے پہلے قیمت معلوم۔ ریٹ صرف مزدوری کے ہیں، سامان اور پرزہ جات کی ادائیگی گاہک کرے گا۔ کام کے بعد جاز کیش یا ایزی پیسہ سے ادائیگی۔",
  why4: "فوری رابطہ", why4d: "واٹس ایپ یا فون پر اردو یا انگریزی میں بات کریں۔",
  ctaTitle: "آج کاریگر چاہیے؟",
  ctaSub: "ایک منٹ میں آن لائن بُک کریں یا واٹس ایپ پر پیغام بھیجیں۔",
  login: "لاگ ان", signup: "اکاؤنٹ بنائیں", logout: "لاگ آؤٹ",
  myBookings: "میری بکنگز", account: "اکاؤنٹ", admin: "ایڈمن",
  phone: "موبائل نمبر", password: "پاس ورڈ", fullName: "پورا نام",
  phoneHint: "مثلاً 0300 1234567",
  passwordHint: "کم از کم 6 حروف",
  noAccount: "نئے ہیں؟", haveAccount: "پہلے سے اکاؤنٹ ہے؟",
  forgot: "پاس ورڈ بھول گئے؟ واٹس ایپ پر پیغام بھیجیں، ہم ری سیٹ کر دیں گے۔",
  errPhone: "درست موبائل نمبر درج کریں (03XX XXXXXXX)۔",
  errPassword: "پاس ورڈ کم از کم 6 حروف کا ہو۔",
  errName: "براہ کرم اپنا نام درج کریں۔",
  errTaken: "اس نمبر پر اکاؤنٹ موجود ہے۔ لاگ ان کریں۔",
  errLogin: "موبائل نمبر یا پاس ورڈ غلط ہے۔",
  errGeneric: "کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔",
  bookTitle: "کاریگر بُک کریں",
  service: "سروس", chooseService: "سروس منتخب کریں",
  bookingType: "بکنگ کی قسم", hourly: "گھنٹے کے حساب سے", daily: "روزانہ (8 گھنٹے)",
  hours: "گھنٹے", days: "دن", workers: "کاریگروں کی تعداد",
  date: "تاریخ", time: "وقت", area: "علاقہ", chooseArea: "علاقہ منتخب کریں",
  address: "مکمل پتہ", addressHint: "مکان نمبر، گلی، بلاک، نشانی",
  notes: "تفصیل (اختیاری)", notesHint: "کام کی تفصیل، مثلاً کچن کا نلکا لیک ہے",
  estimate: "اندازاً قیمت", payCash: "کام کے بعد جاز کیش یا ایزی پیسہ سے ادائیگی کریں۔",
  materialsNote: "ہمارے ریٹ صرف مزدوری کے ہیں۔ کام کے لیے درکار سامان یا پرزہ جات (پائپ، ٹونٹیاں، فٹنگز، تار، سوئچ، پینٹ، اسپیئر پارٹس) کی ادائیگی گاہک کرے گا۔",
  minHours: "کم از کم {n} گھنٹے",
  confirmBooking: "بکنگ کی تصدیق کریں",
  loginToBook: "بکنگ کے لیے لاگ ان کریں یا اکاؤنٹ بنائیں",
  booked: "بکنگ موصول ہو گئی!",
  bookedSub: "بکنگ نمبر {ref}۔ ہم جلد فون کر کے تصدیق کریں گے اور کاریگر بھیجیں گے۔",
  viewBookings: "میری بکنگز دیکھیں",
  noBookings: "ابھی کوئی بکنگ نہیں۔",
  cancel: "بکنگ منسوخ کریں", cancelConfirm: "کیا یہ بکنگ منسوخ کرنی ہے؟",
  worker: "کاریگر", callWorker: "کال کریں",
  status_pending: "موصول", status_confirmed: "تصدیق شدہ", status_assigned: "کاریگر مقرر",
  status_in_progress: "کام جاری", status_completed: "مکمل", status_cancelled: "منسوخ",
  total: "کل", saving: "انتظار کریں…",
  save: "محفوظ کریں", saved: "محفوظ ہو گیا",
  changePassword: "پاس ورڈ تبدیل کریں", newPassword: "نیا پاس ورڈ",
  installApp: "ایپ انسٹال کریں", installText: "ایک ٹچ بکنگ کے لیے گھر کیئر کو ہوم اسکرین پر لگائیں۔",
  install: "انسٹال", notNow: "ابھی نہیں",
  iosInstall: "شیئر دبائیں، پھر “Add to Home Screen”۔",
  contact: "رابطہ", hoursLabel: "اوقاتِ کار",
  rights: "جملہ حقوق محفوظ ہیں۔",
  language: "English",
  serviceArea: "سروس ایریا",
  notFound: "صفحہ نہیں ملا", goHome: "ہوم پیج",
};

const dicts: Record<Lang, Dict> = { en, ur };
export type TKey = keyof Dict;

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: TKey, vars?: Record<string, string | number>) => string; pick: (enText: string, urText: string) => string };
const I18nCtx = createContext<Ctx>(null as unknown as Ctx);

function readLang(): Lang {
  try { return (localStorage.getItem("gc_lang") as Lang) === "ur" ? "ur" : "en"; } catch { return "en"; }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem("gc_lang", l); } catch { /* ignore */ }
  };
  const t = (k: TKey, vars?: Record<string, string | number>) => {
    let s = dicts[lang][k] ?? en[k] ?? k;
    if (vars) for (const [vk, vv] of Object.entries(vars)) s = s.replace(`{${vk}}`, String(vv));
    return s;
  };
  const pick = (e: string, u: string) => (lang === "ur" && u ? u : e);
  return <I18nCtx.Provider value={{ lang, setLang, t, pick }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
