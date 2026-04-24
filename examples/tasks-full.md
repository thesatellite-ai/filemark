---
title: Tasks — full feature tour
project: filemark
default-owner: alice
default-priority: p1
---

# Tasks — full feature tour

Filemark parses GFM task bullets with **inline sigil metadata** and renders every line as a rich row with chips for priority, owner, dates, tags, links, and more. Same markdown source → multiple views. Edit the file in any editor; filemark re-renders on auto-refresh.

Spec: `docsi/TASKS_PLAN.md`.

---

## 1. The six statuses

Filemark supports six checkbox states. Text gets strikethrough on `done` and `cancelled`.

- [ ] Todo — the plain GFM checkbox
- [/] In progress — Obsidian/Logseq convention `[/]`
- [x] Done — GFM `[x]` (or uppercase `[X]`)
- [!] Blocked — something external is stopping this
- [?] Question — needs a decision before it can move
- [-] Cancelled — struck-through; not counted

Each task below demonstrates the status with a real example.

---

## 2. Owners, priority, due

Put metadata **at the end of the line** — parser tail-scans from the right and stops when it hits text.

- [ ] Ship datagrid v2 @alice !p0 ~2026-04-28 #grid
- [/] Refactor auth middleware @grace !p1 ^2026-04-25 ~2026-04-29 #auth
- [!] DB migration blocked on infra @linus !p0 #infra
- [?] Kill or keep legacy sparkline? @karen !p2 #design
- [x] Pick launch logo @karen !p3 #design
- [-] Old mobile prototype @alice #mobile

Owner is `@<name>` (multiple allowed). Priority is `!p0..!p3` or `!high` / `!med` / `!low` alias. Due is `~<date>`. Start is `^<date>`.

---

## 3. Time expressions

Dates are first-class — ISO, keywords, or relative offsets.

- [ ] Ship tomorrow @alice !p0 ~tomorrow
- [ ] Finish this week @grace !p1 ~eow
- [ ] Next sprint ~next-week @linus !p1 #infra
- [ ] Monthly OKR review ~eom @alice !p2 #review
- [ ] Quarterly planning ~eoq @alice !p1 #planning
- [ ] Yearly roadmap ~eoy @alice !p3 #planning
- [ ] Next Friday demo @grace !p1 ~next-friday #demo
- [ ] Three days from now @alice !p2 ~+3d
- [ ] Two weeks out @alice !p3 ~+2w
- [ ] Date range ~2026-04-28..2026-05-05 @alice #sprint

Relative times resolve against browser-local time at parse.

---

## 4. Tags + projects + area + goal

- [ ] Research competitors @alice !p1 ~eow #research #competitors (launch)
- [ ] Nested tag hierarchy @grace #area/work/grid (launch)
- [ ] Link to a goal @linus !p1 *goal-q2 #planning
- [ ] Area dotted path .ops/observability @grace !p2 #infra

Tags are `#<tag>` (multiple allowed). Projects are `(name)` (single per task). Area is `.dotted/path`. Goal is `*slug`.

---

## 5. Estimate, percent, cost

- [ ] Write launch post @alice !p1 ~eow &2h
- [ ] Migrate auth @grace !p0 ~2026-04-29 &3d %40
- [ ] Vendor evaluation @linus !p2 $500usd &1w
- [ ] Half-done design audit @karen !p2 %50

Estimate: `&<duration>` (units: m/h/d/w). Percent: `%<0..100>`. Cost: `$<amount><currency?>`.

---

## 6. External reference links

Three forms: markdown links, typed shortcodes, bare URLs. All become icon chips.

