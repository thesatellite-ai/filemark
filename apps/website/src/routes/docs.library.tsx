import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsHeader, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/library")({
  head: () =>
    docsHead(
      "library",
      "Library & navigation",
      "Organize and move around your files in Filemark — the sidebar, folders, recents, web docs, tabs, full-text search, and the table of contents.",
    ),
  component: Library,
});

function Library(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Workspace"
        title="Library & navigation"
        intro="The standalone app is a real file workspace: a sidebar of everything you've opened, tabs, fast search, and a live table of contents."
      />

      <h2>Adding files</h2>
      <ul>
        <li>
          <strong>Drag &amp; drop</strong> — drop one file, many files, or a
          whole folder from Finder/Explorer. Loose files land in “Dropped
          files”; folders are walked (skipping <code>node_modules</code>,{" "}
          <code>.git</code>, <code>dist</code>, …).
        </li>
        <li>
          <strong>Open Folder</strong> — on desktop Chromium, pick a folder and
          Filemark shows the whole tree in the sidebar. The handle is remembered
          across reloads (a “Reconnect folder” button appears if Chrome ever
          drops it).
        </li>
        <li>
          <strong>Paste a URL</strong> — open a remote raw file; it's added to
          “Web docs”.
        </li>
      </ul>

      <h2>The sidebar</h2>
      <p>Collapsible (<kbd>⌘B</kbd>) and resizable (drag its edge). Sections:</p>
      <ul>
        <li>
          <strong>Starred</strong> — pinned files in a stable, muscle-memory
          order (star from the toolbar or a row's menu).
        </li>
        <li>
          <strong>Recent</strong> — the last files you opened. Clicking a recent
          does <em>not</em> reorder the list, so positions stay put.
        </li>
        <li>
          <strong>Web docs</strong> — the last 30 remote URLs you rendered,
          newest first, synced across tabs.
        </li>
        <li>
          <strong>Dropped files</strong> — loose files from drag-and-drop.
        </li>
        <li>
          <strong>Folders</strong> — one section per opened folder, with a file
          count, a per-folder filter, rescan, rename (label only), scoped
          search, and remove.
        </li>
      </ul>
      <p>
        Each row has a menu: copy name, copy relative path, copy full path, star,
        remove. Folder collapse state and the sidebar width persist.
      </p>

      <h2>Tabs</h2>
      <p>
        Open multiple files as tabs; drag to reorder, click to switch,{" "}
        <kbd>]</kbd>/<kbd>[</kbd> to move between them, and <kbd>1</kbd>–
        <kbd>9</kbd> to jump. Each file remembers its scroll position across
        reloads, so you return exactly where you left off.
      </p>

      <h2>Full-text search</h2>
      <p>
        Press <kbd>⌘K</kbd> for instant search across every loaded file, with
        query highlighting and the file's location shown. Type{" "}
        <code>@folder-name</code> to scope the search to one folder; the scope
        chip shows what's applied and <kbd>Backspace</kbd> clears it. Search
        state is remembered when you reopen the palette.
      </p>

      <h2>Table of contents &amp; reveal</h2>
      <ul>
        <li>
          <strong>TOC</strong> — toggle it (<kbd>\</kbd>) for a heading outline
          that tracks your scroll position; click to jump.
        </li>
        <li>
          <strong>Reveal in sidebar</strong> — the crosshair button expands the
          parent folders and flashes the active file so you can find it in a big
          tree.
        </li>
      </ul>

      <Note tone="tip" title="Auto-refresh">
        Turn on auto-refresh (the green refresh icon) to poll the active file
        and your folders for on-disk changes — handy while an editor or AI is
        writing to the files.
      </Note>

      <NextPrev
        prev={{ to: "/docs/markdown", label: "Markdown & components" }}
        next={{ to: "/docs/tasks", label: "Tasks" }}
      />
    </article>
  );
}
