import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Lock,
  Zap,
  Layers,
  Github as GithubIcon,
  FileText,
  Braces,
  Table2,
  Database,
  Sparkles,
} from "lucide-react";
import {
  ldScript,
  softwareApplicationLd,
  softwareSourceCodeLd,
  faqLd,
} from "../lib/schema";

const SITE = "https://khanakia.com/apps/filemark";
const STORE_URL =
  "https://chromewebstore.google.com/detail/filemark/cidgogmffaflfghnebkfjbccfgbdjicm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Filemark — Markdown, MDX, JSON, CSV & schema viewer for Chrome",
      },
      {
        name: "description",
        content:
          "Open .md, .mdx, .json, .csv, .sql, .prisma in Chrome — real renderers, tabs, search, themes, kanban from markdown. 100% client-side.",
      },
      { property: "og:url", content: `${SITE}/` },
    ],
    links: [{ rel: "canonical", href: `${SITE}/` }],
    // Home is the product's primary entity page: SoftwareApplication (the
    // rich-result card) + SoftwareSourceCode (the MIT repo) + FAQPage (mirrors
    // the visible FAQ below). The sitewide WebSite node comes from the root
    // route. Rationale: docsi/SEO.md.
    scripts: [
      ldScript(softwareApplicationLd()),
      ldScript(softwareSourceCodeLd()),
      ldScript(faqLd(FAQ)),
    ],
  }),
  component: Home,
});

// Real product FAQ — also rendered on the page (FAQPage schema must match
// visible content). Keep answers honest and concrete.
const FAQ = [
  {
    q: "Is Filemark free?",
    a: "Yes. Filemark is completely free and open source under the MIT license. There is no paid tier, account, or sign-up.",
  },
  {
    q: "Does Filemark upload my files anywhere?",
    a: "No. Every renderer runs entirely in your browser. No file contents, search queries, settings, or telemetry are ever sent to any server — you can verify zero outbound requests in Chrome DevTools.",
  },
  {
    q: "Which file types does it open?",
    a: "Markdown (.md, .mdx), JSON (.json, .jsonc), CSV/TSV (.csv, .tsv), and database schemas (.sql, .prisma, .dbml) — each with a real interactive viewer.",
  },
  {
    q: "Can it open local files from my computer?",
    a: "Yes. Enable 'Allow access to file URLs' on the extension's details page in chrome://extensions, then double-click any supported file and Chrome opens it rendered. Drag-and-drop and Open Folder also work without that toggle.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. All rendering libraries are bundled into the extension at build time (Manifest V3, strict CSP, no remote code), so Filemark works with no network connection.",
  },
  {
    q: "Can an AI coding agent author Filemark documents?",
    a: "Yes. Filemark ships an AI skill that teaches Claude Code, Cursor, or Codex the full component grammar. Install it with: npx skills add thesatellite-ai/filemark.",
  },
];

function Home(): React.ReactElement {
  return (
    <main className="bg-background text-foreground">
      <Hero />
      <Marquee />
      <ShowcaseMarkdown />
      <ShowcaseJSON />
      <ShowcaseSchema />
      <ShowcaseTable />
      <ShowcaseTasks />
      <AISkill />
      <WhyFilemark />
      <FAQSection />
      <Install />
    </main>
  );
}

/* ─────────── FAQ ──────────────────────────────────────────────────── */

