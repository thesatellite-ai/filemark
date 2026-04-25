---
title: Examples — index of every component
---

# Examples — index of every component

Single page that lists every example doc in this directory, every component each one exercises, and a one-line use case for picking it. Open any example in the playground (`apps/playground`) or drop it into the chrome extension to see it render.

<DocStatus state="approved" owner="aman" updated="2026-04-25" note="auto-curated catalogue"></DocStatus>

---

## Browse by example doc

| Example | Components shown | Best for |
|---|---|---|
| [`showcase.md`](./showcase.md) | Callout · Tabs · Details · Stats · GFM tables · math · code · Mermaid · task lists | Tour every "core" feature in one doc — the welcome / on-ramp |
| [`datagrid.md`](./datagrid.md) | Datagrid (basic) | Quickest 30-second intro to fenced ` ```csv ` blocks |
| [`datagrid-full.md`](./datagrid-full.md) | Datagrid (every column type, info-string flag, UX option) | Reference doc for spreadsheet-style tables |
| [`chart-full.md`](./chart-full.md) | Chart (bar / line / pie / area / scatter / funnel / radar) | Visualizing CSV metrics inside docs |
| [`kanban-full.md`](./kanban-full.md) | Kanban (CSV-driven board) | Drag-to-move boards from a CSV source-of-truth |
| [`tasks-full.md`](./tasks-full.md) | Tasks DSL (sigils + `<TaskList>` / `<TaskStats>` / `<TaskTimeline>` / `<Kanban md>`) | The whole markdown-native task system end-to-end |
| [`stats-adr-full.md`](./stats-adr-full.md) | Stats · ADR | KPI dashboards + Architecture Decision Records |
| [`planning-v2-full.md`](./planning-v2-full.md) | DocBlock kind=prfaq/rfc/pitch/postmortem/daily · DocStatus · Backlinks · MindMap · OKRtree | Every M9 planning shape in one tour |
| [`planning-v2-tier2.md`](./planning-v2-tier2.md) | WeightedScore · DocBlock kind=meeting · Matrix2x2 · Timeline | Decision frameworks + 2×2 prioritisation + horizontal timeline |
| [`planning-v2-tier3.md`](./planning-v2-tier3.md) | ReadingTime · FiveWhys · Roadmap · DecisionTree | Quick-win planning helpers |
| [`mindmap-full.md`](./mindmap-full.md) | MindMap (markmap engine) — 13 sections | Every markmap feature, frontmatter directives, controls cheatsheet |
| [`richdocs-tier1.md`](./richdocs-tier1.md) | Steps · Cards · APIEndpoint · VideoEmbed · Diff · Glossary · Badge · LastUpdated · EditThisPage | Tutorials, landing pages, dev reference, doc workflow chips |
| [`richdocs-tier2.md`](./richdocs-tier2.md) | Heatmap · AnnotatedImage · PullQuote · Testimonials · Sparkline · Footnote | Activity grid, image hotspots, marketing quotes, inline trends, Tufte-style notes |
| [`richdocs-tier3.md`](./richdocs-tier3.md) | PRCard · IssueCard · CommitCard · FileTree · EnvVarsTable · Lightbox · Carousel · Gauge · Treemap · Quiz · Poll · AISummary · CalloutWithAction · AuthorCard · PackageBadge | Niche additions for dev docs, tutorials, marketing, polls/quizzes |

Schema-only (drop these directly without a markdown wrapper — filemark renders them as ER diagrams):

| Example | What | Best for |
|---|---|---|
| [`schema.sql`](./schema.sql) | Postgres-flavoured DDL | Visualize an existing database schema |
| [`schema.prisma`](./schema.prisma) | Prisma schema | Visualize a Prisma data model |
| [`schema.dbml`](./schema.dbml) | DBML (dbdiagram.io DSL) | Sketching a schema before you've picked a DB |
| [`sales.csv`](./sales.csv) | Plain CSV | Pair with `<Datagrid src=…>` to demo external CSV loading |

---

## Browse by component

Every authorable component, the example doc that exercises it, and when to reach for it.

### Core MDX building blocks

| Component | Lives in | Use when |
|---|---|---|
| `<Callout type="…">` | `showcase.md` | Highlight a tip / warning / danger / info / note inline with prose |
| `<Tabs>` + `<Tab label=…>` | `showcase.md` | OS / package-manager / language alternatives without bloating the page |
| `<Details summary=…>` | `showcase.md` | Hide long detail behind a toggle (FAQ items, gotchas, appendices) |
| `<Stats>` + `<Stat>` | `stats-adr-full.md` | KPI tile grid at the top of a dashboard or summary |
| `<ADR>` | `stats-adr-full.md` | Architecture Decision Record with status pill |

### Data + visual

| Component | Lives in | Use when |
|---|---|---|
| ` ```csv ` / ` ```tsv ` fenced + `<Datagrid src=…>` | `datagrid-full.md`, `datagrid.md` | Spreadsheet-style interactive table from inline or external CSV |
| ` ```bar/line/pie/area/scatter/funnel/radar ` fenced + `<Chart src=…>` | `chart-full.md` | Visualize CSV metrics — pivot, formatters, by-pivot, tags |
| ` ```kanban ` fenced + `<Kanban>` | `kanban-full.md` | CSV-driven kanban; rich cell types per card |
| ` ```mermaid ` fenced | `showcase.md` | Diagrams (flowcharts, sequence, ER, etc.) in standard Mermaid syntax |
| ` ```schema / sql / prisma / dbml ` fenced | `schema.sql`, `schema.prisma`, `schema.dbml` | Render any DDL as an ER diagram |
| ` ```mindmap ` fenced + `<MindMap>` | `mindmap-full.md` | Real mindmap (markmap engine) — pan, zoom, fullscreen, KaTeX, frontmatter directives |

