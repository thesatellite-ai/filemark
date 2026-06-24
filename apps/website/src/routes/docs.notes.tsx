import { createFileRoute } from "@tanstack/react-router";
import { DocsHeader, Figure, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE, shot } from "../lib/docs";

export const Route = createFileRoute("/docs/notes")({
  head: () =>
    docsHead(
      "notes",
      "AI review notes",
      "Highlight text in a rendered doc, attach an instruction for your AI, and copy every note as plain text to paste back.",
      { image: shot("notes_view.png") },
    ),
  component: Notes,
});

function Notes(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Feature"
        title="AI review notes"
        intro="Reviewing a doc an AI wrote? Mark up the rendered page like you'd scribble on a printout, then hand the whole list back to your AI in one paste."
      />

      <h2>How it works</h2>
      <ol>
        <li>
          <strong>Highlight</strong> any text in the rendered document. A “+
          Note” button appears.
        </li>
        <li>
          <strong>Write an instruction</strong> for the AI (“tighten this”,
          “wrong — it's deny-by-default”, “add an example”). Save with{" "}
          <kbd>⌘↵</kbd>.
        </li>
        <li>
          The highlight stays painted on the page and the note lands in the
          sidebar.
        </li>
        <li>
          <strong>Copy all</strong> to get every note as plain text, then paste
          it into your AI chat.
        </li>
      </ol>

      <Figure
        src="notes_add.png"
        alt="Highlighting text in a Filemark document and adding an AI review note in the composer"
        caption="Highlight text → add an instruction for your AI."
      />

      <h2>What each note captures</h2>
      <p>
        Every note records the exact quoted text, the nearest heading (which
        section it's in), and the source line number — so when you paste them
        back, the AI knows precisely where each instruction applies. Copy a
        single note, or all of them at once.
      </p>

      <h2>Navigating notes</h2>
      <ul>
        <li>
          Click a note in the sidebar to scroll to its highlight and flash it.
        </li>
        <li>
          Click a highlight in the document to jump to its note in the panel.
        </li>
      </ul>
      <Figure
        src="notes_view.png"
        alt="The Filemark notes side panel listing review notes with their quotes and section references"
        caption="The notes panel — every note with its quote, section, and line; Copy all for AI."
      />

      <Note tone="info" title="Ephemeral by design">
        Notes live in memory for the current view — they're a scratch pad for a
        review pass, not saved into the file. Switching files or reloading clears
        them. There's no sidecar file and nothing is written to your document.
      </Note>

      <Note tone="tip" title="Highlights survive re-renders">
        Highlights are re-resolved from the quoted text on every change, so they
        stay put even when code blocks re-highlight or the page re-renders.
      </Note>

      <NextPrev
        prev={{ to: "/docs/revisions", label: "Revision mode" }}
        next={{ to: "/docs/reading", label: "Reading & themes" }}
      />
    </article>
  );
}
