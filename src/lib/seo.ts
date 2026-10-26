// Per-page title, description and canonical URL. Used at runtime (seo hook) and at
// build time (scripts/seo-pages.mjs writes a static HTML file per page for crawlers).
export const SITE = "https://www.gharcarepk.com";

export type PageSeo = { title: string; description: string; index: boolean };

export const PAGES: Record<string, PageSeo> = {
  "/": {
    title: "GharCare گھر کیئر — Cleaner, Plumber, Electrician, Mechanic on Demand | Lahore",
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
    title: "Download the GharCare App — Android & iPhone",
    description: "Get the GharCare app to book home workers in one tap. Free Android download; iPhone users can add GharCare to the home screen.",
    index: true,
  },
  "/join": {
    title: "Jobs for Cleaners, Plumbers, Electricians & Helpers in Lahore | Work with GharCare",
    description: "Apply to work with GharCare in Lahore: regular work with fixed daily pay for cleaners, plumbers, electricians, mechanics, painters, carpenters and helpers.",
    index: true,
  },
};

export const NOINDEX: PageSeo = { title: "GharCare", description: PAGES["/"].description, index: false };

export function seoFor(pathname: string): PageSeo & { canonical: string } {
  const path = pathname.replace(/\/+$/, "") || "/";
  const page = PAGES[path] ?? NOINDEX;
  return { ...page, canonical: SITE + (path === "/" ? "/" : path) };
}
