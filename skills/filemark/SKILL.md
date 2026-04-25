---
name: filemark
description: Author beautiful interactive markdown docs that filemark renders — every component, every sigil, every gotcha. Fires when the user is writing or editing a `.md` / `.mdx` file meant to be viewed in filemark (the Chrome extension + playground) and wants callouts, tabs, stats, ADRs, datagrids, kanban boards, charts, timelines, or markdown-native tasks.
---

# filemark — skill

Filemark renders `.md` / `.mdx` / `.json` / `.sql` / `.prisma` / `.dbml` files in Chrome with rich **interactive** components — no eval, no server, no DB. The markdown file is always the source of truth. AI writes it, filemark visualizes it, humans grep it.

**Use this skill when:**

- The user asks to "write a doc that looks good in filemark"
- They want a kanban, timeline, datagrid, chart, or stats block inside a markdown doc
- They want markdown-native tasks (`- [ ] foo !p1 @alice ~2026-05-10`) with filterable views
- They want the grammar/DSL for tasks, charts, datagrids, or any custom component
- They're debugging why a component renders wrong (blank lines, closing tags, eval restrictions)

**Do NOT use this for:**

- Generic markdown help (use base markdown knowledge)
- Extending filemark itself — the source is at `chrome-extensions/filemark/packages/**`, use repo conventions
- VS Code / GitHub rendering — filemark-specific syntax (Callout, Tabs, TaskList, `::` fence) does not render there

## The two rules that prevent 90% of breakage

Both come from CommonMark + HTML-in-markdown semantics. Filemark can't work around them — learn them once.

### Rule 1 — blank lines inside HTML-style components

Every `<Callout>`, `<Tabs>`, `<Tab>`, `<Details>`, `<ADR>` block needs a **blank line between the opening tag and its content**, and another between the content and the closing tag. Without blank lines CommonMark treats the whole block as raw HTML and skips markdown parsing — bold, lists, code blocks all come out literal.

```md
<Callout type="tip" title="Good">

Blank line above AND below. Markdown **works** here.

</Callout>

<Callout type="tip" title="Broken">
Glued to the tag — CommonMark skips markdown.
**This won't bold.**
</Callout>
```

### Rule 2 — explicit closing tags, not self-closing

HTML5 does not self-close unknown elements. `<TaskStats md/>`, `<TaskList/>`, `<Kanban md/>` etc. will **eat every sibling after them** because the parser keeps looking for a closing tag. Always write `<Tag></Tag>` — even on "empty" components.

```md
<!-- BAD: everything after this heading disappears -->
<TaskStats md/>

<!-- GOOD -->
<TaskStats md></TaskStats>
```

The same trap applies to marker children of components like `<WeightedScore>`, `<Matrix2x2>`, `<Timeline>`, `<Roadmap>`. Self-closing siblings (`<Criterion />`, `<Item />`, `<Event />`, `<Lane />`) get nested into each other by the parser. Filemark works around this with a recursive walker, but the failure mode if you copy a component into a different host is invisible (only the first marker registers). Prefer the paired form when in doubt: `<Criterion ...></Criterion>`.

### Rule 3 — single-line opening tag (attrs all on one line)

CommonMark's HTML-block detection requires the opening tag to **complete on the first line**. Wrapping a long attribute list across multiple lines makes the parser fall back to "inline HTML inside a paragraph" — which often eats your component or its body.

```md
<!-- BAD: parser doesn't recognize this as an HTML block -->
<DocBlock kind="meeting"
  title="Q3 sync"
  date="2026-04-24"
  attendees="aman,grace,linus">

### Agenda

</DocBlock>

<!-- GOOD: opening tag (incl. closing >) on one line -->
<DocBlock kind="meeting" title="Q3 sync" date="2026-04-24" attendees="aman,grace,linus">

### Agenda

</DocBlock>
```

Long attribute lines are fine — but they must NOT include a literal newline. If the opening tag is unwieldy, prefer fewer attributes (compose via children) over multi-line authoring.

## Components at a glance

| Component | Source | What it does |
|---|---|---|
| `<Callout>` | inline HTML | 5 variants: `note` / `tip` / `info` / `warning` / `danger` |
| `<Tabs>` + `<Tab>` | inline HTML | Tabbed content panels — syntax examples, OS-specific commands |
| `<Details>` | inline HTML | Collapsible `<summary>`-headed block |
| `<Stats>` + `<Stat>` | inline HTML | KPI tile grid with delta arrows, intent colors, optional `href=` |
| `<ADR>` | inline HTML | Architecture Decision Record card with status pill + metadata |
| fenced ```` ```csv ```` / ```` ```tsv ```` / ```` ```md ```` / ```` ```json ```` | fence meta | Datagrid (Google-Sheets-like interactive table) |
| `<Datagrid>` | inline HTML | Datagrid with external CSV via `src=` |
| fenced ```` ```bar/line/pie/area/scatter/funnel/radar/chart ```` | fence meta | Chart |
| `<Chart>` | inline HTML | Chart with external CSV via `src=` |
| fenced ```` ```kanban ```` | fence meta | Kanban board from CSV rows |
| `<Kanban>` | inline HTML | Kanban from CSV via `src=` OR from task bullets via `md` |
| fenced ```` ```mermaid ```` | fence | Mermaid diagram |
| fenced ```` ```schema / sql / prisma / dbml ```` | fence | ER diagram |
| `- [ ] task …` | GFM task bullet + sigils | Markdown-native task |
| `<TaskStats md>` | inline HTML | KPI tiles over parsed tasks |
| `<TaskList>` | inline HTML | Flat or grouped task list |
| `<TaskTimeline md>` | inline HTML | Gantt-lite timeline |
| `<DocBlock kind="prfaq" \| "rfc" \| "pitch" \| "postmortem" \| "meeting" \| "daily">` | inline HTML | Single unified template wrapper with smart `kind=` presets — replaces the per-template `<PRFAQ>` / `<RFC>` / `<Pitch>` / `<PostMortem>` / `<MeetingNotes>` / `<DailyNote>` (all collapsed into `<DocBlock>`) |
| `<DocStatus>` | inline HTML | Inline status pill — draft / review / approved / deprecated / archived |
| fenced ```` ```mindmap ```` / `<MindMap>` | fence meta / inline HTML | Collapsible horizontal tree from a bullet outline (fenced form preferred) |
| `<OKRtree>` + `<Objective>` + `<KR>` | inline HTML | Objective → key-results scorecard; KR scoring from manual `current/target` or `tasks="id1,id2"` |
| `<Backlinks>` | inline HTML | Inbound `[[wikilink]]` references (host-supplied; chrome-ext wires it via `BacklinksProvider`) |
| `<WeightedScore>` + `<Criterion>` + `<Option>` | inline HTML | Decision matrix; auto-ranks rows by Σ score × weight |
| `<Matrix2x2>` + `<Item>` | inline HTML | 2×2 prioritization grid; positioned bubbles in Quick-wins / Big-bets / Time-sinks / Fillers quadrants |
| `<Timeline>` + `<Event>` | inline HTML | Horizontal date axis; lanes; bars vs diamonds; today marker |
| `<ReadingTime>` | inline HTML | Auto-counted "~N min read" chip |
| `<FiveWhys>` + `<Why>` | inline HTML | Numbered root-cause chain; last Why styled as root cause |
| `<Roadmap>` + `<Lane>` | inline HTML | Three-column now/next/later board with toned lanes |
| `<DecisionTree>` + `<Branch>` | inline HTML | Recursive branching analysis with collapsible labels |
| `<Steps>` + `<Step n= title=>` | inline HTML | Numbered guided walkthrough — install / setup / how-to flows |
| `<Cards cols=>` + `<DocCard icon= title= href= badge=>` | inline HTML | Landing-page card grid (responsive 1 / 2 / 3 / 4 cols) |
| `<Badge tone=>` | inline HTML | Tiny inline tone pill — six tones via datagrid TONE_CLASS |
| `<LastUpdated date= by=>` + `<EditThisPage repo= path= branch=>` | inline HTML | Doc workflow chips |
| `<VideoEmbed src= title= aspect=>` | inline HTML | Safe iframe wrapper for YouTube / Vimeo / Loom (privacy-conscious) |
| `<Diff>` wrapping `before` + `after` fenced blocks | inline HTML | Side-by-side before/after code blocks |
| `<APIEndpoint method= path= auth= base=>` | inline HTML | REST endpoint card — method chip, copy-curl button, body |
| `<Define term=>` | inline HTML | Glossary entry — every later occurrence in the doc gets a hover popover |
| `<Heatmap src= date= value= year=>` | inline HTML | GitHub-style activity grid (53 weeks × 7 days) from CSV |
| `<AnnotatedImage src=>` + `<Hotspot x= y= label=>` | inline HTML | Image with numbered hotspot overlays + popovers |
| `<PullQuote author= role= avatar=>` + `<Testimonials cols=>` | inline HTML | Styled quote block / grid for marketing pages |
| `<Sparkline data= type= color=>` | inline HTML | Tiny inline trend visual (line or bar) |
| `<Footnote>` | inline HTML | Inline numbered footnote — click to toggle popover |
| `<PRCard>` / `<IssueCard>` / `<CommitCard>` | inline HTML | GitHub artifacts as styled cards |
| `<FileTree>` | inline HTML | Indented file/folder outline from fenced text |
| `<EnvVarsTable>` + `<Env name= type= default= required secret>` | inline HTML | Env var reference table |
| `<Lightbox>` | inline HTML | Click-to-fullscreen image (single or multi) |
| `<Carousel>` + `<Slide title=>` | inline HTML | CSS scroll-snap card row |
| `<Gauge value= target= thresholds= label= unit=>` | inline HTML | Single-value semicircle dial |
| `<Treemap>` | inline HTML | Nested rectangles sized by value (CSV: name,value[,group]) |
| `<Quiz question=>` + `<Choice correct?>` | inline HTML | Multi-choice question with reveal-on-click |
| `<Poll id= question=>` + `<PollOption>` | inline HTML | Single-question vote, persisted via localStorage |
| `<AISummary status=>` | inline HTML | Placeholder slot for host-provided summariser |
| `<CalloutWithAction tone= title= action= href=>` | inline HTML | Callout variant with primary CTA button |
| `<AuthorCard name= role= avatar= twitter= github=>` | inline HTML | Inline author bio |
| `<PackageBadge name= type= version= downloads= license= stars=>` | inline HTML | npm-style package version + downloads + license + stars |

> **Hands-on examples:** every component above has a worked example in `examples/`. Browse [`examples/INDEX.md`](../../examples/INDEX.md) for a per-component catalogue with one-line use cases, or open the playground gallery — every example doc is wired in.

## Callouts, Tabs, Details (the simple HTML trio)

Callouts — five variants, each with an accent + icon:

```md
<Callout type="note" title="Note">

