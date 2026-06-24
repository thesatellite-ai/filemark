import { createFileRoute } from "@tanstack/react-router";
import { DocsHeader, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/reading")({
  head: () =>
    docsHead(
      "reading",
      "Reading & themes",
      "Reading mode, light/dark/sepia themes, fonts, content width, keyboard shortcuts, and how preferences persist.",
    ),
  component: Reading,
});

function Reading(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Comfort"
        title="Reading & themes"
        intro="Tune how documents look and read — and your choices stick everywhere, including the in-page file viewer."
      />

      <h2>Reading mode</h2>
      <p>
        Press <kbd>⇧F</kbd> (or the book icon) for reading mode: the sidebar and
        task panel hide, leaving the top bar, tabs, and the document — distraction
        free. <kbd>Esc</kbd> exits.
      </p>

      <h2>Theme, font &amp; width</h2>
      <p>
        From the appearance menu pick a theme (light, dark, sepia), a font, and
        the content width (a slider up to a very wide measure for tables and code).
        Each control has its own reset.
      </p>

      <Note tone="tip" title="Preferences persist — even on file:// and remote">
        Theme, font, and width are stored in <code>chrome.storage</code>, so they
        survive reloads in the standalone app <em>and</em> in the injected file
        viewer on <code>file://</code> and remote pages.
      </Note>

      <h2>Getting around</h2>
      <ul>
        <li>
          <strong>Table of contents</strong> — toggle the TOC to jump between
          headings.
        </li>
        <li>
          <strong>Search</strong> — <kbd>⌘K</kbd> opens the search palette
          (scoped search, <code>@mention</code> file picker).
        </li>
        <li>
          <strong>Tabs</strong> — open multiple files; drag to reorder; per-file
          scroll position is remembered across reloads.
        </li>
        <li>
          <strong>Tasks panel</strong> — <kbd>⌘T</kbd> aggregates markdown tasks
          across your open files.
        </li>
        <li>
          <strong>Fullscreen</strong> — <kbd>F</kbd> for a chrome-free view.
        </li>
      </ul>

      <h2>Custom shortcuts</h2>
      <p>
        Shortcuts are layout-independent (they work on any keyboard layout) and
        every one is remappable from the options page if a default clashes with
        your habits.
      </p>

      <NextPrev
        prev={{ to: "/docs/notes", label: "AI review notes" }}
        next={{ to: "/docs/local-remote", label: "Local & remote files" }}
      />
    </article>
  );
}
