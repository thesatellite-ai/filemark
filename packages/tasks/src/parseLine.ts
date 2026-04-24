// ─────────────────────────────────────────────────────────────────────────
// parseLine — the core single-line parser for @filemark/tasks.
//
// Given a full markdown line like:
//
//   - [/] Ship datagrid v2 @alice !p0 ~2026-04-28 #grid (launch)
//
// returns a typed Task object with metadata extracted, or null when the
// line isn't a task bullet.
//
// Algorithm (read docsi/TASKS_PLAN.md §5 for the full spec):
//
//   1. TASK-BULLET DETECTION.
//      Match `^(\s*)[-*+]\s+\[<status-char>\]\s+(.+)$` — the GFM task
//      pattern. Non-matches return null (line is not a task).
//
//   2. STATUS MAP.
//      The bracket char resolves to one of 6 statuses:
//        ' '→todo, '/'→wip, 'x'|'X'→done, '!'→blocked, '?'→question, '-'→cancelled
//      Unknown chars emit a diagnostic + default to `todo`.
//
//   3. BODY SPLIT (explicit `::` fence OR implicit tail-scan).
//      If the body contains ` :: ` the parser splits on the FIRST
//      occurrence — everything before is task text, everything after is
//      metadata. The `::` fence is the author's explicit escape when the
//      text legitimately ends with sigil-looking tokens (e.g.
//      `Email @team about #launch`).
//
//      Without an explicit fence, we TAIL-SCAN: tokenize the body and walk
//      from the RIGHT, consuming tokens that classify as metadata, until
//      we hit a non-metadata token. That boundary separates text (left)
//      from metadata (right). This handles the common case with zero
//      author ceremony — text can freely contain `#` and `@` as long as
//      metadata sits at the end.
//
//   4. TOKENIZER.
//      Whitespace-delimited, BUT:
//        - `[text...](url...)` markdown links become ONE token (so a link
//          with spaces in the label doesn't confuse tail-scan).
//        - `` `inline code` `` becomes ONE token.
//      Everything else splits on whitespace.
//
//   5. CLASSIFIER.
//      Each token is tried against a sigil table (§4.3 of the plan).
//      Match → typed field; no-match → text fragment.
//
//   6. TYPED COERCION.
//      Priority aliases resolve: high→p0, med→p1, low→p2.
//      Dates parse into TimeValue { iso, keyword, kind }.
//      Duration (`&2h`), money (`$500usd`), percent (`%40`) parsed.
//      `^<slug>` sets stableId; `^<date>` sets start (disambiguated by
//      content shape — ISO-date-like vs. identifier-like).
//
//   7. DEFAULTS CASCADE.
//      Caller passes TaskDefaults (typically resolved from frontmatter
//      and fence info-string). Each field falls through the cascade only
//      when the task line itself didn't set it. Explicit always wins.
//
//   8. DIAGNOSTICS.
//      Non-fatal warnings accumulate on the Task — bad date formats,
//      unknown priority values, ambiguous tokens. Parser always returns
//      a Task object even with diagnostics; the renderer surfaces them.
//
// This file is pure logic — no React, no DOM, no I/O. Pure function input
// (string) → pure output (Task). Trivially unit-testable.
// ─────────────────────────────────────────────────────────────────────────

import type {
  Task,
  TaskStatus,
  Priority,
  TimeValue,
  Duration,
  Money,
  TaskLink,
  TaskDependency,
  Diagnostic,
  TaskDefaults,
  Recurrence,
} from "./types";

// Map: one checkbox char → one status. All 6 statuses + X uppercase alias.
const STATUS_MAP: Record<string, TaskStatus> = {
  " ": "todo",
  "/": "wip",
  x: "done",
  X: "done",
  "!": "blocked",
  "?": "question",
  "-": "cancelled",
};

// Priority aliases the author can write instead of p0..p3. Resolved here
// so every downstream consumer sees a single canonical `Priority` enum.
const PRIORITY_ALIASES: Record<string, Priority> = {
  p0: "p0",
  p1: "p1",
  p2: "p2",
  p3: "p3",
  high: "p0",
  med: "p1",
  medium: "p1",
  low: "p2",
};

