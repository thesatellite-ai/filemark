// ─────────────────────────────────────────────────────────────────────────
// MDXComponentsContext — expose MDXViewer's components map to descendants.
//
// Why: the task-detail popup (<TaskDetailSheet>) renders through a
// separate ReactMarkdown instance inside a React portal. It needs the
// same `components` map the main viewer uses — otherwise <Chart>,
// <Kanban>, <Stats>, <TaskList>, <ADR>, etc. inside a task detail
// render as literal HTML tags instead of their rich components.
//
// Passing the map down through props from every parent surface is
// awkward (the sheet is 5+ levels deep from MDXViewer). A context is
// the right shape — portals read context from their React tree, not
// from the DOM tree.
//
// Usage:
//   MDXViewer: <MDXComponentsContext.Provider value={components}>…</Provider>
//   Consumer: const components = useMDXComponents();
//
// See docsi/TASKS_PLAN.md §18b.7.
// ─────────────────────────────────────────────────────────────────────────

import { createContext, useContext } from "react";

// Loose typing — `components` is the prop react-markdown accepts.
// We keep it as `Record<string, ComponentType>`-ish since the exact
// shape depends on what the host registers.
export type MDXComponentsMap = Record<string, unknown>;

const MDXComponentsContext = createContext<MDXComponentsMap | null>(null);

export const MDXComponentsProvider = MDXComponentsContext.Provider;

export function useMDXComponents(): MDXComponentsMap | null {
  return useContext(MDXComponentsContext);
}
