import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  Columns3,
  Database,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  Folder,
  Globe,
  Image as ImageIcon,
  KanbanSquare,
  Keyboard,
  LayoutGrid,
  Lock,
  Palette,
  PanelLeft,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TableProperties,
  Type,
  Zap,
} from "lucide-react";
import { asset } from "../lib/asset";
import { pageScripts } from "../lib/schema";

const SITE = "https://khanakia.com/apps/filemark";

export const Route = createFileRoute("/features")({
  head: () => {
    const title = "Features — Filemark | every file Chrome should already open";
    const desc =
      "Every Filemark feature laid out — nine file formats (markdown, MDX, JSON, JSONC, CSV, TSV, SQL, Prisma, DBML), remote URL rendering, kanban from markdown, tasks, ER diagrams, customization, keyboard shortcuts, privacy.";
    const url = `${SITE}/features`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: pageScripts({
        name: title,
        description: desc,
        url,
        crumbs: [
          { name: "Filemark", url: `${SITE}/` },
          { name: "Features", url },
        ],
      }),
    };
  },
  component: FeaturesPage,
});

interface Feature {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  image?: string;
  imageAlt?: string;
  flipped?: boolean;
  icon: typeof FileText;
  /** Demo route + label — surfaces a "Try it live" link beside each format. */
  demoId?: string;
  demoLabel?: string;
}

