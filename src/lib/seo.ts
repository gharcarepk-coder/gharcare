// Per-page title, description and canonical URL. Used at runtime (seo hook) and at
// build time (scripts/seo-pages.mjs writes a static HTML file per page for crawlers).
export const SITE = "https://www.gharcarepk.com";

export type PageSeo = { title: string; description: string; index: boolean; schema?: Record<string, unknown> };

export const PAGES: Record<string, PageSeo> = {
  "/": {
    title: "GharCare PK گھر کیئر — Cleaner, Plumber, Electrician, Mechanic on Demand | Lahore",
    description: "Book verified cleaners, plumbers, electricians, AC technicians, mechanics, painters and helpers in Lahore by the hour or day. Pay by JazzCash or Easypaisa after the job.",
    index: true,
  },
  "/services": {
    title: "Home Services & Rates in Lahore — Cleaning, Plumbing, Electrical, AC | GharCare",
    description: "All GharCare services in Lahore: house and deep cleaning, plumber, electrician, AC service, car and bike mechanic, painter, carpenter and helpers. Hourly or daily booking.",
    index: true,
  },
  "/book": {
    title: "Book a Worker Online in Lahore | GharCare",
    description: "Book a cleaner, plumber, electrician, AC technician, mechanic, painter or helper in a minute. See the price before you book. Hourly or full-day.",
    index: true,
  },
  "/app": {
    title: "GharCare PK App Download — Free Android APK | Home Services Lahore",
    description: "Download the official GharCare PK app (APK) for Android. Book cleaners, plumbers, electricians, AC technicians and mechanics in Lahore in one tap. Free, about 10 MB.",
    index: true,
    schema: {
      "@context": "https://schema.org",
      "@type": "MobileApplication",
      name: "GharCare PK",
      alternateName: ["GharCare", "Ghar Care PK", "گھر کیئر"],
      operatingSystem: "Android",
      applicationCategory: "LifestyleApplication",
      description: "Book verified home workers in Lahore by the hour or day: cleaning, plumbing, electrical, AC, mechanic, painting, carpentry and helpers.",
      url: "https://www.gharcarepk.com/app/",
      downloadUrl: "https://github.com/gharcarepk-coder/gharcare/releases/download/android-latest/GharCare.apk",
      image: "https://www.gharcarepk.com/icons/icon-512.png",
      inLanguage: ["en", "ur"],
      offers: { "@type": "Offer", price: "0", priceCurrency: "PKR" },
      publisher: { "@type": "Organization", name: "GharCare PK", url: "https://www.gharcarepk.com/" },
    },
  },
  "/privacy": {
    title: "Privacy Policy | GharCare PK",
    description: "How GharCare PK collects, uses and protects your information on the website and Android app.",
    index: true,
  },
  "/delete-account": {
    title: "Delete Your Account | GharCare PK",
    description: "How to delete your GharCare PK account and personal data.",
    index: true,
  },
  "/join": {
    title: "Jobs for Cleaners, Plumbers, Electricians & Helpers in Lahore | Work with GharCare",
    description: "Apply to work with GharCare in Lahore: regular work with fixed daily pay for cleaners, plumbers, electricians, mechanics, painters, carpenters and helpers.",
    index: true,
  },
};

export const NOINDEX: PageSeo = { title: "GharCare", description: PAGES["/"].description, index: false };

export const canonicalUrl = (path: string) => SITE + (path === "/" ? "/" : `${path}/`);

export function seoFor(pathname: string): PageSeo & { canonical: string } {
  const path = pathname.replace(/\/+$/, "") || "/";
  const page = PAGES[path] ?? NOINDEX;
  // Static page files live at /<page>/index.html, which the host serves at "/<page>/".
  return { ...page, canonical: canonicalUrl(path) };
}
