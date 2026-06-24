import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsHeader, Figure, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE, shot } from "../lib/docs";

export const Route = createFileRoute("/docs/viewers")({
  head: () =>
    docsHead(
      "viewers",
      "File viewers",
      "The file types Filemark renders — Markdown/MDX, JSON, CSV/TSV, and SQL/Prisma/DBML schemas — each with a real interactive renderer instead of plain text.",
      {
        image: shot("json.png"),
        faq: [
          {
            q: "What file types does Filemark open?",
            a: "Markdown (.md, .markdown), MDX (.mdx), JSON (.json), JSONC (.jsonc), CSV (.csv), TSV (.tsv), and database schemas — SQL (.sql), Prisma (.prisma) and DBML (.dbml).",
          },
          {
            q: "Does Filemark render JSON as a tree?",
            a: "Yes. JSON and JSONC open as an interactive collapsible tree with nine themes, per-node copy, type chips, and exact parse-error locations — not prettified text.",
          },
          {
            q: "Can I turn off a file type?",
            a: "Yes — disable any format on the options page and Chrome's default handling takes over for that extension (e.g. CSV downloads normally again).",
          },
        ],
      },
    ),
  component: Viewers,
});

function Viewers(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Viewers"
        title="File viewers"
        intro="Filemark picks a real renderer from the file extension. Each is interactive — sortable, collapsible, zoomable — not a static dump."
      />

      <h2 id="markdown">Markdown &amp; MDX — .md, .mdx, .markdown</h2>
      <p>
        Full GitHub-Flavored Markdown: tables, task lists, strikethrough,
        footnotes, autolinks, and emoji shortcodes (<code>:smile:</code> → 😄).
        Code blocks get real syntax highlighting (Shiki, 30+ languages,
        theme-matched), YAML frontmatter renders as a metadata card, and
        Mermaid diagrams and KaTeX math render inline. On top of GFM, Filemark
        adds a large library of interactive components — see{" "}
        <Link to="/docs/markdown">Markdown &amp; components</Link>.
      </p>
      <Figure
        src="hero.png"
        alt="Filemark rendering a Markdown document with headings, code, and a table of contents"
        caption="A Markdown document rendered in the Filemark app."
      />

      <h2 id="json">JSON &amp; JSONC — .json, .jsonc</h2>
      <p>
        An interactive collapsible tree instead of a wall of text: expand and
        collapse nodes, switch between nine color themes, see a type chip on
        every value, and copy any value or its full path in one click. Large
        files render collapsed by default; <code>.jsonc</code> allows comments
        and trailing commas. When a file won't parse, Filemark points to the
        exact line of the problem rather than failing silently.
      </p>
      <Figure
        src="json.png"
        alt="Filemark's interactive JSON tree viewer with collapsible nodes and type chips"
        caption="JSON opens as a collapsible, themeable tree."
      />
      <p>
        JSON viewer defaults (theme, collapse depth, string truncation, copy
        indent, type/size badges) are all configurable — see{" "}
        <Link to="/docs/settings">Settings</Link>.
      </p>

      <h2 id="csv">CSV &amp; TSV — .csv, .tsv</h2>
      <p>
        A sortable, filterable data grid like a spreadsheet: click a header to
        sort (Shift-click for a secondary sort), filter per column, resize and
        pin columns, switch density, go fullscreen, and export the selection to
        CSV, Markdown, or JSON. Columns are type-aware — status badges, tags,
        ratings, currency, percentages, dates, progress bars, and more. The
        delimiter is auto-detected.
      </p>
      <Figure
        src="datagrid.png"
        alt="Filemark's interactive CSV data grid with sortable, type-aware columns"
        caption="CSV/TSV open as an interactive, type-aware data grid."
      />
      <Note tone="info" title="CSV on file:// is intercepted">
        Chrome would normally download a <code>.csv</code>. Filemark intercepts
        it so it opens as a grid in place. Disable the CSV format in Settings to
        get the default download behavior back.
      </Note>

      <h2 id="schemas">Database schemas — .sql, .prisma, .dbml</h2>
      <p>
        An interactive entity-relationship diagram straight from your schema.
        Drag tables around the canvas, zoom and pan, use the mini-map on large
        schemas, and jump to a table by name. SQL covers PostgreSQL, MySQL,
        SQLite, ClickHouse, and more; Prisma and DBML render the same canvas. If
        a file can't be parsed into a diagram, it falls back to highlighted
        source so you still see something useful.
      </p>
      <Figure
        src="schema.png"
        alt="Filemark rendering a SQL schema as an interactive entity-relationship diagram"
        caption="SQL, Prisma, and DBML render as an interactive ER diagram."
      />

      <h2 id="raw">Raw source view</h2>
      <p>
        Every file has a raw view — press <kbd>R</kbd> (or use the file actions)
        to flip between the rendered output and syntax-highlighted source, with a
        soft-wrap toggle and one-click copy.
      </p>

      <h2 id="turning-off">Turning a format off</h2>
      <p>
        Don't want Filemark handling a given type? Disable it on the{" "}
        <Link to="/docs/settings">options page</Link> and Chrome's default
        behavior returns for that extension.
      </p>

      <NextPrev
        prev={{ to: "/docs/getting-started", label: "Getting started" }}
        next={{ to: "/docs/markdown", label: "Markdown & components" }}
      />
    </article>
  );
}
