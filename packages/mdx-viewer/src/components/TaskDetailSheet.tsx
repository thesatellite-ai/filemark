// ─────────────────────────────────────────────────────────────────────────
// TaskDetailSheet — right-side popup drawer rendering a task's detail.
//
// Spec: docsi/TASKS_PLAN.md §18b.4.
//
// Design:
//
//   - Portal into document.body so the sheet isn't clipped by any
//     parent `overflow: hidden` / `transform` context.
//   - Backdrop + slide-in drawer; all colors + geometry driven by
//     `--fm-task-sheet-*` theme tokens with shadcn fallbacks.
//   - Close affordances: X button, Escape key, backdrop click.
//   - Body renders `task.detail` through ReactMarkdown using the SAME
//     components map the main viewer uses (pulled via
//     useMDXComponents) + the SAME remark/rehype plugin chain so
//     fenced blocks (csv, chart, kanban, schema, tasks), MDX tags
//     (<Chart>, <Stats>, <ADR>, …), math, and raw HTML all work.
//   - Footer: optional "Open source line" link that bumps the host's
//     scrollTarget to the start of the detail's line range.
//
// Rendering safety:
//
//   - The detail string is trusted author markdown — no sanitization
//     beyond what rehype-raw normally applies. This matches the
//     treatment of the rest of the markdown doc.
//   - Nested TaskItems inside a detail go through the same TaskItem
//     component, which tries to useTaskByLine. Since subtasks live in
//     the same TasksContext array with correct `line` numbers from
//     the ORIGINAL doc (not the sliced detail source), they won't
//     match. Acceptable for v1: nested tasks inside a detail render
//     as plain GFM checkboxes without chips. Restore rich chips in
//     v1.1 by re-parsing the detail slice with offset line numbers.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import type { Task } from "@filemark/tasks";
import { useMDXComponents } from "../components-context";
import { remarkCodeMeta } from "../remark-code-meta";

export interface TaskDetailSheetProps {
  task: Task;
  open: boolean;
  onClose: () => void;
  /** Optional — called when the user clicks "Jump to source line" in the
   *  footer. Usually bound to the host's `openTaskLocation` action. */
  onJumpToSource?: (line: number) => void;
}

export function TaskDetailSheet({
  task,
  open,
  onClose,
  onJumpToSource,
}: TaskDetailSheetProps) {
  const components = useMDXComponents();

  // Close on Escape. We attach directly to window so the sheet handles
  // the key even when focus is outside its subtree. Runs only while
  // open to avoid cluttering the global keymap.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent background page from scrolling while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const body = task.detail ?? "";
  const firstLine = task.detailLineRange?.[0];

  return createPortal(
    <div
      className="fv-task-sheet-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <aside
        className="fv-task-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={task.text || "Task detail"}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fv-task-sheet-header">
          <span className="fv-task-sheet-status" aria-hidden>
            {statusGlyph(task.status)}
          </span>
          <span className="fv-task-sheet-title">
            {task.text || <em>Untitled task</em>}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="fv-task-sheet-close"
            aria-label="Close task detail"
            title="Close (Esc)"
          >
            ×
          </button>
        </header>
        <div className="fv-task-sheet-body fv-mdx-body">
          {body ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath, remarkBreaks, remarkCodeMeta]}
              rehypePlugins={[rehypeRaw, rehypeSlug, rehypeKatex]}
              components={(components ?? undefined) as never}
            >
              {body}
            </ReactMarkdown>
          ) : (
            <div className="fv-task-sheet-empty">
              <em>This task has no detail.</em>
            </div>
          )}
        </div>
        {firstLine && onJumpToSource && (
          <footer className="fv-task-sheet-footer">
            <button
              type="button"
              onClick={() => {
                onJumpToSource(firstLine);
                onClose();
              }}
              className="fv-task-sheet-jump"
            >
              Jump to source line {firstLine} →
            </button>
          </footer>
        )}
      </aside>
    </div>,
    document.body
  );
}

function statusGlyph(s: string): string {
  switch (s) {
    case "todo":
      return "☐";
    case "wip":
      return "◐";
    case "done":
      return "☑";
    case "blocked":
      return "⚠";
    case "question":
      return "?";
    case "cancelled":
      return "⊘";
    default:
      return "·";
  }
}
