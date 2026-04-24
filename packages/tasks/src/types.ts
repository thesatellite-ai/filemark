// ─────────────────────────────────────────────────────────────────────────
// @filemark/tasks — type definitions
//
// Full grammar + design spec lives at docsi/TASKS_PLAN.md. Read that first
// if you're a new AI session picking this up.
//
// Short recap for context:
//
//   This package parses GFM task bullets with inline sigil metadata into
//   typed Task objects. Markdown is the source of truth; the Task shape is
//   a derived view. Round-trip `serializeTask(parseTaskLine(line))` is
//   byte-identical for canonical inputs, which is what lets AI agents edit
//   one line at a time without clobbering formatting.
//
//   The DSL is grep-friendly by invariant:
//     - one task = one line (never wraps)
//     - ASCII-only sigils, each with one meaning
//     - ISO dates, identifier-safe payloads (`[A-Za-z0-9_-]+`)
//     - space-delimited tokens
//
// Nothing in this file touches React or a markdown parser — types are
// pure. Runtime lives in parseLine.ts + extractTasks.ts + serialize.ts.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Task status derived from the checkbox character.
 *
 *   [ ] → todo         (GFM default, empty checkbox)
 *   [/] → wip          (Obsidian/Logseq convention: in-progress)
 *   [x] → done         (GFM default; `[X]` also accepted)
 *   [!] → blocked      (amber alert; external dependency not met)
 *   [?] → question     (needs decision — useful in planning docs)
 *   [-] → cancelled    (strikethrough; not counted toward totals)
 *
 * Kanban column default ordering goes: todo → wip → blocked → question → done,
 * with `cancelled` hidden unless the view explicitly enables it.
 *
 * Reserved for future (Phase 5 / v1.1): `[>]` delegated, `[~]` snoozed,
 * `[=]` waiting. Not in v1.0. Parser returns `todo` + a diagnostic if it
 * sees an unknown status char.
 */
export type TaskStatus =
  | "todo"
  | "wip"
  | "done"
  | "blocked"
  | "question"
  | "cancelled";

/**
 * Priority values — ordered (p0 = highest). The `!high` / `!med` / `!low`
 * aliases author-side resolve to `p0` / `p1` / `p2` respectively. Predicates
 * can use `<=` / `<` / `>` etc. against this ordering.
 */
export type Priority = "p0" | "p1" | "p2" | "p3";

/**
 * A time value — either an absolute date/range or a keyword that resolves
 * against browser-local time at parse time. Stored both as `iso` (resolved
 * concrete date) and `keyword` (original author intent) so:
 *   - queries comparing against `today` can use `iso`
 *   - re-serialization preserves the author's original `~today` vs. a
 *     materialized date
 *
 * Ranges (`~2026-04-28..2026-05-01`) use `start` + `end`. Open-ended
 * ranges (`~>=2026-04-28`, `~<=eow`) set only one side.
 */
export interface TimeValue {
  /** Absolute date (YYYY-MM-DD) when the value resolves to a single day. */
  iso?: string;
  /** Original keyword if the author wrote one. Preserved for re-serialization. */
  keyword?: string;
  /** Range / week / month / quarter start. */
  start?: string;
  /** Range / week / month / quarter end. */
  end?: string;
  /** What kind of time expression the author wrote. */
  kind: "date" | "week" | "month" | "quarter" | "range" | "keyword" | "relative";
}

/**
 * Duration (`&2h`, `&30m`, `&3d`, `&1w`). Stored in seconds for math,
 * plus `display` preserving the author's original unit for re-serialize.
 */
export interface Duration {
  seconds: number;
  display: string;
}

/**
 * Recurrence (Layer 7). Author sigil: `every:<spec>`. Forms supported:
 *
 *   every:daily
 *   every:weekly
 *   every:biweekly            — alias for every:2weeks
 *   every:monthly
 *   every:quarterly
 *   every:yearly
 *   every:mon,wed,fri         — specific weekdays
 *   every:2weeks              — every N weeks
 *   every:3d                  — every N days
 *   every:first-monday        — first Monday of each month
 *   every:last-friday         — last Friday of each month
 *
 * v1 is read-only: we parse + render a "🔁 daily" chip. Spawning the
 * next instance on [x] completion is out of scope (filemark is a
 * reader; markdown is the source of truth). Phase 6+ could opt into
 * that via a formatter subcommand the user triggers explicitly.
 */