const FORMAT_FEATURES: Feature[] = [
  {
    id: "markdown",
    eyebrow: "Markdown · MDX",
    title: "GitHub-flavored markdown — with components you can drop in.",
    body:
      "Full GFM, syntax-highlighted code via shiki, KaTeX math, Mermaid diagrams, and a library of inline components — callouts, tabs, ADRs, kanban boards, charts — all from plain text.",
    bullets: [
      "Tables · task lists · footnotes · autolinks · strikethrough",
      "KaTeX math (inline $x$ and block $$…$$)",
      "Mermaid — flowchart, sequence, class, state, ER, gantt, journey, mindmap, timeline, sankey, Wardley, architecture, treemap",
      "Shiki syntax highlighting — TS · JS · Python · Go · Rust · SQL · 20+ languages, themed in sync with the UI",
      "<Callout>, <Tabs>, <Details>, <ADR>, <Kanban>, <Chart>, <Datagrid>, <Schema>",
      "Wiki-links [[Page]] · backlinks panel · linked-mention graph",
      "Frontmatter chip strip, table of contents that follows your scroll, anchor links per heading",
      "Code block toolbar — copy, wrap/scroll toggle, language label",
      "Markmap / mindmap rendering inside ```markmap fences",
      "Persistent task checkboxes — flip them in the viewer, state survives reload",
      "Shortcode emoji (:smile:) and HTML-in-markdown when you need an escape hatch",
    ],
    image: "/screenshots/1-hero.png",
    imageAlt: "Markdown rendered with tables, callouts, and a code block.",
    icon: FileText,
    demoId: "showcase",
    demoLabel: "Try the markdown showcase",
  },
  {
    id: "schemas",
    eyebrow: "SQL · Prisma · DBML",
    title: "Schemas → interactive entity-relationship diagrams.",
    body:
      "Drop a .sql, .prisma, or .dbml file and Filemark renders an interactive ER diagram with foreign keys and indexes. Doesn't parse cleanly? Falls back to syntax-highlighted source — you never lose the file.",
    bullets: [
      "Dialects — PostgreSQL · MySQL · SQLite · ClickHouse",
      "Prisma schema syntax (.prisma) supported natively",
      "DBML (.dbml) supported natively",
      "Drag tables around the canvas; FK arrows stay tracked",
      "Indexes and unique constraints rendered as chips on each table",
      "Resizable tables, zoom + pan canvas, mini-map for big schemas",
      "Search box jumps to a table by name",
      "Cytoscape graph engine — handles hundreds of tables without lag",
      "Graceful fallback to highlighted source on parse failure (so a broken .sql still opens)",
    ],
    image: "/screenshots/2-schema.png",
    imageAlt: "An entity-relationship diagram of a Prisma schema.",
    flipped: true,
    icon: Database,
    demoId: "schema-prisma",
    demoLabel: "Open the Prisma schema demo",
  },
  {
    id: "json",
    eyebrow: "JSON · JSONC",
    title: "JSON as a collapsible tree, nine themes, line-numbered errors.",
    body:
      "Drop a JSON or JSONC (JSON with comments, like tsconfig.json) and read it the way it deserves — a collapsible tree, type chips, clipboard on every node, and line-numbered parse errors when a comma misbehaves.",
    bullets: [
      "Nine themes — githubDark, nord, monokai, gruvbox, vscode, basic, dark, light, githubLight",
      "Collapsible tree with configurable default depth (None · 1–5)",
      "Type chips — string, number, boolean, array, object",
      "Copy any value or full JSON path with one click",
      "Configurable string truncation (drag-slider, 0–400 chars)",
      "Toggle data-type labels and object-size badges per preference",
      "Line-numbered parse errors when a comma or bracket misbehaves",
      "JSONC — // and /* */ comments, trailing commas — no errors",
      "Configurable indent for copy (0–8 spaces)",
    ],
    image: "/screenshots/3-json.png",
    imageAlt: "Collapsible JSON tree with type chips and theme controls.",
    icon: FileJson,
    demoId: "richdocs-tier1",
    demoLabel: "Open a JSON-rich demo",
  },
  {
    id: "datagrid",
    eyebrow: "CSV · TSV",
    title: "CSV and TSV as a sortable, filterable datagrid.",
    body:
      "Sort, filter, resize columns — type-aware cells (status badges, tag chips, ratings, currency, dates) via simple fence-meta hints. Export filtered rows back to CSV, Markdown, or JSON.",
    bullets: [
      "Sort by any column, multi-column secondary sort",
      "Per-column filter inputs — partial match, range, set membership",
      "Type-aware cells — status badges, tag chips, star ratings, currency, dates",
      "Fence-meta hints in markdown (```csv {currency:price}) for typed columns",
      "Resizable column widths, persisted per file",
      "Pin / freeze the first column for wide tables",
      "Export selection (filtered view) to CSV, Markdown, or JSON",
      "TSV out of the box — tab-separated falls back to the same datagrid",
      "Virtualized rows — thousands of records without scroll jank",
    ],
    image: "/screenshots/4-datagrid.png",
    imageAlt: "CSV rendered as an interactive datagrid with badges and filters.",
    flipped: true,
    icon: FileSpreadsheet,
    demoId: "datagrid-full",
    demoLabel: "Open the datagrid tour",
  },
  {
    id: "tasks",
    eyebrow: "Tasks · Kanban",
    title: "Tasks in plain markdown, rendered as a board.",
    body:
      "Author tasks as ordinary markdown bullets with @owner, !priority, ~due, (project) sigils. Add a <Kanban md/> tag and the same file renders as a board — grouped by status, priority, owner, due-bucket, whatever you want.",
    bullets: [
      "Sigil syntax — @owner, !priority (p0/p1/…), ~due (YYYY-MM-DD), (project)",
      "<TaskList filter=\"…\"> — render a filtered subset anywhere",
      "<Kanban md/> — same source, board view",
      "<TaskStats> — counts by status / priority / owner / project",
      "<TaskTimeline> — Gantt-style strip over a date range",
      "Group by status, priority, owner, due-bucket — your choice",
      "Drag tasks across columns; sigil rewrites in source",
      "Cross-file task panel — every task in every file, one dashboard",
      "Filter DSL — status:doing & !p:p0 & ~:overdue",
      "Checkbox state persists per file across reloads",
    ],
    image: "/screenshots/5-tasks-kanban.png",
    imageAlt: "Markdown task list rendered as a kanban board.",
    icon: KanbanSquare,
    demoId: "kanban-full",
    demoLabel: "Open the kanban demo",
  },
];

