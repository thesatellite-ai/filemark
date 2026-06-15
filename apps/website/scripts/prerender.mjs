// Static per-route HTML generation.
//
// For each route we produce a dist/<route>/index.html with route-specific
// <title>, meta description, OG / Twitter cards, canonical, and JSON-LD
// baked into the served HTML. The body remains the SPA shell — JS still
// hydrates the full React app and TanStack Router's HeadContent overlays
// these at runtime — but social-card scrapers and non-JS crawlers see
// the correct per-page meta on first fetch, not the home-page baseline.
//
// Add a route + meta entry here, then run `pnpm build`. No headless
// browser, no SSR runtime — just string templating after `vite build`.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = resolve(__dirname, "..");
const DIST = join(APP_ROOT, "dist");
const INDEX_HTML = join(DIST, "index.html");
const SITE = "https://khanakia.com/apps/filemark";
const OG_IMAGE = `${SITE}/screenshots/promo-tile.png`;

// Demo gallery examples (keep in sync with src/playground/examples/index.ts).
const GALLERY_EXAMPLES = [
  {
    id: "datagrid-full",
    title: "Datagrid — full feature tour",
    desc: "30+ datagrid sections covering every column type, info-string flag, and UX feature.",
  },
  {
    id: "datagrid-intro",
    title: "Datagrid — quick start",
    desc: "Shorter first-touch walkthrough for the fenced csv syntax.",
  },
  {
    id: "chart-full",
    title: "Chart — full feature tour",
    desc: "Bar / line / pie / area charts via recharts; formats, by-pivot, tags.",
  },
  {
    id: "kanban-full",
    title: "Kanban — full feature tour",
    desc: "Group a CSV into columns, render rows as cards with rich types.",
  },
  {
    id: "stats-adr-full",
    title: "Stats & ADR — full feature tour",
    desc: "KPI card grid and Architecture Decision Record blocks for planning docs.",
  },
  {
    id: "tasks-full",
    title: "Tasks — full feature tour",
    desc: "Markdown-native task DSL — 6 statuses, inline metadata chips, links, subtasks.",
  },
  {
    id: "planning-v2-full",
    title: "Planning v2 — DocBlock / MindMap / OKR / DocStatus / Backlinks",
    desc: "All M9 planning shapes in one doc — DocBlock templates, knowledge connectivity, OKR scoring, daily journal.",
  },
  {
    id: "planning-v2-tier2",
    title: "Planning v2 Tier 2 — WeightedScore / DocBlock meeting / Matrix2x2 / Timeline",
    desc: "Decision frameworks, meeting capture, 2×2 prioritization, horizontal timeline with lanes.",
  },
  {
    id: "planning-v2-tier3",
    title: "Planning v2 Tier 3 — ReadingTime / FiveWhys / Roadmap / DecisionTree",
    desc: "Read-time chip, root-cause chain, now/next/later board, branching analysis.",
  },
  {
    id: "mindmap-full",
    title: "MindMap — full feature tour (markmap engine)",
    desc: "Twelve mindmap patterns: bullets, headings, math, code, frontmatter directives.",
  },
  {
    id: "richdocs-tier1",
    title: "Rich docs Tier 1 — Steps / Cards / APIEndpoint / VideoEmbed / Diff / Glossary",
    desc: "Eight Tier 1 components covering tutorials, landing pages, dev reference, and doc workflow.",
  },
  {
    id: "richdocs-tier2",
    title: "Rich docs Tier 2 — Heatmap / AnnotatedImage / PullQuote / Testimonials / Sparkline / Footnote",
    desc: "Six Tier 2 components — activity grid, image hotspots, pull quotes, inline trends, Tufte notes.",
  },
  {
    id: "richdocs-tier3",
    title: "Rich docs Tier 3 — GitHub cards / FileTree / EnvVars / Lightbox / Carousel / Gauge",
    desc: "Thirteen Tier 3 components — niche additions for dev docs, tutorials, marketing.",
  },
  {
    id: "showcase",
    title: "Markdown / MDX showcase",
    desc: "General MDX showcase — callouts, tabs, details, math, Mermaid, task lists.",
  },
  {
    id: "schema-sql",
    title: "SQL → ER diagram",
    desc: "Drop-any Postgres / MySQL / SQLite DDL and get an interactive ER diagram.",
  },
  {
    id: "schema-prisma",
    title: "Prisma → ER diagram",
    desc: "Prisma schema rendered as a live Mermaid ER diagram.",
  },
  {
    id: "schema-dbml",
    title: "DBML → ER diagram",
    desc: "The dbdiagram.io DSL, in the browser.",
  },
];

