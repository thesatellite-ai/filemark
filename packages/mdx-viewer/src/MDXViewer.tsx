import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { parse as parseYaml } from "yaml";
import type { ViewerProps } from "@filemark/core";

import { Callout } from "./components/Callout";
import { Tabs, Tab } from "./components/Tabs";
import { Details } from "./components/Details";
import { Stats, Stat } from "./components/Stats";
import { ADR } from "./components/ADR";
import { DocStatus } from "./components/DocStatus";
import { Backlinks } from "./components/Backlinks";
import { MindMap } from "./components/MindMap";
import { OKRtree, Objective, KR } from "./components/OKRtree";
import { DocBlock } from "./components/DocBlock";
import {
  WeightedScore,
  Criterion,
  Option as WSOption,
} from "./components/WeightedScore";
import { Matrix2x2, Item as MatrixItem } from "./components/Matrix2x2";
import { Timeline, Event as TimelineEvent } from "./components/Timeline";
import { ReadingTime } from "./components/ReadingTime";
import { FiveWhys, Why } from "./components/FiveWhys";
import { Roadmap, Lane } from "./components/Roadmap";
import { DecisionTree, Branch } from "./components/DecisionTree";
import { Steps, Step } from "./components/Steps";
import { Badge } from "./components/Badge";
import { LastUpdated, EditThisPage } from "./components/DocMeta";
import { VideoEmbed } from "./components/VideoEmbed";
import { Cards, DocCard } from "./components/Cards";
import { Diff } from "./components/Diff";
import { APIEndpoint } from "./components/APIEndpoint";
import { Define } from "./components/Glossary";
import { rehypeGlossary, extractGlossaryTerms } from "./rehypeGlossary";
import { Heatmap } from "./components/Heatmap";
import { AnnotatedImage, Hotspot } from "./components/AnnotatedImage";
import { PullQuote, Testimonials } from "./components/Quote";
import { Sparkline } from "./components/Sparkline";
import { Footnote } from "./components/Footnote";
import { PRCard, IssueCard, CommitCard } from "./components/GitHubCards";
import { FileTree } from "./components/FileTree";
import { EnvVarsTable, Env } from "./components/EnvVarsTable";
import { Lightbox } from "./components/Lightbox";
import { Carousel, Slide } from "./components/Carousel";
import { Gauge } from "./components/Gauge";
import { Treemap } from "./components/Treemap";
import { Quiz, Choice } from "./components/Quiz";
import { Poll, PollOption } from "./components/Poll";
import {
  AISummary,
  CalloutWithAction,
  AuthorCard,
  PackageBadge,
} from "./components/MiscRich";
import { MDXTable } from "./components/MDXTable";
import { TaskItem } from "./components/TaskItem";
import { TaskList } from "./components/TaskList";
import { TaskStats } from "./components/TaskStats";
import { TaskTimeline } from "./components/TaskTimeline";
import { KanbanFromTasks } from "./components/KanbanFromTasks";
import { extractTasks, TasksProvider } from "@filemark/tasks";
import { MDXComponentsProvider } from "./components-context";
import { CodeBlock } from "./CodeBlock";
import { TaskCheckbox } from "./TaskCheckbox";
import { SmartLink } from "./SmartLink";
import { SmartImage } from "./SmartImage";
import { Frontmatter } from "./Frontmatter";
import { Mermaid } from "./Mermaid";
import { SchemaBlock } from "./SchemaBlock";
import { DataBlock } from "./DataBlock";
import { remarkCodeMeta } from "./remark-code-meta";
import {
  parseInfoString,
  type DataGridOptions,
} from "@filemark/datagrid";
import {
  ChartBlock,
  attrsToChartOptions,
  parseChartInfoString,
  type ChartType,
} from "@filemark/chart";
import {
  KanbanBlock,
  attrsToKanbanOptions,
  parseKanbanInfoString,
} from "@filemark/kanban";

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export function MDXViewer(props: ViewerProps) {
  const { content, file, storage, assets, onNavigate } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeTocId, setActiveTocId] = useState<string | null>(null);

  // Frontmatter extraction. Browser-friendly: match `---\n…\n---\n` at the
  // very start, parse the YAML body with the `yaml` package (pure JS), and
  // strip from the body. Falls back to the unchanged content on any failure.
  const { frontData, body } = useMemo(
    () => extractFrontmatter(content),
    [content]
  );

  // Task parse — one pass per file render, memoized by (body, file.path).
  // The result is provided via TasksProvider so every downstream component
  // (enhanced <li> TaskItem, future <TaskList>, <Kanban md>, <TaskStats md>)
  // reads the same array without re-parsing. See docsi/TASKS_PLAN.md §8.
  //
  // Defaults cascade: extractTasks itself reads frontmatter default-owner /
  // default-priority / project / area. Host-level defaults can be passed
  // here if filemark ever wants a global owner/project, but none exist yet.
  const tasks = useMemo(
    () => extractTasks(body, { file: file.path }),
    [body, file.path]
  );

  const glossaryTerms = useMemo(() => extractGlossaryTerms(body), [body]);

  const components = useMemo(
    () =>
      ({
        // Built-in MDX-style components (via HTML tags thanks to rehype-raw)
        callout: Callout,
        tabs: Tabs,
        tab: Tab,
        details: Details,
        stats: Stats,
        stat: Stat,
        adr: ADR,
        docstatus: DocStatus,
        backlinks: Backlinks,
        mindmap: MindMap,
        okrtree: OKRtree,
        objective: Objective,
        kr: KR,
        docblock: DocBlock,
        weightedscore: WeightedScore,
        criterion: Criterion,
        option: WSOption,
        matrix2x2: Matrix2x2,
        item: MatrixItem,
        timeline: Timeline,
        event: TimelineEvent,
        readingtime: ReadingTime,
        fivewhys: FiveWhys,
        why: Why,
        roadmap: Roadmap,
        lane: Lane,
        decisiontree: DecisionTree,
        branch: Branch,
        steps: Steps,
        step: Step,
        badge: Badge,
        lastupdated: LastUpdated,
        editthispage: EditThisPage,
        videoembed: VideoEmbed,
        cards: Cards,
        doccard: DocCard,
        diff: Diff,
        apiendpoint: APIEndpoint,
        define: Define,
        heatmap: Heatmap,
        annotatedimage: AnnotatedImage,
        hotspot: Hotspot,
        pullquote: PullQuote,
        testimonials: Testimonials,
        sparkline: Sparkline,
        footnote: Footnote,
        prcard: PRCard,
        issuecard: IssueCard,
        commitcard: CommitCard,
        filetree: FileTree,
        envvarstable: EnvVarsTable,
        env: Env,
        lightbox: Lightbox,
        carousel: Carousel,
        slide: Slide,
        gauge: Gauge,
        treemap: Treemap,
        quiz: Quiz,
        choice: Choice,
        poll: Poll,
        polloption: PollOption,
        aisummary: AISummary,
        calloutwithaction: CalloutWithAction,
        authorcard: AuthorCard,
        packagebadge: PackageBadge,
        // <Chart src="./metrics.csv" type="bar" x="region" y="revenue" />
        // Mirrors <Datagrid> — src-based; inline data uses a ```chart fence.
        chart: (p: Record<string, unknown>) => {
          const options = attrsToChartOptions(p);
          if (!options.src) {
            return <ChartMissingSrc />;
          }
          return (
            <ChartBlock
              source=""
              options={options}
              defaultDelimiter={","}
              assets={assets}
            />
          );
        },
        // <Kanban src="./roadmap.csv" group-by="status" card-title="title" />
        // Src-based; inline data uses a ```kanban fence.
        //
        // SPECIAL MODE: <Kanban md group-by="status"/> — when the `md`
        // presence flag is set (with no `src`), render KanbanFromTasks
        // instead: board fed by TasksContext, no CSV needed. Same thesis
        // as TaskStats md — tasks from markdown become a board.
        kanban: (p: Record<string, unknown>) => {
          // Task-source mode: `md` is a presence flag (empty string
          // attribute in HTML becomes "" — both truthy-ish forms work).
          if ("md" in p || p["md"] !== undefined) {
            return <KanbanFromTasks {...p} />;
          }
          const options = attrsToKanbanOptions(p);
          if (!options.src) {
            return <KanbanMissingSrc />;
          }
          return (
            <KanbanBlock source="" options={options} assets={assets} />
          );
        },
        // <TaskList filter="…" group-by="status" sort="due:asc" limit="20"/>
        // Pure projection over TasksContext — no src; reads the current doc.
        tasklist: (p: Record<string, unknown>) => <TaskList {...p} />,
        // <TaskStats md filter="project=launch"/> — KPI tiles built on
        // <Stats> + <Stat>. `md` is a presence marker (future: `src=./x.md`).
        taskstats: (p: Record<string, unknown>) => <TaskStats {...p} />,
        // <TaskTimeline md lane="owner" from=… to=…/> — Gantt-lite SVG
        // bars on a date axis, grouped by lane. Reads TasksContext.
        tasktimeline: (p: Record<string, unknown>) => <TaskTimeline {...p} />,
        // <datagrid src="..." title="..." sort="..." meta="type:col=status(...)" />
        // Src-based only — for inline data, use a ```csv fenced block instead
        // (HTML attributes can't cleanly hold multi-line CSV).
        datagrid: (p: Record<string, unknown>) => {
          const options = attrsToOptions(p);
          if (!options.src) {
            return <DatagridMissingSrc />;
          }
          return (
            <DataBlock
              source=""
              options={options}
              lang="datagrid"
              assets={assets}
              storage={storage}
              storageKey={`${file.id}:datagrid-tag:${hashString(
                JSON.stringify(options),
              )}`}
            />
          );
        },

        // Code + interactive renderers. `node` is injected by react-markdown;
        // strip it so it doesn't leak onto the DOM. Multi-line content is
        // promoted to block rendering regardless of whether the author used a
        // fenced ```code``` block — backtick-wrapped prose that happens to
        // span lines should still preserve its newlines.
        //
        // `language-mermaid` is routed to the Mermaid renderer instead of
        // the Shiki-highlighted CodeBlock, so ```mermaid fences draw a
        // diagram. Mermaid is lazy-loaded inside that component.
        code: ({
          className,
          children,
          node: _node,
          ...rest
        }: {
          className?: string;
          children?: React.ReactNode;
          node?: unknown;
        } & React.HTMLAttributes<HTMLElement>) => {
          const raw = String(children ?? "");
          const langMatch = /language-([a-zA-Z0-9_+\-]+)/.exec(className ?? "");
          const lang = langMatch?.[1]?.toLowerCase();
          const meta = (rest as Record<string, unknown>)["data-meta"] as
            | string
            | undefined;
          if (lang === "mermaid") {
            return <Mermaid source={raw.replace(/\n$/, "")} />;
          }
          // MindMap — fenced ```mindmap with bullet-list outline. Meta
          // string can carry `height=560` (or `height=70vh`) plus a
          // free-form title — anything that isn't a `key=value` pair is
          // treated as the title.
          if (lang === "mindmap") {
            const { height: mmHeight, rest: mmTitle } = parseMindmapMeta(
              meta
            );
            return (
              <MindMap
                source={raw.replace(/\n$/, "")}
                title={mmTitle}
                height={mmHeight}
              />
            );
          }
          // Schema blocks — parse via db-schema-toolkit (lazy), render as
          // Mermaid ER diagram. `schema` auto-detects (SQL-ish); `prisma`
          // and `dbml` are explicit so the toolkit takes the right parser.
          if (lang === "schema" || lang === "prisma" || lang === "dbml") {
            return (
              <SchemaBlock
                source={raw.replace(/\n$/, "")}
                lang={lang as "schema" | "prisma" | "dbml"}
              />
            );
          }
          // Interactive datagrid for csv / tsv / datagrid fences.
          // Info-string after the lang (e.g. `filter=false sort=age:desc
          // src=./data.csv`) arrives via `data-meta` thanks to
          // `remarkCodeMeta`.
          if (lang === "csv" || lang === "tsv" || lang === "datagrid") {
            return (
              <DataBlock
                source={raw}
                options={parseInfoString(meta)}
                lang={lang}
                meta={meta}
                assets={assets}
                storage={storage}
                storageKey={`${file.id}:${lang}:${hashString(raw + (meta ?? ""))}`}
              />
            );
          }
          // Kanban board — ```kanban group-by=status ...
          if (lang === "kanban") {
            return (
              <KanbanBlock
                source={raw}
                options={parseKanbanInfoString(meta)}
                assets={assets}
              />
            );
          }
          // Interactive charts — ```chart / ```bar / ```line / ```pie /
          // ```area / ```scatter. Lang tag sets the default type; `type=`
          // in meta overrides. Mirrors the csv/tsv/datagrid branch.
          if (CHART_LANGS.has(lang ?? "")) {
            return (
              <ChartBlock
                source={raw}
                options={parseChartInfoString(meta, {
                  defaultType: lang as ChartType,
                })}
                defaultDelimiter={","}
                assets={assets}
              />
            );
          }
          const hasLangClass = !!langMatch;
          const isMultiline = raw.includes("\n");
          const isBlock = hasLangClass || isMultiline;
          return (
            <CodeBlock inline={!isBlock} className={className} {...rest}>
              {children}
            </CodeBlock>
          );
        },
        pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
        // MDXTable wraps every rendered markdown table with:
        //  1. A horizontal-scroll container so wide tables stay inside the
        //     body column and don't overlap the TOC.
        //  2. A hover-revealed "Download" menu with CSV / JSON / compact JSON
        //     exports computed from the rendered DOM.
        table: ({ node: _n, ...p }: React.TableHTMLAttributes<HTMLTableElement> & { node?: unknown }) => (
          <MDXTable {...p} />
        ),
        a: ({ node: _n, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) => (
          <SmartLink {...p} onNavigate={onNavigate} />
        ),
        img: ({ node: _n, ...p }: React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown }) => (
          <SmartImage {...p} assets={assets} />
        ),
        input: ({ node, ...p }: React.InputHTMLAttributes<HTMLInputElement> & {
          node?: { position?: { start?: { line?: number } } };
        }) => {
          if (p.type === "checkbox") {
            // Pull the source line from remark's hast node — it's a
            // file-local stable identifier. Replaces the old DOM-index
            // approach which leaked across files mounted in the same
            // tab session and silently corrupted state.
            const line = node?.position?.start?.line;
            return (
              <TaskCheckbox
                {...p}
                file={file}
                storage={storage}
                line={line}
              />
            );
          }
          return <input {...p} />;
        },
        // Custom <li> handler — upgrades task-list-items with metadata
        // chips pulled from @filemark/tasks via context. Regular <li>
        // elements fall through transparently (TaskItem self-detects).
        li: TaskItem,
      }) as never,
    [onNavigate, assets, storage, file]
  );

  useEffect(() => {
    if (!rootRef.current) return;
    const hs = Array.from(
      rootRef.current.querySelectorAll<HTMLHeadingElement>("h1,h2,h3,h4")
    );
    setToc(
      hs.map((h) => ({
        id: h.id || slugify(h.textContent ?? ""),
        text: h.textContent ?? "",
        depth: Number(h.tagName.slice(1)),
      }))
    );

    // If the page was loaded (or the file just changed) with a URL hash,
    // scroll the matching heading into view once the body is in the DOM.
    // Run in a microtask so the browser has painted the new headings.
    if (typeof location !== "undefined" && location.hash.length > 1) {
      const id = decodeURIComponent(location.hash.slice(1));
      queueMicrotask(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
      });
    }
  }, [body]);

  // Scroll-spy: highlight the TOC entry whose heading is currently nearest
  // the top of the viewport. The negative bottom margin shrinks the
  // intersection viewport so a heading is "active" only while it sits in
  // the upper third of the screen — otherwise the active row would jump
  // around mid-section. Re-observes whenever the body changes (new file).
  useEffect(() => {
    if (!rootRef.current) return;
    if (typeof IntersectionObserver === "undefined") return;
    const hs = Array.from(
      rootRef.current.querySelectorAll<HTMLHeadingElement>("h1,h2,h3,h4")
    );
    if (hs.length === 0) return;

    const visibleIds = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visibleIds.add(e.target.id);
          else visibleIds.delete(e.target.id);
        }
        // Pick the visible heading nearest the top of the doc — preserves
        // doc order when several headings overlap the active band.
        const ordered = hs.map((h) => h.id).filter((id) => visibleIds.has(id));
        if (ordered.length > 0) setActiveTocId(ordered[0]);
      },
      { rootMargin: "0px 0px -70% 0px", threshold: 0 }
    );
    for (const h of hs) if (h.id) observer.observe(h);
    return () => observer.disconnect();
  }, [body]);

  return (
    <div className="fv-mdx-root">
      <article ref={rootRef} className="fv-mdx-body">
        <Frontmatter data={frontData as Record<string, unknown>} />
        <MDXComponentsProvider value={components as never}>
          <TasksProvider value={tasks}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath, remarkBreaks, remarkCodeMeta]}
              rehypePlugins={[
                rehypeRaw,
                rehypeSlug,
                rehypeKatex,
                [rehypeGlossary, { terms: glossaryTerms }],
              ]}
              components={components}
            >
              {body}
            </ReactMarkdown>
          </TasksProvider>
        </MDXComponentsProvider>
      </article>
      {toc.length > 1 && (
        <nav className="fv-toc" aria-label="Table of contents">
          <div className="fv-toc-title">On this page</div>
          <ul>
            {toc.map((t, i) => (
              <li key={i} data-depth={t.depth}>
                <a
                  href={`#${t.id}`}
                  aria-current={t.id === activeTocId ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(t.id);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    // Mirror the heading into the URL hash so the whole
                    // view is copy-paste shareable, without adding a
                    // history entry for every click.
                    if (typeof history !== "undefined") {
                      history.replaceState(null, "", `#${t.id}`);
                    }
                  }}
                >
                  {t.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

// FNV-1a — small stable hash so datagrid storage keys stay the same
// across re-renders but differ between blocks within one document.
function hashString(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return undefined;
}

function bool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = String(v).toLowerCase();
  if (s === "true" || s === "yes" || s === "on" || s === "1") return true;
  if (s === "false" || s === "no" || s === "off" || s === "0") return false;
  return undefined;
}

function num(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function list(v: unknown): string[] | undefined {
  const s = str(v);
  if (!s) return undefined;
  const items = s.split(",").map((x) => x.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Build a DataGridOptions from the `<datagrid>` tag's HTML attributes.
 * Simple attrs are read directly; the optional `meta` attr carries the
 * `type:<col>=...` / `align:<col>=...` flags (HTML attribute names
 * can't hold colons, so colon-bearing flags ride in `meta=`).
 */
function attrsToOptions(p: Record<string, unknown>): DataGridOptions {
  const base: DataGridOptions = str(p.meta) ? parseInfoString(str(p.meta)) : {};
  const src = str(p.src);
  if (src) base.src = src;
  const title = str(p.title);
  if (title) base.title = title;
  const sort = str(p.sort);
  if (sort) base.sort = sort;
  const filter = bool(p.filter);
  if (filter !== undefined) base.filter = filter;
  const search = bool(p.search);
  if (search !== undefined) base.search = search;
  const height = num(p.height);
  if (height !== undefined) base.height = height;
  const hide = list(p.hide);
  if (hide) base.hide = hide;
  const idCol = str(p["id-column"]) ?? str(p.idColumn);
  if (idCol) base.idColumn = idCol;
  const rowNums = bool(p["row-numbers"]) ?? bool(p.rowNumbers);
  if (rowNums !== undefined) base.rowNumbers = rowNums;
  const delim = str(p.delimiter);
  if (delim) base.delimiter = delim === "\\t" ? "\t" : delim;
  return base;
}

const CHART_LANGS: ReadonlySet<string> = new Set([
  "chart",
  "bar",
  "line",
  "pie",
  "area",
  "scatter",
  "funnel",
  "radar",
]);

function ChartMissingSrc() {
  return (
    <div className="not-prose my-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <div className="font-semibold text-amber-600 dark:text-amber-400">
        &lt;Chart&gt; — missing <code>src=</code>
      </div>
      <div className="mt-1 text-foreground/80">
        The <code>&lt;Chart&gt;</code> tag loads data from a sibling file or
        absolute URL. For inline data use a <code>```chart</code> fenced block.
      </div>
    </div>
  );
}

function KanbanMissingSrc() {
  return (
    <div className="not-prose my-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <div className="font-semibold text-amber-600 dark:text-amber-400">
        &lt;Kanban&gt; — missing <code>src=</code>
      </div>
      <div className="mt-1 text-foreground/80">
        The <code>&lt;Kanban&gt;</code> tag loads data from a sibling file or
        absolute URL. For inline data use a <code>```kanban</code> fenced block.
      </div>
    </div>
  );
}

function DatagridMissingSrc() {
  return (
    <div className="not-prose my-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
      <div className="font-semibold text-amber-600 dark:text-amber-400">
        &lt;datagrid&gt; — missing <code>src=</code>
      </div>
      <div className="mt-1 text-foreground/80">
        The <code>&lt;datagrid&gt;</code> tag loads CSV from a sibling file.
        For inline data use a <code>```csv</code> fenced block instead.
      </div>
    </div>
  );
}

const FRONT_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function extractFrontmatter(content: string): {
  frontData: Record<string, unknown>;
  body: string;
} {
  const match = FRONT_RE.exec(content);
  if (!match) return { frontData: {}, body: content };
  const yamlSrc = match[1];
  try {
    const data = parseYaml(yamlSrc);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return {
        frontData: data as Record<string, unknown>,
        body: content.slice(match[0].length),
      };
    }
  } catch {
    /* fall through — treat as body */
  }
  return { frontData: {}, body: content };
}

/**
 * Parse the meta string after a fenced ```mindmap fence. Pulls out
 * recognised key=value pairs (currently just `height=`); the rest is
 * concatenated as a free-form title.
 *
 *     mindmap height=560 Quarterly themes
 *     → { height: "560px", rest: "Quarterly themes" }
 */
function parseMindmapMeta(
  meta: string | undefined
): { height: string | undefined; rest: string } {
  if (!meta) return { height: undefined, rest: "" };
  const tokens = meta.trim().split(/\s+/);
  const titleParts: string[] = [];
  let height: string | undefined;
  for (const t of tokens) {
    const m = /^height=(.+)$/i.exec(t);
    if (m) {
      const v = m[1];
      // Bare number → assume px
      height = /^\d+$/.test(v) ? `${v}px` : v;
    } else {
      titleParts.push(t);
    }
  }
  return { height, rest: titleParts.join(" ") };
}
