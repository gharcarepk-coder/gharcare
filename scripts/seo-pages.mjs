// After `vite build`: write dist/<page>/index.html for each indexable page, with that
// page's own title, description and canonical, so crawlers see correct tags without JS.
// Also writes dist/sitemap.xml from the same list.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const src = fs.readFileSync(path.join(root, "src/lib/seo.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const tmp = path.join(root, "dist", ".seo-tmp.mjs");
fs.writeFileSync(tmp, js);
const { PAGES, SITE } = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
const base = fs.readFileSync(path.join(root, "dist/index.html"), "utf8");
const today = new Date().toISOString().slice(0, 10);
const urls = [];

for (const [route, p] of Object.entries(PAGES)) {
  if (!p.index) continue;
  const canonical = SITE + (route === "/" ? "/" : route);
  urls.push(canonical);
  let html = base
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(p.description)}" />`)
    .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(p.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(p.description)}" />`);
  for (const must of [canonical, esc(p.title)]) if (!html.includes(must)) throw new Error(`SEO tag missing for ${route}`);
  const out = route === "/" ? path.join(root, "dist/index.html") : path.join(root, "dist", route.slice(1), "index.html");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

fs.writeFileSync(path.join(root, "dist/sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") + "\n</urlset>\n");
console.log(`SEO pages written: ${urls.length}`);
