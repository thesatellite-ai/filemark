// ─────────────────────────────────────────────────────────────────────────
// serialize — turn a Task object back into its markdown-bullet line.
//
// Round-trip guarantee: for a task parsed from a canonical line,
// `serializeTask(parseTaskLine(line)) === line` (byte-identical). This is
// what lets AI agents edit a single task programmatically without
// clobbering formatting or trailing fields elsewhere in the doc.
//
// Canonical metadata order (see docsi/TASKS_PLAN.md §12.1 "Formatter
// canonical-order dividend"):
//
//   text  →  links  →  owners  →  priority  →  start  →  due  →
//   estimate  →  percent  →  area  →  goal  →  project  →  tags  →
//   created  →  completed  →  id  →  dependencies  →  custom-fields
//
// Whitespace normalization:
//   - single space between tokens
//   - trailing spaces stripped
//   - bullet char always `-`, checkbox always lowercase `x` for done
//
// Non-canonical inputs (metadata in unusual order, extra whitespace,
// uppercase `X`) normalize to canonical on serialize. That's the
// formatter pass — deliberately idempotent.
// ─────────────────────────────────────────────────────────────────────────

import type { Task, TaskStatus } from "./types";

// Reverse of STATUS_MAP in parseLine.ts. Keep these in sync.
const STATUS_CHAR: Record<TaskStatus, string> = {
  todo: " ",
  wip: "/",
  done: "x",
  blocked: "!",
  question: "?",
  cancelled: "-",
};

/**
 * Serialize a single task back to its markdown-bullet line — WITHOUT
 * the leading bullet/checkbox. That's added by `serializeTaskLine()`
 * below for full-line output.
 *
 * Returns the body AFTER `- [X] `. Used when the caller wants to splice
 * the body into an existing bullet structure (e.g. `[x] ` already there
 * because only text changed).
 */
export function serializeTask(task: Task): string {
  const parts: string[] = [];

  // Text comes first. Re-escape any sigils that appear in text as
  // literal user content so they're not re-parsed as metadata on the
  // next round.
  if (task.text) parts.push(escapeSigilsInText(task.text));

  // Links (markdown-link form preserved if that's how author wrote them;
  // shortcode form for auto-resolved ones). v1.0 keeps it simple — emit
  // in the form that was originally parsed.
  for (const link of task.links) {
    if (link.source === "markdown-link") {
      parts.push(`[${link.label}](${link.url})`);
    } else if (link.source === "shortcode") {
      // Re-emit as prefix:payload when we stored enough metadata.
      if (link.kind === "github-pr" && link.meta) {
        parts.push(`gh:${link.meta.org}/${link.meta.repo}#${link.meta.number}`);
      } else if (link.kind === "github-issue" && link.meta) {
        parts.push(`gh:${link.meta.org}/${link.meta.repo}!${link.meta.number}`);
      } else if (link.kind === "github-commit" && link.meta) {
        parts.push(`gh:${link.meta.org}/${link.meta.repo}@${link.meta.sha}`);
      } else if (link.kind === "github-repo" && link.meta) {
        parts.push(`gh:${link.meta.org}/${link.meta.repo}`);
      } else if (link.kind === "linear" && link.meta) {
        parts.push(`linear:${link.meta.id}`);
      } else if (link.kind === "jira" && link.meta) {
        parts.push(`jira:${link.meta.id}`);
      } else if (link.kind === "notion" && link.meta) {
        parts.push(`notion:${link.meta.id}`);
      } else if (link.kind === "figma" && link.meta) {
        parts.push(`figma:${link.meta.id}`);
      } else if (link.kind === "youtube" && link.meta) {
        parts.push(`yt:${link.meta.id}`);
      } else {
        parts.push(link.url);
      }
    } else if (link.source === "url-detect") {
      parts.push(link.url);
    } else if (link.source === "x-field") {
      // Already rendered as an `x-<key>=<value>` token later.
    }
  }

  // Owners.
  for (const o of task.owners) parts.push(`@${o}`);

  // Priority.
  if (task.priority) parts.push(`!${task.priority}`);

  // Start.
  if (task.start) parts.push(`^${timeValueToSource(task.start)}`);

  // Due.
  if (task.due) parts.push(`~${timeValueToSource(task.due)}`);

  // Estimate.
  if (task.estimate) parts.push(`&${task.estimate.display}`);

  // Cost.
  if (task.cost) {
    const cur = task.cost.currency ? task.cost.currency : "";
    parts.push(`$${task.cost.amount}${cur}`);
  }

  // Percent.
  if (task.percent != null) parts.push(`%${task.percent}`);

  // Area.
  if (task.area) parts.push(`.${task.area}`);

  // Goal.
  if (task.goal) parts.push(`*${task.goal}`);

  // Project.
  if (task.project) parts.push(`(${task.project})`);

  // Recurrence.
  if (task.recurrence) parts.push(`every:${task.recurrence.display}`);

  // Tags.
  for (const t of task.tags) parts.push(`#${t}`);

  // Created / completed — auto-fields, usually formatter-added.
  if (task.created) parts.push(`+${task.created}`);
  if (task.completed) parts.push(`=${task.completed}`);

  // Stable id.
  if (task.stableId) parts.push(`^${task.stableId}`);

  // Dependencies.
  for (const dep of task.dependencies) {
    parts.push(`${dep.relation}:${dep.ids.join(",")}`);
  }

  // Custom fields — preserve `x-<key>=<value>` form.
  for (const [key, value] of Object.entries(task.customFields)) {
    parts.push(`${key}=${value}`);
  }

  return parts.join(" ");
}

/**
 * Full-line serializer: emits the canonical `- [X] body` form.
 *
 * @param task    Task to render
 * @param opts    Optional indent override (string of leading whitespace)
 */
export function serializeTaskLine(task: Task, opts?: { indent?: string }): string {
  const indent = opts?.indent ?? "  ".repeat(task.depth);
  const statusChar = STATUS_CHAR[task.status] ?? " ";
  return `${indent}- [${statusChar}] ${serializeTask(task)}`;
}

/**
 * Re-escape sigil characters that appear in task text so a subsequent
 * parse won't misread them as metadata (belt-and-suspenders — the
 * original text survives tail-scan fine, but this guards programmatic
 * edits that might inject sigils at the end of the text).
 *
 * Only at the end-of-text boundary would sigils create ambiguity; we
 * escape conservatively if the text ENDS with a token that looks like a
 * sigil.
 */
function escapeSigilsInText(text: string): string {
  // If text ends with a sigil-starting token, prepend `\` to it.
  const lastTokenMatch = /(\S+)\s*$/.exec(text);
  if (!lastTokenMatch) return text;
  const lastToken = lastTokenMatch[1];
  if (/^[@!~^#&$%.*+=]/.test(lastToken)) {
    return (
      text.slice(0, lastTokenMatch.index) +
      "\\" +
      text.slice(lastTokenMatch.index)
    );
  }
  return text;
}

/**
 * Re-render a TimeValue back to its source-like form. Preserves the
 * author's original shape when we know it (`keyword`), otherwise emits
 * canonical ISO.
 */
function timeValueToSource(t: {
  iso?: string;
  keyword?: string;
  start?: string;
  end?: string;
  kind: string;
}): string {
  if (t.kind === "range" && t.start && t.end) return `${t.start}..${t.end}`;
  if (t.kind === "keyword" || t.kind === "relative") return t.keyword ?? t.iso ?? "";
  if (t.kind === "week" || t.kind === "month" || t.kind === "quarter") {
    return t.keyword ?? t.iso ?? "";
  }
  return t.iso ?? "";
}
