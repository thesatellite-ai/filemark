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

## Gotchas

**Blank lines inside components.** See Rule 1 above. If you see markdown rendered literally inside a `<Callout>` / `<Tabs>` / `<Details>`, add blank lines above and below the content.

**Self-closing tags eat content.** See Rule 2. `<TaskStats md/>` without an explicit `</TaskStats>` will swallow every subsequent section.

**Task views are HTML inside markdown.** Attribute values with `<` / `>` break the HTML parser. Use `in (…)` for less-than comparisons. Prefer `"…"` quotes over `'…'` — shadcn-like stacks sometimes mangle single quotes.

**Frontmatter line numbers.** The parser strips frontmatter before extracting tasks, so task `line` fields are body-relative. If you author tools against `extractTasks()`, strip frontmatter first or the panel "scroll to task" will jump to wrong rows.

**External CSV (datagrid / kanban / chart `src=`) only works inside a folder-picked library.** Pure drag-drop has no FS root. Either open via the folder picker, or embed the CSV inline inside a fence.

**`remark-breaks` is on** — single newlines become `<br>`. Paragraph breaks require a blank line. Great for ASCII art + tables-in-paragraphs; surprising if you expect hard CR-only files to collapse.

**MV3 CSP rules out `eval`.** No `@mdx-js/mdx` `evaluate`, no `gray-matter`, no libraries using `new Function()`. All components are pre-registered React components, not runtime MDX.

**Recurrence does NOT auto-generate new bullets.** Filemark is a reader. The AI/human writes the next instance manually when rolling a routine forward. The 🔁 chip + `is:recurring` filter is the entire UX.

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

- Filemark repo: `chrome-extensions/filemark`
- Canonical spec: `docsi/TASKS_PLAN.md` (sections 9 for filter DSL, 10 for recurrence)
- Theming tokens: `docsi/THEMING.md` — 55 `--fm-*` CSS variables
- Feature inventory + benchmark: `docsi/TASKS_INVENTORY.md`
- Working example files: `examples/showcase.md`, `examples/tasks-full.md`, `examples/chart-full.md`, `examples/datagrid-full.md`, `examples/kanban-full.md`, `examples/stats-adr-full.md`

Copy any example file into filemark to see the full syntax rendered.