### Markdown-native task system

| Component | Lives in | Use when |
|---|---|---|
| `- [ ] task @owner !p1 ~due` (sigils) | `tasks-full.md` | Any task — works inside any markdown body |
| `<TaskList filter=… group-by=… sort=…>` | `tasks-full.md` | Filtered / grouped / sorted task projection |
| `<TaskStats md>` | `tasks-full.md` | KPI tiles auto-derived from tasks (total / open / done / overdue) |
| `<TaskTimeline md>` | `tasks-full.md` | Gantt-lite SVG date axis from task `^start..~due` ranges |
| `<Kanban md group-by="status">` | `tasks-full.md` | Same task data → kanban board, no separate CSV |

### Planning v2 (M9 / M10 / M11)

| Component | Lives in | Use when |
|---|---|---|
| `<DocBlock kind="prfaq" …>` | `planning-v2-full.md` | Amazon-style press-release-first planning template |
| `<DocBlock kind="rfc" status=… id=… …>` | `planning-v2-full.md` | Request-for-comments with six-status chip |
| `<DocBlock kind="pitch" problem=… appetite=… …>` | `planning-v2-full.md` | Shape-Up "fat marker" pitch (problem + time budget) |
| `<DocBlock kind="postmortem" severity=sev2 …>` | `planning-v2-full.md` | Incident retro with sev1–4 chip + action items |
| `<DocBlock kind="meeting" attendees=… …>` | `planning-v2-tier2.md` | Single-meeting capture (agenda / decisions / action items) |
| `<DocBlock kind="daily" date=… mood=… …>` | `planning-v2-full.md` | Date-stamped daily journal wrapper |
| `<DocBlock>` (no `kind`) | (any) | One-off custom block — same chrome, manual slots |
| `<DocStatus state="approved" owner=… updated=…>` | `planning-v2-full.md` | Inline status pill at top of any doc |
| `<Backlinks>` | `planning-v2-full.md` | Inbound `[[wikilink]]` references from other docs in the library (chrome-ext only) |
| `<MindMap>` / ` ```mindmap ` | `mindmap-full.md` | Real mindmap — outline / brainstorm / spec map |
| `<OKRtree>` + `<Objective>` + `<KR>` | `planning-v2-full.md` | Objective → key-results scorecard (manual or task-derived) |
| `<WeightedScore>` + `<Criterion>` + `<Option>` | `planning-v2-tier2.md` | Pick the best option from a weighted matrix |
| `<Matrix2x2>` + `<Item>` | `planning-v2-tier2.md` | 2×2 prioritization grid (Effort × Impact, RICE, etc.) |
| `<Timeline>` + `<Event>` | `planning-v2-tier2.md` | Horizontal date-axis with lanes; bars vs diamonds |
| `<ReadingTime>` | `planning-v2-tier3.md` | Auto-counted "~N min read" chip |
| `<FiveWhys>` + `<Why>` | `planning-v2-tier3.md` | Numbered root-cause chain |
| `<Roadmap>` + `<Lane>` | `planning-v2-tier3.md` | Now / Next / Later three-column board |
| `<DecisionTree>` + `<Branch>` | `planning-v2-tier3.md` | Recursive branching analysis with collapsible labels |

### Rich docs (M14 — tutorials / landing / dev reference)

| Component | Lives in | Use when |
|---|---|---|
| `<Steps>` + `<Step n= title=>` | `richdocs-tier1.md` | Numbered guided walkthrough — install / setup / how-to flows |
| `<Cards cols=>` + `<DocCard icon= title= href= badge=>` | `richdocs-tier1.md` | Landing-page tile grid — features, getting started, related docs |
| `<APIEndpoint method= path= auth= base=>` | `richdocs-tier1.md` | REST endpoint reference card with copy-curl button |
| `<VideoEmbed src=>` | `richdocs-tier1.md` | Privacy-conscious YouTube / Vimeo / Loom iframe |
| `<Diff>` wrapping before/after fenced blocks | `richdocs-tier1.md` | Migration guides, refactor PRs, before/after tutorials |
| `<Define term=>` | `richdocs-tier1.md` | Glossary — define a term once; auto-popover on every later occurrence |
| `<Badge tone=>` | `richdocs-tier1.md` | Inline tone pill next to a heading or feature name |
| `<LastUpdated date= by=>` + `<EditThisPage repo= path=>` | `richdocs-tier1.md` | Doc workflow chips at top of any long doc |

### Rich docs (M15 — Tier 2 power features)

| Component | Lives in | Use when |
|---|---|---|
| `<Heatmap src= date= value=>` | `richdocs-tier2.md` | GitHub-style activity grid (53×7) from CSV |
| `<AnnotatedImage src=>` + `<Hotspot x= y=>` | `richdocs-tier2.md` | Screenshot walkthrough — numbered pin overlays + popovers |
| `<PullQuote author= role=>` | `richdocs-tier2.md` | Featured testimonial / quote block |
| `<Testimonials cols=>` | `richdocs-tier2.md` | Marketing-style grid of pull quotes |
| `<Sparkline data= type= color=>` | `richdocs-tier2.md` | Inline trend visual (line or bar) inside text or table cells |
| `<Footnote>` | `richdocs-tier2.md` | Tufte-style numbered footnote with click-to-toggle popover |

### Rich docs (M16 — Tier 3 niche)

| Component | Lives in | Use when |
|---|---|---|
| `<PRCard>` / `<IssueCard>` / `<CommitCard>` | `richdocs-tier3.md` | GitHub artifacts as styled cards in changelogs / release notes |
| `<FileTree>` | `richdocs-tier3.md` | Indented file/folder outline (folders end with `/`) |
| `<EnvVarsTable>` + `<Env name= type= default= required secret>` | `richdocs-tier3.md` | Env var reference table with required + secret pills |
| `<Lightbox>` | `richdocs-tier3.md` | Click-to-fullscreen image grid with arrow navigation |
| `<Carousel>` + `<Slide>` | `richdocs-tier3.md` | Horizontal scroll-snap card row (no JS scroll listener) |
| `<Gauge value= target= thresholds=>` | `richdocs-tier3.md` | Single-value semicircle dial with threshold colour bands |
| `<Treemap>` (CSV: name,value[,group]) | `richdocs-tier3.md` | Nested rectangles sized by value, coloured by group |
| `<Quiz question=>` + `<Choice correct?>` | `richdocs-tier3.md` | Multi-choice question with reveal-on-click |
| `<Poll id= question=>` + `<PollOption>` | `richdocs-tier3.md` | Single-question vote, persisted via localStorage |
| `<AISummary status=>` | `richdocs-tier3.md` | Placeholder slot for host-provided summariser |
| `<CalloutWithAction tone= title= action= href=>` | `richdocs-tier3.md` | Sleek callout w/ tone accent (left bar + icon chip) + inline arrow CTA link |
| `<AuthorCard name= role= avatar= twitter= github=>` | `richdocs-tier3.md` | Inline author bio for blog posts / signed docs |
| `<PackageBadge name= type= version= license= stars=>` | `richdocs-tier3.md` | npm-style package version + downloads chip |

---

## Use-case shortcuts

Picking the right component starts with the question you're answering:

| Question | Reach for |
|---|---|
| "What does this metric look like over time?" | `<Chart>` (line / bar / area) |
| "Where do we stand right now?" | `<Stats>` / `<TaskStats md>` |
| "Who's working on what?" | `<Kanban md>` / `<TaskList group-by="owner">` |
| "When is this happening?" | `<Timeline>` / `<TaskTimeline md>` |
| "What's the spec / pitch / RFC?" | `<DocBlock kind="prfaq" \| "rfc" \| "pitch">` |
| "What broke last week?" | `<DocBlock kind="postmortem">` + `<FiveWhys>` |
| "Which option should we pick?" | `<WeightedScore>` (weighted) or `<Matrix2x2>` (visual) |
| "What's the brainstorm structure?" | ` ```mindmap ` |
| "Where does this doc fit in the wider library?" | `<Backlinks>` + `<DocStatus>` |
| "What did we decide today?" | `<DocBlock kind="meeting">` |
| "What's the long-term plan?" | `<Roadmap>` (now/next/later) + `<OKRtree>` |
| "What's my plan for today?" | `<DocBlock kind="daily">` + `<TaskList filter="is:open AND due <= today">` |
| "If we go with X, what then?" | `<DecisionTree>` |
| "How do I install / set up X?" | `<Steps>` + `<Step>` (numbered walkthrough) |
| "Show me the API" | `<APIEndpoint>` + `<EnvVarsTable>` |
| "Before vs after this change" | `<Diff>` |
| "What does this term mean?" | `<Define term=>` (auto-popover everywhere it appears) |
| "How is X trending?" | `<Sparkline>` (inline) or `<Heatmap>` (year grid) |
| "Where do I click in this UI?" | `<AnnotatedImage>` + numbered `<Hotspot>` overlays |
| "What did GitHub say?" | `<PRCard>` / `<IssueCard>` / `<CommitCard>` |
| "What's the file layout?" | `<FileTree>` |
| "How do I score against this metric?" | `<Gauge value= target= thresholds=>` |
| "What's the breakdown of X by Y?" | `<Treemap>` |
| "Test the reader's understanding" | `<Quiz>` |
| "Get a vote from readers" | `<Poll>` |
| "Show off testimonials" | `<Testimonials>` of `<PullQuote>` |

---

## Where else to look

- **`SKILL.md`** at `skills/filemark/SKILL.md` — full grammar reference for AI agents (Claude / Cursor / Codex). Covers the three rules (blank lines / closing tags / single-line opening), every component's API, the task-bullet sigil system, the filter DSL, and authoring gotchas.
- **`apps/playground/src/examples/index.ts`** — every example doc above is wired into the playground gallery sidebar.

## Ideas / requests

If a use case isn't covered by anything above, [open an issue](https://github.com/thesatellite-ai/filemark/issues) on GitHub.
