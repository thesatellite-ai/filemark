// ─────────────────────────────────────────────────────────────────────────
// predicate — the filter DSL parser + evaluator.
//
// A small SQL-ish language for filtering Task[] arrays. Fully consumed
// by <TaskList filter="…">, <Kanban md filter="…">, <TaskStats md filter="…">.
//
// Spec: docsi/TASKS_PLAN.md §9.1.
//
// Supported forms:
//
//   Equality / comparison:
//     status=todo            status!=done
//     owner=alice
//     priority<=p1           priority<p0
//     due<=today             due>=eow
//     estimate>2h
//     percent>=50
//
//   Set membership:
//     owner in (alice, bob)
//     tag in (grid, v2)
//     status not in (done, cancelled)
//
//   Boolean combinators:
//     status=todo AND owner=alice
//     (priority<=p1) OR (due<=today)
//     status!=done AND NOT tag=experimental
//
//   Existential / derived predicates (sugar):
//     has:due                missing:due
//     has:estimate           has:pr
//     has:x-jira             missing:owner
//     is:overdue             is:today       is:upcoming
//     is:unblocked           is:blocked     is:recurring
//     is:stale(14d)          — no line change in N days (NYI — returns false)
//
//   Text / reference:
//     text:"datagrid"        contains:\#grid       mentions:@alice
//     linked:gh:*/*#*        linked:pr             linked:linear:ENG-*
//
//   Dependency:
//     after:task-foo         parent:task-q2-goal
//     blocks:any             — at least one blocker exists
//
// Design notes:
//
//   - The language is deliberately small. Add features only when real
//     use cases appear. It's easier to grow than to shrink.
//
//   - Parser is hand-rolled — tokenize → recursive-descent parse to AST
//     → evaluator walks the AST against a Task. No eval/Function/regex-
//     assembly — safe to run against untrusted predicate strings.
//
//   - Evaluator returns boolean. On ambiguous types (e.g. comparing
//     priority against non-priority string), returns false + silently
//     drops — callers see "no match" rather than errors.
//
//   - Unknown fields / operators return false (task doesn't match).
//     Diagnostics are NOT surfaced here — parseFilter returns null for
//     unparseable strings, caller decides what to do.
//
// ─────────────────────────────────────────────────────────────────────────

import type { Task, Priority } from "./types";

// AST node shapes -------------------------------------------------------

type Predicate =
  | { t: "and"; l: Predicate; r: Predicate }
  | { t: "or"; l: Predicate; r: Predicate }
  | { t: "not"; p: Predicate }
  | { t: "cmp"; field: string; op: CmpOp; value: Value }
  | { t: "in"; field: string; values: Value[]; negated: boolean }
  | { t: "has"; key: string; negated: boolean }
  | { t: "is"; kind: string; arg?: string }
  | { t: "text"; value: string; kind: "text" | "contains" | "mentions" }
  | { t: "linked"; pattern: string }
  | { t: "dep"; relation: string; id: string };

type CmpOp = "=" | "!=" | "<" | "<=" | ">" | ">=";
type Value = string | number;

const PRIORITY_ORDER: Record<Priority, number> = { p0: 0, p1: 1, p2: 2, p3: 3 };

// Public API ------------------------------------------------------------

/**
 * Apply a predicate (either a pre-parsed AST or a source string) to a
 * task array and return the filtered result.
 *
 * When `opts.allTasks` is provided, dependency-aware predicates
 * (`is:blocked` / `is:unblocked`) resolve `after:` / `requires:` ids
 * against the full task universe instead of treating "has any deps" as
 * "blocked". This lets an `is:unblocked` filter correctly show tasks
 * whose prerequisites are all `done`.
 */
export function filterTasks(
  tasks: Task[],
  predicate: string | Predicate | null | undefined,
  opts?: { now?: Date; allTasks?: Task[] }
): Task[] {
  if (!predicate) return tasks;
  const ast =
    typeof predicate === "string" ? parseFilter(predicate) : predicate;
  if (!ast) return tasks;
  const ref = opts?.now ?? new Date();
  const universe = opts?.allTasks ?? tasks;
  return tasks.filter((t) => evalPredicate(ast, t, ref, universe));
}

