import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { seoFor } from "../lib/seo";

function setMeta(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) { el = create(); document.head.appendChild(el); }
  el.setAttribute(attr, value);
}

/** Keeps title, description, canonical and robots in sync with the current page. */
export default function Seo() {
  const { pathname } = useLocation();
  useEffect(() => {
    const s = seoFor(pathname);
    document.title = s.title;
    setMeta('meta[name="description"]', "content", s.description, () => Object.assign(document.createElement("meta"), { name: "description" }));
    setMeta('link[rel="canonical"]', "href", s.canonical, () => Object.assign(document.createElement("link"), { rel: "canonical" }));
    setMeta('meta[property="og:url"]', "content", s.canonical, () => { const m = document.createElement("meta"); m.setAttribute("property", "og:url"); return m; });
    setMeta('meta[name="robots"]', "content", s.index ? "index, follow" : "noindex, follow", () => Object.assign(document.createElement("meta"), { name: "robots" }));
  }, [pathname]);
  return null;
}
