// REVISION MODE — comparison-node logic (feature map: revision/RevisionProvider.tsx).
//
// Pure helpers (no React/DOM) deciding WHAT the diff view compares, so the
// behaviour is unit-testable instead of buried in component state:
//   • buildDiffNodes — stored revisions + a "Current (live)" node, the latter
//     only when the on-screen content differs from the latest snapshot (so the
//     default never lands on an empty "latest → Current").
//   • defaultPair — the from→to to preselect: the last two nodes (the most
//     recent change), i.e. "#1 → #2", or "latest → Current" when there's an
//     uncommitted live edit.
import type { Revision } from "./types";

/** Synthetic node id for the live on-screen content. */
export const CURRENT_ID = "__current__";

/** Display label for the live on-screen content node (shared by the picker and
 *  the history panel so they never read differently). */
export const CURRENT_NODE_LABEL = "Current (live)";

/** A comparison node = a stored revision OR the live "Current" content. */
export interface DiffNode {
  id: string;
  content: string;
  label: string;
}

/** "#3 · 14:02" label for a stored revision (index is 0-based position). */
export function revisionLabel(rev: Revision, index: number): string {
  const time = new Date(rev.capturedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `#${index + 1} · ${time}`;
}

/**
 * Build the ordered comparison nodes (oldest → newest). Appends a "Current
 * (live)" node ONLY when `currentContent` differs from the latest stored
 * revision — when they're equal the live state adds nothing and would make the
 * default comparison an empty diff.
 */
export function buildDiffNodes(revisions: Revision[], currentContent: string): DiffNode[] {
  const nodes: DiffNode[] = revisions.map((r, i) => ({
    id: r.id,
    content: r.content,
    label: revisionLabel(r, i),
  }));
  const latest = revisions[revisions.length - 1];
  if (currentContent && (!latest || latest.content !== currentContent)) {
    nodes.push({ id: CURRENT_ID, content: currentContent, label: CURRENT_NODE_LABEL });
  }
  return nodes;
}

/** The default from→to selection: the last two nodes (the most recent change).
 *  Null when there aren't two nodes to compare. */
export function defaultPair(nodes: DiffNode[]): { oldId: string; newId: string } | null {
  if (nodes.length < 2) return null;
  return { oldId: nodes[nodes.length - 2]!.id, newId: nodes[nodes.length - 1]!.id };
}