/**
 * Parse a filter source string into an AST. Returns null on parse failure
 * (caller typically treats null as "no filter"). Callers that want
 * diagnostics can check the return and emit their own warnings.
 */
export function parseFilter(source: string): Predicate | null {
  try {
    const parser = new Parser(tokenize(source));
    const ast = parser.parseExpr();
    if (!parser.done) return null;
    return ast;
  } catch {
    return null;
  }
}

// Tokenizer -------------------------------------------------------------

type Token = { kind: string; value: string };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (c === "(" || c === ")" || c === ",") {
      tokens.push({ kind: c, value: c });
      i++;
      continue;
    }
    // Quoted string
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\") j++;
        j++;
      }
      tokens.push({ kind: "string", value: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    // Operators: <= >= != < > =
    if (c === "<" || c === ">" || c === "=" || c === "!") {
      if (src[i + 1] === "=") {
        tokens.push({ kind: "op", value: c + "=" });
        i += 2;
        continue;
      }
      if (c === "!") {
        // Could be `!=` only; a bare `!` isn't allowed.
        throw new Error(`Unexpected '!' at ${i}`);
      }
      tokens.push({ kind: "op", value: c });
      i++;
      continue;
    }
    // Identifier / bareword (includes `.`, `-`, `_`, `/`, `*`, `:`, `#`, `@` for field-name tokens and values)
    const m = /^[A-Za-z0-9_.\-\/*:#@]+/.exec(src.slice(i));
    if (m) {
      const value = m[0];
      // Keywords recognized in upper-case too, but normalize.
      const upper = value.toUpperCase();
      if (upper === "AND" || upper === "OR" || upper === "NOT" || upper === "IN") {
        tokens.push({ kind: upper, value: upper });
      } else {
        tokens.push({ kind: "word", value });
      }
      i += value.length;
      continue;
    }
    throw new Error(`Unexpected char '${c}' at ${i}`);
  }
  return tokens;
}

// Recursive-descent parser ---------------------------------------------

class Parser {
  i = 0;
  constructor(readonly tokens: Token[]) {}

  get done(): boolean {
    return this.i >= this.tokens.length;
  }

  peek(): Token | undefined {
    return this.tokens[this.i];
  }

  eat(kind?: string, value?: string): Token {
    const tok = this.tokens[this.i];
    if (!tok) throw new Error("Unexpected end of input");
    if (kind && tok.kind !== kind) {
      throw new Error(`Expected ${kind}, got ${tok.kind}`);
    }
    if (value && tok.value !== value) {
      throw new Error(`Expected ${value}, got ${tok.value}`);
    }
    this.i++;
    return tok;
  }

  // Precedence: OR < AND < NOT < atom
  parseExpr(): Predicate {
    let left = this.parseAnd();
    while (this.peek()?.kind === "OR") {
      this.eat("OR");
      const right = this.parseAnd();
      left = { t: "or", l: left, r: right };
    }
    return left;
  }

  parseAnd(): Predicate {
    let left = this.parseNot();
    while (this.peek()?.kind === "AND") {
      this.eat("AND");
      const right = this.parseNot();
      left = { t: "and", l: left, r: right };
    }
    return left;
  }

  parseNot(): Predicate {
    if (this.peek()?.kind === "NOT") {
      this.eat("NOT");
      return { t: "not", p: this.parseNot() };
    }
    return this.parseAtom();
  }

  parseAtom(): Predicate {
    const tok = this.peek();
    if (!tok) throw new Error("Expected atom");

    if (tok.kind === "(") {
      this.eat("(");
      const e = this.parseExpr();
      this.eat(")");
      return e;
    }

    // Only words and strings can start an atom.
    if (tok.kind !== "word") {
      throw new Error(`Unexpected token ${tok.kind} at atom`);
    }

    const word = tok.value;
    this.i++;

    // Special-case prefixed atoms: has:, missing:, is:, text:, contains:,
    // mentions:, linked:, and dependency prefixes (after:, parent:, …).
    const colon = word.indexOf(":");
    if (colon > 0) {
      const prefix = word.slice(0, colon);
      const rest = word.slice(colon + 1);
      switch (prefix) {
        case "has":
          return { t: "has", key: rest, negated: false };
        case "missing":
          return { t: "has", key: rest, negated: true };
        case "is": {
          // is:stale(14d) — parse optional argument.
          const argMatch = /^([a-z-]+)(?:\((.+)\))?$/.exec(rest);
          if (argMatch) {
            return { t: "is", kind: argMatch[1], arg: argMatch[2] };
          }
          return { t: "is", kind: rest };
        }
        case "text":
          return { t: "text", value: unquote(rest), kind: "text" };
        case "contains":
          return { t: "text", value: unquote(rest), kind: "contains" };
        case "mentions":
          return { t: "text", value: rest.replace(/^@/, ""), kind: "mentions" };
        case "linked":
          return { t: "linked", pattern: rest };
        case "after":
        case "before":
        case "blocks":
        case "requires":
        case "parent":
        case "children":
        case "related":
          return { t: "dep", relation: prefix, id: rest };
      }
    }

    // field=value, field!=value, field<=value, field in (…) etc.
    const next = this.peek();
    if (next?.kind === "op") {
      this.i++;
      const valueTok = this.eat();
      return {
        t: "cmp",
        field: word,
        op: next.value as CmpOp,
        value: coerceValue(valueTok),
      };
    }
    if (next?.kind === "IN") {
      this.eat("IN");
      this.eat("(");
      const values: Value[] = [];
      while (this.peek()?.kind !== ")") {
        values.push(coerceValue(this.eat()));
        if (this.peek()?.kind === ",") this.eat(",");
      }
      this.eat(")");
      return { t: "in", field: word, values, negated: false };
    }

    // Standalone word = boolean shortcut: just "overdue" ≡ is:overdue? No,
    // too ambiguous. Reject.
    throw new Error(`Expected operator after field '${word}'`);
  }
}

function coerceValue(tok: Token): Value {
  if (tok.kind === "string") return tok.value;
  if (tok.kind === "word") {
    const n = Number(tok.value);
    if (Number.isFinite(n) && tok.value.trim() !== "") return n;
    return tok.value;
  }
  return tok.value;
}

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Evaluator -------------------------------------------------------------

function evalPredicate(
  p: Predicate,
  t: Task,
  now: Date,
  universe: Task[]
): boolean {
  switch (p.t) {
    case "and":
      return (
        evalPredicate(p.l, t, now, universe) &&
        evalPredicate(p.r, t, now, universe)
      );
    case "or":
      return (
        evalPredicate(p.l, t, now, universe) ||
        evalPredicate(p.r, t, now, universe)
      );
    case "not":
      return !evalPredicate(p.p, t, now, universe);
    case "cmp":
      return evalCmp(t, p.field, p.op, p.value, now);
    case "in":
      return evalIn(t, p.field, p.values, p.negated);
    case "has":
      return p.negated ? !hasField(t, p.key) : hasField(t, p.key);
    case "is":
      return evalIs(t, p.kind, p.arg, now, universe);
    case "text":
      return evalText(t, p.value, p.kind);
    case "linked":
      return t.links.some((l) => matchShortcodePattern(l, p.pattern));
    case "dep":
      return t.dependencies.some(
        (d) => d.relation === p.relation && (p.id === "any" || d.ids.includes(p.id))
      );
  }
}

function evalCmp(
  t: Task,
  field: string,
  op: CmpOp,
  rhs: Value,
  now: Date
): boolean {
  const lhs = readField(t, field, now);
  if (lhs == null) return op === "!=" ? true : false;
  // Numeric comparison when both sides coerce to numbers.
  if (typeof lhs === "number" && typeof rhs === "number") {
    return numCmp(lhs, rhs, op);
  }
  // Priority comparison: map p0..p3 to 0..3 (p0 < p1 < p2 < p3).
  if (field === "priority" && typeof lhs === "string" && typeof rhs === "string") {
    const l = PRIORITY_ORDER[lhs as Priority];
    const r = PRIORITY_ORDER[rhs as Priority];
    if (l != null && r != null) return numCmp(l, r, op);
  }
  // Date comparison — both sides should be ISO-ish.
  if ((field === "due" || field === "start" || field === "created" || field === "completed") && typeof lhs === "string") {
    const rhsISO = resolveDateValue(rhs, now);
    if (rhsISO) return strCmp(lhs, rhsISO, op);
  }
  // Default: string compare.
  return strCmp(String(lhs), String(rhs), op);
}

function evalIn(t: Task, field: string, values: Value[], negated: boolean): boolean {
  const lhs = readField(t, field);
  const found =
    Array.isArray(lhs)
      ? values.some((v) => (lhs as Value[]).includes(v as never))
      : values.includes(lhs as Value);
  return negated ? !found : found;
}

function evalIs(
  t: Task,
  kind: string,
  _arg: string | undefined,
  now: Date,
  universe: Task[]
): boolean {
  const today = toISODate(now);
  switch (kind) {
    case "overdue": {
      const due = t.due?.iso;
      return !!due && due < today && t.status !== "done" && t.status !== "cancelled";
    }
    case "today": {
      return t.due?.iso === today;
    }
    case "tomorrow": {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return t.due?.iso === toISODate(d);
    }
    case "upcoming": {
      if (!t.due?.iso) return false;
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      return t.due.iso >= today && t.due.iso <= toISODate(d);
    }
    case "unblocked": {
      // Task is unblocked iff:
      //   - Its own status isn't `blocked`
      //   - None of its BLOCKING dependencies (after / requires /
      //     parent) resolve to an open task. Unknown-id deps are
      //     treated as NOT blocking (optimistic — an `after:task-xyz`
      //     pointing at a task that doesn't exist anywhere shouldn't
      //     hide the task forever).
      if (t.status === "blocked") return false;
      return resolveBlockers(t, universe).length === 0;
    }
    case "blocked": {
      if (t.status === "blocked") return true;
      return resolveBlockers(t, universe).length > 0;
    }
    case "recurring": {
      return !!t.recurrence;
    }
    case "stale": {
      return false; // NYI — needs git integration.
    }
    case "done":
      return t.status === "done";
    case "open":
      return t.status !== "done" && t.status !== "cancelled";
    default:
      return false;
  }
}

function evalText(
  t: Task,
  value: string,
  kind: "text" | "contains" | "mentions"
): boolean {
  if (kind === "mentions") {
    return (
      t.text.includes(`@${value}`) || t.owners.includes(value) || t.raw.includes(`@${value}`)
    );
  }
  const needle = value.toLowerCase();
  const hay = (kind === "text" ? t.text : t.raw).toLowerCase();
  return hay.includes(needle);
}

function matchShortcodePattern(
  link: { kind: string; url: string; meta?: Record<string, string | number> },
  pattern: string
): boolean {
  // Simple suffix matching: `pr` matches any github-pr; `gh:org/*#*` matches
  // github links in that org; `linear:ENG-*` matches linear issues with that team.
  if (pattern === "pr") return link.kind === "github-pr";
  if (pattern === "issue") return link.kind === "github-issue";
  if (pattern === "linear") return link.kind === "linear";
  if (pattern === "jira") return link.kind === "jira";
  const re = new RegExp(
    "^" + pattern.split("*").map(escapeRegex).join(".*") + "$"
  );
  const serialized =
    link.kind.startsWith("github-") && link.meta
      ? `gh:${link.meta.org}/${link.meta.repo}${link.kind === "github-pr" ? "#" : "!"}${link.meta.number ?? ""}`
      : link.url;
  return re.test(serialized);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasField(t: Task, key: string): boolean {
  if (key === "due") return !!t.due;
  if (key === "start") return !!t.start;
  if (key === "estimate") return !!t.estimate;
  if (key === "cost") return !!t.cost;
  if (key === "percent") return t.percent != null;
  if (key === "priority") return !!t.priority;
  if (key === "project") return !!t.project;
  if (key === "area") return !!t.area;
  if (key === "goal") return !!t.goal;
  if (key === "owner") return t.owners.length > 0;
  if (key === "tag") return t.tags.length > 0;
  if (key === "pr") return t.links.some((l) => l.kind === "github-pr");
  if (key === "issue") return t.links.some((l) => l.kind === "github-issue");
  if (key === "link") return t.links.length > 0;
  if (key === "dep" || key === "dependency") return t.dependencies.length > 0;
  if (key === "recurrence" || key === "every") return !!t.recurrence;
  if (key.startsWith("x-")) return key in t.customFields;
  return false;
}

function readField(t: Task, field: string, now?: Date): unknown {
  if (field === "status") return t.status;
  if (field === "priority") return t.priority;
  if (field === "owner") return t.owners;
  if (field === "tag") return t.tags;
  if (field === "project") return t.project;
  if (field === "area") return t.area;
  if (field === "goal") return t.goal;
  if (field === "due") return t.due?.iso ?? t.due?.keyword;
  if (field === "start") return t.start?.iso ?? t.start?.keyword;
  if (field === "created") return t.created;
  if (field === "completed") return t.completed;
  if (field === "estimate") return t.estimate?.seconds;
  if (field === "percent") return t.percent;
  if (field === "text") return t.text;
  if (field === "file") return t.file;
  if (field === "depth") return t.depth;
  if (field.startsWith("x-")) return t.customFields[field];
  return undefined;
  // Silently returns undefined for unknown fields. `eval*` treats undefined
  // as "no match" which is usually what callers want.
  void now;
}

function numCmp(l: number, r: number, op: CmpOp): boolean {
  switch (op) {
    case "=":
      return l === r;
    case "!=":
      return l !== r;
    case "<":
      return l < r;
    case "<=":
      return l <= r;
    case ">":
      return l > r;
    case ">=":
      return l >= r;
  }
}

function strCmp(l: string, r: string, op: CmpOp): boolean {
  switch (op) {
    case "=":
      return l === r;
    case "!=":
      return l !== r;
    case "<":
      return l < r;
    case "<=":
      return l <= r;
    case ">":
      return l > r;
    case ">=":
      return l >= r;
  }
}

function resolveDateValue(v: Value, now: Date): string | null {
  if (typeof v !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(now);
  switch (v) {
    case "today":
      return toISODate(d);
    case "tomorrow":
      d.setDate(d.getDate() + 1);
      return toISODate(d);
    case "yesterday":
      d.setDate(d.getDate() - 1);
      return toISODate(d);
    case "eow":
    case "this-week": {
      const day = d.getDay();
      const diff = day === 0 ? 0 : 7 - day;
      d.setDate(d.getDate() + diff);
      return toISODate(d);
    }
    case "eom":
    case "this-month": {
      d.setMonth(d.getMonth() + 1);
      d.setDate(0);
      return toISODate(d);
    }
    case "eoq": {
      const q = Math.floor(d.getMonth() / 3);
      d.setMonth(q * 3 + 3);
      d.setDate(0);
      return toISODate(d);
    }
    case "eoy":
      d.setMonth(11);
      d.setDate(31);
      return toISODate(d);
  }
  // Relative: +Nd / -Nd etc.
  const m = /^([+-])(\d+)([dwmy])$/.exec(v);
  if (m) {
    const sign = m[1] === "-" ? -1 : 1;
    const n = sign * Number(m[2]);
    const u = m[3];
    if (u === "d") d.setDate(d.getDate() + n);
    if (u === "w") d.setDate(d.getDate() + n * 7);
    if (u === "m") d.setMonth(d.getMonth() + n);
    if (u === "y") d.setFullYear(d.getFullYear() + n);
    return toISODate(d);
  }
  return null;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/**
 * Returns the list of tasks that are currently BLOCKING `t` — tasks it
 * depends on via `after:` / `requires:` / `parent:` whose status isn't
 * `done` or `cancelled`. Unknown-id references are silently skipped
 * (optimistic).
 *
 * Exported so renderers can show "blocked by: …" chips with links to
 * the specific prerequisites, not just a boolean.
 */
export function resolveBlockers(t: Task, universe: Task[]): Task[] {
  const blockingKinds = new Set<string>(["after", "requires", "parent"]);
  const ids = new Set<string>();
  for (const d of t.dependencies) {
    if (blockingKinds.has(d.relation)) {
      for (const id of d.ids) ids.add(id);
    }
  }
  if (ids.size === 0) return [];
  const blockers: Task[] = [];
  for (const u of universe) {
    // Match either the auto-id or the author-supplied stableId.
    if (ids.has(u.stableId ?? "") || ids.has(u.id)) {
      if (u.status !== "done" && u.status !== "cancelled") blockers.push(u);
    }
  }
  return blockers;
}
