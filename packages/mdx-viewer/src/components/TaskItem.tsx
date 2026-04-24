// ─────────────────────────────────────────────────────────────────────────
// TaskItem — enhanced renderer for GFM task-list bullets.
//
// react-markdown calls our custom `li` renderer for every <li> in the
// rendered document. When the <li> is a task-list-item (GFM class
// "task-list-item"), we:
//
//   1. Look up the parsed Task from TasksContext by line number. The
//      host (MDXViewer) parses the doc once per render and populates
//      context — see @filemark/tasks/src/context.tsx. We pull the task
//      using `useTaskByLine` against `node.position.start.line`.
//
//   2. Strip the trailing metadata sigils from the rendered children so
//      the prose doesn't duplicate what's already shown as chips. Inline
//      markdown formatting (links, code, bold) inside the text part is
//      preserved — we only trim the tail tokens from the last string
//      leaf, leaving all other nodes untouched.
//
//   3. Append TaskChips showing priority / owners / due / tags / project /
//      links / estimate / percent / area / goal / dependencies.
//
// When the line isn't actually a task (regular <li>), we pass through
// transparently with no overhead.
//
// This component never writes to the markdown file. Tick state persists
// via the existing TaskCheckbox → StorageAdapter flow (unchanged).
// Metadata is display-only; editing a task means editing the markdown.
//
// Detailed spec: docsi/TASKS_PLAN.md §5.1 and §10.1.
// ─────────────────────────────────────────────────────────────────────────