const CATEGORIES: {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  groups: { icon: typeof FileText; title: string; bullets: string[] }[];
}[] = [
  {
    id: "remote",
    eyebrow: "Web URLs",
    title: "Render remote .md / .json / .sql URLs in place.",
    blurb:
      "Open a raw URL on github, gist, gitlab, or any site — Filemark replaces the page with its rendered view, URL bar untouched. Back / forward / bookmarks all keep working.",
    groups: [
      {
        icon: Globe,
        title: "In-place rendering",
        bullets: [
          "URL bar stays at the original .md / .json / .sql / .csv / .prisma / .dbml",
          "Browser back / forward navigate exactly like a normal page",
          "Bookmarks land on the renderable URL, not a chrome-extension://… proxy",
          "Works on pages served with Content-Security-Policy: sandbox (raw.github, gists, gitlab raw)",
          "Works on Cloudflare-protected pages — reads cookies from the parent context",
        ],
      },
      {
        icon: ShieldCheck,
        title: "Opt-in permission",
        bullets: [
          "Disabled by default — Filemark cannot read any web page on a fresh install",
          "Single toggle in Options → 'Render remote files' grants the optional *://*/* permission",
          "Standard Chrome permission prompt — you accept it once",
          "Revoke any time from the same toggle (Chrome removes the permission immediately)",
        ],
      },
      {
        icon: Star,
        title: "Web Docs sidebar",
        bullets: [
          "Every remote URL you open auto-saves to a 'Web docs' list in the sidebar",
          "Last 30 URLs, newest first, deduplicated by URL",
          "Host shown as subtitle so you can scan at a glance",
          "Synced across browser tabs via chrome.storage.local — open in one tab, see it in another",
          "Same list visible in the standalone Filemark app",
        ],
      },
      {
        icon: ArrowRight,
        title: "Open in full Filemark",
        bullets: [
          "TopBar button on every injected page opens the standalone viewer in a new tab",
          "Standalone app fetches the URL through your granted host permission",
          "Switch to library mode for multi-file sessions, drag in folders, use ⌘K search across all files",
        ],
      },
    ],
  },
  {
    id: "library",
    eyebrow: "Library",
    title: "A real file manager, in a browser tab.",
    blurb:
      "Drop folders, drop files, drop URLs — Filemark builds a sidebar around them with stars, recents, tags, search, and live disk sync.",
    groups: [
      {
        icon: Folder,
        title: "Folders",
        bullets: [
          "Drag-drop a folder — recursive walk skips node_modules, .git, dist, build",
          "File System Access (FSA) handles persist across reloads",
          "Live sync — files added/removed on disk show up without a manual reload",
          "Auto-refresh polling (toggle + interval in Options) for FSA folders",
          "Per-folder root path display, rename folder, label custom name",
          "'Reconnect folder' when Chrome forgets a handle (rare)",
          "Hierarchical tree with per-folder collapse state, persisted",
        ],
      },
      {
        icon: FileText,
        title: "Files",
        bullets: [
          "Drag-drop loose files anywhere on the page",
          "Stable Recent list — clicking a file does NOT move it to the top (muscle memory matters)",
          "Star any file — Starred section pinned to sidebar top",
          "Custom tags per file; tag filter narrows the library",
          "Per-file actions menu — rename, copy path, remove, star, tags",
          "Folder open-in-OS, Reveal-in-Finder, Open-in-editor (Cursor / VS Code / Zed) when path is known",
          "Subtitles in filtered views — show parent folder so duplicates are distinguishable",
        ],
      },
      {
        icon: PanelLeft,
        title: "Sidebar",
        bullets: [
          "Collapsible, resizable — drag the right edge to set width (persisted)",
          "Sections: Starred · Recent · Web docs · Dropped · Folders",
          "Per-section open/close state, persisted",
          "Per-folder tree collapse state, persisted",
          "Per-folder scoped ⌘K search (magnifier icon on hover)",
          "'Reveal active file in sidebar' — expand every parent + scroll to row + flash highlight",
          "Expand-all / collapse-all toolbar icons",
        ],
      },
      {
        icon: RefreshCw,
        title: "Auto-refresh",
        bullets: [
          "Toggle in the TopBar (RefreshCw icon turns green when on)",
          "Polls the active file plus every FSA folder on a configurable interval",
          "Default 2s; adjustable from 500ms upward",
          "On window focus + tab visibility — re-walks every FSA folder for cheap sync",
        ],
      },
    ],
  },
  {
    id: "navigation",
    eyebrow: "Tabs · Search · TOC",
    title: "Navigate like an editor, not a browser.",
    blurb: "Multi-tab open files, fuzzy search across the whole library, and a TOC that tracks your scroll. Every action has a shortcut.",
    groups: [
      {
        icon: LayoutGrid,
        title: "Tabs",
        bullets: [
          "Open multiple files as tabs — drag to reorder",
          "Next / previous tab keyboard shortcuts (rebindable)",
          "Jump to tab N (⌘1–⌘9)",
          "Close tab × button per tab; close-other-tabs from the tab menu",
          "Tab strip auto-scrolls to show the active tab",
        ],
      },
      {
        icon: Search,
        title: "⌘K Search",
        bullets: [
          "Full-text across every loaded file (FlexSearch under the hood)",
          "Query highlighting in matches",
          "Per-folder scope — magnifier icon on each folder in the sidebar",
          "File path subtitles for disambiguation",
          "Type, hit Enter, file opens in viewer — no mouse needed",
        ],
      },
      {
        icon: Columns3,
        title: "TOC + tasks panel",
        bullets: [
          "Auto-generated TOC sidebar that tracks your scroll position",
          "Click a heading to jump",
          "Tasks panel (⌘T) — cross-file task dashboard",
          "Click a task in the panel → file opens, scrolls to the task line, briefly highlights it",
        ],
      },
    ],
  },
  {
    id: "viewer",
    eyebrow: "Viewer",
    title: "Reader chrome that gets out of the way.",
    blurb: "Top bar with every action you need; reading + fullscreen modes when you want nothing else on screen.",
    groups: [
      {
        icon: Eye,
        title: "Reading modes",
        bullets: [
          "Raw mode — toggle to syntax-highlighted source any time",
          "Reading mode (⇧F) — hides Sidebar + Tasks panel, keeps TopBar + TabStrip",
          "Fullscreen (F) — hides every chrome, edge-to-edge viewer",
          "Escape exits any mode",
        ],
      },
      {
        icon: TableProperties,
        title: "TopBar",
        bullets: [
          "Open Folder · Search · TOC toggle · Tasks panel toggle",
          "Reveal-in-Sidebar (Crosshair icon)",
          "Auto-refresh toggle (green when on)",
          "Theme popover (light · dark · sepia · custom + font/size/line-height sliders)",
          "FileActions menu — rename · copy path · open in editor · reveal in Finder",
          "Open-in-Full-Filemark button in inject mode",
          "Settings link to the Options page",
        ],
      },
    ],
  },
  {
    id: "customization",
    eyebrow: "Customization",
    title: "Themes, typography, every shortcut rebindable.",
    blurb: "Three built-in themes plus your own. Reset any slider individually. Every shortcut adjustable from Options.",
    groups: [
      {
        icon: Palette,
        title: "Themes",
        bullets: [
          "Light · dark · sepia, plus example custom themes (neon, solarized)",
          "Theme tokens via shadcn — drop in your own CSS to add a theme",
          "Persists across reloads + syncs across Chrome profiles via chrome.storage.sync",
          "Auto follows system color scheme on first install",
        ],
      },
      {
        icon: Type,
        title: "Typography",
        bullets: [
          "Font family — sans · serif · mono (sliders, individually resettable)",
          "Font size · line height · content width sliders",
          "Live preview — drag a slider, see the active file re-flow",
          "Reset all from the Danger Zone in Options",
        ],
      },
      {
        icon: Keyboard,
        title: "Keyboard shortcuts",
        bullets: [
          "Every shortcut listed in Options with its current binding",
          "Click any chord to rebind — press the key combo you want",
          "Bindings use physical key position so they work on every layout (Turkish Q, AZERTY, Dvorak, …)",
          "Reset to default per shortcut · Disable-all toggle for conflict relief",
          "Conflict warnings in-line when two shortcuts share a key",
        ],
      },
      {
        icon: Settings,
        title: "Per-format toggles",
        bullets: [
          "Enable / disable each of the nine supported formats independently",
          "Disabled = Filemark stops intercepting → falls back to Chrome's default handling",
          "JSON viewer options surface separately — theme, depth, truncation, types, sizes, clipboard",
          "Settings sync across Chrome profiles via chrome.storage.sync",
        ],
      },
    ],
  },
  {
    id: "privacy",
    eyebrow: "Privacy · performance",
    title: "Files stay on your device. Renderers stay fast.",
    blurb: "No server. No analytics. No remote code. Lazy-loaded grammars. Audit it yourself in DevTools.",
    groups: [
      {
        icon: Lock,
        title: "100% client-side",
        bullets: [
          "No outbound requests during normal use — verify in DevTools' Network tab",
          "No analytics, no telemetry, no crash reporting",
          "Manifest V3 strict CSP — no unsafe-eval, no remote code execution at runtime",
          "Every rendering library is bundled at build time and shipped with the extension",
          "Narrow host_permissions: file:///* only — broader access is opt-in via Options",
        ],
      },
      {
        icon: Zap,
        title: "Performance",
        bullets: [
          "Lazy-loaded shiki language grammars — only the languages your file uses",
          "Code-split Mermaid, KaTeX, db-schema-toolkit chunks",
          "IndexedDB-backed library — opens thousands of files without bog",
          "Direct-DOM injection on web URLs — no iframe overhead, no double-fetch",
          "Service worker stays asleep when nothing's happening",
        ],
      },
      {
        icon: Sparkles,
        title: "Open source · MIT",
        bullets: [
          "Source at github.com/thesatellite-ai/filemark — audit the manifest, the renderer, the request graph",
          "Every permission declared with a written justification on the listing",
          "Issues + PRs welcome",
        ],
      },
    ],
  },
];

