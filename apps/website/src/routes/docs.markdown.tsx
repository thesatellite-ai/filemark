import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsHeader, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/markdown")({
  head: () =>
    docsHead(
      "markdown",
      "Markdown & components",
      "Filemark renders full GitHub-Flavored Markdown plus an interactive component grammar — callouts, tabs, charts, kanban, mermaid, math, planning templates and more.",
      {
        faq: [
          {
            q: "Does Filemark support GitHub-Flavored Markdown?",
            a: "Yes — tables, task lists, strikethrough, autolinks, footnotes, and emoji shortcodes, plus syntax-highlighted code, Mermaid diagrams, and KaTeX math.",
          },
          {
            q: "Can I add charts and kanban boards to a markdown file?",
            a: "Yes. Filemark renders interactive components from fenced blocks and HTML-style tags — charts, kanban, datagrids, callouts, tabs, timelines, and more — with no build step or JavaScript evaluation.",
          },
        ],
      },
    ),
  component: Markdown,
});

const COMPONENTS: { group: string; items: string[] }[] = [
  {
    group: "Structure & callouts",
    items: [
      "Callout (note / tip / info / warning / danger)",
      "Tabs + Tab",
      "Details (collapsible)",
      "Steps + Step",
      "Cards + DocCard",
    ],
  },
  {
    group: "Data & charts",
    items: [
      "Datagrid (from CSV/TSV fences or src=)",
      "Chart (bar / line / pie / area / scatter / funnel / radar)",
      "Kanban board",
      "Stats / KPI tiles",
      "Heatmap, Sparkline, Gauge, Treemap",
    ],
  },
  {
    group: "Diagrams & math",
    items: [
      "Mermaid (flowchart, sequence, ER, gantt, …)",
      "Mindmap (markmap)",
      "KaTeX math — $inline$ and $$block$$",
      "Schema / ER diagrams (sql / prisma / dbml)",
      "FileTree",
    ],
  },
  {
    group: "Planning & decisions",
    items: [
      "DocBlock (rfc / prfaq / pitch / postmortem / meeting / daily)",
      "ADR (architecture decision record)",
      "Roadmap, Timeline, OKRtree",
      "WeightedScore, Matrix2x2, DecisionTree, FiveWhys",
      "DocStatus, ReadingTime, Backlinks",
    ],
  },
];

function Markdown(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Authoring"
        title="Markdown & components"
        intro="Beyond standard markdown, Filemark renders a rich set of interactive components — so a plain .md file can hold charts, boards, diagrams, and planning docs."
      />

      <h2>GitHub-Flavored Markdown</h2>
      <p>
        Everything you expect: headings, <strong>bold</strong>/<em>italic</em>,
        links, images, tables, ordered/unordered lists, blockquotes,
        strikethrough, footnotes, and task list checkboxes that toggle and
        persist. Code blocks are syntax-highlighted with Shiki across 30+
        languages, theme-matched to your current theme. Emoji shortcodes like{" "}
        <code>:rocket:</code> render too.
      </p>

      <h2>Diagrams &amp; math</h2>
      <p>
        Fenced <code>```mermaid</code> blocks render as pan/zoom diagrams
        (flowchart, sequence, class, state, ER, gantt, mindmap, and more).{" "}
        <code>```mindmap</code> renders an interactive markmap. Math uses KaTeX —{" "}
        block math with <code>$$…$$</code> (and a <code>```math</code> fence).
      </p>
      <Note tone="info" title="Currency vs. math">
        A lone <code>$</code> is treated as plain text (so “$150k” renders
        normally) — use <code>$$…$$</code> for inline/block math.
      </Note>

      <h2>The component library</h2>
      <p>
        These render from fenced code blocks (e.g. <code>```chart</code>,{" "}
        <code>```kanban</code>) or HTML-style tags (e.g.{" "}
        <code>&lt;Callout&gt;</code>) — no build step, and nothing is evaluated
        as JavaScript (Manifest V3 forbids it). A non-exhaustive map:
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {COMPONENTS.map((c) => (
          <div key={c.group} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 text-sm font-semibold text-foreground">
              {c.group}
            </div>
            <ul className="!my-0 space-y-1 text-[13px] text-muted-foreground">
              {c.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2>Tasks in markdown</h2>
      <p>
        Task bullets with sigils (priority, owner, due date, project) power
        filterable lists, stats, and timelines — and feed the cross-file task
        panel. See <Link to="/docs/tasks">Tasks</Link>.
      </p>

      <h2>How to write them</h2>
      <p>
        The exact grammar for every component — the attributes, the fence
        syntax, and the two HTML-in-markdown rules — is taught by the Filemark{" "}
        <Link to="/ai">AI skill</Link>, so your AI assistant authors them
        correctly. You can also explore live examples in the{" "}
        <Link to="/demo">playground</Link>.
      </p>

      <NextPrev
        prev={{ to: "/docs/viewers", label: "File viewers" }}
        next={{ to: "/docs/library", label: "Library & navigation" }}
      />
    </article>
  );
}