import {
  Children,
  isValidElement,
  useState,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import {
  useTaskByLine,
  useTasks,
  resolveBlockers,
  type Task,
  type TaskLink,
  type Priority,
  type TimeValue,
} from "@filemark/tasks";
import { TaskDetailSheet } from "./TaskDetailSheet";

// Props flowing in from react-markdown's `li` component handler.
// `node` carries the hast node — we need `position.start.line` to find
// the matching Task in context.
type LiProps = HTMLAttributes<HTMLLIElement> & {
  node?: { position?: { start?: { line?: number } } };
  checked?: boolean | null; // GFM adds this on task items
};

export function TaskItem({ node, className, children, ...rest }: LiProps) {
  const line = node?.position?.start?.line;
  const task = useTaskByLine(line);
  // Detail sheet open state — per-row local state. Not persisted (v1).
  const [sheetOpen, setSheetOpen] = useState(false);

  // Not a task — pass through. (The `task-list-item` class usually also
  // implies a checkbox child, but we don't render chips unless the task
  // is in context.)
  if (!task) {
    return (
      <li className={className} {...rest}>
        {children}
      </li>
    );
  }

  // When a task has rich `detail` (paragraphs, images, code, tables,
  // embedded components indented under the bullet), remark-gfm still
  // renders all of that INSIDE the <li> — which would duplicate the
  // content that the popup sheet already shows. Strip detail blocks
  // from the inline render, then strip trailing sigil tokens from the
  // remaining task-text portion so chips aren't a visual duplicate.
  const hasDetail = !!task.detail && task.detail.trim().length > 0;
  const filtered = hasDetail
    ? stripDetailFromChildren(children)
    : children;
  const cleaned = stripTrailingSigils(filtered);

  // Tag the <li> with the source line number so cross-file panels (e.g.
  // chrome-ext's TaskPanel) can scroll the viewer to this row when a
  // task is clicked. Using a data-* attr keeps the public render API
  // ergonomic — no one else needs to know the line number.
  return (
    <li
      className={className}
      data-fv-task-line={task.line ?? undefined}
      {...rest}
    >
      {cleaned}
      <TaskChips task={task} onOpenDetail={hasDetail ? () => setSheetOpen(true) : undefined} />
      {hasDetail && (
        <TaskDetailSheet
          task={task}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TaskChips — renders each task's metadata as tasteful inline chips.
//
// Rendering order (matches serialize.ts canonical order for consistency):
//   priority  →  owners  →  start/due  →  estimate  →  percent  →
//   project  →  area  →  goal  →  tags  →  links  →  deps  →  x-fields
//
// Chips are small, muted, and mirror datagrid's TONE_CLASS for colors
// where applicable. Individual chip styling lives in the host stylesheet
// under `.fv-chip*` — see apps/chrome-ext/src/styles/index.css.
// ─────────────────────────────────────────────────────────────────────────

export function TaskChips({
  task,
  onOpenDetail,
}: {
  task: Task;
  /** When provided, renders a "📎 detail" chip; clicking invokes the
   *  callback to open the task detail popup sheet. */
  onOpenDetail?: () => void;
}) {
  // Resolve blocking prerequisites (after/requires/parent → open tasks).
  // `useTasks()` returns the full TasksContext array; for tasks rendered
  // outside a provider it's an empty array, which means resolveBlockers
  // returns [] — the blocked-by chip just doesn't render in that case.
  const allTasks = useTasks();
  const blockers =
    task.dependencies.length > 0 ? resolveBlockers(task, allTasks) : [];

  return (
    <span className="fv-task-chips">
      {onOpenDetail && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpenDetail();
          }}
          className="fv-chip fv-chip--detail"
          title="Open task detail"
          aria-label="Open task detail"
        >
          📎 detail
        </button>
      )}
      {task.priority && <PriorityChip p={task.priority} />}
      {task.owners.map((o) => (
        <OwnerChip key={o} name={o} />
      ))}
      {task.start && <TimeChip t={task.start} prefix="start" />}
      {task.due && <TimeChip t={task.due} prefix="due" />}
      {task.estimate && (
        <span className="fv-chip fv-chip--muted" title="Estimate">
          ⏱ {task.estimate.display}
        </span>
      )}
      {task.percent != null && (
        <span className="fv-chip fv-chip--muted" title="Percent complete">
          {task.percent}%
        </span>
      )}
      {task.recurrence && (
        <span
          className="fv-chip fv-chip--info"
          title={`Recurrence: every ${task.recurrence.display}`}
        >
          🔁 {task.recurrence.display}
        </span>
      )}
      {task.project && (
        <span className="fv-chip fv-chip--project" title="Project">
          {task.project}
        </span>
      )}
      {task.area && (
        <span className="fv-chip fv-chip--muted" title="Area">
          .{task.area}
        </span>
      )}
      {task.goal && (
        <span className="fv-chip fv-chip--muted" title="Goal">
          ✨ {task.goal}
        </span>
      )}
      {task.tags.map((t) => (
        <span key={t} className="fv-chip fv-chip--tag">
          #{t}
        </span>
      ))}
      {task.links.map((l, i) => (
        <LinkChip key={i} link={l} />
      ))}
      {blockers.length > 0 && (
        <span
          className="fv-chip fv-chip--danger"
          title={
            "Blocked by:\n" +
            blockers.map((b) => `  ${b.status}: ${b.text}`).join("\n")
          }
        >
          🚧 blocked by {blockers.length}
        </span>
      )}
      {task.dependencies.map((d, i) => (
        <span
          key={i}
          className="fv-chip fv-chip--muted"
          title={`${d.relation}: ${d.ids.join(", ")}`}
        >
          ⛓ {d.relation}: {d.ids.length}
        </span>
      ))}
      {task.diagnostics.length > 0 && (
        <span
          className="fv-chip fv-chip--warn"
          title={task.diagnostics.map((d) => d.message).join("\n")}
        >
          ⚠ {task.diagnostics.length}
        </span>
      )}
    </span>
  );
}

function PriorityChip({ p }: { p: Priority }) {
  const cls =
    p === "p0"
      ? "fv-chip--danger"
      : p === "p1"
        ? "fv-chip--warn"
        : p === "p2"
          ? "fv-chip--info"
          : "fv-chip--muted";
  return (
    <span className={`fv-chip ${cls}`} title={`Priority ${p}`}>
      {p.toUpperCase()}
    </span>
  );
}

function OwnerChip({ name }: { name: string }) {
  return (
    <span className="fv-chip fv-chip--owner" title={`Owner ${name}`}>
      @{name}
    </span>
  );
}

/**
 * Time chip with human-readable rendering:
 *   - Past date: "overdue 2d" in red
 *   - Today: "today" in amber
 *   - Tomorrow: "tomorrow" in amber
 *   - Future: "in 3d" in neutral
 *   - Range: "Apr 28–May 1"
 *
 * Title attribute always shows the absolute ISO form for precision.
 */
function TimeChip({ t, prefix }: { t: TimeValue; prefix: "due" | "start" }) {
  const { label, tone } = formatTime(t, prefix);
  const title = t.iso ?? t.keyword ?? (t.start ? `${t.start}..${t.end}` : "");
  return (
    <span
      className={`fv-chip fv-chip--${tone}`}
      title={`${prefix}: ${title}`}
    >
      {prefix === "due" ? "→ " : "↦ "}
      {label}
    </span>
  );
}

function formatTime(
  t: TimeValue,
  prefix: "due" | "start"
): { label: string; tone: "muted" | "warn" | "danger" | "info" } {
  if (t.kind === "range" && t.start && t.end) {
    return { label: `${short(t.start)}–${short(t.end)}`, tone: "info" };
  }
  const iso = t.iso ?? t.keyword ?? "";
  if (!iso) return { label: "?", tone: "muted" };
  // If we have a resolved ISO, compute relative days.
  if (t.iso) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const then = new Date(t.iso);
    const deltaMs = then.getTime() - today.getTime();
    const days = Math.round(deltaMs / 86400000);
    if (days < 0 && prefix === "due") {
      return { label: `overdue ${Math.abs(days)}d`, tone: "danger" };
    }
    if (days === 0) return { label: "today", tone: "warn" };
    if (days === 1) return { label: "tomorrow", tone: "warn" };
    if (days <= 7) return { label: `in ${days}d`, tone: "info" };
    return { label: short(t.iso), tone: "muted" };
  }
  return { label: t.keyword ?? "?", tone: "muted" };
}

function short(iso: string): string {
  // YYYY-MM-DD → MMM DD (e.g. Apr 28)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}`;
}

/**
 * Link chip — renders a link's kind as an icon prefix + label. Clicking
 * opens the URL in a new tab (prevents any accidental in-extension
 * navigation, and keeps security straightforward — no programmatic
 * location change).
 */
function LinkChip({ link }: { link: TaskLink }) {
  const icon = linkIcon(link.kind);
  const label = linkLabel(link);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="fv-chip fv-chip--link"
      title={link.url}
    >
      {icon} {label}
    </a>
  );
}

