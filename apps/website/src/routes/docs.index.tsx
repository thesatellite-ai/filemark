import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsHeader } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/")({
  head: () =>
    docsHead(
      "",
      "Filemark documentation",
      "How Filemark works — file viewers, local & remote rendering, revision mode, AI review notes, and more.",
    ),
  component: DocsIndex,
});

const SECTIONS = [
  {
    to: "/docs/getting-started",
    title: "Getting started",
    body: "Install, open your first file, and the two optional permissions that unlock local + remote rendering.",
  },
  {
    to: "/docs/viewers",
    title: "File viewers",
    body: "Markdown/MDX, JSON, CSV/TSV, and SQL/Prisma/DBML schemas — each with a real interactive renderer.",
  },
  {
    to: "/docs/markdown",
    title: "Markdown & components",
    body: "GFM plus the full interactive component grammar — callouts, tabs, charts, mermaid, math, and more.",
  },
  {
    to: "/docs/library",
    title: "Library & navigation",
    body: "Sidebar, folders, recents, web docs, tabs, full-text search, table of contents.",
  },
  {
    to: "/docs/tasks",
    title: "Tasks",
    body: "Markdown-native tasks with priorities and due dates, the cross-file task panel, and kanban boards.",
  },
  {
    to: "/docs/revisions",
    title: "Revision mode",
    body: "Cache a doc as it changes and review only what an AI edited — with a side-by-side or reading diff.",
  },
  {
    to: "/docs/notes",
    title: "AI review notes",
    body: "Highlight text, attach an instruction, and copy every note as plain text to paste back to your AI.",
  },
  {
    to: "/docs/reading",
    title: "Reading & themes",
    body: "Reading mode, light/dark/sepia, fonts, and content width — and how your preferences persist.",
  },
  {
    to: "/docs/local-remote",
    title: "Local & remote files",
    body: "How file:// interception and remote URL rendering work, and the permissions each needs.",
  },
  {
    to: "/docs/settings",
    title: "Settings & permissions",
    body: "The options page: file formats, remote URLs, site rules, JSON viewer, shortcuts, and privacy.",
  },
  {
    to: "/docs/shortcuts",
    title: "Keyboard shortcuts",
    body: "Every shortcut, how to remap them, and why they work on any keyboard layout.",
  },
  {
    to: "/docs/troubleshooting",
    title: "Troubleshooting",
    body: "Blank viewers, permissions, sandboxed pages, and other gotchas — with fixes.",
  },
];

function DocsIndex(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Documentation"
        title="Filemark documentation"
        intro="Filemark turns Chrome into a real viewer for the files you actually read — Markdown, JSON, CSV, and database schemas — 100% in your browser, no uploads. These pages explain every feature and how it works."
      />

      <p>
        New here? Start with{" "}
        <Link to="/docs/getting-started">Getting started</Link>. Otherwise jump
        straight to a feature:
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="group rounded-lg border border-border bg-card p-4 no-underline transition-colors hover:border-foreground/20 hover:bg-muted/40"
          >
            <div className="font-semibold text-foreground group-hover:text-foreground">
              {s.title}
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">{s.body}</p>
          </Link>
        ))}
      </div>

      <h2>Need help?</h2>
      <ul>
        <li>
          Found a bug or have a request?{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark/issues"
            target="_blank"
            rel="noreferrer"
          >
            Open an issue on GitHub
          </a>
          .
        </li>
        <li>
          Browse the source at{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
          >
            github.com/thesatellite-ai/filemark
          </a>
          .
        </li>
        <li>
          See what changed in each release on the{" "}
          <Link to="/changelog">changelog</Link>.
        </li>
      </ul>
    </article>
  );
}