function FeaturesPage(): React.ReactElement {
  return (
    <div className="bg-background text-foreground">
      <Hero />
      <FormatsStrip />
      <TOC />
      {FORMAT_FEATURES.map((f) => (
        <FeatureRow key={f.id} feature={f} />
      ))}
      {CATEGORIES.map((c) => (
        <Category key={c.id} category={c} />
      ))}
      <CTA />
    </div>
  );
}

function Hero(): React.ReactElement {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Features
        </p>
        <h1 className="mt-4 max-w-3xl text-balance text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[56px]">
          Every file Chrome should already open — beautifully.
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
          Nine formats. Real renderers. Zero upload. Everything below works on
          local files and remote URLs — same UI, same shortcuts, same speed.
        </p>
      </div>
    </section>
  );
}

function FormatsStrip(): React.ReactElement {
  const formats = [
    ".md",
    ".mdx",
    ".json",
    ".jsonc",
    ".csv",
    ".tsv",
    ".sql",
    ".prisma",
    ".dbml",
  ];
  return (
    <section className="border-b border-border bg-foreground/[0.015]">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {formats.map((f) => (
            <span
              key={f}
              className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[13px] text-foreground/80"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function TOC(): React.ReactElement {
  const sections = [
    ...FORMAT_FEATURES.map((f) => ({ id: f.id, label: f.eyebrow })),
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.eyebrow })),
  ];
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-[12px] text-foreground/70 hover:bg-muted hover:text-foreground"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ feature }: { feature: Feature }): React.ReactElement {
  const Icon = feature.icon;
  return (
    <section id={feature.id} className="border-b border-border scroll-mt-16">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:gap-16 lg:grid-cols-2">
          <div className={feature.flipped ? "lg:order-2" : ""}>
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-foreground/[0.06] text-foreground">
                <Icon size={16} strokeWidth={1.7} />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {feature.eyebrow}
              </p>
            </div>
            <h2 className="mt-4 max-w-xl text-balance text-[28px] font-semibold leading-[1.15] tracking-tight sm:text-[34px]">
              {feature.title}
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
              {feature.body}
            </p>
            <ul className="mt-6 space-y-2.5">
              {feature.bullets.map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-2.5 text-[14px] text-foreground/85"
                >
                  <Check
                    size={16}
                    strokeWidth={2}
                    className="mt-0.5 shrink-0 text-foreground/60"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            {feature.demoId && (
              <Link
                to="/demo/gallery/$exampleId"
                params={{ exampleId: feature.demoId }}
                className="mt-7 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-foreground hover:underline"
              >
                {feature.demoLabel ?? "Try it live"}
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
          <div className={feature.flipped ? "lg:order-1" : ""}>
            {feature.image ? (
              <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
                <img
                  src={asset(feature.image)}
                  alt={feature.imageAlt ?? feature.title}
                  className="block h-auto w-full"
                  loading="lazy"
                  width={1280}
                  height={800}
                />
              </div>
            ) : (
              <div className="grid aspect-[16/10] place-items-center rounded-xl border border-dashed border-border bg-foreground/[0.02] text-muted-foreground">
                <ImageIcon size={20} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Category({
  category,
}: {
  category: (typeof CATEGORIES)[number];
}): React.ReactElement {
  return (
    <section id={category.id} className="border-b border-border scroll-mt-16">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {category.eyebrow}
          </p>
          <h2 className="mt-3 text-balance text-[28px] font-semibold leading-[1.1] tracking-tight sm:text-[36px]">
            {category.title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
            {category.blurb}
          </p>
        </div>

        <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {category.groups.map((g) => (
            <div key={g.title} className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="grid size-8 place-items-center rounded-lg bg-foreground/[0.04] text-foreground">
                  <g.icon size={16} strokeWidth={1.7} />
                </div>
                <h3 className="text-[16px] font-semibold tracking-tight">
                  {g.title}
                </h3>
              </div>
              <ul className="mt-4 space-y-2">
                {g.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-foreground/80"
                  >
                    <Check
                      size={14}
                      strokeWidth={2}
                      className="mt-1 shrink-0 text-foreground/45"
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA(): React.ReactElement {
  return (
    <section className="bg-foreground text-background">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-background/60">
            Try it
          </p>
          <h2 className="mt-3 text-balance text-[32px] font-semibold leading-[1.05] tracking-tight sm:text-[44px]">
            See it in the browser. Install when it clicks.
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-background/70 sm:text-[16px]">
            The demo runs every renderer in the playground — same code as the
            extension. No install required, no account needed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/demo"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-background px-6 text-[14px] font-medium text-foreground transition-opacity hover:opacity-90"
            >
              Open the demo
              <ArrowRight size={14} />
            </Link>
            <a
              href="https://chromewebstore.google.com/detail/filemark/cidgogmffaflfghnebkfjbccfgbdjicm"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-background/30 px-6 text-[14px] font-medium text-background hover:border-background/60"
            >
              Add to Chrome
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