function linkIcon(kind: TaskLink["kind"]): string {
  switch (kind) {
    case "github-pr":
      return "⎘";
    case "github-issue":
      return "◎";
    case "github-commit":
      return "◆";
    case "github-repo":
      return "▦";
    case "linear":
      return "L";
    case "jira":
      return "J";
    case "slack":
      return "#";
    case "notion":
      return "N";
    case "figma":
      return "F";
    case "youtube":
      return "▶";
    default:
      return "↗";
  }
}

function linkLabel(link: TaskLink): string {
  if (link.meta?.number) return `#${link.meta.number}`;
  if (link.meta?.id) return String(link.meta.id);
  if (link.label && link.label !== link.url) return link.label;
  try {
    return new URL(link.url).host;
  } catch {
    return link.url;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// stripTrailingSigils — remove trailing metadata tokens from rendered
// children so the displayed prose doesn't duplicate what's already in
// chips.
//
// Walks children in reverse; finds the last string leaf; strips any
// trailing sigil-pattern tokens from it. Non-string children (inline
// React elements from markdown formatting: links, code, bold, italic)
// are preserved untouched — we only trim the tail text.
// ─────────────────────────────────────────────────────────────────────────

// Regex for a single trailing sigil token (preceded by whitespace). We
// iterate, stripping one at a time, until no match remains.
const TRAILING_SIGIL_RE =
  /\s+(@[A-Za-z0-9_-]+|![a-z0-9-]+|~\S+|\^\S+|#[A-Za-z0-9_\/-]+|&\d+(?:\.\d+)?[mhdw]|\$\d+(?:\.\d+)?[a-z]*|%\d+|\.[A-Za-z0-9_\/-]+|\*[A-Za-z0-9_-]+|\+\d{4}-\d{2}-\d{2}|=\d{4}-\d{2}-\d{2}|\([A-Za-z0-9_-]+\)|[a-z][a-z0-9-]*:[A-Za-z0-9_./#!@,-]+|https?:\/\/\S+|x-[a-z0-9_-]+=\S+)$/;

function stripSigilTail(text: string): string {
  let result = text;
  // Iteratively strip one sigil at a time.
  while (TRAILING_SIGIL_RE.test(result)) {
    result = result.replace(TRAILING_SIGIL_RE, "");
  }
  // Also handle `::` metadata fence — strip everything from ` :: ` to end.
  const fenceMatch = /\s+::\s.*$/.exec(result);
  if (fenceMatch) result = result.slice(0, fenceMatch.index);
  return result.trimEnd();
}

function stripTrailingSigils(children: ReactNode): ReactNode {
  const arr = Children.toArray(children);
  // Find the last string leaf (ignoring trailing non-string elements).
  for (let i = arr.length - 1; i >= 0; i--) {
    const c = arr[i];
    if (typeof c === "string") {
      const stripped = stripSigilTail(c);
      if (stripped !== c) {
        arr[i] = stripped;
      }
      // Found + processed the last text leaf — stop. Any non-string
      // nodes that follow a text leaf are preserved as-is.
      break;
    }
  }
  return arr;
}

// ─────────────────────────────────────────────────────────────────────────
// stripDetailFromChildren — hide detail blocks from the inline task row
// so they don't render twice (once inline, once in the popup sheet).
//
// remark-gfm renders an indented paragraph / image / code / table /
// callout under a task bullet as a NESTED child of the <li>. If we pass
// those through, the row visually extends with the whole detail below
// the task text. The popup sheet already renders the detail through a
// separate ReactMarkdown pass — so the inline copy is duplicate noise.
//
// Filter rule:
//   - Keep: <input> (GFM checkbox), <ul>/<ol> (nested subtask or note
//     lists), strings + inline elements before any block has appeared,
//     and the FIRST <p> (task text in loose-list mode).
//   - Skip: everything else once we've seen a block — second <p>,
//     <img>, <pre>, <blockquote>, <table>, <h1..h6>, <figure>, and any
//     other obvious block-level tag or custom component.
//
// Custom React components (tags with `type === "function"`) after a
// block boundary are treated as detail too. Known inline ones (like
// SmartLink which renders <a>) always appear in the text portion
// before a block boundary, so they're captured naturally.
// ─────────────────────────────────────────────────────────────────────────

const BLOCK_TAGS = new Set<string>([
  "p",
  "img",
  "pre",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "figure",
]);

function stripDetailFromChildren(children: ReactNode): ReactNode {
  const arr = Children.toArray(children);
  const kept: ReactNode[] = [];
  let blockSeen = false;

  for (const child of arr) {
    // Raw strings: keep until we've entered "block territory".
    if (typeof child === "string") {
      if (!blockSeen) kept.push(child);
      continue;
    }
    if (!isValidElement(child)) continue;

    const type = child.type;
    const tag = typeof type === "string" ? type : "";

    // Always keep: GFM checkbox + nested lists (subtasks / notes).
    if (tag === "input" || tag === "ul" || tag === "ol") {
      kept.push(child);
      continue;
    }

    // First <p> is the task text — keep it; mark block-seen so
    // subsequent <p>s (detail paragraphs) are dropped.
    if (tag === "p" && !blockSeen) {
      kept.push(child);
      blockSeen = true;
      continue;
    }

    // Any other block tag = detail. Drop + flag.
    if (BLOCK_TAGS.has(tag)) {
      blockSeen = true;
      continue;
    }

    // Custom components (tag === "") after a block boundary = detail.
    // Before the boundary they could be inline (SmartLink → <a>) and
    // should pass through.
    if (!tag) {
      if (!blockSeen) kept.push(child);
      else continue;
      continue;
    }

    // Remaining inline HTML tags (em, strong, code, a, span, br, …) —
    // pass through when we're still assembling the task text.
    if (!blockSeen) kept.push(child);
  }
  return kept;
}
