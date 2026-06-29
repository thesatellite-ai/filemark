import {
  HeadContent,
  Scripts,
  createRootRoute,
  Link,
  useRouterState,
} from "@tanstack/react-router";
import {
  ExternalLink,
  Menu,
  X,
  Sparkles,
  BookOpen,
  Play,
  Bot,
  Palette,
  ScrollText,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { GithubIcon } from "../components/BrandIcons";
import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import {
  GoogleTagManagerNoScript,
  GoogleTagManagerScript,
} from "../components/GoogleTagManager";
import { env } from "../env/client";
import { ldScript, webSiteLd } from "../lib/schema";

const SITE = "https://khanakia.com/apps/filemark";

// Primary header nav. Kept as data so the active-link highlight stays DRY.
// Each item carries its own accent so the nav has color (the brand itself is
// neutral). `hover`/`active` are full literal Tailwind class strings (so the
// JIT scanner picks them up); `text`/`tile` colorize the mobile drawer icons.
const NAV = [
  {
    to: "/features",
    label: "Features",
    icon: Sparkles,
    desc: "What it does",
    text: "text-violet-600 dark:text-violet-400",
    hover: "hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400",
    active: "bg-violet-500/15 text-violet-600 ring-1 ring-violet-500/25 dark:text-violet-300",
    tile: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    to: "/docs",
    label: "Docs",
    icon: BookOpen,
    desc: "Guides & reference",
    text: "text-sky-600 dark:text-sky-400",
    hover: "hover:bg-sky-500/10 hover:text-sky-600 dark:hover:text-sky-400",
    active: "bg-sky-500/15 text-sky-600 ring-1 ring-sky-500/25 dark:text-sky-300",
    tile: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  {
    to: "/demo",
    label: "Demo",
    icon: Play,
    desc: "Try it live",
    text: "text-emerald-600 dark:text-emerald-400",
    hover: "hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400",
    active: "bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-300",
    tile: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    to: "/ai",
    label: "AI Skill",
    icon: Bot,
    desc: "Author docs with AI",
    text: "text-amber-600 dark:text-amber-400",
    hover: "hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400",
    active: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-300",
    tile: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    to: "/brand",
    label: "Brand",
    icon: Palette,
    desc: "Logos & assets",
    text: "text-rose-600 dark:text-rose-400",
    hover: "hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400",
    active: "bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/25 dark:text-rose-300",
    tile: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    to: "/changelog",
    label: "Changelog",
    icon: ScrollText,
    desc: "What's new",
    text: "text-indigo-600 dark:text-indigo-400",
    hover: "hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400",
    active: "bg-indigo-500/15 text-indigo-600 ring-1 ring-indigo-500/25 dark:text-indigo-300",
    tile: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    to: "/privacy",
    label: "Privacy",
    icon: ShieldCheck,
    desc: "Data handling",
    text: "text-teal-600 dark:text-teal-400",
    hover: "hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400",
    active: "bg-teal-500/15 text-teal-600 ring-1 ring-teal-500/25 dark:text-teal-300",
    tile: "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
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
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className="overflow-x-hidden"
    >
      <head>
        <HeadContent />
        {GTM_ENABLED && <GoogleTagManagerScript gtmId={env.VITE_GTM_ID} />}
      </head>
      {/* overflow-x-hidden so the off-canvas mobile nav drawer (translated past
          the right edge while closed) can't add a horizontal scrollbar. */}
      <body className="overflow-x-hidden">
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
  // The inline desktop nav (7 links + 2 CTAs) only fits at lg; below that a
  // hamburger opens a slide-in drawer with the same links. Lock body scroll
  // while the drawer is open so the page behind it doesn't move.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold">
          <Logo />
          <span>Filemark</span>
        </Link>
        <nav className="hidden flex-1 items-center justify-center gap-0.5 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[13px] font-medium text-muted-foreground transition-colors ${item.hover}`}
              // Highlight the current section in its accent. `activeProps`
              // applies when the route (or a descendant, e.g. /demo/play under
              // /demo) matches.
              activeProps={{ className: item.active }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            aria-label="Filemark on GitHub"
            className="hidden h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted sm:inline-flex"
          >
            <GithubIcon size={14} aria-hidden />
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
          {/* Hamburger — below lg only. */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Open navigation menu"
            aria-expanded={menuOpen}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border hover:bg-muted lg:hidden"
          >
            <Menu size={16} aria-hidden />
          </button>
        </div>
      </div>

    </header>
    {/* Rendered OUTSIDE the header: the header's backdrop-blur creates a
        containing block that would trap this position:fixed drawer inside the
        56px header. As a sibling, it resolves against the viewport (full
        height). */}
    <MobileNav open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

/** Slide-in navigation drawer (below lg). Backdrop + right panel are always
 *  mounted and toggled via transforms so they animate both ways. */
function MobileNav({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="lg:hidden" aria-hidden={!open}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        className={`fixed inset-y-0 right-0 z-50 flex w-[80vw] max-w-[300px] flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <Logo />
            Filemark
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={15} aria-hidden />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 overflow-y-auto p-1.5">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted data-[status=active]:bg-muted"
            >
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-colors ${item.tile}`}
              >
                <item.icon size={14} aria-hidden />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block text-[13px] font-medium text-foreground/85 group-data-[status=active]:text-foreground">
                  {item.label}
                </span>
                <span className="block truncate text-[10.5px] text-muted-foreground">
                  {item.desc}
                </span>
              </span>
              <ChevronRight
                size={14}
                className="shrink-0 text-muted-foreground/40"
                aria-hidden
              />
            </Link>
          ))}
        </nav>

        {/* CTAs */}
        <div className="shrink-0 space-y-1.5 border-t border-border p-2.5">
          <a
            href="https://chromewebstore.google.com/detail/filemark/cidgogmffaflfghnebkfjbccfgbdjicm"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-[12px] font-medium text-primary-foreground hover:opacity-90"
          >
            Add to Chrome
            <ExternalLink size={12} aria-hidden />
          </a>
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-border text-[12px] font-medium hover:bg-muted"
          >
            <GithubIcon size={13} aria-hidden />
            View on GitHub
          </a>
        </div>
      </aside>
    </div>
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
          <Link to="/docs" className="hover:text-foreground">
            Docs
          </Link>
          <Link to="/ai" className="hover:text-foreground">
            AI Skill
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