- [ ] Review draft PR gh:anthropic/filemark#142 @grace !p1 ~fri #grid
- [ ] Check issue gh:anthropic/filemark!87 @alice !p2 #tasks
- [ ] Linear follow-up linear:ENG-1234 @linus !p1 #planning
- [ ] Design review figma:abc123xyz @karen !p2 ~tuesday
- [ ] Watch onboarding video yt:dQw4w9WgXcQ @alice !p3
- [ ] Read the spec [design doc](https://example.com/spec) @alice !p1 ~fri
- [ ] Bare URL detection https://github.com/anthropic/filemark/pull/200 @grace !p1

Built-in registry: `gh:` `linear:` `jira:` `slack:` `notion:` `figma:` `yt:`. GitHub URLs auto-detect PR vs. issue vs. commit.

---

## 7. Dependencies

Tasks form a DAG — `after:` waits on another task.

- [ ] Foundation work @alice !p0 ~2026-04-25 ^task-foundation
- [ ] Build v2 on top of foundation @grace !p0 ~2026-04-29 after:task-foundation #grid
- [ ] Parent task for ui work ^task-ui-work @alice !p1
- [ ] Sub-item via explicit parent link @karen !p2 parent:task-ui-work #ui

The `^task-<slug>` suffix gives a task a stable id others can reference.

---

## 8. Subtasks (indented)

- [/] Ship datagrid v2 @alice !p0 ~2026-04-28 #grid
  - [x] Multi-sort
  - [/] Typed filters
  - [ ] Aggregation footer
  - [ ] Column resize persistence
- [ ] Kanban v2 @grace !p1 ~eom #kanban
  - [ ] Swimlanes
  - [ ] WIP limits
  - [ ] Collapsible columns

Nesting comes from 2-space indents. Parent's completion % derives from children unless explicitly overridden with `%`.

---

## 9. Notes on a task

A non-task child bullet under a task becomes a collapsible note. Useful for context / research links / commentary that belongs with the task but isn't itself a task.

- [ ] Ship timeline component @grace !p1 ~eom #planning
  - Core primitive is SVG date axis + bars
  - Reuse recharts' existing axis primitives?
  - Open question: does it share data layer with kanban?

---

## 10. The `::` metadata fence

Sometimes the task text legitimately ends with a sigil-looking token. Use `::` to force a metadata split.

- [ ] Email @team about the #launch :: @alice !p1 ~fri

Everything left of `::` is verbatim text; everything right is metadata. Without the fence, the tail-scan would consume `#launch` as a tag.

---

## 11. Backslash escape

Single character escape for a literal sigil in task text.

- [ ] Check \#grid tag appears literally @alice !p0 #auth
- [ ] Keep \@username literal in prose @grace !p2

---

## 12. Inline code literal

Backtick-wrapped content is never parsed as metadata.

- [ ] Review `#grid` tag and `@alice` mention @alice !p1 #grid
- [ ] Document the `~` sigil @karen !p2 #docs

---

## 13. Custom fields

Extend the grammar without a parser change — any `x-<name>=<value>` becomes a custom field.

- [ ] Linked from Jira x-jira=PROJ-42 @alice !p1 ~fri #migration
- [ ] Custom severity x-severity=critical @linus !p0 #infra
- [ ] Impact score x-impact=high @grace !p1 #launch

---

## 14. Diagnostics

Bad metadata emits a warning chip (hover for message) without breaking the parse.

- [ ] Unknown priority !veryhigh @alice ~fri
- [ ] Bad date ~notadate @grace !p1
- [ ] Unknown status but still renders @linus !p2

---

## 15. Frontmatter defaults cascade

Check the frontmatter at the top of this file — `project: filemark`, `default-owner: alice`, `default-priority: p1`. Tasks inherit those when they don't specify their own.

- [ ] Minimal task — inherits everything
- [ ] Override priority !p0 — inherits owner + project
- [ ] Override owner @grace — inherits priority + project
- [ ] Full override @linus !p3 (other-project) — overrides everything

Open the frontmatter block to see the defaults.

---

## 16. Stable-id references

The `^task-<slug>` identity sigil lets other tasks point at this one. If the task text changes, its id stays stable.

- [ ] Shippable by monday ^task-monday-ship @alice !p0 ~monday
- [ ] Follow-up depends on the above @grace after:task-monday-ship !p1
- [ ] Related research @linus related:task-monday-ship !p2 #research

---

## 17. `<TaskStats md>` — KPI tiles

<TaskStats md></TaskStats>

Counts for this doc: total + each status + overdue + today + this-week.

## 18. `<TaskStats md filter=…>` — filtered

<TaskStats md filter="priority in (p0,p1)"></TaskStats>

Only counts p0 + p1 tasks. Use `in (…)` set syntax instead of `<=` — `<` in an HTML attribute value breaks the tag parser.

---

## 19. `<TaskList>` — flat list over all tasks

<TaskList title="All open tasks" filter="is:open" sort="priority:asc,due:asc" limit="15"></TaskList>

Predicate DSL (see `docsi/TASKS_PLAN.md §9.1`): `is:open` derives to `status != done AND status != cancelled`. Sort multi-key; limit caps rows.

## 20. `<TaskList group-by="status">` — grouped list

<TaskList group-by="status"></TaskList>

Tasks split into columns by status. Order is canonical: todo → wip → blocked → question → done → cancelled.

## 21. `<TaskList group-by="owner">` — by owner

<TaskList group-by="owner" filter="is:open"></TaskList>

Tasks with multiple owners appear in each matching group (many-to-many rendering, like Linear's assignee groupings).

## 22. `<TaskList group-by="due-bucket">` — smart time buckets

<TaskList group-by="due-bucket" filter="is:open"></TaskList>

Overdue · Today · Tomorrow · This week · Next week · Later · No due.

---

## 23. `<Kanban md>` — board from task bullets

<Kanban md group-by="status" title="Tasks — by status"></Kanban>

A board fed directly from the bullets above. No CSV. No fork. Edit a task → auto-refresh re-renders both the inline list AND this board.

## 24. `<Kanban md group-by="priority">` — priority columns

<Kanban md group-by="priority" order="p0,p1,p2,p3" filter="is:open" title="Open by priority" height="420"></Kanban>

Column order pinned with `order=`. Filter cuts to open tasks only. Height in px.

## 25. `<Kanban md group-by="owner">` — by owner

<Kanban md group-by="owner" filter="is:open" title="Who's on what"></Kanban>

Great for "show me everyone's load" at a glance.

---

## 26. Recurring tasks — `every:<spec>`

Mark tasks that repeat on a schedule. Renders a 🔁 chip + lets you filter with `is:recurring`. Filemark **doesn't** auto-create the next instance on check-off — it's a reader, so the markdown file stays exactly as you (or your AI) wrote it. The chip is informational: it tells a human reader + an AI agent "this is supposed to repeat."

### 26a — a realistic mix of recurring commitments

A typical week's recurring load across ops, planning, and personal habits:

- [/] Standup prep @alice !p2 every:daily ~today #ops
- [ ] Weekly review @alice !p1 every:weekly ~friday #planning
- [ ] Sprint planning @grace !p1 every:biweekly ~2026-04-28 (launch)
- [ ] Monthly retro @alice !p2 every:monthly ~eom #planning
- [x] MWF gym @alice every:mon,wed,fri =2026-04-22 .area/health
- [ ] Team all-hands @linus !p2 every:first-monday ~2026-05-04 #ops
- [ ] Pay rent !p0 every:monthly ~2026-05-01 $2000usd
- [ ] Quarterly goal review @alice every:quarterly ~eoq *goal-q2
- [!] Security training every:yearly ~2026-06-15 #compliance
- [ ] Vendor invoicing @karen every:monthly ~eom $ .area/finance
- [ ] Content calendar sync @grace every:2weeks ~2026-04-30 #marketing
- [ ] Backup verification @linus every:7d ~2026-04-25 #infra
- [ ] Last-friday happy hour @alice every:last-friday ~2026-04-25 #culture

### 26b — KPIs for the recurring slice

How much of your load is repeat work? `<TaskStats>` + the `is:recurring` filter:

<TaskStats md filter="is:recurring"></TaskStats>

### 26c — the weekly routine at a glance

<TaskList filter="is:recurring AND is:open" group-by="project" sort="priority:asc,due:asc" title="Open recurring commitments"></TaskList>

Use `group-by="owner"` to see who carries which cadence, or `group-by="due-bucket"` to see what's coming up this week.

### 26d — recurring work as a board

<Kanban md group-by="status" filter="is:recurring" title="Recurring load — by status"></Kanban>

Same kanban engine as any other task source. Just a filter narrowing to recurrences.

### 26e — recurring work on the timeline

<TaskTimeline md lane="owner" filter="is:recurring" title="Who's on the hook this cycle"></TaskTimeline>

Bars colored by priority; due dates rendered as diamond points when no `^start` is set. The timeline treats `~today` / `~eom` / `~eoq` keywords the same as ISO dates — they resolve at parse time.

### 26f — non-recurring backlog (the complement)

What's NOT recurring — one-offs you still need to do:

<TaskList filter="is:open AND NOT is:recurring" sort="priority:asc,due:asc" limit="10" title="One-off work"></TaskList>

### 26g — pairs that matter for AI agents

The `every:<spec>` token is a **machine-readable** commitment. An AI agent (Claude / any LLM) asked *"what's my Friday routine?"* can grep:

```bash
grep -E "every:(weekly|friday|fri|last-friday)" **/*.md
```

…and get every matching line with file + line number. Without the sigil, "repeats Friday" is unstructured prose that you have to reason about.

Combined with the reader-first model: when an agent spots that **today is Friday + you have a `every:weekly ~friday` bullet marked `[x]`**, it can propose the next-week bullet for you to approve, without ever touching the file unless you say go. That's the workflow the grammar is built for.

### 26h — all the recurrence forms

| Spec | Meaning |
|---|---|
| `every:daily` | every day |
| `every:weekly` | every 7 days |
| `every:biweekly` | every 14 days |
| `every:monthly` | every calendar month |
| `every:quarterly` | every 3 months |
| `every:yearly` / `every:annually` | every calendar year |
| `every:mon,wed,fri` | specific weekdays (any subset of sun..sat) |
| `every:2weeks` / `every:3weeks` | every N weeks |
| `every:7d` / `every:10d` | every N days |
| `every:first-monday` | first Monday of each month |
| `every:last-friday` | last Friday of each month |

Unrecognized specs emit a warning chip with suggested alternatives — malformed recurrence doesn't break the parse.

## 27. Dependencies that actually resolve

Blocked-by detection walks the task graph. A task with `after:task-xyz` or `requires:task-xyz` shows a **🚧 blocked by N** chip listing prerequisites that aren't `done` or `cancelled`. When a blocker finishes, the chip disappears on next render.

- [x] Schema design complete @linus ^task-schema
- [ ] Write migration @grace !p0 ~2026-04-30 after:task-schema #db
- [ ] QA migration @karen !p1 after:task-schema,task-migration-run
- [ ] Deploy ^task-deploy requires:task-qa-migration @alice !p0 #launch

Predicate `is:unblocked` now correctly returns tasks whose prerequisites are all done. `is:blocked` matches `status=blocked` OR any open prerequisite.

## 28. `<TaskTimeline md>` — Gantt-lite from dates

<TaskTimeline md lane="status" title="All tasks — by status"></TaskTimeline>

SVG date-axis bars. Tasks with both `^start` + `~due` render as rectangles. Tasks with only `~due` render as diamond points. `done` / `cancelled` → muted + strikethrough.

## 29. `<TaskTimeline md lane="owner">` — by owner

<TaskTimeline md lane="owner" filter="is:open" title="Open work by owner"></TaskTimeline>

Lane grouping; today vertical marker; priority color (p0 red, p1 amber, p2 blue, p3 muted).

## 30. `<TaskTimeline md lane="priority">` — by priority

<TaskTimeline md lane="priority" title="By priority"></TaskTimeline>

---

Every line above is one sentence of markdown. No database. No server. Grep `!p0` and you get every top-priority item across every file. That's the point.