Plain context.

</Callout>

<Callout type="tip" title="Pro tip">...</Callout>
<Callout type="info" title="Did you know">...</Callout>
<Callout type="warning" title="Heads up">...</Callout>
<Callout type="danger" title="Do not do this">...</Callout>
```

Tabs — every `<Tab>` needs a `label=`:

```md
<Tabs>
  <Tab label="npm">

  ```bash
  npm install @filemark/mdx
  ```

  </Tab>
  <Tab label="pnpm">

  ```bash
  pnpm add @filemark/mdx
  ```

  </Tab>
</Tabs>
```

Details — collapsible block with a `summary=`:

```md
<Details summary="Click to reveal the API">

```ts
interface ViewerProps { … }
```

</Details>
```

## Stats — KPI grid

```md
<Stats>
  <Stat title="MRR" value="$128,400" delta="+12.4%" description="vs last month" />
  <Stat title="Churn" value="1.8%" delta="-0.3%" intent="success" description="lower is better" />
  <Stat title="NPS" value="42" delta="+5" />
</Stats>
```

Auto behavior:

- `delta="+…"` → up arrow + green. `delta="-…"` → down arrow + red. `delta="0"` → flat em-dash + muted.
- Override with `intent="success|warn|danger|info|muted"` when semantics flip (e.g. latency drop = success).
- `cols="2|3|4|5|6"` pins column count. Omit for responsive 1/2/3/4.
- `href="…"` makes the whole tile a link.

`<Stat>` is self-closing — it's one of the known HTML-primitive components, safe to self-close. `<Stats>` itself must be explicitly closed.

## ADR — decision records

```md
<ADR status="accepted" id="ADR-007" date="2026-04-23" title="Use recharts for charting">

### Context

Why we needed this decision.

### Decision

What we're doing.

### Consequences

What changes as a result.

</ADR>
```

Valid `status=`: `proposed` · `accepted` · `rejected` · `deprecated` · `superseded`.

Cross-link decisions with `supersedes="ADR-003"` and `superseded-by="ADR-009"`.

## Planning v2 templates — PRFAQ, RFC, Pitch, PostMortem, DocStatus

All header-strip-+-body planning templates (PRFAQ / RFC / Pitch / PostMortem / MeetingNotes / DailyNote) collapse into a single `<DocBlock>` component with smart `kind=` presets. One component, six recognisable shapes — pick the kind, pass the kind-specific attrs, get the right chip / meta / variant for free.

### `<DocBlock kind="prfaq">` — Amazon press-release-first

```md
<DocBlock kind="prfaq" title="Filemark v1" subhead="Render any .md in Chrome — no DB, no server" date="2026-04-24" author="aman">

### Press release

### Summary

### FAQ

</DocBlock>
```

Use for product launches, project kickoffs, and "imagine we shipped it" exercises.

### `<DocBlock kind="rfc">` — request for comments

```md
<DocBlock kind="rfc" status="proposed" id="RFC-0042" date="2026-04-24" title="Adopt filemark" author="aman">

### Status
### Context
### Proposal
### Alternatives
### Risks
### Decision

</DocBlock>
```

Six statuses: `draft` · `proposed` · `accepted` · `rejected` · `withdrawn` · `implemented`.

### `<DocBlock kind="pitch">` — Shape Up fat-marker

```md
<DocBlock kind="pitch" problem="Tabs reorder is clunky" appetite="2 days" owner="aman" title="Tab DnD">

### Solution
### Rabbit holes
### No-gos

</DocBlock>
```

`appetite` is the time budget (Shape Up's signature commitment) and renders as a pill in the header.

### `<DocBlock kind="postmortem">` — incident retrospective

```md
<DocBlock kind="postmortem" severity="sev2" service="api" date="2026-04-22" duration="42m" title="API 5xx spike">

### Summary
### Timeline
### Root cause
### Contributing factors
### Action items

- [ ] Fix the deploy script @aman !p1 ~2026-05-01

</DocBlock>
```

Sev tones: `sev1`=danger · `sev2`=warn · `sev3`=info · `sev4`=muted. Action items use task-bullet sigils so they flow into TaskPanel.

### `<DocBlock kind="meeting">` — capture a single sync

```md
<DocBlock kind="meeting" title="Q3 sync" date="2026-04-24" time="14:00–15:00" facilitator="aman" attendees="aman,grace,linus">

### Agenda
### Discussion
### Decisions
### Action items

- [ ] Draft RFC @grace !p1 ~2026-05-01

</DocBlock>
```

`attendees` becomes initial-pill chips. (`kind="meetingnotes"` is also accepted as an alias.)

### `<DocBlock kind="daily">` — date-stamped daily journal

```md
<DocBlock kind="daily" date="2026-04-24" yesterday="2026-04-23" tomorrow="2026-04-25" mood="focused" weather="rainy">

