import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, RotateCcw } from "lucide-react";
import { ThemeProvider } from "@filemark/core";
import { MDXViewer } from "@filemark/mdx";

export const Route = createFileRoute("/demo")({
  component: Demo,
});

const SAMPLE = `# Welcome to Filemark

Edit this markdown on the left — the right side re-renders live, using the
exact same \`@filemark/mdx\` package that ships in the Chrome extension.

<Callout type="tip" title="No install needed">

Every component documented in the README works here too. Try editing the
\`<Stats>\` block below, the kanban, or the SQL fence.

</Callout>

## Stats

<Stats cols="3">
  <Stat title="File formats" value="9" description="md · mdx · json · csv · sql · …" />
  <Stat title="Themes" value="3" description="light · dark · sepia" />
  <Stat title="Telemetry" value="0" intent="success" description="100% client-side" />
</Stats>

## Tasks → Kanban

- [ ] Ship CWS listing @aman !p0 (launch) ~2026-06-15
- [/] Add interactive playground demo @aman !p1 (launch)
- [x] Build marketing site @aman =2026-05-25 (launch)
- [ ] Trademark check @aman !p2 (launch)
- [ ] Capture promo screenshots @aman !p1 (launch)

<Kanban md group-by="status" title="Launch board"></Kanban>

## Code highlighting

\`\`\`ts
import { MDXViewer } from "@filemark/mdx";

export function Demo({ content }: { content: string }) {
  return <MDXViewer content={content} file={{ id: "demo", name: "demo.md", ext: "md" }} />;
}
\`\`\`

## Schema (SQL → ER diagram)

\`\`\`sql
CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id        BIGSERIAL PRIMARY KEY,
  user_id   BIGINT NOT NULL REFERENCES users(id),
  title     TEXT NOT NULL,
  body      TEXT
);
\`\`\`

## Table

| File type | Renderer | Notes |
| --- | --- | --- |
| \`.md\` / \`.mdx\` | @filemark/mdx | GFM + every component above |
| \`.json\` / \`.jsonc\` | @filemark/json | Collapsible tree, 9 themes |
| \`.csv\` / \`.tsv\` | @filemark/csv | Sortable, filterable datagrid |
| \`.sql\` / \`.prisma\` / \`.dbml\` | @filemark/schema | Interactive ER diagram |
`;

const FILE = { id: "demo:playground", name: "demo.md", ext: "md" } as const;

function Demo(): React.ReactElement {
  const [content, setContent] = useState(SAMPLE);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Live demo
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Filemark playground
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Same{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              @filemark/mdx
            </code>{" "}
            renderer as the Chrome extension — type on the left, see it render
            on the right.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setContent(SAMPLE)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted"
            title="Reset to sample"
          >
            <RotateCcw size={13} />
            Reset
          </button>
          <a
            href="https://github.com/thesatellite-ai/filemark/tree/main/examples"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs hover:bg-muted"
          >
            More examples
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Source · demo.md
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            className="min-h-[70vh] flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none"
          />
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Rendered
          </div>
          <div className="max-h-[70vh] overflow-auto px-6 py-6">
            {/* ThemeProvider required: MDXViewer's internals use useTheme
                (strict) for some components, not useThemeOptional. Same
                wrap pattern chrome-ext and apps/desktop use. */}
            <ThemeProvider>
              <MDXViewer content={content} file={FILE} />
            </ThemeProvider>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Want everything else (file library, tabs, search, schema diagrams,
        themes)?{" "}
        <a href="/" className="underline underline-offset-2">
          Install the extension
        </a>
        .
      </p>
    </main>
  );
}