const ROUTES = [
  {
    path: "/",
    title: "Filemark — Markdown, MDX, JSON, CSV & schema viewer for Chrome",
    desc:
      "Free Chrome extension that opens local and remote .md, .mdx, .json, .jsonc, .csv, .tsv, .sql, .prisma and .dbml files with real interactive renderers. 100% client-side, MIT licensed.",
    ldType: "SoftwareApplication",
  },
  {
    path: "/features",
    title: "Features — Filemark | every file Chrome should already open",
    desc:
      "Every Filemark feature laid out — nine file formats, remote URL rendering, kanban from markdown, tasks, ER diagrams, customization, keyboard shortcuts, privacy.",
    ldType: "WebPage",
    breadcrumb: ["Filemark", "Features"],
  },
  {
    path: "/changelog",
    title: "Changelog — Filemark",
    desc:
      "Every Filemark release, what changed, and why. Markdown viewer, JSON viewer, schema viewer, datagrid, kanban, inject mode — version-by-version.",
    ldType: "WebPage",
    breadcrumb: ["Filemark", "Changelog"],
  },
  {
    path: "/privacy",
    title: "Privacy policy — Filemark",
    desc:
      "Filemark privacy policy: zero data collection, zero analytics, zero remote code. Full disclosure of every permission used by the Chrome extension and why.",
    ldType: "WebPage",
    breadcrumb: ["Filemark", "Privacy"],
  },
  {
    path: "/demo",
    title: "Demo — Filemark playground",
    desc:
      "Live Filemark playground — every renderer running in the browser. Markdown, JSON, CSV, SQL/Prisma/DBML schemas, kanban from markdown, charts, mindmaps.",
    ldType: "WebPage",
    breadcrumb: ["Filemark", "Demo"],
  },
  {
    path: "/demo/play",
    title: "Playground — Filemark",
    desc:
      "Live Monaco-backed scratch editor — write markdown on the left, watch every Filemark renderer respond on the right.",
    ldType: "WebPage",
    breadcrumb: ["Filemark", "Demo", "Playground"],
  },
  ...GALLERY_EXAMPLES.map((ex) => ({
    path: `/demo/gallery/${ex.id}`,
    title: `${ex.title} — Filemark demo`,
    desc: `${ex.desc} Try it live, edit the source, share the URL.`,
    ldType: "WebPage",
    breadcrumb: ["Filemark", "Demo", ex.title],
  })),
];

function htmlEscape(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHead(template, route) {
  const url = `${SITE}${route.path === "/" ? "/" : route.path}`;
  const t = htmlEscape(route.title);
  const d = htmlEscape(route.desc);

  // Per-route JSON-LD.
  let ld;
  if (route.ldType === "SoftwareApplication") {
    ld = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Filemark",
      url,
      description: route.desc,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Chrome",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: {
        "@type": "Person",
        name: "khanakia",
        url: "https://github.com/khanakia",
      },
    };
  } else {
    ld = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: route.title,
      description: route.desc,
      url,
    };
    if (route.breadcrumb) {
      ld.breadcrumb = {
        "@type": "BreadcrumbList",
        itemListElement: route.breadcrumb.map((name, i, all) => ({
          "@type": "ListItem",
          position: i + 1,
          name,
          item:
            i === 0
              ? `${SITE}/`
              : i === all.length - 1
                ? url
                : `${SITE}/${route.breadcrumb[i].toLowerCase()}`,
        })),
      };
    }
  }

  let out = template;
  // <title>
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`);
  // <meta name="description">
  out = out.replace(
    /<meta\s+name="description"[^>]*\/>/,
    `<meta name="description" content="${d}" />`,
  );
  // canonical
  out = out.replace(
    /<link rel="canonical"[^>]*\/>/,
    `<link rel="canonical" href="${url}" />`,
  );
  // OG title / description / url
  out = out.replace(
    /<meta property="og:title"[^>]*\/>/,
    `<meta property="og:title" content="${t}" />`,
  );
  out = out.replace(
    /<meta\s+property="og:description"[^>]*\/>/,
    `<meta property="og:description" content="${d}" />`,
  );
  out = out.replace(
    /<meta property="og:url"[^>]*\/>/,
    `<meta property="og:url" content="${url}" />`,
  );
  // Twitter
  out = out.replace(
    /<meta name="twitter:title"[^>]*\/>/,
    `<meta name="twitter:title" content="${t}" />`,
  );
  out = out.replace(
    /<meta name="twitter:description"[^>]*\/>/,
    `<meta name="twitter:description" content="${d}" />`,
  );
  // JSON-LD (last <script type="application/ld+json"> in <head>)
  out = out.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify(ld, null, 2)}</script>`,
  );
  return out;
}

async function main() {
  if (!existsSync(INDEX_HTML)) {
    console.error("prerender: dist/index.html missing — run `vite build` first.");
    process.exit(1);
  }
  const template = await readFile(INDEX_HTML, "utf8");

  let count = 0;
  for (const route of ROUTES) {
    const html = buildHead(template, route);
    const outPath = route.path === "/"
      ? INDEX_HTML
      : join(DIST, route.path.replace(/^\//, ""), "index.html");
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, html, "utf8");
    count++;
    console.log(
      `prerender: ${route.path.padEnd(40)} → ${outPath.replace(DIST, "dist")}`,
    );
  }
  console.log(`prerender: wrote ${count} files`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
