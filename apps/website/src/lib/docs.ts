// Shared config for the /docs section: the sidebar nav (single source of truth
// for ordering + labels) and a reusable prose className so every docs page has
// identical typography without a prose plugin.

import { faqLd, ldScript, pageScripts } from "./schema";

export const SITE = "https://khanakia.com/apps/filemark";

/** Absolute URL for a screenshot in /public/screenshots (for og:image). */
export const shot = (name: string) => `${SITE}/screenshots/${name}`;

/**
 * Build the `head()` for a docs sub-page: title/description meta, a
 * self-referencing canonical, an optional og:image, and JSON-LD (a TechArticle
 * WebPage + breadcrumb, plus an optional FAQPage for rich results). `slug` is
 * the path under /docs ("" for the overview index).
 */
export function docsHead(
  slug: string,
  title: string,
  desc: string,
  opts: { faq?: { q: string; a: string }[]; image?: string } = {},
) {
  const url = slug ? `${SITE}/docs/${slug}` : `${SITE}/docs`;
  const fullTitle = `${title} — Filemark Docs`;
  const meta = [
    { title: fullTitle },
    { name: "description", content: desc },
    { property: "og:title", content: fullTitle },
    { property: "og:description", content: desc },
    { property: "og:url", content: url },
    { name: "twitter:title", content: fullTitle },
    { name: "twitter:description", content: desc },
    ...(opts.image
      ? [
          { property: "og:image", content: opts.image },
          { name: "twitter:image", content: opts.image },
        ]
      : []),
  ];
  const scripts = [
    ...pageScripts({
      name: fullTitle,
      description: desc,
      url,
      extraType: "TechArticle",
      crumbs: [
        { name: "Filemark", url: `${SITE}/` },
        { name: "Docs", url: `${SITE}/docs` },
        ...(slug ? [{ name: title, url }] : []),
      ],
    }),
    ...(opts.faq && opts.faq.length ? [ldScript(faqLd(opts.faq))] : []),
  ];
  return { meta, links: [{ rel: "canonical", href: url }], scripts };
}

export interface DocsNavItem {
  to: string;
  label: string;
  /** Match exactly (the overview index lives at /docs itself). */
  exact?: boolean;
}

export const DOCS_NAV: DocsNavItem[] = [
  { to: "/docs", label: "Overview", exact: true },
  { to: "/docs/getting-started", label: "Getting started" },
  { to: "/docs/viewers", label: "File viewers" },
  { to: "/docs/markdown", label: "Markdown & components" },
  { to: "/docs/library", label: "Library & navigation" },
  { to: "/docs/tasks", label: "Tasks" },
  { to: "/docs/revisions", label: "Revision mode" },
  { to: "/docs/notes", label: "AI review notes" },
  { to: "/docs/reading", label: "Reading & themes" },
  { to: "/docs/local-remote", label: "Local & remote files" },
  { to: "/docs/settings", label: "Settings & permissions" },
  { to: "/docs/shortcuts", label: "Keyboard shortcuts" },
  { to: "/docs/troubleshooting", label: "Troubleshooting" },
];

// Typographic scale for docs body copy. Applied to the wrapper; child elements
// are styled with arbitrary variants so plain markup (h2/p/ul/code…) renders
// consistently across every docs page.
export const DOCS_PROSE = [
  "max-w-none text-[15px] leading-relaxed text-foreground/90",
  // The DocsHeader already supplies bottom spacing (pb-6 + mb-8); kill the top
  // margin of the first content element after it so the gap isn't doubled.
  "[&>header+*]:mt-0!",
  "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground [&_h2]:scroll-mt-20",
  "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-foreground",
  "[&_p]:my-3",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul>li]:my-1.5",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol>li]:my-1.5",
  // Style inline prose links, but EXCLUDE structural links that opt out with
  // `.no-underline` (e.g. the card grid) — the descendant selector would
  // otherwise out-specify a `no-underline` utility on the element.
  "[&_a:not(.no-underline)]:text-primary [&_a:not(.no-underline)]:underline [&_a:not(.no-underline)]:underline-offset-2",
  "[&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px]",
  "[&_kbd]:rounded [&_kbd]:border [&_kbd]:border-border [&_kbd]:bg-muted [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:font-mono [&_kbd]:text-[12px]",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
].join(" ");
