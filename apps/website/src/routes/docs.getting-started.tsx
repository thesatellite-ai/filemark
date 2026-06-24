import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsHeader, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/getting-started")({
  head: () =>
    docsHead(
      "getting-started",
      "Getting started",
      "Install Filemark, open your first file, and enable the two optional permissions for local and remote rendering.",
      {
        faq: [
          {
            q: "Is Filemark free?",
            a: "Yes — Filemark is a free, MIT-licensed Chrome extension. It runs entirely in your browser with no account, server, or uploads.",
          },
          {
            q: "How do I open a local markdown file?",
            a: "Enable 'Allow access to file URLs' for Filemark at chrome://extensions → Details, then open a file:// path to that .md file and it renders in place.",
          },
          {
            q: "Which browsers does Filemark support?",
            a: "Chrome and Chromium-based browsers (Edge, Brave, Arc) on desktop. Mobile Chrome works for drag-drop but lacks the File System Access folder picker.",
          },
        ],
      },
    ),
  component: GettingStarted,
});

function GettingStarted(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Getting started"
        title="Getting started"
        intro="Install, open a file, and (optionally) flip two switches so Filemark can render local and remote files."
      />

      <h2>1. Install</h2>
      <p>
        Add Filemark from the{" "}
        <a
          href="https://chromewebstore.google.com/detail/filemark/cidgogmffaflfghnebkfjbccfgbdjicm"
          target="_blank"
          rel="noreferrer"
        >
          Chrome Web Store
        </a>
        . It works in Chrome and Chromium browsers (Edge, Brave, Arc). After
        installing, the first run opens a short welcome page explaining the two
        permissions below.
      </p>

      <h2>2. Open a file</h2>
      <p>There are three ways to view a file:</p>
      <ul>
        <li>
          <strong>Open the app</strong> — click the Filemark toolbar icon to
          open the standalone viewer, then drag a file in, open a folder, or
          paste a URL.
        </li>
        <li>
          <strong>Open a local file directly</strong> — navigate to a{" "}
          <code>file://…/notes.md</code> in the address bar and Filemark renders
          it in place (needs the file-URLs permission below).
        </li>
        <li>
          <strong>Open a remote file</strong> — visit a raw{" "}
          <code>.md</code>/<code>.json</code>/<code>.csv</code> URL (a raw
          GitHub or gist link) and Filemark renders it instead of showing plain
          text (needs the remote permission below).
        </li>
      </ul>

      <h2>3. The two optional permissions</h2>
      <p>
        Filemark ships locked-down: it asks for nothing until you turn it on.
        Two switches unlock the in-page rendering modes — see{" "}
        <Link to="/docs/local-remote">Local &amp; remote files</Link> for the
        full detail.
      </p>
      <ul>
        <li>
          <strong>Allow access to file URLs</strong> — lets Filemark render{" "}
          <code>file://</code> documents you open. Toggle it at{" "}
          <code>chrome://extensions</code> → Filemark → Details → “Allow access
          to file URLs”.
        </li>
        <li>
          <strong>Remote rendering</strong> — lets Filemark render raw files
          served over <code>https://</code>. Enable it from the Setup button in
          the toolbar (one click).
        </li>
      </ul>

      <Note tone="tip" title="Not sure if a permission is on?">
        The toolbar shows a small amber dot on the Setup (rocket) button when a
        local or remote gate is still off. Click it to finish setup anytime.
      </Note>

      <h2>4. Make it yours</h2>
      <p>
        Switch theme (light / dark / sepia), font, and content width from the
        appearance menu; press <kbd>⇧F</kbd> for reading mode. Your preferences
        persist across reloads — even inside the injected file viewer. More in{" "}
        <Link to="/docs/reading">Reading &amp; themes</Link>.
      </p>

      <h2>Privacy</h2>
      <p>
        Everything runs client-side in your browser. Filemark never uploads your
        files anywhere — see the <Link to="/privacy">privacy page</Link>.
      </p>

      <NextPrev next={{ to: "/docs/viewers", label: "File viewers" }} />
    </article>
  );
}
