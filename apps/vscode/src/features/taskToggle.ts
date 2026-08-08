// Pure task-checkbox toggle logic, split out from the host so it can be unit
// tested without the vscode API. extension.ts turns the returned column +
// replacement char into a WorkspaceEdit.

/**
 * A GFM task bullet, capturing the prefix up to the marker char (group 1) and
 * the marker itself (group 2). The marker char set mirrors filemark's task
 * statuses (see @filemark/tasks): ` ` todo, `x`/`X` done, `/` wip, `-`
 * cancelled, `!` blocked, `?` question. Kept as a regex (not the status enum)
 * because we operate on raw source text, one line at a time.
 */
export const TASK_MARKER_RE = /^(\s*[-*+]\s+\[)([ xX/\-!?])(\])/;

/** Marker chars written back by a toggle. */
export const DONE_MARKER = "x";
export const TODO_MARKER = " ";

/** Where and what to write to flip a task's checkbox. */
export interface TaskMarkerToggle {
  /** 0-based column of the single marker char inside the `[ ]`. */
  col: number;
  /** Replacement char for that column. */
  next: string;
}

/**
 * Compute the edit that flips a task bullet's checkbox, or null when the line
 * isn't a task bullet (so a stray preview click is a safe no-op). Done (`x`/`X`)
 * → todo (space); any other state (todo/wip/blocked/…) → done (`x`) — a plain
 * two-state toggle, not a status cycle. Pure: no I/O, no vscode dependency.
 */
export function toggleTaskMarker(lineText: string): TaskMarkerToggle | null {
  const match = TASK_MARKER_RE.exec(lineText);
  if (!match) return null;
  const done = match[2] === "x" || match[2] === "X";
  return { col: match[1].length, next: done ? TODO_MARKER : DONE_MARKER };
}
