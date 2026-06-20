/**
 * Centralized schema.org / JSON-LD builders for the Filemark site.
 *
 * Each route's `head()` adds the relevant nodes via `ldScript(...)`. Keeping
 * the graph in one place means the author/org/version facts stay consistent
 * across every page (and rich-result eligibility stays maximal).
 *
 * Google rich-result note: we deliberately do NOT emit `aggregateRating` /
 * `review` — those require real, on-page user reviews; faking them is a
 * policy violation. Add them only when genuine reviews exist.
 */

const SITE = "https://khanakia.com/apps/filemark";
const REPO = "https://github.com/thesatellite-ai/filemark";
const STORE =
  "https://chromewebstore.google.com/detail/filemark/cidgogmffaflfghnebkfjbccfgbdjicm";
const OG_IMAGE = `${SITE}/screenshots/promo-tile.png`;
const LOGO = `${SITE}/logo.svg`;
// Keep in sync with apps/chrome-ext/public/manifest.json on each release.
const SOFTWARE_VERSION = "0.1.4";

/** The author, referenced (by @id) from every node that needs a creator. */
export const PERSON = {
  "@type": "Person",
  "@id": `${SITE}/#person`,
  name: "khanakia",
  url: "https://github.com/khanakia",
} as const;

/** Wrap a JSON-LD object as a TanStack `head().scripts` descriptor. */
export function ldScript(obj: unknown) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(obj),
  };
}

/** Sitewide WebSite node — emitted once from the root route. */
export function webSiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    name: "Filemark",
    url: `${SITE}/`,
    description:
      "Free Chrome extension that opens local and remote markdown, JSON, CSV, and SQL/Prisma/DBML files with real interactive renderers — 100% client-side.",
    inLanguage: "en",
    publisher: PERSON,
  };
}

/** The product — the headline entity for the home page. */
export function softwareApplicationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE}/#app`,
    name: "Filemark",
    url: `${SITE}/`,
    description:
      "Chrome extension that renders local and remote markdown, MDX, JSON, JSONC, CSV, TSV, SQL, Prisma and DBML files with rich interactive components — markdown with KaTeX/Mermaid/shiki, JSON as a collapsible tree, CSV as a sortable datagrid, schemas as ER diagrams. 100% client-side.",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "Browser Extension",
    operatingSystem: "Chrome, Chromium, Edge, Brave",
    browserRequirements: "Requires Chrome / Chromium 110+ (Manifest V3)",
    softwareVersion: SOFTWARE_VERSION,
    image: OG_IMAGE,
    screenshot: [
      `${SITE}/screenshots/hero.png`,
      `${SITE}/screenshots/schema.png`,
      `${SITE}/screenshots/json.png`,
      `${SITE}/screenshots/datagrid.png`,
      `${SITE}/screenshots/tasks-kanban.png`,
    ],
    downloadUrl: STORE,
    installUrl: STORE,
    softwareHelp: `${SITE}/features`,
    license: "https://opensource.org/licenses/MIT",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    featureList: [
      "GitHub-flavored markdown with KaTeX, Mermaid and shiki",
      "JSON / JSONC collapsible tree viewer",
      "CSV / TSV sortable, filterable datagrid",
      "SQL / Prisma / DBML interactive ER diagrams",
      "Kanban boards and tasks authored from plain markdown",
      "Local file:// and opt-in remote URL rendering",
      "100% client-side — no upload, no telemetry",
    ],
    author: PERSON,
    publisher: PERSON,
    sameAs: [REPO],
  };
}

/** The open-source codebase. */
export function softwareSourceCodeLd() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    "@id": `${REPO}#source`,
    name: "Filemark",
    description:
      "Source code for Filemark — a Chrome extension and viewer packages that render markdown, JSON, CSV and database schemas.",
    codeRepository: REPO,
    url: REPO,
    programmingLanguage: "TypeScript",
    license: "https://opensource.org/licenses/MIT",
    author: PERSON,
  };
}

/** Standalone BreadcrumbList from an ordered [name, url] list (Home first). */
export function breadcrumbLd(crumbs: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

/**
 * A WebPage node for inner pages. `isPartOf` ties it to the sitewide WebSite;
 * `about` ties it to the SoftwareApplication entity (declared on the home
 * page) so the whole site resolves to one product graph. Pass `extraType` to
 * add a co-type, e.g. "PrivacyPolicy" for the privacy page.
 */
export function webPageLd(opts: {
  name: string;
  description: string;
  url: string;
  extraType?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": opts.extraType ? ["WebPage", opts.extraType] : "WebPage",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    isPartOf: { "@id": `${SITE}/#website` },
    about: { "@id": `${SITE}/#app` },
  };
}

/**
 * Convenience: the two JSON-LD `head().scripts` descriptors every inner page
 * wants — a WebPage node + a standalone BreadcrumbList. Breadcrumb is emitted
 * as its own top-level block (Google's preferred shape for the breadcrumb
 * rich result) rather than nested inside WebPage.
 */
export function pageScripts(opts: {
  name: string;
  description: string;
  url: string;
  crumbs: { name: string; url: string }[];
  extraType?: string;
}) {
  return [
    ldScript(
      webPageLd({
        name: opts.name,
        description: opts.description,
        url: opts.url,
        extraType: opts.extraType,
      }),
    ),
    ldScript(breadcrumbLd(opts.crumbs)),
  ];
}

/** FAQPage from question/answer pairs. */
export function faqLd(qa: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export { SITE, REPO, STORE, OG_IMAGE, LOGO, SOFTWARE_VERSION };