// Time-expression keywords. Parser stores these as `keyword` and also
// resolves to `iso` using the provided `now` reference. Host can override
// `now` for deterministic testing.
const TIME_KEYWORDS = new Set([
  "today",
  "tomorrow",
  "yesterday",
  "this-week",
  "next-week",
  "last-week",
  "this-month",
  "next-month",
  "eod",
  "eow",
  "eom",
  "eoq",
  "eoy",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

// Relationship keywords (Layer 6 — dependencies). The token `<kind>:<ids>`
// where <kind> is one of these becomes a TaskDependency. Everything else
// with a `prefix:payload` shape becomes a shortcode link.
const DEPENDENCY_KINDS = new Set([
  "after",
  "before",
  "blocks",
  "requires",
  "parent",
  "children",
  "related",
]);

/**
 * Parse a single task-bullet line. Returns null when the line doesn't
 * match the GFM task-bullet pattern.
 *
 * @param line    Full source line (including leading whitespace + bullet + checkbox)
 * @param opts    Optional file path / line number / defaults cascade / time reference
 */
export function parseTaskLine(
  line: string,
  opts?: {
    file?: string;
    lineNo?: number;
    defaults?: TaskDefaults;
    /** Reference time for resolving keyword dates. Defaults to Date.now(). */
    now?: Date;
  }
): Task | null {
  // ── STEP 1: detect task bullet ──────────────────────────────────────
  //
  // GFM task pattern. The status-char group accepts the 6 canonical
  // characters; uppercase X is also accepted. We use \s+ after ]
  // instead of a literal single space so tab-indented lines still match.
  const match = /^(\s*)[-*+]\s+\[([ xX/!?\-])\]\s+(.+)$/.exec(line);
  if (!match) return null;

  const [, indent, statusChar, body] = match;

  // Depth: every 2 spaces of indent is one nesting level. Tabs count as 2
  // spaces so mixed-indent docs don't break; the formatter normalizes to
  // pure 2-space indent on save.
  const depth = Math.floor(indent.replace(/\t/g, "  ").length / 2);

  // Status — default to todo for unrecognized chars (with diagnostic).
  const diagnostics: Diagnostic[] = [];
  let status: TaskStatus = STATUS_MAP[statusChar] ?? "todo";
  if (!(statusChar in STATUS_MAP)) {
    diagnostics.push({
      kind: "unknown-sigil",
      message: `Unknown status character '[${statusChar}]'`,
      line: opts?.lineNo,
      hint: "Use one of [ ], [/], [x], [!], [?], [-]",
    });
    status = "todo";
  }

  // ── STEP 2: split body on `::` fence if present ─────────────────────
  //
  // `::` (surrounded by whitespace) is the author's explicit "metadata
  // starts here" marker. We split on the FIRST occurrence — everything
  // before is text; everything after is tokenized as metadata.
  //
  // When `::` is absent we fall through to tail-scan (step 4).
  let textPart = body;
  let metaPart = "";
  const fenceIdx = findDoubleColonFence(body);
  if (fenceIdx >= 0) {
    textPart = body.slice(0, fenceIdx).trimEnd();
    metaPart = body.slice(fenceIdx + 2).trimStart();
  }

  // ── STEP 3: tokenize the candidate metadata half ────────────────────
  //
  // Tokenizer treats markdown links and inline code as single tokens so
  // they never get misclassified.
  const tokens = tokenize(fenceIdx >= 0 ? metaPart : body);

  // ── STEP 4: tail-scan (only when there's no explicit `::` fence) ────
  //
  // Walk from the right; consume tokens that CLASSIFY as metadata until
  // we hit a non-metadata token. The boundary index splits text from
  // metadata.
  let boundary = tokens.length; // index of first metadata token
  const task: Partial<Task> = {
    owners: [],
    tags: [],
    links: [],
    dependencies: [],
    customFields: {},
    diagnostics,
    depth,
  };

  if (fenceIdx < 0) {
    // Implicit (tail-scan) mode. Walk right→left, apply tokens to task
    // fields as we consume them. We accumulate the consumed count; if
    // we stop mid-scan, the remaining tokens form the text.
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (applyToken(tokens[i], task, opts)) {
        boundary = i;
      } else {
        // First non-metadata token from the right halts the scan. Tokens
        // [0..boundary) are text; [boundary..end) are metadata we've
        // already consumed into `task`.
        break;
      }
    }
    textPart = tokens.slice(0, boundary).join(" ");
  } else {
    // Explicit `::` fence — consume ALL tokens as metadata, no tail
    // ambiguity. If a token doesn't classify, emit a diagnostic and
    // drop it (rather than silently folding into text).
    for (const tok of tokens) {
      if (!applyToken(tok, task, opts)) {
        diagnostics.push({
          kind: "unknown-sigil",
          message: `Unknown metadata token '${tok}' after :: fence`,
          line: opts?.lineNo,
        });
      }
    }
  }

  // Unescape backslash-escaped sigils in the final text: `\#grid` → `#grid`.
  const text = unescapeSigils(textPart).trim();

  // ── STEP 5: apply defaults cascade ──────────────────────────────────
  //
  // Defaults fill ONLY fields the task line didn't set. Cascade order
  // (task > fence > frontmatter > global) is enforced by the caller —
  // by the time defaults arrive here they're a flat merged object, so
  // we just fill empty fields.
  const d = opts?.defaults;
  if (d) {
    if (task.owners!.length === 0 && d.owners?.length) {
      task.owners = [...d.owners];
    }
    if (task.tags!.length === 0 && d.tags?.length) {
      task.tags = [...d.tags];
    }
    if (!task.priority && d.priority) task.priority = d.priority;
    if (!task.project && d.project) task.project = d.project;
    if (!task.area && d.area) task.area = d.area;
  }

  // ── STEP 6: compute id (stable vs auto-hash) ────────────────────────
  //
  // If the author wrote `^task-<slug>`, that became task.stableId. Use
  // it as the canonical id. Otherwise hash (file:line:text) — stable
  // for lines that don't move or change.
  const id =
    task.stableId ??
    autoHashId(opts?.file ?? "", opts?.lineNo ?? 0, text, statusChar);

  return {
    id,
    stableId: task.stableId,
    status,
    text,
    raw: body,
    owners: task.owners!,
    tags: task.tags!,
    priority: task.priority,
    due: task.due,
    start: task.start,
    estimate: task.estimate,
    cost: task.cost,
    percent: task.percent,
    area: task.area,
    goal: task.goal,
    created: task.created,
    completed: task.completed,
    project: task.project,
    links: task.links!,
    dependencies: task.dependencies!,
    customFields: task.customFields!,
    file: opts?.file,
    line: opts?.lineNo,
    depth,
    diagnostics,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Find a ` :: ` fence in the body (whitespace-surrounded) and return the
 * character index of the first colon of the `::`. Returns -1 if absent.
 *
 * Strict about the surrounding whitespace so a JS class/TypeScript type
 * like `Array::from` isn't misread.
 */
function findDoubleColonFence(body: string): number {
  const m = /(^|[^:])::(\s|$)/.exec(body);
  if (!m) return -1;
  // m.index points at the character before `::` (or start of string when
  // the match began at position 0 with empty capture group 1).
  return m.index + (m[1] ? m[1].length : 0);
}

/**
 * Tokenizer that treats markdown-link and inline-code spans as atomic
 * tokens. Everything else splits on whitespace.
 *
 * Why atomic: a link like `[see PR for details](https://...)` contains
 * spaces; naive whitespace-split would shatter it. We scan for
 * `[…](…)` and `` `…` `` as single tokens.
 */
function tokenize(body: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < body.length) {
    // Skip whitespace between tokens.
    while (i < body.length && /\s/.test(body[i])) i++;
    if (i >= body.length) break;

    const start = i;

    if (body[i] === "`") {
      // Inline code span — read until matching backtick (or EOL).
      i++;
      while (i < body.length && body[i] !== "`") i++;
      if (i < body.length) i++; // closing `
    } else if (body[i] === "[") {
      // Candidate markdown link. Grab `[...](...)` greedily — if the
      // `(...)` part is absent, fall back to treating `[...]` alone as
      // a token (stays as literal text).
      let depth = 1;
      i++;
      while (i < body.length && depth > 0) {
        if (body[i] === "\\") {
          i += 2;
        } else if (body[i] === "[") {
          depth++;
          i++;
        } else if (body[i] === "]") {
          depth--;
          i++;
        } else {
          i++;
        }
      }
      // Optional `(...)`
      if (i < body.length && body[i] === "(") {
        let pdepth = 1;
        i++;
        while (i < body.length && pdepth > 0) {
          if (body[i] === "\\") {
            i += 2;
          } else if (body[i] === "(") {
            pdepth++;
            i++;
          } else if (body[i] === ")") {
            pdepth--;
            i++;
          } else {
            i++;
          }
        }
      }
    } else {
      // Plain token — read until whitespace.
      while (i < body.length && !/\s/.test(body[i])) i++;
    }

    tokens.push(body.slice(start, i));
  }
  return tokens;
}

/**
 * Try to interpret `tok` as a metadata sigil. On match, mutate `task`
 * with the resolved field and return true. On no match, return false
 * (tail-scan halts; explicit `::` fence emits diagnostic).
 *
 * Every sigil branch is commented with the corresponding spec section
 * from docsi/TASKS_PLAN.md §4.
 */
function applyToken(
  tok: string,
  task: Partial<Task>,
  opts?: { now?: Date; lineNo?: number }
): boolean {
  if (!tok) return false;

  const head = tok[0];

  // `@owner` — Layer 3, §4.3.
  if (head === "@" && isIdent(tok.slice(1))) {
    task.owners!.push(tok.slice(1));
    return true;
  }

  // `!priority` — Layer 3 + alias resolution (§4.3).
  if (head === "!") {
    const key = tok.slice(1).toLowerCase();
    const prio = PRIORITY_ALIASES[key];
    if (prio) {
      // Last-write-wins if multiple priority tokens (they shouldn't
      // appear — emit diagnostic).
      if (task.priority) {
        task.diagnostics!.push({
          kind: "ambiguous-tail",
          message: `Multiple priority tokens; keeping last value '${tok}'`,
          line: opts?.lineNo,
        });
      }
      task.priority = prio;
      return true;
    }
    task.diagnostics!.push({
      kind: "unknown-priority",
      message: `Unknown priority '${tok}'`,
      line: opts?.lineNo,
      hint: "Use !p0..!p3, !high, !med, !low",
    });
    return false;
  }

  // `~due` — Layer 4 time expression (§4.4).
  if (head === "~") {
    const t = parseTimeExpr(tok.slice(1), opts?.now);
    if (t) {
      task.due = t;
      return true;
    }
    task.diagnostics!.push({
      kind: "bad-date",
      message: `Unrecognized date expression '${tok}'`,
      line: opts?.lineNo,
      hint: "Use ISO date (~YYYY-MM-DD), keyword (~today, ~eow), or relative (~+3d)",
    });
    return false;
  }

  // `^start` OR `^task-<slug>` identity — Layer 2/4 disambiguation.
  //
  // Heuristic: if the payload starts with `task-` or matches slug shape
  // `[a-z0-9-]+` but NOT an ISO date, it's an id. Otherwise it's a
  // time expression (start date).
  if (head === "^") {
    const payload = tok.slice(1);
    if (/^task-[a-z0-9-]+$/.test(payload)) {
      task.stableId = payload;
      return true;
    }
    const t = parseTimeExpr(payload, opts?.now);
    if (t) {
      task.start = t;
      return true;
    }
    // Fall back: treat as unknown — most likely a typo.
    task.diagnostics!.push({
      kind: "bad-date",
      message: `Unrecognized start/id expression '${tok}'`,
      line: opts?.lineNo,
    });
    return false;
  }

  // `#tag` — Layer 3. Supports `/` hierarchy (`#area/work`).
  if (head === "#" && /^[A-Za-z0-9_/-]+$/.test(tok.slice(1))) {
    task.tags!.push(tok.slice(1));
    return true;
  }

  // `&estimate` — duration.
  if (head === "&") {
    const d = parseDuration(tok.slice(1));
    if (d) {
      task.estimate = d;
      return true;
    }
    return false;
  }

  // `$cost` — money.
  if (head === "$") {
    const m = parseMoney(tok.slice(1));
    if (m) {
      task.cost = m;
      return true;
    }
    return false;
  }

  // `%percent` — 0..100 progress override.
  if (head === "%") {
    const n = Number(tok.slice(1));
    if (Number.isFinite(n) && n >= 0 && n <= 100) {
      task.percent = n;
      return true;
    }
    return false;
  }

  // `.area/path` — area / OKR category.
  if (head === "." && /^[A-Za-z0-9_\/-]+$/.test(tok.slice(1))) {
    task.area = tok.slice(1);
    return true;
  }

  // `*goal-slug`
  if (head === "*" && isIdent(tok.slice(1))) {
    task.goal = tok.slice(1);
    return true;
  }

  // `+YYYY-MM-DD` — created.
  if (head === "+" && /^\d{4}-\d{2}-\d{2}$/.test(tok.slice(1))) {
    task.created = tok.slice(1);
    return true;
  }

  // `=YYYY-MM-DD` — completed.
  if (head === "=" && /^\d{4}-\d{2}-\d{2}$/.test(tok.slice(1))) {
    task.completed = tok.slice(1);
    return true;
  }

  // `(project)` — Layer 3.
  if (head === "(" && tok.endsWith(")")) {
    const inner = tok.slice(1, -1);
    if (isIdent(inner)) {
      task.project = inner;
      return true;
    }
  }

  // `[label](url)` — markdown link. Preserve as a TaskLink with
  // source="markdown-link". Detect link kind via URL pattern matching
  // (Layer 5 Form C — URL pattern detection, §4.5).
  const linkMatch = /^\[([^\]]*)\]\((.+)\)$/.exec(tok);
  if (linkMatch) {
    const [, label, url] = linkMatch;
    task.links!.push(classifyLink(label, url, "markdown-link"));
    return true;
  }

  // `prefix:payload` — typed shortcode OR dependency OR recurrence.
  const refMatch = /^([a-z][a-z0-9-]*):(.+)$/.exec(tok);
  if (refMatch) {
    const [, prefix, payload] = refMatch;
    // Recurrence (Layer 7) — `every:<spec>`.
    if (prefix === "every") {
      const r = parseRecurrence(payload);
      if (r) {
        task.recurrence = r;
        return true;
      }
      task.diagnostics!.push({
        kind: "unknown-sigil",
        message: `Unrecognized recurrence spec 'every:${payload}'`,
        line: opts?.lineNo,
        hint: "Use every:daily / every:weekly / every:mon,wed,fri / every:2weeks / every:first-monday / etc.",
      });
      return false;
    }
    if (DEPENDENCY_KINDS.has(prefix)) {
      // Dependency (Layer 6). Multi-id: comma-separated.
      const ids = payload.split(",").map((s) => s.trim()).filter(Boolean);
      task.dependencies!.push({
        relation: prefix as TaskDependency["relation"],
        ids,
      });
      return true;
    }
    // Typed shortcode link — resolve via registry (Phase 3 extension;
    // v1.0 stores as 'custom' with derived URL from prefix).
    task.links!.push(resolveShortcode(prefix, payload));
    return true;
  }

  // `x-<name>=<value>` — custom field (Layer 9).
  const cfMatch = /^x-([a-z0-9_-]+)=(.+)$/.exec(tok);
  if (cfMatch) {
    const [, key, value] = cfMatch;
    task.customFields![`x-${key}`] = value;
    // If value looks like a URL, also index as a link.
    if (/^https?:\/\//.test(value)) {
      task.links!.push(classifyLink(`x-${key}`, value, "x-field"));
    }
    return true;
  }

  // `https://...` — bare URL gets auto-detected as a link.
  if (/^https?:\/\//.test(tok)) {
    task.links!.push(classifyLink(tok, tok, "url-detect"));
    return true;
  }

  return false;
}

// ───── tiny helpers ─────────────────────────────────────────────────────

function isIdent(s: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(s);
}

/**
 * Resolve `\#`, `\@`, `\!`, `\~`, `\^`, `\*` in text back to the literal
 * sigil. Called on the text half AFTER tail-scan.
 */
function unescapeSigils(s: string): string {
  return s.replace(/\\([@!~^#*])/g, "$1");
}

/**
 * Parse a time expression payload (without the leading `~` or `^`).
 *
 * Supported forms (v1.0):
 *   - ISO date:     YYYY-MM-DD
 *   - ISO range:    YYYY-MM-DD..YYYY-MM-DD
 *   - Keyword:      today, tomorrow, eod, eow, eom, eoq, eoy, this-week,
 *                   next-week, monday..sunday, next-friday, last-monday, …
 *   - Relative:     +Nd, +Nw, +Nm, +Ny (and -Nd/etc. for start)
 *
 * Returns TimeValue with `kind` reflecting the original author form so
 * re-serialization preserves intent.
 *
 * Heavier bits (business-day math, holidays, relative-with-anchor) are
 * deferred to v1.1. v1.0 uses browser-local time for keyword resolution.
 */
function parseTimeExpr(payload: string, now?: Date): TimeValue | null {
  if (!payload) return null;

  const ref = now ?? new Date();

  // Range form: YYYY-MM-DD..YYYY-MM-DD
  const rangeMatch = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/.exec(payload);
  if (rangeMatch) {
    return { start: rangeMatch[1], end: rangeMatch[2], kind: "range" };
  }

  // Plain ISO date
  if (/^\d{4}-\d{2}-\d{2}$/.test(payload)) {
    return { iso: payload, kind: "date" };
  }
  // ISO week
  if (/^\d{4}-W\d{2}$/.test(payload)) {
    return { keyword: payload, kind: "week" };
  }
  // ISO month
  if (/^\d{4}-\d{2}$/.test(payload)) {
    return { keyword: payload, kind: "month" };
  }
  // ISO quarter
  if (/^\d{4}-Q[1-4]$/.test(payload)) {
    return { keyword: payload, kind: "quarter" };
  }
  // Relative: +Nd / +Nw / +Nm / +Ny (or negative for start dates)
  const relMatch = /^([+-])(\d+)([dwmy])$/.exec(payload);
  if (relMatch) {
    const sign = relMatch[1] === "-" ? -1 : 1;
    const n = sign * Number(relMatch[2]);
    const unit = relMatch[3];
    const d = new Date(ref);
    if (unit === "d") d.setDate(d.getDate() + n);
    if (unit === "w") d.setDate(d.getDate() + n * 7);
    if (unit === "m") d.setMonth(d.getMonth() + n);
    if (unit === "y") d.setFullYear(d.getFullYear() + n);
    return { iso: toISODate(d), keyword: payload, kind: "relative" };
  }
  // Keyword
  if (TIME_KEYWORDS.has(payload.toLowerCase())) {
    const iso = resolveKeyword(payload.toLowerCase(), ref);
    return { iso, keyword: payload, kind: "keyword" };
  }
  return null;
}

/** Resolve a keyword to a concrete ISO date using `ref` as "now". */
function resolveKeyword(kw: string, ref: Date): string {
  const d = new Date(ref);
  switch (kw) {
    case "today":
    case "eod":
      return toISODate(d);
    case "tomorrow":
      d.setDate(d.getDate() + 1);
      return toISODate(d);
    case "yesterday":
      d.setDate(d.getDate() - 1);
      return toISODate(d);
    case "eow":
    case "this-week": {
      // End of current week (Sunday = 0 → compute days to Sunday).
      const day = d.getDay();
      const diff = day === 0 ? 0 : 7 - day;
      d.setDate(d.getDate() + diff);
      return toISODate(d);
    }
    case "next-week": {
      d.setDate(d.getDate() + 7);
      return toISODate(d);
    }
    case "last-week": {
      d.setDate(d.getDate() - 7);
      return toISODate(d);
    }
    case "eom":
    case "this-month": {
      // End of current month.
      const m = d.getMonth();
      d.setMonth(m + 1);
      d.setDate(0);
      return toISODate(d);
    }
    case "next-month": {
      d.setMonth(d.getMonth() + 1);
      return toISODate(d);
    }
    case "eoq": {
      const q = Math.floor(d.getMonth() / 3);
      d.setMonth(q * 3 + 3);
      d.setDate(0);
      return toISODate(d);
    }
    case "eoy": {
      d.setMonth(11);
      d.setDate(31);
      return toISODate(d);
    }
    default: {
      // Day-of-week keyword → next occurrence.
      const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const idx = days.indexOf(kw);
      if (idx >= 0) {
        const today = d.getDay();
        let delta = idx - today;
        if (delta <= 0) delta += 7;
        d.setDate(d.getDate() + delta);
        return toISODate(d);
      }
      return toISODate(d);
    }
  }
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * `&2h`, `&30m`, `&3d`, `&1w` → Duration in seconds.
 */
function parseDuration(s: string): Duration | null {
  const m = /^(\d+(?:\.\d+)?)([mhdw])$/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2];
  const mult = unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86400 : 604800;
  return { seconds: n * mult, display: s };
}

/**
 * `500`, `500usd`, `500.00eur` → Money { amount, currency? }.
 */
function parseMoney(s: string): Money | null {
  const m = /^(\d+(?:\.\d+)?)([a-zA-Z]{3})?$/.exec(s);
  if (!m) return null;
  return { amount: Number(m[1]), currency: m[2]?.toLowerCase() };
}

/**
 * Classify a markdown link or auto-detected URL into a typed TaskLink.
 * Adds `kind` + optional `meta` for known URL patterns.
 */
function classifyLink(
  label: string,
  url: string,
  source: TaskLink["source"]
): TaskLink {
  // github.com/<org>/<repo>/pull/<N>
  let m = /github\.com\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/.exec(url);
  if (m) {
    return {
      kind: "github-pr",
      label,
      url,
      meta: { org: m[1], repo: m[2], number: Number(m[3]) },
      source,
    };
  }
  m = /github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/.exec(url);
  if (m) {
    return {
      kind: "github-issue",
      label,
      url,
      meta: { org: m[1], repo: m[2], number: Number(m[3]) },
      source,
    };
  }
  m = /github\.com\/([^\/]+)\/([^\/]+)\/commit\/([0-9a-f]+)/.exec(url);
  if (m) {
    return {
      kind: "github-commit",
      label,
      url,
      meta: { org: m[1], repo: m[2], sha: m[3] },
      source,
    };
  }
  if (/linear\.app\//.test(url)) {
    return { kind: "linear", label, url, source };
  }
  if (/atlassian\.net\//.test(url)) {
    return { kind: "jira", label, url, source };
  }
  if (/slack\.com\//.test(url)) {
    return { kind: "slack", label, url, source };
  }
  if (/notion\.so\//.test(url)) {
    return { kind: "notion", label, url, source };
  }
  if (/figma\.com\//.test(url)) {
    return { kind: "figma", label, url, source };
  }
  if (/youtube\.com|youtu\.be/.test(url)) {
    return { kind: "youtube", label, url, source };
  }
  return { kind: "url", label, url, source };
}

/**
 * Resolve a typed-shortcode token (e.g. `gh:org/repo#42`) to a TaskLink
 * with the full URL and typed meta.
 *
 * v1.0 ships a built-in set. Future (Phase 3): accept runtime-registered
 * resolvers via `registerShortcode()` so Linear/Jira/Slack workspaces
 * can be configured from the host options page.
 */
function resolveShortcode(prefix: string, payload: string): TaskLink {
  // gh:org/repo#N → PR | gh:org/repo!N → issue | gh:org/repo@sha → commit
  if (prefix === "gh") {
    let m = /^([^\/]+)\/([^\/#!@]+)#(\d+)$/.exec(payload);
    if (m) {
      return {
        kind: "github-pr",
        label: `gh:${payload}`,
        url: `https://github.com/${m[1]}/${m[2]}/pull/${m[3]}`,
        meta: { org: m[1], repo: m[2], number: Number(m[3]) },
        source: "shortcode",
      };
    }
    m = /^([^\/]+)\/([^\/#!@]+)!(\d+)$/.exec(payload);
    if (m) {
      return {
        kind: "github-issue",
        label: `gh:${payload}`,
        url: `https://github.com/${m[1]}/${m[2]}/issues/${m[3]}`,
        meta: { org: m[1], repo: m[2], number: Number(m[3]) },
        source: "shortcode",
      };
    }
    m = /^([^\/]+)\/([^\/#!@]+)@([0-9a-f]+)$/.exec(payload);
    if (m) {
      return {
        kind: "github-commit",
        label: `gh:${payload}`,
        url: `https://github.com/${m[1]}/${m[2]}/commit/${m[3]}`,
        meta: { org: m[1], repo: m[2], sha: m[3] },
        source: "shortcode",
      };
    }
    // Bare `gh:org/repo` → repo link.
    m = /^([^\/]+)\/([^\/#!@]+)$/.exec(payload);
    if (m) {
      return {
        kind: "github-repo",
        label: `gh:${payload}`,
        url: `https://github.com/${m[1]}/${m[2]}`,
        meta: { org: m[1], repo: m[2] },
        source: "shortcode",
      };
    }
  }
  if (prefix === "linear") {
    return {
      kind: "linear",
      label: `linear:${payload}`,
      url: `https://linear.app/_/issue/${payload}`,
      meta: { id: payload },
      source: "shortcode",
    };
  }
  if (prefix === "jira") {
    return {
      kind: "jira",
      label: `jira:${payload}`,
      url: `https://_/browse/${payload}`,
      meta: { id: payload },
      source: "shortcode",
    };
  }
  if (prefix === "notion") {
    return {
      kind: "notion",
      label: `notion:${payload}`,
      url: `https://notion.so/${payload}`,
      meta: { id: payload },
      source: "shortcode",
    };
  }
  if (prefix === "figma") {
    return {
      kind: "figma",
      label: `figma:${payload}`,
      url: `https://figma.com/file/${payload}`,
      meta: { id: payload },
      source: "shortcode",
    };
  }
  if (prefix === "yt") {
    return {
      kind: "youtube",
      label: `yt:${payload}`,
      url: `https://youtu.be/${payload}`,
      meta: { id: payload },
      source: "shortcode",
    };
  }
  // Unknown prefix — store as custom (generic chip).
  return {
    kind: "custom",
    label: `${prefix}:${payload}`,
    url: "",
    meta: { prefix, payload },
    source: "shortcode",
  };
}

/**
 * Parse a recurrence spec (payload after `every:`). Returns null when
 * unrecognized. See types.ts Recurrence for the supported forms.
 *
 * Parse order matters — we try the most specific patterns first so
 * `every:2weeks` isn't matched by the generic `every:<kind>` keyword
 * path.
 */
function parseRecurrence(payload: string): Recurrence | null {
  const p = payload.trim().toLowerCase();
  if (!p) return null;

  // Simple single-word keywords.
  if (p === "daily") return { kind: "daily", display: p };
  if (p === "weekly") return { kind: "weekly", display: p };
  if (p === "biweekly") return { kind: "biweekly", interval: 2, display: p };
  if (p === "monthly") return { kind: "monthly", display: p };
  if (p === "quarterly") return { kind: "quarterly", display: p };
  if (p === "yearly" || p === "annually") return { kind: "yearly", display: p };

  // every-n-days / every-n-weeks
  const nMatch = /^(\d+)(d|days?|w|weeks?)$/.exec(p);
  if (nMatch) {
    const n = Number(nMatch[1]);
    const unit = nMatch[2];
    if (unit.startsWith("d")) return { kind: "every-n-days", interval: n, display: p };
    if (unit.startsWith("w")) return { kind: "every-n-weeks", interval: n, display: p };
  }

  // custom-days: mon,wed,fri
  const WEEKDAY_IDX: Record<string, number> = {
    sun: 0, sunday: 0,
    mon: 1, monday: 1,
    tue: 2, tuesday: 2,
    wed: 3, wednesday: 3,
    thu: 4, thursday: 4,
    fri: 5, friday: 5,
    sat: 6, saturday: 6,
  };
  if (p.includes(",") || p in WEEKDAY_IDX) {
    const days: number[] = [];
    for (const raw of p.split(",")) {
      const idx = WEEKDAY_IDX[raw.trim()];
      if (idx == null) return null;
      if (!days.includes(idx)) days.push(idx);
    }
    if (days.length > 0) return { kind: "custom-days", days, display: p };
  }

  // anchored: first-monday / last-friday
  const anchorMatch = /^(first|last)-(sun|mon|tue|wed|thu|fri|sat)(?:day|nesday|rsday|urday)?$/.exec(p);
  if (anchorMatch) {
    const anchor = anchorMatch[1] as "first" | "last";
    const dayKey = anchorMatch[2];
    const anchorDay = WEEKDAY_IDX[dayKey];
    return { kind: "anchored", anchor, anchorDay, display: p };
  }

  return null;
}

/**
 * Stable-ish hash for auto-ids. FNV-1a — tiny, dependency-free, good
 * enough distribution for per-document uniqueness (we're not building a
 * content-addressed store; collisions between files are acceptable
 * because we scope id lookups by file).
 *
 * Input = `file + ":" + line + ":" + normalized-text + ":" + status`.
 * Output = 8-char hex for compact rendering in diagnostics.
 */
function autoHashId(
  file: string,
  line: number,
  text: string,
  status: string
): string {
  const key = `${file}:${line}:${text.toLowerCase().replace(/\s+/g, " ").trim()}:${status}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
