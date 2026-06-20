import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Check,
  FileCode2,
  Sparkles,
  Terminal,
} from "lucide-react";
import { pageScripts } from "../lib/schema";

const SITE = "https://khanakia.com/apps/filemark";
const SKILL_URL =
  "https://github.com/thesatellite-ai/filemark/blob/main/skills/filemark/SKILL.md";
const SKILL_RAW =
  "https://raw.githubusercontent.com/thesatellite-ai/filemark/main/skills/filemark/SKILL.md";

export const Route = createFileRoute("/ai")({
  head: () => {
    const title = "AI skill — teach your coding agent Filemark | Filemark";
    const desc =
      "Filemark ships an AI skill: one Markdown file that teaches Claude Code, Cursor, Codex, or any SKILL.md-aware agent how to author Filemark-rendered docs — every component, the task DSL, the filter grammar, and the HTML-in-markdown gotchas. Install with one command.";
    const url = `${SITE}/ai`;
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
          { name: "AI skill", url },
        ],
      }),
    };
  },
  component: AIPage,
});

const COMPONENTS = [
  "Callout / Tabs / Details",
  "Stats / ADR / DocBlock",
  "Datagrid (CSV with type hints)",
  "Chart (bar / line / pie / area …)",
  "Kanban from markdown tasks",
  "Mindmap / Timeline / Roadmap",
  "ER diagrams (SQL / Prisma / DBML)",
  "TaskList / TaskStats / TaskTimeline",
  "30+ rich-doc components",
];

function AIPage(): React.ReactElement {
  return (
    <main className="bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-20 text-center sm:py-28">
          <div className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <Sparkles size={13} aria-hidden />
            AI skill
          </div>
          <h1 className="mx-auto max-w-3xl text-balance text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[56px]">
            Teach your AI to write Filemark docs
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground">
            Filemark ships a single Markdown{" "}
            <span className="text-foreground">skill file</span> that teaches
            Claude Code, Cursor, Codex — any{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-[0.85em]">
              SKILL.md
            </code>
            -aware agent — every component, the task DSL, the filter grammar, and
            the HTML-in-markdown gotchas that normally take a debugging session
            to discover.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a
              href={SKILL_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <FileCode2 size={15} aria-hidden />
              View the skill on GitHub
            </a>
            <Link
              to="/demo"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm hover:bg-muted"
            >
              See every component live
              <ArrowRight size={14} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Install */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Terminal size={14} aria-hidden />
            Install
          </div>
          <h2 className="mt-3 text-balance text-[28px] font-semibold tracking-tight sm:text-[34px]">
            One command, any project
          </h2>
          <p className="mt-3 text-muted-foreground">
            From the root of the project you want the skill available in:
          </p>
          <CodeBlock>npx skills add thesatellite-ai/filemark</CodeBlock>

          <p className="mt-8 text-muted-foreground">
            Or pull the file directly — global Claude Code skill:
          </p>
          <CodeBlock>{`mkdir -p ~/.claude/skills/filemark
curl -sL ${SKILL_RAW} \\
  -o ~/.claude/skills/filemark/SKILL.md`}</CodeBlock>

          <p className="mt-8 text-muted-foreground">…or per-project:</p>
          <CodeBlock>{`mkdir -p .claude/skills/filemark
curl -sL ${SKILL_RAW} \\
  -o .claude/skills/filemark/SKILL.md`}</CodeBlock>

          <div className="mt-8 flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <Bot size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">
                Auto-loads on demand.
              </span>{" "}
              Once installed, the skill activates the moment your agent edits a{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
                .md
              </code>{" "}
              /{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
                .mdx
              </code>{" "}
              file meant for Filemark — no manual invocation.
            </p>
          </div>
        </div>
      </section>

      {/* What it teaches */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <h2 className="text-balance text-[28px] font-semibold tracking-tight sm:text-[34px]">
            What the skill covers
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The grammar for every interactive component, plus the markdown-native
            task system and the parser rules that prevent silent breakage.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMPONENTS.map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 rounded-lg border border-border bg-background p-3 text-sm"
              >
                <Check
                  size={16}
                  className="mt-0.5 shrink-0 text-primary"
                  aria-hidden
                />
                {c}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Every component above has a worked example in the{" "}
            <Link to="/demo" className="text-foreground underline">
              live gallery
            </Link>
            {" "}— which doubles as the component reference.
          </p>
        </div>
      </section>
    </main>
  );
}

/** Monospace command block — matches the dark code panels used elsewhere. */
function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-foreground p-4 text-[13px] leading-relaxed text-background">
      <code>{children}</code>
    </pre>
  );
}
