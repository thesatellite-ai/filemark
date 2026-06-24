import { createFileRoute } from "@tanstack/react-router";
import { DocsHeader, Figure, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE, shot } from "../lib/docs";

export const Route = createFileRoute("/docs/revisions")({
  head: () =>
    docsHead(
      "revisions",
      "Revision mode",
      "Cache a doc as it changes and review only what an AI edited — with a reading diff or a raw side-by-side / stacked source diff.",
      {
        image: shot("revision-diff-preview-mode.png"),
        faq: [
          {
            q: "How do I see what an AI changed in a document?",
            a: "Turn on revision mode (the History icon). Filemark snapshots the doc as it changes; open History and diff any two revisions — as a rendered 'reading' diff or a raw source diff — so you review only what changed.",
          },
          {
            q: "Does revision mode store my document anywhere?",
            a: "No — revisions are kept locally in your browser (chrome.storage), never uploaded. It keeps the last 5 and is read-only.",
          },
        ],
      },
    ),
  component: Revisions,
});

function Revisions(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Feature"
        title="Revision mode"
        intro="When you're iterating on a doc with an AI, you don't want to re-read the whole thing after every edit. Revision mode snapshots the doc as it changes so you can review only what changed."
      />

      <h2>What it does</h2>
      <p>
        Turn it on for a doc and Filemark keeps a short history of it. Each time
        the content changes, it captures a new revision. Then you can diff any
        two revisions (or a revision against what's on screen) and see exactly
        what moved — as rendered markdown or as raw source lines.
      </p>

      <h2>Turning it on</h2>
      <p>
        Click the <strong>History</strong> (clock) icon in the toolbar. It glows
        green while revision mode is on for the current doc. The setting is{" "}
        <strong>per document</strong> and persists across reloads.
      </p>

      <h2>How capture works</h2>
      <ul>
        <li>
          <strong>Snapshots on change.</strong> Every time the doc renders with
          different content — you reload, auto-refresh re-reads it, or you edit
          and refresh — Filemark hashes the content and stores a new revision{" "}
          <strong>only if it actually changed</strong> (identical content is
          never duplicated).
        </li>
        <li>
          <strong>Keeps the last 5.</strong> It's a “review what just changed”
          buffer, not full version control — the oldest drops off.
        </li>
        <li>
          <strong>Manual snapshot.</strong> A drag-dropped file can't be
          re-read on its own, so the bar has a <strong>Snapshot</strong> button
          to capture the current state on demand.
        </li>
        <li>
          <strong>100% local.</strong> Revisions live in your browser
          (<code>chrome.storage</code>), never uploaded.
        </li>
      </ul>

      <h2>Browsing history</h2>
      <p>
        With revision mode on, a slim bar appears above the doc
        (<em>“Revision mode · N revisions · changed 2m ago”</em>) with{" "}
        <strong>Snapshot</strong>, <strong>History</strong>, and{" "}
        <strong>Clear</strong>. Open <strong>History</strong> for the side panel:
        a list of revisions, newest first, plus the live “Current” state on top
        when there's an unsaved on-screen change.
      </p>
      <ul>
        <li>
          <strong>Click a revision</strong> to load it read-only into the main
          view — step through versions by clicking different rows.
        </li>
        <li>
          <strong>Diff vs previous</strong> on any row shows that revision's
          changes inline.
        </li>
      </ul>

      <h2>The two diff views</h2>
      <p>Both the inline diff and the full-screen compare offer the same lenses:</p>
      <ul>
        <li>
          <strong>Reading diff</strong> — the rendered markdown with changed
          sections highlighted; word-level for prose, structured cell diff for
          tables, and an <strong>“Only changes”</strong> toggle that collapses
          everything unchanged.
        </li>
        <li>
          <strong>Source diff</strong> — the raw markdown lines, in{" "}
          <strong>Side-by-side</strong> or <strong>Stacked</strong> layout, with
          jump-to-next-change.
        </li>
      </ul>
      <p>
        The picker lets you compare any two stored revisions, or the latest
        against the live document.
      </p>
      <Figure
        src="revision-diff-preview-mode.png"
        alt="Filemark revision reading diff showing changed sections of a markdown document"
        caption="Reading diff — rendered markdown with only the changed sections."
      />
      <Figure
        src="revision-diff-source.png"
        alt="Filemark revision source diff showing raw markdown line changes side by side"
        caption="Source diff — raw markdown lines, side-by-side or stacked."
      />

      <Note tone="tip" title="Your view is remembered">
        The panel state, which revision you were previewing, and your diff
        settings (Reading/Source, layout, only-changes) are saved per doc — a
        reload drops you back exactly where you were.
      </Note>

      <h2>Clearing history</h2>
      <p>
        <strong>Clear</strong> resets the history to a single fresh baseline of
        the current content — so the next edit is immediately diffable, with no
        confusing empty first revision. It stays cleared across reloads until the
        doc actually changes.
      </p>

      <Note tone="info" title="It's read-only">
        Revision mode never writes back to your file — it's for reviewing, not
        restoring. Copy what you need from the diff.
      </Note>

      <NextPrev
        prev={{ to: "/docs/tasks", label: "Tasks" }}
        next={{ to: "/docs/notes", label: "AI review notes" }}
      />
    </article>
  );
}
