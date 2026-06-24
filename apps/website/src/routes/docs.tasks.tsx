import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsHeader, Figure, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE, shot } from "../lib/docs";

export const Route = createFileRoute("/docs/tasks")({
  head: () =>
    docsHead(
      "tasks",
      "Tasks",
      "Markdown-native tasks in Filemark — status, priority, owner and due-date sigils, filterable task lists, the cross-file task panel, and kanban boards.",
      {
        image: shot("tasks-kanban.png"),
        faq: [
          {
            q: "How do I write a task in Filemark?",
            a: "Use a GFM checkbox bullet with sigils: '- [ ] Ship the docs @aman !p1 ~2026-07-01 (website)'. Status, owner (@), priority (!p0–p4), due date (~date), and project (parentheses) are all parsed.",
          },
          {
            q: "Can I see tasks across multiple files?",
            a: "Yes — the Tasks panel (⌘T) aggregates every task across your open files, with filter tabs (Open, Today, Week, Overdue, Blocked), search, and group-by.",
          },
        ],
      },
    ),
  component: Tasks,
});

function Tasks(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Productivity"
        title="Tasks"
        intro="Filemark treats markdown checkboxes as real tasks: add priority, owner, and due-date sigils, then filter, group, and roll them up across files."
      />

      <h2>Writing a task</h2>
      <p>A task is a GFM checkbox bullet plus optional sigils:</p>
      <pre className="my-3 overflow-x-auto rounded-md border border-border bg-card p-3 text-[13px]">
        <code>- [ ] Ship the docs @aman !p1 ~2026-07-01 (website) #seo ^docs-ship</code>
      </pre>
      <ul>
        <li>
          <strong>Status</strong> — <code>[ ]</code> todo, <code>[/]</code> in
          progress, <code>[x]</code> done, <code>[!]</code> blocked,{" "}
          <code>[?]</code> question, <code>[-]</code> cancelled.
        </li>
        <li>
          <strong>@owner</strong> · <strong>!p0–p4</strong> priority ·{" "}
          <strong>~YYYY-MM-DD</strong> due date · <strong>(project)</strong> ·{" "}
          <strong>#tag</strong> · <strong>^id</strong> stable id ·{" "}
          <strong>after:^id</strong> dependency.
        </li>
      </ul>
      <p>
        Checkboxes toggle right in the rendered view and the state persists per
        file.
      </p>

      <h2>Lists, stats &amp; timelines</h2>
      <p>Pull tasks into views anywhere in a doc:</p>
      <ul>
        <li>
          <code>&lt;TaskList filter="is:open AND priority&lt;=p1" group-by="owner" sort="priority:asc" /&gt;</code>
        </li>
        <li>
          <code>&lt;TaskStats md /&gt;</code> — counts by status / priority /
          owner / project.
        </li>
        <li>
          <code>&lt;TaskTimeline md lane="owner" /&gt;</code> — a Gantt-style
          strip.
        </li>
      </ul>

      <h2>The cross-file task panel</h2>
      <p>
        Press <kbd>⌘T</kbd> to open the task panel — it aggregates every task
        across your open files with filter tabs (All, Open, Today, Week,
        Overdue, Blocked), search, and a group-by dropdown. It's the single place
        to see “what's due” across a whole project.
      </p>

      <h2>Kanban</h2>
      <p>
        Render a board from your tasks with{" "}
        <code>&lt;Kanban md group-by="status" /&gt;</code>, or from a CSV with{" "}
        <code>&lt;Kanban src="./roadmap.csv" group-by="status" /&gt;</code>.
      </p>
      <Figure
        src="tasks-kanban.png"
        alt="Filemark rendering markdown tasks as a kanban board grouped by status"
        caption="Tasks rendered as a kanban board."
      />

      <Note tone="info" title="Authoring the sigils + filter DSL">
        The full task grammar and the <code>&lt;TaskList&gt;</code> filter DSL
        are taught by the <Link to="/ai">AI skill</Link> so your assistant writes
        valid tasks.
      </Note>

      <NextPrev
        prev={{ to: "/docs/library", label: "Library & navigation" }}
        next={{ to: "/docs/revisions", label: "Revision mode" }}
      />
    </article>
  );
}
