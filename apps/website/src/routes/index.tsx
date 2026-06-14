import { createFileRoute } from "@tanstack/react-router";
import {
  FileText,
  Database,
  Braces,
  Table2,
  KanbanSquare,
  BarChart3,
  Search,
  Palette,
  Lock,
  Zap,
  FolderOpen,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

const FORMATS = [
  { ext: "md", label: "Markdown" },
  { ext: "mdx", label: "MDX" },
  { ext: "json", label: "JSON" },
  { ext: "jsonc", label: "JSONC" },
  { ext: "csv", label: "CSV" },
  { ext: "tsv", label: "TSV" },
  { ext: "sql", label: "SQL" },
  { ext: "prisma", label: "Prisma" },
  { ext: "dbml", label: "DBML" },
];

const FEATURES = [
  {
    icon: FileText,
    title: "Real markdown + MDX",
    body: "Full GFM (tables, task lists, footnotes), KaTeX math, Mermaid diagrams, shiki code highlighting — plus inline components: callouts, tabs, ADRs, DocBlocks.",
  },
  {
    icon: Database,
    title: "SQL / Prisma / DBML → ER diagram",
    body: "Open a .sql, .prisma, or .dbml file and get an interactive entity-relationship diagram. Parse errors fall back to highlighted source.",
  },
  {
    icon: Braces,
    title: "JSON / JSONC viewer",
    body: "Collapsible tree, nine themes (githubDark/Light, nord, vscode, monokai, gruvbox, …), copy-to-clipboard, parse-error pinpoints.",
  },
  {
    icon: Table2,
    title: "Interactive CSV / TSV datagrid",
    body: "Sortable, filterable, resizable. Type hints (status / tags / rating / currency / date) via fence meta. Exports to CSV, MD or JSON.",
  },
  {
    icon: KanbanSquare,
    title: "Kanban from markdown tasks",
    body: '"- [ ] task @alice !p0 ~2026-05-10 (launch)" → drop a <Kanban md group-by="status"/> and get a board, no separate file.',
  },
  {
    icon: BarChart3,
    title: "Charts from CSV",
    body: "Bar / line / pie / area / scatter / funnel / radar — fence a CSV with type-lang + meta and it renders inline with reference lines and palettes.",
  },
  {
    icon: Search,
    title: "Full-text search across files",
    body: "⌘K palette indexes every file in your folder. Scope by folder with @mention, highlights matches, persists across reloads.",
  },
  {
    icon: Palette,
    title: "Three themes + typography controls",
    body: "Light / dark / sepia, with font family (sans/serif/mono), size, line-height and content-width sliders — each individually resettable.",
  },
  {
    icon: Lock,
    title: "100% client-side",
    body: "No server, no telemetry, no analytics, no remote code execution. Your files are read locally and never leave your browser.",
  },
  {
    icon: Zap,
    title: "Fast on big folders",
    body: "Lazy shiki loading, code-split language grammars, IndexedDB-backed persistence. Opens hundreds of files without bog.",
  },
  {
    icon: FolderOpen,
    title: "Drag a folder, become a project",
    body: "Recursive walk skips noise dirs (node_modules, .git, dist). File-tree sidebar, draggable tabs, per-file scroll memory.",
  },
  {
    icon: Eye,
    title: "Open Folder + file:// auto-render",
    body: "Visit file:///path/to/notes.md → Filemark intercepts and renders. Or pick a folder from the toolbar. Both keep working across reloads.",
  },
];

function Home(): React.ReactElement {
  return (
    <main>
      <Hero />
      <Formats />
      <Features />
      <Install />
    </main>
  );
}

function Hero(): React.ReactElement {
  return (
    <section className="border-b border-border bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
        <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Free · open source · 100% client-side
        </div>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          The Chrome extension every markdown viewer should have been.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">
          Open <code className="rounded bg-muted px-1.5 py-0.5 text-sm">.md</code>,
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-sm">.mdx</code>,
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-sm">.json</code>,
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-sm">.csv</code>,
          <code className="ml-1 rounded bg-muted px-1.5 py-0.5 text-sm">.sql</code>{" "}
          and more in Chrome with real renderers — tables, callouts, kanban from
          your task bullets, ER diagrams, search across folders. Entirely in your
          browser.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#install"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Install for Chrome
          </a>
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-5 text-sm hover:bg-muted"
          >
            Star on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

function Formats(): React.ReactElement {
  return (
    <section className="border-b border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 px-4 py-8 sm:px-6">
        {FORMATS.map((f) => (
          <span
            key={f.ext}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs"
          >
            <span className="font-mono text-muted-foreground">.{f.ext}</span>
            <span className="text-muted-foreground/70">·</span>
            <span>{f.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function Features(): React.ReactElement {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Everything other markdown extensions skip
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Twelve features that turn local files into a workspace, not just a preview.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/30"
            >
              <div className="mb-3 grid size-8 place-items-center rounded-md bg-muted text-foreground">
                <f.icon size={16} />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Install(): React.ReactElement {
  return (
    <section id="install" className="bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <h2 className="text-2xl font-semibold sm:text-3xl">Install</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Filemark is heading to the Chrome Web Store. Until it's live, load
          the unpacked extension in 30 seconds.
        </p>
        <ol className="mx-auto mt-8 max-w-md space-y-3 text-left text-sm">
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              1
            </span>
            <span>
              Clone or download{" "}
              <a
                href="https://github.com/thesatellite-ai/filemark"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                github.com/thesatellite-ai/filemark
              </a>
              , then run <code className="rounded bg-muted px-1.5 py-0.5">pnpm install && task build</code>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              2
            </span>
            <span>
              Visit <code className="rounded bg-muted px-1.5 py-0.5">chrome://extensions</code>,
              enable <em>Developer mode</em>, click <em>Load unpacked</em>, pick{" "}
              <code className="rounded bg-muted px-1.5 py-0.5">apps/chrome-ext/dist</code>.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              3
            </span>
            <span>
              On the extension's details page, toggle{" "}
              <em>Allow access to file URLs</em> so it can open local files.
            </span>
          </li>
        </ol>
        <div className="mt-10 inline-flex items-center gap-3 rounded-lg border border-dashed border-border bg-background px-5 py-3 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-amber-500" />
          Chrome Web Store listing coming soon — this page will switch to a one-click install.
        </div>
      </div>
    </section>
  );
}