## Plan for today

- [ ] Ship M9 @aman !p0

## Open from yesterday

<TaskList filter="is:open" sort="priority:asc" limit="10"></TaskList>

</DocBlock>
```

`date` defaults to today (locale-rendered). The wrapper provides a recognisable date billboard + day-of-week kicker + prev/next nav. (`kind="dailynote"` also accepted.) Convention: store as `daily/YYYY-MM-DD.md` for chronological sidebar order.

### `<DocBlock>` without `kind=` — manual / one-off custom block

When none of the presets fit, drop a plain `<DocBlock>` and fill the slots yourself:

```md
<DocBlock kicker="Spike" title="Inline AI hooks — feasibility" variant="dashed">

Three vendors evaluated. Verdict: build adapter, defer SDK choice.

</DocBlock>
```

Available manual props: `kicker` (small uppercase label), `title`, `titleAs="h2"|"h3"`, `subtitle`, `chip={tone,label}`, `meta=[{label,value,mono?,pill?}]`, `aside`, `variant="flat"|"gradient"|"dashed"`, `asArticle`. Manual props **override** any kind preset, so you can pick a `kind="rfc"` and still swap in your own `kicker=` if you want.

### `<DocStatus>` — inline status chip (NOT collapsed into DocBlock)

```md
<DocStatus state="approved" owner="aman" updated="2026-04-24"></DocStatus>
```

States: `draft` · `review` · `approved` · `deprecated` · `archived`. DocStatus stays its own component because it's an *inline* chip, not a header-strip-+-body wrapper.

## MindMap — real mindmap (markmap engine)

Renders via [markmap](https://markmap.js.org/) — purpose-built `markdown-→-mindmap` engine used by HackMD. Curved branches, pan/zoom, signature mindmap aesthetic, themed via shadcn tokens. Lazy-loaded — only docs that actually contain a mindmap pull the markmap chunk.

**Preferred — fenced ` ```mindmap ` block** (rock-solid, no markdown-block-edge gotchas):

````md
```mindmap Filemark component map
- Filemark
  - Visual
    - Chart
    - Kanban
  - Decision
    - ADR
    - RFC
```
````

Anything after `mindmap` on the fence line becomes the title.

**Alternative — `<MindMap>` wrapping a markdown list** (works when react-markdown nests the `<ul>` inside the wrapper; can fail when blank-line block-splitting puts the list as a sibling):

```md
<MindMap title="Filemark component map">

- Filemark
  - Visual
    - Chart
  - Decision
    - ADR

</MindMap>
```

If the wrapper renders a fallback message ("needs a nested unordered list inside"), switch to the fenced form. Branch tones cycle by depth (primary / blue / emerald / amber / rose / violet); nodes collapse on click. Optional `<MindMap height="500px">` to control the rendered area (default 420px); `<MindMap title="…">` adds a header strip. If markmap fails to load (CSP blocked, network error), MindMap falls back to a CSS collapsible tree.

**Why the fenced form is preferred — the markdown-block-edge gotcha:**

CommonMark's HTML-block detection (type 7, used for any non-standard tag) ends the block at the **next blank line**. But Rule 1 above *requires* a blank line between the opening `<MindMap>` tag and the markdown content inside, otherwise the body is treated as raw HTML and the list is never parsed as a list. These two requirements collide:

```
<MindMap title="…">
                          ← blank line: needed for Rule 1, also ENDS the HTML block
- Filemark                ← parsed as a top-level markdown list, NOT inside <MindMap>
  - Visual
                          ← another blank line
</MindMap>                ← parsed as its own HTML block (just a closing tag)
```

After parsing, the three pieces are *siblings* in the document tree — `<MindMap>` (empty), `<ul>…</ul>`, `</MindMap>`. rehype-raw re-stitches the HTML through parse5, but whether the list ends up nested inside `<MindMap>` (vs alongside it) depends on the rest of the document and whitespace placement.

For wrapper components that just render `{children}` verbatim (PRFAQ, RFC, Pitch, ADR, MeetingNotes, …) the visual outcome is fine even if the parser splits the body — react-markdown still calls each registered component, the markdown still renders, and the eye reads the result as one block. **MindMap is different**: it needs to *programmatically extract* the `<ul>` from its children to build a tree. When the list ends up as a *sibling* instead of a child, MindMap finds nothing and renders the fallback.

The fenced ` ```mindmap ` form sidesteps this entirely — code fences are first-class CommonMark blocks and their body is delivered to the lang handler as a single raw string, untouched by HTML-block edge cases. Same pattern as `chart`, `kanban`, `mermaid`, `csv`, etc. Use the fenced form for any future component that needs to read structured markdown content from its body.

## OKRtree — objective + key-result scorecard

```md
<OKRtree>

<Objective title="Q3: ship M9" owner="aman" due="2026-09-30">

<KR title="Ship 6 components" tasks="task-m9-prfaq,task-m9-rfc,task-m9-pitch,task-m9-postmortem,task-m9-docstatus,task-m9-backlinks" />
<KR title="10K WAU" current="6200" target="10000" />
<KR title="<2% bounce" current="3.4" target="2" inverse />

</Objective>

</OKRtree>
```

KR scoring two ways:

- `current` + `target` → bar fills `current/target`. Add `inverse` for "lower is better" (e.g. error rate).
- `tasks="id1,id2,…"` → looks up each task `^id` in the doc's `useTasks()` context, counts `[x]` as done; bar fills `done/total`.

Bar colour shifts emerald (≥100%) / blue (≥70%) / amber (≥30%) / rose (<30%).

## WeightedScore — ranked decision matrix

```md
<WeightedScore title="Pick the next infra investment">

<Criterion name="Effort"  weight="2" inverse />
<Criterion name="Impact"  weight="3" />
<Criterion name="Risk"    weight="1" inverse />

<Option name="Refactor parser"  scores="3,4,2" />
<Option name="Cache layer"      scores="2,3,1" />
<Option name="Rewrite from 0"   scores="5,5,5" />

</WeightedScore>
```

Score order in `scores=` matches criterion order. `inverse` on a criterion flips it ("lower is better"). Rows auto-rank; winner gets a primary border + 🏆.

## Matrix2x2 — 2×2 prioritization grid

```md
<Matrix2x2 x-axis="Effort" y-axis="Impact" title="Roadmap candidates">

<Item x="0.2" y="0.9">Quick win A</Item>
<Item x="0.7" y="0.4">Time sink B</Item>
<Item x="0.85" y="0.85">Big bet C</Item>

</Matrix2x2>
```

Coords are 0..1 — `(0,0)` is bottom-left of the inner grid. Quadrants are coloured (emerald = quick wins, blue = big bets, zinc = fillers, rose = time sinks). Override the four labels with `quadrants="A,B,C,D"` (clockwise from top-left).

## Timeline — horizontal date axis with lanes

```md
<Timeline title="Q3 plan" from="2026-07-01" to="2026-09-30">

<Event date="2026-07-15" lane="design" title="Mocks final" />
<Event date="2026-08-01" end="2026-08-22" lane="eng" title="Build phase" />
<Event date="2026-09-15" lane="ship" title="GA launch" highlight />

</Timeline>
```

Diamond markers for single-day events; bars for ranges (`date` + `end`). `highlight` promotes to primary colour. Today gets a vertical dashed line when within range. `from` / `to` set the visible window (auto-derived from event min/max if omitted).

## ReadingTime · FiveWhys · Roadmap · DecisionTree (Tier 3)

Four quick-win planning blocks.

### `<ReadingTime>`

```md
<ReadingTime></ReadingTime>              <!-- auto-counts words from the article -->
<ReadingTime words="2400"></ReadingTime>
<ReadingTime words="500" wpm="180"></ReadingTime>
```

Default pace 230 wpm. Auto mode mounts a `MutationObserver` on the enclosing `.fv-mdx-body`, so it stays accurate as the doc updates.

### `<FiveWhys>` — root-cause chain

```md
<FiveWhys problem="Deploy broke prod">