function FAQSection(): React.ReactElement {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-3xl px-6 py-24 sm:py-32">
        <div className="text-center">
          <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            FAQ
          </div>
          <h2 className="mt-3 text-balance text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
            Questions, answered
          </h2>
        </div>
        <dl className="mt-12 divide-y divide-border">
          {FAQ.map((item) => (
            <div key={item.q} className="py-6">
              <dt className="text-base font-medium text-foreground">
                {item.q}
              </dt>
              <dd className="mt-2 text-balance leading-relaxed text-muted-foreground">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/* ─────────── AI skill band ────────────────────────────────────────── */

function AISkill(): React.ReactElement {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="rounded-2xl border border-border bg-muted/40 p-8 sm:p-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <Sparkles size={13} aria-hidden />
            AI skill
          </div>
          <h2 className="max-w-3xl text-balance text-[28px] font-semibold leading-[1.1] tracking-tight sm:text-[38px]">
            Let your AI author Filemark docs for you
          </h2>
          <p className="mt-4 max-w-2xl text-balance text-muted-foreground sm:text-lg">
            Drop in the Filemark skill and Claude Code, Cursor, or Codex learns
            every component, the task DSL, and the gotchas — then writes
            beautiful kanban boards, charts, and ER diagrams straight into your
            markdown.
          </p>
          <pre className="mt-7 w-fit max-w-full overflow-x-auto rounded-lg border border-border bg-foreground px-4 py-3 text-[13px] text-background">
            <code>npx skills add thesatellite-ai/filemark</code>
          </pre>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              to="/ai"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              How the AI skill works
              <ArrowRight size={14} aria-hidden />
            </Link>
            <a
              href="https://github.com/thesatellite-ai/filemark/blob/main/skills/filemark/SKILL.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-muted"
            >
              <GithubIcon size={14} aria-hidden />
              Read SKILL.md
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Hero ─────────────────────────────────────────────────── */

function Hero(): React.ReactElement {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.96_0_0_/_0.9),transparent_70%)] dark:bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.22_0_0_/_0.8),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-6xl px-6 pb-28 pt-24 text-center sm:pt-32">
        <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
          <span className="size-1 rounded-full bg-emerald-500" />
          Free · local-first · no telemetry
        </div>
        <h1 className="mx-auto max-w-4xl text-balance text-[44px] font-semibold leading-[1.05] tracking-tight sm:text-[64px] sm:leading-[1.02]">
          Every file Chrome
          <br />
          <span className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
            should already open. Beautifully.
          </span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
          One Chrome extension. Real renderers for{" "}
          <Mono>.md</Mono>, <Mono>.mdx</Mono>, <Mono>.json</Mono>,{" "}
          <Mono>.csv</Mono>, <Mono>.tsv</Mono>, <Mono>.sql</Mono>,{" "}
          <Mono>.prisma</Mono> and <Mono>.dbml</Mono>. No server, no upload,
          no telemetry.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href={STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Add to Chrome
            <ArrowRight size={15} />
          </a>
          <Link
            to="/demo"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-6 text-[14px] font-medium hover:bg-muted"
          >
            Try the live demo
          </Link>
        </div>

        <div className="mt-16">
          <BrowserFrame title="docs/launch-plan.md — Filemark">
            <HeroPreview />
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}

/* ─────────── Marquee: file formats as refined chip cards ─────────── */

// Per-family icon + accent. Same look as the schema tables in the hero
// — small bordered tile, mono extension on top, label below, hover lift.
const FORMATS: {
  ext: string;
  name: string;
  Icon: typeof FileText;
  accent: string;
}[] = [
  { ext: ".md",     name: "Markdown", Icon: FileText, accent: "text-foreground/70" },
  { ext: ".mdx",    name: "MDX",      Icon: FileText, accent: "text-foreground/70" },
  { ext: ".json",   name: "JSON",     Icon: Braces,   accent: "text-amber-600 dark:text-amber-400" },
  { ext: ".jsonc",  name: "JSONC",    Icon: Braces,   accent: "text-amber-600 dark:text-amber-400" },
  { ext: ".csv",    name: "CSV",      Icon: Table2,   accent: "text-sky-600 dark:text-sky-400" },
  { ext: ".tsv",    name: "TSV",      Icon: Table2,   accent: "text-sky-600 dark:text-sky-400" },
  { ext: ".sql",    name: "SQL",      Icon: Database, accent: "text-emerald-600 dark:text-emerald-400" },
  { ext: ".prisma", name: "Prisma",   Icon: Database, accent: "text-emerald-600 dark:text-emerald-400" },
  { ext: ".dbml",   name: "DBML",     Icon: Database, accent: "text-emerald-600 dark:text-emerald-400" },
];

function Marquee(): React.ReactElement {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="mb-10 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            File formats
          </p>
          <h2 className="mt-2 text-balance text-[22px] font-medium tracking-tight text-foreground/85 sm:text-[26px]">
            Nine formats, one extension.
          </h2>
        </div>
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9">
          {FORMATS.map((f) => (
            <li key={f.ext}>
              <div className="group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-2 text-center transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
                <f.Icon
                  size={16}
                  strokeWidth={1.7}
                  className={`shrink-0 transition-transform group-hover:scale-110 ${f.accent}`}
                  aria-hidden
                />
                <span className="font-mono text-[12px] font-semibold leading-none text-foreground">
                  {f.ext}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {f.name}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─────────── Showcase sections (alternating left/right) ──────────── */

interface ShowcaseProps {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
  bg?: string;
}

function Showcase({
  eyebrow,
  title,
  body,
  bullets,
  visual,
  reverse,
  bg,
}: ShowcaseProps): React.ReactElement {
  return (
    <section className={`border-b border-border ${bg ?? ""}`}>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16 lg:py-32">
        <div className={reverse ? "lg:order-2" : ""}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
            {title}
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            {body}
          </p>
          <ul className="mt-7 space-y-2.5 text-[14px]">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground/40" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={reverse ? "lg:order-1" : ""}>
          <BrowserFrame compact>{visual}</BrowserFrame>
        </div>
      </div>
    </section>
  );
}

function ShowcaseMarkdown(): React.ReactElement {
  return (
    <Showcase
      eyebrow="Markdown · MDX"
      title={<>Real markdown.<br />Not text in a box.</>}
      body="Full GitHub-flavored markdown, KaTeX, Mermaid, syntax highlighting via shiki — plus inline components: callouts, tabs, ADRs, kanban boards, charts, all from plain text."
      bullets={[
        "Tables that scroll. Code that highlights. Math that renders.",
        "Drop <Kanban md/>, <Chart src=…/>, <Callout/> right in the prose.",
        "Lazy-loaded Mermaid and Schema engines — fast on big folders.",
      ]}
      visual={<MarkdownMock />}
    />
  );
}

function ShowcaseJSON(): React.ReactElement {
  return (
    <Showcase
      reverse
      eyebrow="JSON · JSONC"
      title={<>JSON you can<br />actually read.</>}
      body="Collapsible tree, nine themes, copy-to-clipboard on every node, parse-error pinpoints with line numbers. Better than DevTools, in the file viewer."
      bullets={[
        "9 themes including githubDark, nord, monokai, gruvbox.",
        "Type chips, size hints, collapse-by-depth controls.",
        ".jsonc supported — comments survive the round trip.",
      ]}
      visual={<JsonMock />}
      bg="bg-muted/25"
    />
  );
}

function ShowcaseSchema(): React.ReactElement {
  return (
    <Showcase
      eyebrow="SQL · Prisma · DBML"
      title={<>Your schema,<br />drawn for you.</>}
      body="Drop a .sql, .prisma or .dbml file in Chrome. Filemark parses it and renders an interactive entity-relationship diagram with foreign keys and column types."
      bullets={[
        "Three dialects, one diagram. Pan, zoom, click a table.",
        "Falls back to syntax-highlighted source if the parser stumbles.",
        "Works offline. No data leaves your browser.",
      ]}
      visual={<SchemaMock />}
    />
  );
}

function ShowcaseTable(): React.ReactElement {
  return (
    <Showcase
      reverse
      eyebrow="CSV · TSV"
      title={<>Spreadsheets that<br />weren't a download.</>}
      body="CSV and TSV files used to trigger a download. In Filemark they open as a real datagrid — sortable, filterable, resizable, with type-aware columns straight from a fence-meta comment."
      bullets={[
        "Type hints: status badges, tag chips, ratings, currency, dates.",
        "Multi-sort, column visibility, density toggle, CSV/MD/JSON export.",
        "Works on local file:// — no server middleware needed.",
      ]}
      visual={<TableMock />}
      bg="bg-muted/25"
    />
  );
}

function ShowcaseTasks(): React.ReactElement {
  return (
    <Showcase
      eyebrow="Tasks → Kanban"
      title={<>Plain markdown.<br />Live kanban board.</>}
      body="Author tasks as ordinary bullets with sigils (@owner, !priority, ~due, (project)). Drop one <Kanban md/> tag and the same file renders as a board, grouped however you want."
      bullets={[
        "- [ ] Ship CWS listing @aman !p0 ~2026-06-15 (launch)",
        "Group by status, priority, owner, due-bucket — your choice.",
        "Filterable, recurring, with ADR-style decision logging.",
      ]}
      visual={<TasksMock />}
    />
  );
}

/* ─────────── Why filemark ────────────────────────────────────────── */

function WhyFilemark(): React.ReactElement {
  const pillars = [
    {
      icon: Layers,
      title: "Nine formats, one extension.",
      body: "One install. Real renderers for everything Chrome can't natively open, with a unified UI across all of them.",
    },
    {
      icon: Lock,
      title: "100% client-side.",
      body: "No server, no upload, no analytics, no remote code. Your files are read locally and never leave the browser.",
    },
    {
      icon: Zap,
      title: "Fast on big folders.",
      body: "Lazy shiki loading, code-split language grammars, IndexedDB persistence. Open thousands of files without bog.",
    },
  ];
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Why filemark
          </p>
          <h2 className="mt-3 text-balance text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
            Built for files you actually
            <br className="hidden sm:block" />
            care about reading.
          </h2>
        </div>
        <div className="mt-16 grid gap-12 sm:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title}>
              <div className="grid size-10 place-items-center rounded-xl bg-foreground/[0.04] text-foreground">
                <p.icon size={18} strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 text-[18px] font-semibold tracking-tight">
                {p.title}
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────── Install ─────────────────────────────────────────────── */

function Install(): React.ReactElement {
  return (
    <section id="install" className="bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-background/60">
              Install
            </p>
            <h2 className="mt-3 text-balance text-[34px] font-semibold leading-[1.1] tracking-tight sm:text-[44px]">
              Add Filemark
              <br />
              to Chrome.
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-background/70 sm:text-base">
              Free, open source, 100% local. One click from the Chrome Web
              Store — or build from source in 30 seconds.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-background px-6 text-[14px] font-medium text-foreground transition-opacity hover:opacity-90"
              >
                Add to Chrome
                <ArrowRight size={15} />
              </a>
              <a
                href="https://github.com/thesatellite-ai/filemark"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-background/30 px-6 text-[14px] font-medium text-background hover:bg-background/10"
              >
                <GithubIcon size={15} />
                Get it on GitHub
              </a>
            </div>
          </div>
          <ol className="space-y-5 text-[14px] text-background/85">
            {[
              "Clone the repo and run pnpm install && task build.",
              "Open chrome://extensions, toggle Developer mode, click Load unpacked, pick apps/chrome-ext/dist.",
              "On the extension's details page, toggle Allow access to file URLs.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-background/10 text-[12px] font-semibold text-background">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ Small UI primitives ══════════════════════════════════ */

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
      {children}
    </code>
  );
}

function BrowserFrame({
  title,
  children,
  compact,
}: {
  title?: string;
  children: React.ReactNode;
  compact?: boolean;
}): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        {title && (
          <span className="ml-3 truncate text-[11px] text-muted-foreground">
            {title}
          </span>
        )}
      </div>
      <div className={compact ? "h-[380px] overflow-hidden" : "min-h-[420px]"}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════ Mock visuals (inline, no images) ═════════════════════ */

function HeroPreview(): React.ReactElement {
  // Hero section is text-center for the headline + subhead; force the
  // browser-frame composite to text-left so the sidebar + TOC items
  // don't inherit centering.
  return (
    <div className="grid h-[480px] grid-cols-[200px_1fr_180px] text-left">
      <aside className="border-r border-border bg-muted/30 p-3 text-[11px]">
        <p className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          launch
        </p>
        {["overview.md", "tasks.md", "schema.sql", "metrics.csv", "post-mortem.md"].map((f, i) => (
          <div
            key={f}
            className={`mb-0.5 truncate rounded px-2 py-1 ${
              i === 0
                ? "bg-foreground/10 font-medium text-foreground"
                : "text-foreground/70"
            }`}
          >
            {f}
          </div>
        ))}
      </aside>
      <div className="overflow-hidden p-6 text-left">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          docs/launch-plan.md
        </p>
        <h3 className="mt-1 text-[22px] font-semibold tracking-tight">
          Launch plan — v0.1
        </h3>
        <p className="mt-3 text-[12px] leading-relaxed text-foreground/75">
          Filemark is live on the Chrome Web Store. Install in one click, or
          build from source — the renderer is identical either way.
        </p>
        <div className="mt-4 rounded-md border-l-2 border-emerald-500/70 bg-emerald-500/[0.07] p-3 text-[11px]">
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Site live
          </p>
          <p className="mt-0.5 text-foreground/70">
            khanakia.com/apps/filemark · privacy + changelog + demo
          </p>
        </div>
        <pre className="mt-4 overflow-hidden rounded-md bg-foreground/[0.04] p-3 font-mono text-[10px] leading-relaxed">
          <span className="text-pink-600 dark:text-pink-400">import</span>{" "}
          {"{ MDXViewer }"}{" "}
          <span className="text-pink-600 dark:text-pink-400">from</span>{" "}
          <span className="text-emerald-700 dark:text-emerald-400">
            "@filemark/mdx"
          </span>
          ;
        </pre>
      </div>
      <aside className="border-l border-border p-4 text-[11px]">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          On this page
        </p>
        {["Overview", "Decisions", "Open work", "Risk log"].map((h, i) => (
          <div
            key={h}
            className={`mb-1 truncate ${
              i === 0 ? "font-medium text-foreground" : "text-foreground/60"
            }`}
          >
            {h}
          </div>
        ))}
      </aside>
    </div>
  );
}

function MarkdownMock(): React.ReactElement {
  return (
    <div className="h-full overflow-hidden p-6 text-left text-[12px] leading-relaxed">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        guides/getting-started.md
      </p>
      <h4 className="mt-1 text-[20px] font-semibold tracking-tight">
        Getting started
      </h4>
      <p className="mt-3 text-foreground/75">
        Filemark works the moment you point it at a folder. Drag, drop, done.
      </p>
      <div className="mt-3 rounded-md border-l-2 border-sky-500/70 bg-sky-500/[0.08] p-2.5 text-[11px]">
        <p className="font-semibold text-sky-700 dark:text-sky-300">
          💡 Pro tip
        </p>
        <p className="text-foreground/75">
          Press{" "}
          <kbd className="rounded border border-border bg-background px-1">
            ⌘K
          </kbd>{" "}
          to search across every open file.
        </p>
      </div>
      <pre className="mt-3 overflow-hidden rounded-md bg-foreground/[0.04] p-2.5 font-mono text-[10px]">
        <span className="text-violet-600 dark:text-violet-400">const</span> ok ={" "}
        <span className="text-emerald-700 dark:text-emerald-400">true</span>;
      </pre>
      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-1.5 font-medium">Format</th>
            <th className="py-1.5 font-medium">Renderer</th>
          </tr>
        </thead>
        <tbody>
          {[
            [".md", "@filemark/mdx"],
            [".csv", "@filemark/csv"],
            [".sql", "@filemark/schema"],
          ].map(([a, b]) => (
            <tr key={a} className="border-b border-border/60">
              <td className="py-1.5 font-mono">{a}</td>
              <td className="py-1.5 font-mono text-foreground/70">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function JsonMock(): React.ReactElement {
  return (
    <div className="h-full overflow-hidden bg-[#0d1117] p-5 font-mono text-[11.5px] leading-[1.7] text-[#c9d1d9]">
      <p className="mb-3 font-sans text-[10px] uppercase tracking-wider text-[#7d8590]">
        package.json · githubDark
      </p>
      <div>
        <span className="text-[#7d8590]">{"{"}</span>
      </div>
      <div className="ml-4">
        <span className="text-[#79c0ff]">"name"</span>
        <span className="text-[#7d8590]">: </span>
        <span className="text-[#a5d6ff]">"filemark"</span>
        <span className="text-[#7d8590]">,</span>
      </div>
      <div className="ml-4">
        <span className="text-[#79c0ff]">"version"</span>
        <span className="text-[#7d8590]">: </span>
        <span className="text-[#a5d6ff]">"0.1.0"</span>
        <span className="text-[#7d8590]">,</span>
      </div>
      <div className="ml-4">
        <span className="text-[#79c0ff]">"private"</span>
        <span className="text-[#7d8590]">: </span>
        <span className="text-[#ffa657]">true</span>
        <span className="text-[#7d8590]">,</span>
      </div>
      <div className="ml-4">
        <span className="text-[#79c0ff]">"dependencies"</span>
        <span className="text-[#7d8590]">: {"{"}</span>
      </div>
      {[
        ["@filemark/core", "workspace:*"],
        ["@filemark/mdx", "workspace:*"],
        ["react", "^19.0.0"],
        ["lucide-react", "^0.460.0"],
      ].map(([k, v]) => (
        <div key={k} className="ml-8">
          <span className="text-[#79c0ff]">"{k}"</span>
          <span className="text-[#7d8590]">: </span>
          <span className="text-[#a5d6ff]">"{v}"</span>
          <span className="text-[#7d8590]">,</span>
        </div>
      ))}
      <div className="ml-4">
        <span className="text-[#7d8590]">{"},"}</span>
      </div>
      <div className="ml-4">
        <span className="text-[#79c0ff]">"scripts"</span>
        <span className="text-[#7d8590]">: {"{ /* 4 entries */ }"}</span>
      </div>
      <div>
        <span className="text-[#7d8590]">{"}"}</span>
      </div>
    </div>
  );
}

function SchemaMock(): React.ReactElement {
  const tables = [
    { x: 30, y: 40, name: "users", rows: ["id PK", "email", "created_at"] },
    { x: 270, y: 100, name: "posts", rows: ["id PK", "user_id FK", "title", "body"] },
    { x: 510, y: 60, name: "comments", rows: ["id PK", "post_id FK", "body"] },
  ];
  return (
    <div className="relative h-full overflow-hidden bg-[oklch(0.985_0_0)] p-4 dark:bg-[oklch(0.165_0_0)]">
      <p className="absolute left-4 top-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        schema.prisma · 3 tables, 2 relations
      </p>
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 720 380"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M180 120 C 230 130, 240 145, 280 155"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.4"
        />
        <path
          d="M420 155 C 470 145, 480 130, 520 120"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.4"
        />
      </svg>
      {tables.map((t) => (
        <div
          key={t.name}
          className="absolute w-[150px] overflow-hidden rounded-md border border-border bg-card shadow-sm"
          style={{ left: t.x, top: t.y }}
        >
          <div className="border-b border-border bg-muted/60 px-2.5 py-1 font-mono text-[11px] font-semibold">
            {t.name}
          </div>
          <div className="px-2.5 py-1.5 font-mono text-[10.5px] leading-[1.65] text-foreground/75">
            {t.rows.map((r) => (
              <div key={r} className="truncate">
                {r}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TableMock(): React.ReactElement {
  const rows = [
    { id: 1, title: "Pass platform-design review", priority: "P0", owner: "Ada", done: false },
    { id: 2, title: "Cut electron-builder release", priority: "P1", owner: "Grace", done: false },
    { id: 3, title: "Wire Open Folder hotkey", priority: "P2", owner: "Linus", done: true },
    { id: 4, title: "Ship CWS listing draft", priority: "P0", owner: "Aman", done: false },
    { id: 5, title: "Promo tile 440×280", priority: "P1", owner: "Aman", done: true },
  ];
  const prioColor: Record<string, string> = {
    P0: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    P1: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    P2: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  };
  return (
    <div className="h-full overflow-hidden p-4 text-left text-[12px]">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>roadmap.csv · 5 rows</span>
        <span>sort priority · group: none</span>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-y border-border bg-muted/40 text-left text-[11px] text-muted-foreground">
            <th className="w-8 px-2 py-1.5">#</th>
            <th className="px-2 py-1.5 font-medium">title</th>
            <th className="w-16 px-2 py-1.5 font-medium">priority</th>
            <th className="w-20 px-2 py-1.5 font-medium">owner</th>
            <th className="w-12 px-2 py-1.5 font-medium">done</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 hover:bg-muted/30">
              <td className="px-2 py-1.5 tabular-nums text-muted-foreground/70">
                {r.id}
              </td>
              <td className="px-2 py-1.5">{r.title}</td>
              <td className="px-2 py-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${prioColor[r.priority]}`}
                >
                  {r.priority}
                </span>
              </td>
              <td className="px-2 py-1.5 text-foreground/75">{r.owner}</td>
              <td className="px-2 py-1.5">{r.done ? "✓" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TasksMock(): React.ReactElement {
  const cols = [
    {
      name: "todo",
      tone: "border-zinc-300 dark:border-zinc-700",
      cards: [
        "Ship CWS listing @aman !p0 ~Jun 15 (launch)",
        "Trademark sanity check @aman !p2",
      ],
    },
    {
      name: "in progress",
      tone: "border-amber-300/60 dark:border-amber-700/60",
      cards: [
        "Capture promo screenshots @aman !p1",
        "Add interactive playground @aman !p1",
      ],
    },
    {
      name: "done",
      tone: "border-emerald-300/60 dark:border-emerald-700/60",
      cards: ["Build marketing site @aman", "Deploy to khanakia.com"],
    },
  ];
  return (
    <div className="h-full overflow-hidden p-4 text-left text-[12px]">
      <p className="mb-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        tasks.md · &lt;Kanban md group-by="status"/&gt;
      </p>
      <div className="grid grid-cols-3 gap-2.5">
        {cols.map((c) => (
          <div
            key={c.name}
            className={`overflow-hidden rounded-md border-t-2 ${c.tone} bg-muted/40 p-2`}
          >
            <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{c.name}</span>
              <span>{c.cards.length}</span>
            </div>
            <div className="space-y-1.5">
              {c.cards.map((t) => (
                <div
                  key={t}
                  className="rounded border border-border bg-background p-2 text-[11px] leading-snug shadow-sm"
                >
                  {t}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