export interface Recurrence {
  /** High-level pattern for grouping + predicate matching. */
  kind:
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "yearly"
    | "custom-days"       // every:mon,wed,fri
    | "every-n-days"      // every:3d
    | "every-n-weeks"     // every:2weeks
    | "anchored";         // every:first-monday
  /** For `custom-days`: 0=Sun..6=Sat. */
  days?: number[];
  /** For `every-n-*`: the N. */
  interval?: number;
  /** For `anchored`: "first" | "last" | "1st" | "2nd" | etc. Only
   *  "first" / "last" parsed in v1. */
  anchor?: "first" | "last";
  /** For `anchored`: 0=Sun..6=Sat. */
  anchorDay?: number;
  /** Original author source ("daily", "mon,wed,fri", "2weeks", …). */
  display: string;
}

/**
 * Monetary value (`$500`, `$1200usd`, `$50eur`). `currency` is ISO code
 * (optional — inferred from app locale if omitted).
 */
export interface Money {
  amount: number;
  currency?: string;
}

/**
 * External reference — either a raw markdown link, a typed shortcode that
 * expanded via the registry, or a URL auto-detected in task text.
 *
 * The `kind` field tells the renderer which icon/chip to show. Add new
 * kinds via registerShortcode() at runtime.
 */
export interface TaskLink {
  kind:
    | "url"
    | "github-pr"
    | "github-issue"
    | "github-commit"
    | "github-repo"
    | "gitlab"
    | "linear"
    | "jira"
    | "slack"
    | "notion"
    | "figma"
    | "youtube"
    | "custom";
  /** Display label (markdown link text, or derived from shortcode). */
  label: string;
  /** Resolved URL (shortcode expanded). */
  url: string;
  /** Type-specific metadata — e.g. { org, repo, number } for github-pr. */
  meta?: Record<string, string | number>;
  /** Where the link came from — informs re-serialization. */
  source: "markdown-link" | "shortcode" | "url-detect" | "x-field";
}

/**
 * Relationship between tasks. Multiple kinds; parser returns a list so a
 * single task can have e.g. both `after:foo` AND `parent:bar`.
 *
 * v1.0 ships only `after` and `parent`. Others are parsed and stored but
 * UIs may not render them until Phase 5.
 */
export interface TaskDependency {
  relation:
    | "after"
    | "before"
    | "blocks"
    | "requires"
    | "parent"
    | "children"
    | "related";
  /** Referenced task ids. Comma-separated in source: `after:a,b,c`. */
  ids: string[];
}

/**
 * Warnings emitted by the parser. Non-fatal — parse always returns a Task,
 * diagnostics are additive. Surfaced inline in the TaskCheckbox renderer
 * (amber dot + hover message) and collected by the `filemark tasks lint`
 * CLI for batch review.
 */
export interface Diagnostic {
  kind:
    | "unknown-sigil"
    | "bad-date"
    | "unknown-priority"
    | "orphan-ref"
    | "duplicate-id"
    | "ambiguous-tail"
    | "type-mismatch"
    | "circular-dep"
    | "unknown-shortcode"
    | "unknown-owner";
  message: string;
  line?: number;
  col?: number;
  hint?: string;
}

/**
 * The parsed representation of one task-bullet line.
 *
 * Implementation notes for future maintainers:
 *
 * - `id` is ALWAYS populated. For bullets without an author-supplied stable
 *   id, we derive `hash(file:line:text)`. When the author writes
 *   `^task-<slug>` inline, that wins and is also mirrored into `stableId`.
 *
 * - `text` is the task body with metadata tokens removed. `raw` is the
 *   original line minus the leading `- [X] ` prefix — useful for diffing
 *   and exact-match operations.
 *
 * - `textNodes` is optional and only populated by `extractTasks` when
 *   walking an mdast tree — it carries inline markdown AST (links, code,
 *   formatting) so renderers can render the task body with full markdown
 *   fidelity instead of flat text.
 *
 * - `depth` is 0 for top-level bullets, 1+ for nested. Nesting comes from
 *   indent. `parentId` is set when depth > 0.
 *
 * - `subTasks` is populated by `extractTasks` after the flat walk — it
 *   rebuilds the tree structure so the renderer can nest rows.
 *
 * - `notes` are non-task child bullets (e.g. prose sub-points under a
 *   task). Rendered as a collapsible "ℹ N notes" pill.
 *
 * - `diagnostics` is always an array (may be empty). Empty = parse clean.
 */
export interface Task {
  /** Stable identifier — hash-derived or author-supplied `^task-<slug>`. */
  id: string;
  /** Author-supplied `^task-<slug>` if present, else undefined. */
  stableId?: string;