<Why>The migration ran out of order.</Why>
<Why>The deploy script doesn't sequence migrations against feature flags.</Why>
<Why>Nobody owns the deploy script.</Why>
<Why>It was inherited from the previous team.</Why>
<Why>Tooling responsibilities were assumed instead of assigned.</Why>

</FiveWhys>
```

Last Why is highlighted as the root cause. Doesn't enforce exactly five — pass any number.

### `<Roadmap>` — now / next / later

```md
<Roadmap title="Q3 plan">

<Lane name="Now" subtitle="this sprint">

- Ship X
- Polish Y

</Lane>

<Lane name="Next" subtitle="this quarter" tone="info">…</Lane>

<Lane name="Later" subtitle="someday" tone="muted">…</Lane>

</Roadmap>
```

Lane tones: `default` · `info` · `success` · `warn` · `danger` · `muted`. Author writes any markdown body inside each lane.

### `<DecisionTree>` — recursive branching

```md
<DecisionTree question="Should we migrate?">

<Branch label="yes">

<DecisionTree question="Big-bang or incremental?">
<Branch label="big-bang">Risky but fast.</Branch>
<Branch label="incremental">Safer, takes a quarter.</Branch>
</DecisionTree>

</Branch>

<Branch label="no">Stay on current platform.</Branch>

</DecisionTree>
```

Branches collapse on click. Nest `<DecisionTree>` inside a `<Branch>` to drill deeper.

## Rich docs (M14–M16) — tutorials, landing, dev reference, marketing

Twenty-six components added on top of the planning surface. Grouped by archetype.

### Tutorials / how-to

```md
<Steps>

<Step title="Install">…</Step>
<Step title="Configure">…</Step>
<Step title="Verify">…</Step>

</Steps>
```

`<Diff>` wraps a `before` + `after` pair of fenced code blocks (mark with meta or just put them in order):

````md
<Diff>

```ts before
const x = items.map((i) => i.foo);
```

```ts after
const x = items.flatMap((i) => i.foo ?? []);
```

</Diff>
````

### Landing / index pages

```md
<Cards cols="3">

<DocCard icon="📦" title="Install" href="./install" badge="5 min">
Drop the extension folder into chrome://extensions and load.
</DocCard>

<DocCard icon="🚀" title="Quick start" href="./quick-start">
Open any local .md file in 30 seconds.
</DocCard>

</Cards>

<VideoEmbed src="https://youtu.be/dQw4w9WgXcQ" title="Demo" />
<Carousel><Slide title="A">…</Slide><Slide title="B">…</Slide></Carousel>
<CalloutWithAction tone="info" title="Try it" action="Open playground" href="…">…</CalloutWithAction>
```

### Dev reference

```md
<APIEndpoint method="POST" path="/v1/orders" auth="bearer">

### Body
### Response 201
### Errors

</APIEndpoint>

<EnvVarsTable>
<Env name="DATABASE_URL" type="url" required secret>Postgres URL.</Env>
<Env name="LOG_LEVEL" type="enum" default="info">debug / info / warn / error.</Env>
</EnvVarsTable>

<FileTree>
src/
  index.ts
  components/
    Steps.tsx
</FileTree>

<PackageBadge name="@filemark/mdx" type="npm" version="0.1.0" license="MIT" />
```

### Doc workflow chips

```md
<DocStatus state="approved" owner="aman" updated="2026-04-25"></DocStatus>
<LastUpdated date="2026-04-25" by="aman" />
<EditThisPage repo="thesatellite-ai/filemark" path="examples/showcase.md" branch="main" />
<ReadingTime></ReadingTime>
<Badge tone="warn">beta</Badge>
```

### Knowledge connectivity

```md
<Define term="filemark">A reader-first markdown renderer for Chrome.</Define>

<!-- Now any later occurrence of "filemark" in this doc gets an `<abbr>`
     popover with the definition. Single-doc only; cross-doc index TBD. -->

<Footnote>Inline numbered footnote with a click-to-reveal popover.</Footnote>
```

### Marketing / engagement

```md
<PullQuote author="Linus Torvalds" role="creator of Linux">
Talk is cheap. Show me the code.
</PullQuote>

<Testimonials cols="3">
  <PullQuote …/>
  <PullQuote …/>
  <PullQuote …/>
</Testimonials>

<AuthorCard name="Ada Lovelace" role="founding engineer" avatar="…" twitter="ada" github="ada">
Wrote the first version. Lives in markdown.
</AuthorCard>

<AISummary status="ready">
One-paragraph overview goes here. Status="pending" shows a placeholder.
</AISummary>
```

### Visual / data viz extensions

```md
<Heatmap title="Daily commits" year="2026">
day,commits
2026-01-04,3
…
</Heatmap>

<AnnotatedImage src="./screenshot.png" alt="Filemark UI">
<Hotspot x="0.18" y="0.42">Sidebar — files + tabs</Hotspot>
<Hotspot x="0.62" y="0.78">Task panel — cross-file aggregator</Hotspot>
</AnnotatedImage>

<Sparkline data="3,5,4,7,6,8,9" />
<Gauge value="72" label="Coverage" unit="%" target="80" thresholds="40,70" />
<Treemap height="320">
name,value,group
React,4500,frontend
Vue,2100,frontend
Express,3200,backend
</Treemap>

<Lightbox>
  <img src="./a.png" alt="A" />
  <img src="./b.png" alt="B" />
</Lightbox>
```

### Interactive

```md
<Quiz question="What does colorFreezeLevel:2 do?">
<Choice>Limits the palette to 2 hues.</Choice>
<Choice correct>Stops the per-depth colour cycle at depth 2.</Choice>
<Choice>Disables panning.</Choice>
</Quiz>

<Poll id="favorite-tier" question="Which Tier excited you most?">
<PollOption>Tier 1</PollOption>
<PollOption>Tier 2</PollOption>
<PollOption>Tier 3</PollOption>
</Poll>
```

Poll counts persist via `localStorage` keyed by `id=` — local-only (no server / no cross-user aggregation).

### GitHub artifact cards

```md
<PRCard repo="org/repo" number="42" state="merged" title="…" author="ada" />
<IssueCard repo="org/repo" number="13" state="open" title="…" author="grace" />
<CommitCard repo="org/repo" sha="a3f1c2d" date="2026-04-25" title="…" author="aman" />
```

State tones: PR `open` (emerald) / `merged` (violet) / `closed` (rose) / `draft` (zinc); Issue `open` / `closed`. Each card auto-builds its GitHub URL.

## Backlinks — inbound wikilinks

```md
<Backlinks></Backlinks>
<Backlinks title="Referenced from" empty="No inbound links yet."></Backlinks>
```

Reads inbound `[[Target]]` and `[[Target|anchor]]` references from other docs in the library (host-supplied via `BacklinksProvider` — wired in chrome-ext's `Viewer.tsx`). Renders nothing useful in pure-MDX previews; light up in chrome-ext where the link index is populated.

## Datagrid — fenced CSV with type hints

The simplest form: a ```` ```csv ```` fence with a header row. Columns auto-inferred (`age` → number, `joined` → date, `active` → bool).

````md
```csv
name,age,joined,active
Ada,30,2020-04-02,true
Grace,45,2015-11-19,false
```
````

Add **type hints + options** in the fence meta line. Grammar:

```
```csv type:<col>=<kind>[(opts)] [type:<col2>=<kind2>] [title="…"] [no-filter] [sort="col:desc"] [hide="col1,col2"]
```

Column kinds:

| kind | What it renders | Options |
|---|---|---|
| `status` | Colored badge — conventional defaults (`done/ok` → success, etc.) | `status(key:tone,…)` to override. Tones: `success/warn/danger/info/muted/primary/secondary`. Aliases: `red/green/amber/yellow/blue/gray/neutral` |
| `tags` | Comma-split chips, deterministic color per tag | `tags(\|)` to use a custom separator |
| `checkmark` | Read-only ✓ / — | — |
| `rating` | Star rating | `rating(5)` to set max |
| `avatar` | Avatar image cell | — |
| `currency` | Formatted money | `currency(USD)` / `currency(EUR,2)` |
| `percent` | Percentage | `percent(1)` for 1 decimal |
| `filesize` | Bytes → KB/MB/GB | — |
| `date` | Formatted date | `date(MMM d)` |
| `link` | Clickable link | — |
| `number` | Right-aligned number | — |
| `text` | Default | — |

External CSV (requires a folder-picked root):

```md
<Datagrid src="./data/crew.csv" type:skills="tags"></Datagrid>
```

Accepts also ```` ```tsv ```` (tab-separated) and ```` ```md ```` (markdown table) with the same meta-grammar.

## Kanban — from CSV or from tasks

From a fenced CSV:

````md
```kanban group-by="status" order="todo,wip,done" title="Sprint board"
id,title,status,owner,priority
1,Login page,wip,alice,high
2,API rate-limit,todo,grace,medium
3,Deploy pipeline,done,linus,low
```
````

From markdown tasks in the same doc (**this is the killer feature**):

```md
<Kanban md group-by="status" title="Tasks — by status"></Kanban>
<Kanban md group-by="priority" order="p0,p1,p2,p3" filter="is:open"></Kanban>
<Kanban md group-by="owner" height="420"></Kanban>
```

The `md` flag tells Kanban to source from the document's own `- [ ]` task bullets. Every `<TaskList>`, `<Kanban md>`, and `<TaskTimeline md>` in a single document shares **one parse**.

## Chart — bar, line, pie, area, scatter, funnel, radar

Fence-lang sets the type:

````md
```bar x=region y=revenue title="Q2 revenue"
region,revenue
North,9380
South,10650
East,10860
```

```line x=month y=users,revenue smooth show-legend
month,users,revenue
Jan,1200,12400
Feb,1380,15800
```

```pie x=channel y=spend donut show-legend
channel,spend
Google,48000
LinkedIn,12000
```
````

Also accepts ```` ```chart type=<kind> ```` if you want a generic fence tag.

Extras: `show-table` (a11y fallback), `reference-line=<y>`, `annotations=<x1:label1,x2:label2>`, `palette=colorblind`, `by=<pivot-col>` for long-form → multi-series.

## Mermaid + ER diagrams

```` ```mermaid ```` for flowcharts, sequences, state, class, pie, gantt, mindmap.

```` ```schema ```` auto-detects SQL/Prisma/DBML and renders an interactive ER diagram. Also: ```` ```sql ````, ```` ```prisma ````, ```` ```dbml ````.

## Tasks — the markdown-native task system

### Anatomy of a task bullet

```
- [ ] Do the thing @alice !p1 ~2026-05-10 #backend &2h (launch) .area/work ^task-do-thing
  │ │  │             │      │     │             │         │            │              │
  │ │  text          owner  prio  due           tag       project      area           stable id
  │ status: [ ] [/] [x] [-] [?] [!]
  │
  bullet marker (`- [ ]` is GFM; all extra sigils are filemark conventions)
```

Sigils scanned **tail-first** (from end of line back) — leading prose stays untouched.

### Six statuses

| Syntax | Meaning |
|---|---|
| `- [ ]` | todo |
| `- [/]` | wip (in progress) |
| `- [x]` | done |
| `- [-]` | cancelled |
| `- [?]` | question / blocked |
| `- [!]` | blocked |

### Full sigil reference

| Sigil | Example | Meaning |
|---|---|---|
| `@<user>` | `@alice` | Owner (repeatable for co-owners) |
| `!p0` – `!p3` | `!p0` | Priority |
| `~<date>` | `~2026-05-10` `~monday` `~today` `~tomorrow` `~next-week` | Due |
| `^<date>` | `^2026-04-23` | Scheduled / start |
| `=<date>` | `=2026-04-19` | Completed on (recurring tasks) |
| `#<tag>` | `#backend` | Freeform tag |
| `(<project>)` | `(launch)` | Project (single) |
| `.area/<path>` | `.area/work` `.area/home` | Area (hierarchical) |
| `*<goal>` | `*q3-goal` | Goal |
| `&<dur>` | `&30m` `&2h` `&1d` | Estimate |
| `%<n>` | `%60` | Percent complete |
| `$<amount>` | `$1200` | Cost |
| `[<text>](<url>)` at tail | `[ticket](https://linear.app/...)` | External ref |
| `after:<id>` | `after:task-do-it` | Dependency — must complete first |
| `related:<id>` | `related:task-do-it` | Soft link — not a blocker |
| `every:<spec>` | `every:daily` `every:weekly` `every:2weeks` `every:mon,wed,fri` `every:7d` | Recurrence |
| `^task-<slug>` | `^task-monday-ship` | Stable id — `after:`/`related:` targets |

### Recurrence specs

All forms the parser accepts for `every:`:

```
every:daily
every:weekly
every:biweekly
every:monthly
every:yearly
every:2weeks      every:3weeks    every:4weeks
every:2months     every:3months   every:6months
every:7d          every:14d       every:30d       every:90d
every:mon         every:tue       every:wed       every:thu
every:fri         every:sat       every:sun
every:mon,wed,fri every:tue,thu
every:weekday     every:weekend
```

Filemark does **not auto-create** the next instance when you check the box. It renders a 🔁 chip + lets `is:recurring` / `has:recurrence` filter views. Rolling the routine forward is a manual (or AI) edit.

### `::` metadata fence — hide sigils from prose

When a sigil-like string is part of the visible task text, wrap the metadata in a `::…::` fence so it doesn't get eaten:

```md
- [ ] Reply to @support about invoice :: @alice !p1 ~2026-04-30 ::
```

Tail-scan parses only inside the fence. Task text becomes `"Reply to @support about invoice"`, owner `alice`, priority `p1`.

### Backslash escape

