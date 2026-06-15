import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://khanakia.com/apps/filemark";

export const Route = createFileRoute("/changelog")({
  head: () => {
    const title = "Changelog — Filemark";
    const desc =
      "Every Filemark release, what changed, and why. Markdown viewer, JSON viewer, schema viewer, datagrid, kanban, and inject mode — all version-by-version.";
    const url = `${SITE}/changelog`;
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
    };
  },
  component: Changelog,
});

interface Release {
  version: string;
  date: string;
  tag?: string;
  notes: string[];
}

// Seeded from the commit history of github.com/thesatellite-ai/filemark.
// Update this array on every release; the long-term plan is to read
// from the repo's RELEASES.md (or GitHub API) at build time.
const RELEASES: Release[] = [
  {
    version: "0.1.0",
    date: "2026-05-25",
    tag: "first public build",
    notes: [
      "Public site at khanakia.com/apps/filemark/",
      "Chrome Web Store listing in review",
      "Schema viewer falls back to highlighted source when a file can't be parsed",
      "Desktop companion app (Electron) lands in apps/desktop on the repo",
    ],
  },
  {
    version: "0.0.19",
    date: "2026-05-08",
    notes: [
      "Reading mode (⇧F): hides sidebar + task panel, keeps top bar and tabs",
      "Per-slider reset on every theme control (size, line height, content width)",
      "Content-width slider range widened up to 2400px",
      "Code block: wrap/scroll toggle + icon toolbar buttons",
    ],
  },
  {
    version: "0.0.18",
    date: "2026-05-01",
    notes: [
      "Per-file scroll memory across reloads",
      "Output caches for shiki + mermaid keyed on file id",
      "Fix Define-glossary insertBefore crash via rehype plugin (no DOM mutation)",
      "Fix task-checkbox state cross-contamination on file switch",
    ],
  },
  {
    version: "0.0.16",
    date: "2026-04-24",
    notes: [
      "TopBar tooltips on every icon button",
      "TabStrip: hides native scrollbar, wheel-to-horizontal scroll",
      "Search palette: scoped search, @mention picker, persistence + focus",
      "Mermaid: sharper zoom, preserved across fullscreen, imperative pan",
    ],
  },
  {
    version: "0.0.14",
    date: "2026-04-16",
    notes: [
      "Layout-independent keyboard shortcuts + per-shortcut user remap",
      "Sidebar: rename folder with custom label",
      "Folder walker: blacklist noise dirs, not all dot-prefixed",
      "Share to playground — gzip URL encoding for large docs",
    ],
  },
  {
    version: "0.0.10",
    date: "2026-03-20",
    notes: [
      "Mobile responsive — playground + extension + TOC + tabs + Open Folder",
      "Resizable sidebar + truncate-with-ellipsis + per-row copy menu",
      "Pick up file changes after edit-and-save (loose handles + focus reread)",
      "Drag-to-reorder open tabs",
    ],
  },
];

function Changelog(): React.ReactElement {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Release notes
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Changelog
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          What shipped in each version. Full commit history lives on{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark/commits/main"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            GitHub
          </a>
          .
        </p>
      </div>

      <div className="space-y-12">
        {RELEASES.map((r) => (
          <section key={r.version}>
            <div className="mb-3 flex items-baseline gap-3">
              <h2 className="font-mono text-lg font-semibold">v{r.version}</h2>
              <time className="text-xs tabular-nums text-muted-foreground">
                {r.date}
              </time>
              {r.tag && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.tag}
                </span>
              )}
            </div>
            <ul className="space-y-2 border-l border-border pl-4 text-[14px] leading-relaxed text-foreground/90">
              {r.notes.map((n, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[18px] top-2 size-1.5 rounded-full bg-muted-foreground/60" />
                  {n}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