  status: TaskStatus;
  /** Task body with metadata tokens stripped. Rendered as display text. */
  text: string;
  /** Full original body after `- [X] `. Preserved for diff/re-serialize. */
  raw: string;
  /** Inline markdown AST (hast nodes) for rich rendering — optional. */
  textNodes?: unknown[];

  /** Multiple owners allowed: `@alice @bob`. Empty array when unowned. */
  owners: string[];
  /** Tags with optional `/` hierarchy: `#area/work`. Empty array when untagged. */
  tags: string[];
  /** `!p0..p3` (or high/med/low alias resolved here). */
  priority?: Priority;
  /** `~<expr>` — due date. */
  due?: TimeValue;
  /** `^<expr>` — start/scheduled. Note: `^task-<slug>` goes to stableId, not start. */
  start?: TimeValue;
  /** `&<dur>` — estimate. */
  estimate?: Duration;
  /** `$<money>` — cost/budget. */
  cost?: Money;
  /** `%<N>` — 0..100 percent complete (overrides derived-from-subtasks). */
  percent?: number;
  /** `.area/path` — dotted area / OKR category. */
  area?: string;
  /** `*goal-slug` — link to a higher-level goal. */
  goal?: string;
  /** `+YYYY-MM-DD` — creation date, often auto-filled by formatter. */
  created?: string;
  /** `=YYYY-MM-DD` — completion date, auto-filled on [x] transition. */
  completed?: string;
  /** `(project)` — single project scope. Falls back to frontmatter/fence default. */
  project?: string;
  /** `every:<spec>` — recurrence rule. Parsed but non-enforcing in v1
   *  (no next-instance spawn; filemark stays a reader). */
  recurrence?: Recurrence;

  /** Parsed links — markdown links, shortcodes, URL-detected, x-field URLs. */
  links: TaskLink[];
  /** `after:` / `parent:` / etc. relationships. */
  dependencies: TaskDependency[];
  /** `x-<name>=<value>` namespaced custom fields. Open-ended extension. */
  customFields: Record<string, string>;

  /** Source location — populated when parsed via extractTasks(), not parseTaskLine() alone. */
  file?: string;
  line?: number;
  /** Indent depth; 0 = top-level bullet. */
  depth: number;
  /** Parent task's id when depth > 0. */
  parentId?: string;
  /** Child tasks in tree form (populated post-walk by extractTasks). */
  subTasks?: Task[];
  /** Non-task child bullets rendered as collapsible notes. */
  notes?: string[];
  /** Raw markdown source slice of all block-level content indented
   *  beneath the task bullet, EXCLUDING nested task-bullets (which
   *  become subTasks) and EXCLUDING non-task child bullets (which
   *  become notes). The common indent is stripped so the string
   *  reads like a fresh markdown fragment — ready to pipe through
   *  a nested <ReactMarkdown>. Empty / undefined when the task has
   *  no prose content below it. See docsi/TASKS_PLAN.md §18b. */
  detail?: string;
  /** 1-based line range [startLine, endLine] of the detail in the
   *  original source. Enables "open source at this line" jumps from
   *  the detail sheet's footer. */
  detailLineRange?: [number, number];

  /** Non-fatal parse warnings. Always an array — empty when clean. */
  diagnostics: Diagnostic[];
}

/**
 * Defaults that cascade into each parsed task when its own value is missing.
 * Priority is: task-line explicit > fence default-* > frontmatter > global.
 *
 * Host passes this into `parseTaskLine` / `extractTasks` via the `defaults`
 * option. Filemark populates it from frontmatter parsing upstream.
 */
export interface TaskDefaults {
  owners?: string[];
  tags?: string[];
  priority?: Priority;
  project?: string;
  area?: string;
}

/** Which key to group tasks by in views. */
export type GroupBy =
  | "status"
  | "owner"
  | "tag"
  | "priority"
  | "project"
  | "area"
  | "goal"
  | "due-day"
  | "due-week"
  | "due-month"
  | "due-quarter"
  | "due-bucket"
  | "created-day"
  | "created-week"
  | "file"
  | "depth";

/** Per-key sort direction for multi-column sorts. */
export interface SortSpec {
  key: string;
  dir: "asc" | "desc";
}

/**
 * Grammar version. Documents declare `tasks-version: 1.0` in frontmatter
 * or fence info-string; parser dispatches to the versioned module. Missing
 * declaration = latest.
 */
export type TasksVersion = "1.0";
