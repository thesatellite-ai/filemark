import { createFileRoute } from "@tanstack/react-router";
import { DocsHeader, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/local-remote")({
  head: () =>
    docsHead(
      "local-remote",
      "Local & remote files",
      "How Filemark renders file:// documents and raw remote URLs in place, and the two permissions each mode needs.",
    ),
  component: LocalRemote,
});

function LocalRemote(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Rendering modes"
        title="Local & remote files"
        intro="Filemark can render a file right where you opened it — a local file:// path or a raw URL — instead of in the standalone app. This is “inject mode”, and each kind needs one permission."
      />

      <h2>Local files (file://)</h2>
      <p>
        Open a local document — <code>file:///Users/you/notes.md</code> — and
        Filemark renders it in the tab instead of showing raw text. For Chrome
        to let an extension read <code>file://</code> pages you must turn on one
        switch:
      </p>
      <ol>
        <li>
          Go to <code>chrome://extensions</code>.
        </li>
        <li>Open Filemark → <strong>Details</strong>.</li>
        <li>
          Enable <strong>“Allow access to file URLs”</strong>.
        </li>
      </ol>
      <Note tone="warn" title="Why a refresh re-reads from disk">
        A <code>file://</code> page has an opaque origin, so the in-page script
        can't re-fetch the file. The Reload button reloads the tab, which makes
        Chrome read the file fresh from disk — that's how edits show up.
      </Note>

      <h2>Remote files (https://)</h2>
      <p>
        Visit a raw <code>.md</code>/<code>.json</code>/<code>.csv</code> URL —
        a raw GitHub file, a gist, a docs file on someone's site — and Filemark
        renders it instead of the browser's plain-text view. This needs the
        remote-rendering permission, which you enable in one click from the{" "}
        <strong>Setup</strong> (rocket) button in the toolbar.
      </p>
      <p>
        Filemark is careful here: a URL that merely ends in <code>.json</code>{" "}
        but actually serves HTML (e.g. a GitHub blob page) is left alone, so you
        never get hijacked into a blank viewer.
      </p>

      <h2>Sandboxed pages</h2>
      <p>
        Some hosts (raw gist, GitHub) serve content with a strict sandbox /
        opaque origin. Filemark still renders there, but storage-backed features
        fall back to <code>chrome.storage</code> (which works in that context)
        instead of IndexedDB (which is blocked). You shouldn't notice — it's
        handled automatically.
      </p>

      <h2>Open in the full app</h2>
      <p>
        From an injected viewer you can jump to the full Filemark app (with the
        sidebar, tabs, search, and panels) via the “Open in full Filemark”
        button in the toolbar.
      </p>

      <Note tone="tip" title="Both gates in one place">
        The toolbar's Setup button shows an amber dot whenever a local or remote
        gate is still off, and walks you through enabling them.
      </Note>

      <NextPrev
        prev={{ to: "/docs/reading", label: "Reading & themes" }}
        next={{ to: "/docs/settings", label: "Settings & permissions" }}
      />
    </article>
  );
}
