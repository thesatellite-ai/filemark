import { createFileRoute } from "@tanstack/react-router";
import { DocsHeader, NextPrev } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/troubleshooting")({
  head: () =>
    docsHead(
      "troubleshooting",
      "Troubleshooting",
      "Fixes for common Filemark issues — blank viewers, permissions, sandboxed pages, downloads, and stale content.",
      {
        faq: [
          {
            q: "Why does my local markdown file show as raw text?",
            a: "Filemark needs file-URL access. Go to chrome://extensions → Filemark → Details and enable 'Allow access to file URLs', then reload the tab.",
          },
          {
            q: "Why isn't a raw remote file rendering?",
            a: "Enable remote rendering from the Setup button in the toolbar. Only raw files render — a GitHub blob page (HTML that ends in .json) is intentionally left alone.",
          },
          {
            q: "Why don't my edits show up?",
            a: "For a file:// document, click Reload — a local page can't re-fetch itself, so reloading makes Chrome read the file fresh from disk. Or enable auto-refresh to poll for changes.",
          },
        ],
      },
    ),
  component: Troubleshooting,
});

function Troubleshooting(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Help"
        title="Troubleshooting"
        intro="The usual suspects and how to fix them. Still stuck? Open an issue on GitHub — link at the bottom."
      />

      <h2>A local file shows raw text, not the rendered view</h2>
      <p>
        Filemark needs file-URL access. Go to <code>chrome://extensions</code> →
        Filemark → Details → enable <strong>“Allow access to file URLs”</strong>,
        then reload the tab.
      </p>

      <h2>A remote raw file isn't rendering</h2>
      <p>
        Enable remote rendering from the <strong>Setup</strong> (rocket) button
        in the toolbar. Note that only <em>raw</em> files render — a GitHub blob
        page (HTML that happens to end in <code>.json</code>) is intentionally
        left alone.
      </p>

      <h2>My edits don't show up</h2>
      <p>
        For a <code>file://</code> document, click <strong>Reload</strong> — a
        local page can't re-fetch itself, so reloading makes Chrome read the file
        fresh from disk. Or turn on auto-refresh to poll for changes.
      </p>

      <h2>A CSV downloads instead of opening</h2>
      <p>
        Make sure the CSV format is enabled on the options page. On{" "}
        <code>file://</code>, CSV/TSV are intercepted so they render instead of
        downloading; if you disabled that format, Chrome's default download
        behavior returns.
      </p>

      <h2>Something looks off on a gist / raw GitHub page</h2>
      <p>
        Those pages are sandboxed (opaque origin). Filemark renders there and
        automatically uses <code>chrome.storage</code> for any saved state
        (IndexedDB is blocked in that context). If a feature seems limited on
        such a page, opening the file in the full app avoids the sandbox.
      </p>

      <h2>The page didn't update after an extension update</h2>
      <p>
        Chrome auto-updates the extension in the background. Already-open injected
        viewer tabs keep the old code until you reload <em>those</em> tabs — so
        reload the tab to pick up a new version.
      </p>

      <h2>Still stuck?</h2>
      <p>
        Open an issue at{" "}
        <a
          href="https://github.com/thesatellite-ai/filemark/issues"
          target="_blank"
          rel="noreferrer"
        >
          github.com/thesatellite-ai/filemark/issues
        </a>{" "}
        with the file type, the URL or path, and what you expected — it really
        helps.
      </p>

      <NextPrev prev={{ to: "/docs/shortcuts", label: "Keyboard shortcuts" }} />
    </article>
  );
}
