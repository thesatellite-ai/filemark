import {
  HeadContent,
  Scripts,
  createRootRoute,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import { Github, ExternalLink } from "lucide-react";
import appCss from "../styles.css?url";
import {
  GoogleTagManagerNoScript,
  GoogleTagManagerScript,
} from "../components/GoogleTagManager";
import { env } from "../env/client";
import { ldScript, webSiteLd } from "../lib/schema";

const SITE = "https://khanakia.com/apps/filemark";

// Primary header nav. Kept as data so the active-link highlight stays DRY.
const NAV = [
  { to: "/features", label: "Features" },
  { to: "/demo", label: "Demo" },
  { to: "/ai", label: "AI skill" },
  { to: "/brand", label: "Brand" },
  { to: "/changelog", label: "Changelog" },
  { to: "/privacy", label: "Privacy" },
] as const;
// GA4 flows through the GTM container in env.VITE_GTM_ID (type-safe +
// validated in src/env/client.ts — a bad/missing id throws at build).
// Production-only so dev traffic isn't tracked.
const GTM_ENABLED = import.meta.env.PROD;
// 1200x630 social-preview banner (Twitter/LinkedIn/Slack minimum).
const OG_IMAGE = `${SITE}/screenshots/og-cover.png`;
const DEFAULT_TITLE =
  "Filemark — Markdown, MDX, JSON, CSV & schema viewer for Chrome";
const DEFAULT_DESC =
  "Free Chrome extension that opens local and remote .md, .mdx, .json, .jsonc, .csv, .tsv, .sql, .prisma and .dbml files with real interactive renderers. 100% client-side, MIT licensed.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: DEFAULT_TITLE },
      { name: "description", content: DEFAULT_DESC },
      { name: "author", content: "khanakia" },
      { name: "color-scheme", content: "light dark" },
      { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#0a0a0a", media: "(prefers-color-scheme: dark)" },
      // Social
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Filemark" },
      { property: "og:title", content: DEFAULT_TITLE },
      { property: "og:description", content: DEFAULT_DESC },
      { property: "og:url", content: `${SITE}/` },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Filemark — markdown, JSON, CSV and schema viewer for Chrome" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@khanakia" },
      { name: "twitter:creator", content: "@khanakia" },
      { name: "twitter:title", content: DEFAULT_TITLE },
      { name: "twitter:description", content: DEFAULT_DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    // NOTE: no `canonical` here. Each route sets its own self-referencing
    // canonical; emitting one at the root too produced TWO canonical tags on
    // every inner page (root's "/" won, collapsing all pages to the homepage).
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/apps/filemark/favicon.svg" },
      { rel: "manifest", href: "/apps/filemark/manifest.webmanifest" },
    ],
    // Sitewide WebSite node (author/publisher graph). Per-page routes add
    // their own SoftwareApplication / WebPage / FAQ nodes on top.
    scripts: [ldScript(webSiteLd())],
  }),
  shellComponent: RootDocument,
  // Branded 404 — renders inside the layout (Header/Footer intact) instead of
  // TanStack's bare <p>Not Found</p>.
  notFoundComponent: NotFound,
});

function NotFound(): React.ReactElement {
  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="text-center">
        <div className="text-muted-foreground/40 text-[80px] font-semibold leading-none tracking-tight sm:text-[120px]">
          404
        </div>
        <h1 className="mt-4 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
          This page doesn't exist
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-muted-foreground">
          The link may be broken or the page may have moved. Here are some good
          places to land instead.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Go home
          </Link>
          <Link
            to="/demo"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-muted"
          >
            Open the demo
          </Link>
          <Link
            to="/features"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-muted"
          >
            Features
          </Link>
        </div>
      </div>
    </main>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <HeadContent />
        {GTM_ENABLED && <GoogleTagManagerScript gtmId={env.VITE_GTM_ID} />}
      </head>
      <body>
        {GTM_ENABLED && <GoogleTagManagerNoScript gtmId={env.VITE_GTM_ID} />}
        <RootLayout>{children}</RootLayout>
        <Scripts />
      </body>
    </html>
  );
}

function RootLayout({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const chromeless =
    path === "/demo" || path.startsWith("/demo/") || path.endsWith("/demo");
  if (chromeless) {
    return (
      <div className="h-full bg-background text-foreground">{children}</div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

function Header(): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <Logo />
          <span>Filemark</span>
        </Link>
        <nav className="hidden flex-1 items-center gap-5 text-sm text-muted-foreground sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="hover:text-foreground"
              // Highlight the current section. `activeProps` applies when the
              // route (or a descendant, e.g. /demo/play under /demo) matches.
              activeProps={{ className: "text-foreground font-medium" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <a
          href="https://github.com/thesatellite-ai/filemark"
          target="_blank"
          rel="noreferrer"
          aria-label="Filemark on GitHub"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted sm:ml-0"
        >
          <Github size={14} aria-hidden />
          <span className="hidden sm:inline">GitHub</span>
        </a>
        <a
          href="https://chromewebstore.google.com/detail/filemark/cidgogmffaflfghnebkfjbccfgbdjicm"
          target="_blank"
          rel="noreferrer"
          aria-label="Add Filemark to Chrome (Chrome Web Store)"
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Add to Chrome
          <ExternalLink size={12} aria-hidden />
        </a>
      </div>
    </header>
  );
}

function Footer(): React.ReactElement {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <Logo />
          {/* Year is baked at prerender/build time — refreshes on each deploy. */}
          <span>© {new Date().getFullYear()} Filemark</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/ai" className="hover:text-foreground">
            AI skill
          </Link>
          <Link to="/brand" className="hover:text-foreground">
            Brand
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/changelog" className="hover:text-foreground">
            Changelog
          </Link>
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/sitemap.xml`}
            className="hover:text-foreground"
          >
            Sitemap
          </a>
          <a href="mailto:hello@khanakia.com" className="hover:text-foreground">
            Support
          </a>
        </div>
      </div>
    </footer>
  );
}

function Logo(): React.ReactElement {
  return (
    <svg
      viewBox="0 0 32 32"
      width="20"
      height="20"
      className="shrink-0"
      aria-hidden
    >
      <rect width="32" height="32" rx="7" className="fill-primary" />
      <path
        d="M8 8h12l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M20 8v4h4"
        fill="none"
        className="stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10 17h8M10 21h6"
        className="stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