```md
- [ ] Tag \#1 on the list  (literal `#1`, not a tag)
- [ ] Rate \@3 stars       (literal `@3`, not an owner)
```

### Subtasks, details, notes

Indent under a bullet for any of:

```md
- [ ] Parent task @alice !p0

    A paragraph of detail. Opens in a right-side **popup sheet**, the row itself stays compact. You'll see a 📎 chip on the row.

    ![mockup](https://example.com/mock.png)

    ```ts
    interface Foo { bar: string }
    ```

    | col | col |
    |---|---|
    | yes | no |

    <Callout type="tip" title="Works inside detail too">

    Every filemark component renders inside a task detail.

    </Callout>

    - [/] Subtask one @alice
    - [ ] Subtask two @grace ~2026-05-05

        Subtasks get their own popup detail — independent rows.
```

GFM rule — indent **4 spaces** (or a tab) past the bullet marker for continuation. Filemark is lenient (2+ spaces works) but 4 is the safe default.

### Frontmatter defaults

Declare project-wide defaults so you don't repeat them on every bullet:

```yaml
---
title: Q3 launch plan
defaults:
  project: launch
  area: work
  owner: alice
---
```

Every task in the file inherits `project=launch`, `area=work`, `owner=alice` unless the bullet overrides.

### Stable IDs

Hand-author or let filemark derive (FNV-1a hash of task text). Other tasks reference by id:

```md
- [ ] Ship payment v2 ^task-pay-v2 @alice !p0
- [ ] Announce launch after:task-pay-v2 @grace
- [ ] Write retro related:task-pay-v2 @linus
```

Missing deps show a diagnostic chip — never silent.

## Task views

All task views are HTML-style components. Always use `<Tag></Tag>`, never self-close. All accept `md` (parse this doc) and/or `filter=`, `sort=`, `group-by=`, `limit=`, `title=`.

### `<TaskStats>`

```md
<TaskStats md></TaskStats>
<TaskStats md filter="priority in (p0,p1)"></TaskStats>
```

KPI tiles: total, per-status counts, overdue, today, this-week.

### `<TaskList>`

```md
<!-- flat -->
<TaskList title="All open" filter="is:open" sort="priority:asc,due:asc" limit="15"></TaskList>

<!-- grouped by status -->
<TaskList group-by="status"></TaskList>

<!-- smart time buckets: Overdue · Today · Tomorrow · This week · Next week · Later · No due -->
<TaskList group-by="due-bucket" filter="is:open"></TaskList>

<!-- by owner (multi-owner tasks appear in each group) -->
<TaskList group-by="owner"></TaskList>
```

### `<Kanban md>`

```md
<Kanban md group-by="status" title="By status"></Kanban>
<Kanban md group-by="priority" order="p0,p1,p2,p3" filter="is:open" height="420"></Kanban>
<Kanban md group-by="owner"></Kanban>
```

### `<TaskTimeline md>`

Gantt-lite. Requires `~due` and/or `^scheduled` dates.

```md
<TaskTimeline md lane="status"></TaskTimeline>
<TaskTimeline md lane="owner" filter="is:open"></TaskTimeline>
<TaskTimeline md lane="priority" title="By priority"></TaskTimeline>
```

## Filter DSL (predicate grammar)

Used in `filter=` on every task view. Recursive-descent parser — no injection, no eval.

```
filter ::= expr
expr   ::= term (("AND" | "OR") term)*
term   ::= "NOT"? atom
atom   ::= field op value
         | "is:" shortcut
         | "has:" attr
         | "(" expr ")"
```

**Operators:** `=` · `!=` · `<` · `<=` · `>` · `>=` · `in (…)` · `not in (…)` · `matches /re/`.

**Fields:** `status` · `priority` · `owner` · `project` · `area` · `goal` · `tag` · `due` · `scheduled` · `estimate` · `percent` · `cost`.

**`is:` shortcuts:**

| shortcut | expands to |
|---|---|
| `is:open` | `status != done AND status != cancelled` |
| `is:done` | `status = done` |
| `is:todo` | `status = todo` |
| `is:wip` | `status = wip` |
| `is:blocked` | `status = blocked OR status = question` |
| `is:overdue` | `due < today AND is:open` |
| `is:today` | `due = today` |
| `is:this-week` | `due in <current week>` |
| `is:recurring` | `has:recurrence` |

**`has:` checks:** `has:due` · `has:owner` · `has:project` · `has:estimate` · `has:recurrence` · `has:detail` · `has:blockers`.

**⚠️ `<` breaks HTML attribute parsing.** Use `in (…)` instead:

```md
<!-- BAD -->
<TaskList filter="priority <= p1"></TaskList>

<!-- GOOD -->
<TaskList filter="priority in (p0,p1)"></TaskList>
```

**Examples:**

```
is:open AND priority in (p0,p1)
is:recurring AND owner = alice
(status = todo OR status = wip) AND due <= next-week
NOT is:recurring AND has:due
tag matches /^infra/
```

## Sort & group

`sort=` is comma-separated `field:asc|desc`:

```
sort="priority:asc,due:asc"
sort="owner:asc,priority:desc"
```

`group-by=` accepts: `status` · `priority` · `owner` · `project` · `area` · `goal` · `tag` · `due-bucket` · `recurrence`.

For status-grouped views, canonical order is `todo → wip → blocked → question → done → cancelled`. Override with `order=`.

## Cross-file aggregation (Task panel)

Filemark's side-panel reads from a global task index — every open file contributes tasks. The **inline** components (`<TaskList>`, `<Kanban md>`, etc.) are scoped to **one document**. The side-panel aggregates across **all** open files. Same DSL both places.

## AI agents — reading, writing, managing tasks

Filemark treats markdown as the source of truth. AI agents **read** tasks by grepping or by calling `extractTasks()`, **write** tasks by composing a bullet line, and **manage** tasks by editing text in place. Never through an API or DB. This section is the complete contract for doing those three things without corrupting the file.

### Reading — grep patterns by sigil

Every sigil is a simple ASCII token on its own line — greppable without a parser. The patterns below work with plain `grep` or ripgrep (`rg`) across any repo.

| You want | Pattern |
|---|---|
| All tasks | `rg -n '^\s*- \[[ /x\-?!]\]' .` |
| All open tasks (not done/cancelled) | `rg -n '^\s*- \[[ /?!]\]' .` |
| All todo (unstarted) tasks | `rg -n '^\s*- \[ \]' .` |
| All in-progress | `rg -n '^\s*- \[/\]' .` |
| All done | `rg -n '^\s*- \[x\]' .` |
| All blocked | `rg -n '^\s*- \[[!?]\]' .` |
| Every P0 task | `rg -n '!p0\b' .` |
| Every task for alice | `rg -n '@alice\b' .` |
| Every task tagged #backend | `rg -n '#backend\b' .` |
| Every task in project (launch) | `rg -n '\(launch\)' .` |
| Every recurring task | `rg -n 'every:' .` |
| Every task with a due date | `rg -n '~\d{4}-\d{2}-\d{2}\|~(today\|tomorrow\|monday\|tuesday\|wednesday\|thursday\|friday\|saturday\|sunday\|next-week)' .` |
| Tasks due in April 2026 | `rg -n '~2026-04-\d{2}' .` |
| Tasks that depend on another task | `rg -n 'after:task-' .` |
| External-linked tasks | `rg -n '^\s*- \[.\].*\]\(https?://' .` |
| Detail-bearing tasks | See "detail detection" below |

### Reading — combined filters

grep can't express `AND`/`OR` directly, but pipes work:

```bash
# Open AND p0 (both patterns must match)
rg -n '^\s*- \[[ /?!]\].*!p0' .

# Alice AND overdue (due before today = 2026-04-24)
rg -n '@alice.*~2026-0[1-3]-\d{2}' .

# Done last month (status=done + completed-on date)
rg -n '^\s*- \[x\].*=2026-03-\d{2}' .

# Blocked by a specific upstream
rg -n 'after:task-payment-v2' .
```

For real boolean queries + time math, parse with the extractor (below).

### Reading — programmatic via `@filemark/tasks`

```ts
import { extractTasks } from "@filemark/tasks";
import { readFileSync } from "node:fs";

const body = readFileSync("tasks.md", "utf8");
const tasks = extractTasks(body, { file: "tasks.md" });
// tasks: Task[] with fields { id, text, status, owner, priority, due,
//   scheduled, tags, project, area, goal, estimate, percent, cost,
//   refs, blockers, related, recurrence, detail, detailLineRange, line }
```

Use this for: aggregation across files, cross-references (`after:` / `related:` resolution), date math, anything grep can't do cleanly. The parser is pure-JS, zero deps, drops out on CI.

### Reading — detail detection

A task has rich detail when the bullet is followed by **indented continuation lines** (4+ spaces, or a tab). Grep detection:

```bash
# Tasks followed by at least one indented line
rg -nU --multiline '^(\s*)- \[.\].*\n\1    \S' .
```

In `extractTasks()` output, check `task.detail` (the raw markdown block) and `task.detailLineRange` (1-indexed line span in the body).

### Writing — create a new task

A valid task line looks like:

```md
- [<status>] <text> <sigils>…
```

All sigils are **tail-first** — put the visible prose up front, metadata at the end:

```md
- [ ] Ship payment v2 @alice !p0 ~2026-05-10 &2h (launch) #infra ^task-pay-v2
```

Ordering rules for the sigils themselves do not matter — the parser scans tail-first. But **consistent order reads better**: owner → priority → due → estimate → project → tags → stable-id is the convention in the example files.

Minimum valid task:

```md
- [ ] Do the thing
```

Add sigils as you learn the data. Never invent sigils that don't appear in the "Full sigil reference" table — unrecognized tokens get pushed into the task text and become part of the visible prose.

### Writing — hide metadata inside prose with `::`

When the task text itself contains a sigil character (`@`, `#`, `!`, `(`, `~`, `^`, etc.), wrap the real metadata in the `::…::` fence so tail-scan parses only inside it:

```md
- [ ] Reply to @support about invoice :: @alice !p1 ~2026-04-30 ::
```

Task text after parse: `"Reply to @support about invoice"`.

If you write a task bullet into an existing file and the original had a `::` fence, **preserve it verbatim** — don't unwrap even if it "looks fine" without.

### Writing — when to escape with `\`

Use backslash only when the sigil would otherwise be parsed. Outside of sigil positions, no escape is needed.

```md
- [ ] Tag \#1 on the list   <!-- literal "#1" in text -->
- [ ] Rate \@3 stars        <!-- literal "@3" in text -->
```

### Writing — adding indented detail

Indent **4 spaces** past the bullet marker. Blank line between bullet and detail is required.

```md
- [ ] Parent task @alice !p0

    A paragraph of detail.

    ```ts
    interface Foo { bar: string }
    ```

    <Callout type="tip" title="Nested component works">

    Components inside detail render normally.

    </Callout>
```

If you strip detail, you strip the `📎` chip and the popup. If you nest a subtask inside detail, it becomes a task of its own (with its own popup if *it* has detail).

### Managing — edit-in-place operations

**Always preserve:**

1. Leading indentation of the bullet line (it determines subtask nesting).
2. The stable id `^task-<slug>` if present — other tasks may depend on it.
3. Every unrecognized token, *including* trailing whitespace inside `::…::` fences.
4. The `=<date>` completion marker on recurring tasks (it's how history is reconstructed).
5. Frontmatter `defaults:` block — tasks below depend on it for inherited project/area/owner.

**Flipping a checkbox** — only modify the two characters between `[` and `]`:

```
- [ ] …   →   - [x] …
- [/] …   →   - [x] …
- [x] …   →   - [ ] …   (un-complete)
```

Do **not** re-serialize the line via a parse-then-emit round trip — you'll lose any quirk the parser didn't model.

**Adding a dependency** — append `after:<target-id>` to the dependent task, before the stable id if one exists:

```md
- [ ] New work @grace !p1 ~2026-05-10 after:task-pay-v2 ^task-new-work
```

**Changing a due date** — replace the existing `~<date>` token in place. Don't duplicate.

**Reassigning owner** — replace the `@<user>` token. Multiple `@` tokens become multiple owners (intentional for pair-owned work).

**Promoting a task to have detail** — insert a blank line after the bullet, then add 4-space-indented content below. Don't put content on the same line as the bullet.

### Managing — rolling a recurring task forward

Filemark does **not** auto-create the next instance when a `every:` task is checked. The AI (or the human) writes the next bullet manually. Canonical pattern:

```md
<!-- Before checking off: -->
- [ ] Weekly review @alice every:weekly ~2026-04-26

<!-- After completion, turn the original into a dated-done record + write the next: -->
- [x] Weekly review @alice every:weekly =2026-04-26
- [ ] Weekly review @alice every:weekly ~2026-05-03
```

Rules:

- Keep `every:<spec>` on both the completed row and the new row — preserves history provenance.
- New due date = previous `~due` + recurrence interval. For `weekly`: +7d. `biweekly`: +14d. `2weeks`: +14d. `7d`: +7d. `mon,wed,fri`: next matching weekday.
- If the recurrence has a cadence (`~monday`), advance the relative token — don't hard-code the absolute date unless the user asked for it.
- Stable id, if any, must change on the new bullet (it's a new row). Use `^task-<slug>-<date>` to make new ids unique but discoverable.
- Never skip instances. If today is 2026-04-26 and the task was due 2026-04-19 (missed a week), the agent should ask — don't silently produce a 2026-05-03 row that pretends the skip didn't happen.

### Managing — bulk operations

**Rewrite one task line in place (canonical metadata order):**

```ts
import { extractTasks, serializeTaskLine } from "@filemark/tasks";
import { readFileSync, writeFileSync } from "node:fs";

const body = readFileSync("tasks.md", "utf8");
const tasks = extractTasks(body);
const lines = body.split(/\r?\n/);

for (const t of tasks) {
  if (t.priority === "p0" && t.status === "todo") {
    // serializeTaskLine emits a canonical-order bullet for just this task
    lines[t.line - 1] = serializeTaskLine(t);
  }
}

writeFileSync("tasks.md", lines.join("\n"));
```

`serializeTaskLine(task)` emits the canonical metadata order. `serializeTask(task)` returns the same without the leading `- [x] ` — handy when you want to splice the body into an existing bullet structure.

**Re-assign every task from @departed-user to @new-owner:**

```bash
rg -l '@departed-user' . | xargs sed -i '' 's/@departed-user\b/@new-owner/g'
```

(`sed -i ''` is macOS form; GNU sed drops the empty arg.)

**Close out a project:**

```bash
# Flip all open tasks in (sprint-41) to cancelled
rg -l '(sprint-41)' . | xargs sed -i '' 's/^- \[[ /?!]\]\(.*\(sprint-41\).*\)$/- [-]\1/g'
```

Grep/sed is fine for single-sigil swaps; reach for `extractTasks()` when you need multi-field logic.

### Safety rules for AI editing

Order the list below from highest-stakes to lowest:

1. **Never renumber or rewrite existing stable ids (`^task-<slug>`).** Other files / other tasks may reference them via `after:` / `related:`. Breaking one breaks the cross-file graph silently.
2. **Never auto-advance recurring due dates on check-off without user confirmation.** The whole point of `every:` being a reader-only chip is that the human stays in control of calendar semantics.
3. **Never collapse a `::…::` fence** into tail-scanned sigils. The fence exists *because* the prose contains sigil-like tokens; unwrapping corrupts the visible text.
4. **Never strip backslash escapes (`\#`, `\@`).** They're literal authoring choices.
5. **Never touch frontmatter `defaults:`** when editing a single task — you'll silently re-attribute every task in the file.
6. **Never reorder bullet lines unless explicitly asked.** Task `line` numbers are part of task identity (the task panel's "scroll to task" uses them).
7. **Don't introduce sigils not in the reference table.** Unknown tokens become text noise.
8. **When in doubt, preserve the original line verbatim** and add a comment above saying what change was proposed but not applied. Filemark ignores regular `<!-- html comments -->` in prose.

### Round-trip guarantee (`parseTaskLine` → `serializeTaskLine`)

`@filemark/tasks` exposes a paired single-line parser + serializer: for any canonical-form line, `serializeTaskLine(parseTaskLine(line)) === line` (byte-identical). Non-canonical inputs (metadata in unusual order, extra whitespace, uppercase `X`) normalize to canonical on re-emit — that's the formatter pass, deliberately idempotent.

Recipe for task-only edits that leave the rest of the file untouched:

```ts
import { extractTasks, serializeTaskLine } from "@filemark/tasks";

const body = readFileSync(path, "utf8");
const lines = body.split(/\r?\n/);
const tasks = extractTasks(body);

// Mutate only tasks you actually edit:
for (const t of tasks) {
  if (/* your condition */) {
    /* mutate fields on `t` */
    lines[t.line - 1] = serializeTaskLine(t);
  }
}

writeFileSync(path, lines.join("\n"));
```

This leaves prose, other bullets, fenced code, frontmatter, and unmodified tasks bit-identical to the input. Agents should prefer this pattern over manual string surgery — it's the only round-trip guarantee the library gives.

## Patterns & recipes

### A dashboard top section

```md
<Stats cols="4">
  <Stat title="Total tasks" value="42" />
  <Stat title="Open" value="28" delta="-4" intent="success" description="WoW" />
  <Stat title="Overdue" value="3" delta="+1" intent="danger" />
  <Stat title="Shipped" value="14" delta="+6" intent="success" />
</Stats>

<TaskStats md></TaskStats>

<Kanban md group-by="status" title="Current sprint"></Kanban>
```

### Weekly review

```md
## Overdue + due this week

<TaskList group-by="due-bucket" filter="is:open AND due <= next-week"></TaskList>

## Recurring routine health

<TaskList group-by="project" filter="is:recurring AND is:open" title="Routines"></TaskList>
```

### Multi-owner plan

```md
<TaskList group-by="owner" filter="is:open" sort="priority:asc,due:asc"></TaskList>

<TaskTimeline md lane="owner" filter="is:open"></TaskTimeline>
```

### Decision log

```md
<ADR status="accepted" id="ADR-001" date="2026-04-10" title="Adopt filemark">

### Context

The team needs a local-first doc viewer that renders tasks + kanban directly from markdown — no Notion sync, no Linear import.

### Decision

Use filemark as the canonical doc reader. Markdown stays the source of truth; filemark is a visualization layer only.

### Consequences

- All task management happens in `.md` files, greppable on disk
- Onboarding: install the Chrome extension + point at the repo folder
- Lost: drag-and-drop task reordering, @-mentions that notify

</ADR>
```

### Sprint board from frontmatter-defaulted tasks

```md
---
defaults:
  project: sprint-42
  area: work
---

## Board

<Kanban md group-by="status" order="todo,wip,review,done" title="Sprint 42"></Kanban>

## Tasks

- [ ] Design API contract @alice !p0 ~2026-05-10
- [/] Wire DB migration @grace !p1 ~2026-05-12
- [ ] Review PR #412 @linus !p1
- [x] Project kickoff @alice =2026-04-22
```

### One-source rule for plan docs — views on top, bullets at end

For brainstorm / plan / spec docs that have multiple `<TaskList>` / `<Kanban md>` / `<TaskTimeline md>` views slicing the same task pool: **put every view on top, every source bullet in a single `## Source — all tasks` (or similar) section at the end.** Never repeat the bullets next to each view — `<TaskList filter="(tier-1)">` and the raw `- [ ] … (tier-1)` bullets right below it both render to the screen, so the reader sees the same tasks twice. Confusing, fixes nothing.

❌ **Wrong** — view + source intermixed:

```md
## Tier 1

<TaskList filter="(tier-1)" sort="priority:asc"></TaskList>

- [ ] Resize panel !p1 (tier-1) ^task-resize
- [ ] Full-screen mode !p1 (tier-1) ^task-fullscreen
```

✅ **Right** — views on top, source appendix at end:

```md
## Tier 1

<TaskList filter="(tier-1)" sort="priority:asc"></TaskList>

**Definition of done:** Tier 1 is shippable when every task above closes.

## Tier 2

<TaskList filter="(tier-2)" sort="priority:asc"></TaskList>

---

## Source — all tasks

Single source of truth. Edit here; views above re-render automatically.

### Tier 1 source

- [ ] Resize panel !p1 (tier-1) ^task-resize
- [ ] Full-screen mode !p1 (tier-1) ^task-fullscreen

### Tier 2 source

- [ ] Saved views !p2 (tier-2) ^task-saved-views
```

**When the inverse pattern is fine:** simple task-tracker docs (like a `TASKS.md` or `BACKLOG.md`) where bullets are organized under their own headings (milestones / sprints / sections) and views at the top use a *different* lens (`group-by="project"` while sections are by milestone). The two lenses don't collide — different organizing axis. The clash only happens when the view's filter and the bullet's grouping are the same dimension.

## Gotchas

**Blank lines inside components.** See Rule 1 above. If you see markdown rendered literally inside a `<Callout>` / `<Tabs>` / `<Details>`, add blank lines above and below the content.

**Self-closing tags eat content.** See Rule 2. `<TaskStats md/>` without an explicit `</TaskStats>` will swallow every subsequent section.

**Task views are HTML inside markdown.** Attribute values with `<` / `>` break the HTML parser. Use `in (…)` for less-than comparisons. Prefer `"…"` quotes over `'…'` — shadcn-like stacks sometimes mangle single quotes.

**Frontmatter line numbers.** The parser strips frontmatter before extracting tasks, so task `line` fields are body-relative. If you author tools against `extractTasks()`, strip frontmatter first or the panel "scroll to task" will jump to wrong rows.

**External CSV (datagrid / kanban / chart `src=`) only works inside a folder-picked library.** Pure drag-drop has no FS root. Either open via the folder picker, or embed the CSV inline inside a fence.

**`remark-breaks` is on** — single newlines become `<br>`. Paragraph breaks require a blank line. Great for ASCII art + tables-in-paragraphs; surprising if you expect hard CR-only files to collapse.

**MV3 CSP rules out `eval`.** No `@mdx-js/mdx` `evaluate`, no `gray-matter`, no libraries using `new Function()`. All components are pre-registered React components, not runtime MDX.

**Recurrence does NOT auto-generate new bullets.** Filemark is a reader. The AI/human writes the next instance manually when rolling a routine forward. The 🔁 chip + `is:recurring` filter is the entire UX.

**Don't render the same tasks twice.** Bullets always render with a checkbox (via `remark-gfm`), AND a `<TaskList>` view rendering those same bullets prints them again. So `<TaskList filter="(tier-1)">` followed immediately by the `- [ ] … (tier-1)` source bullets shows every task twice. Fix: in plan docs, hoist views to the top and put one canonical `## Source — all tasks` appendix at the end. See *Patterns & recipes → One-source rule for plan docs* above.

## Decision guide

- **Writing docs** → default to plain markdown; add components only where interactive UX helps.
- **Need a KPI section** → `<Stats>` for static / narrative numbers, `<TaskStats md>` for derived-from-tasks numbers.
- **Need a list of todos rendered nicely** → raw `- [ ]` bullets already render with checkboxes. Add `<TaskList>` only when you want grouping / filtering / sorting.
- **Need a board** → `<Kanban md group-by="status">` over `- [ ]` bullets. Avoid duplicating data into a separate CSV.
- **Showing tabular data** → fenced ```` ```csv ```` with type hints. `<Datagrid src=…>` only when the CSV is external.
- **Charting** → fenced ```` ```bar / line / pie ```` with inline CSV. External only if data is huge or updates frequently.
- **Deciding something** → `<ADR status="accepted" …>` in a `decisions/` folder. Cross-link with `supersedes=` / `superseded-by=`.
- **Long prose block that breaks scanability** → wrap it in `<Details summary="…">`.
- **Alternate commands per OS/package manager** → `<Tabs>` with one `<Tab>` per variant.
- **Callouts vs. blockquotes** → `>` blockquote for literary quotes; `<Callout>` for operational guidance you want to stand out.

## More detail

- Filemark repo: <https://github.com/thesatellite-ai/filemark>
- Component catalogue + per-component use cases: `examples/INDEX.md`
- Working example files: `examples/showcase.md`, `examples/tasks-full.md`, `examples/chart-full.md`, `examples/datagrid-full.md`, `examples/kanban-full.md`, `examples/stats-adr-full.md`, `examples/mindmap-full.md`, `examples/planning-v2-full.md`, `examples/planning-v2-tier2.md`, `examples/planning-v2-tier3.md`

Copy any example file into filemark to see the full syntax rendered.
