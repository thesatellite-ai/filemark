import { createFileRoute, Link } from "@tanstack/react-router";
import { DocsHeader, NextPrev, Note } from "../components/docs-ui";
import { docsHead, DOCS_PROSE } from "../lib/docs";

export const Route = createFileRoute("/docs/settings")({
  head: () =>
    docsHead(
      "settings",
      "Settings & permissions",
      "Configure Filemark from the options page — file formats, remote URL rendering, site rules, the JSON viewer, keyboard shortcuts, and what permissions it uses.",
      {
        faq: [
          {
            q: "What permissions does Filemark need?",
            a: "Only storage by default. Local file rendering needs 'Allow access to file URLs' (a per-extension Chrome toggle); remote rendering is an optional host permission you grant from the options page. No data ever leaves your browser.",
          },
          {
            q: "Can I stop Filemark rendering on a specific site?",
            a: "Yes. Add a site rule on the options page in Exclude mode (e.g. *://*.github.com/*) to never render there, or Include mode to force-allow. Include wins over Exclude for carving exceptions.",
          },
        ],
      },
    ),
  component: Settings,
});

function Settings(): React.ReactElement {
  return (
    <article className={DOCS_PROSE}>
      <DocsHeader
        kicker="Configuration"
        title="Settings & permissions"
        intro="Open the options page from the gear icon in the toolbar (or chrome://extensions → Filemark → Options). It's a left-nav settings shell."
      />

      <h2>File formats</h2>
      <p>
        Toggle each of the nine formats (md, mdx, json, jsonc, csv, tsv, sql,
        prisma, dbml) on or off independently. A disabled format falls back to
        Chrome's default handling — so disabling CSV makes <code>.csv</code>{" "}
        download normally again.
      </p>

      <h2>Remote URLs</h2>
      <p>
        Rendering raw files served over <code>https://</code> needs an optional
        host permission, off by default. Flip the “Render remote files” toggle
        and approve Chrome's one-time prompt; revoke it any time from the same
        switch. See <Link to="/docs/local-remote">Local &amp; remote files</Link>.
      </p>

      <h2>Site rules</h2>
      <p>
        Fine-grained control with Chrome match patterns:
      </p>
      <ul>
        <li>
          <strong>Exclude</strong> — never render on matching URLs (e.g.{" "}
          <code>*://*.github.com/*</code>, or <code>*://*/*</code> for
          everywhere).
        </li>
        <li>
          <strong>Include</strong> — force-allow on matching URLs.{" "}
          <strong>Include wins over Exclude</strong>, so you can exclude a whole
          domain and carve out one path.
        </li>
      </ul>
      <p>Each rule can be enabled/disabled or deleted; there are recipes for the common cases.</p>

      <h2>JSON viewer</h2>
      <p>Defaults for the JSON tree:</p>
      <ul>
        <li>Theme (nine options) and collapse depth (None / 1–5).</li>
        <li>String truncation length (0–400 chars) and copy indent (0–8 spaces).</li>
        <li>Toggles for data-type chips, object-size badges, and clipboard icons.</li>
      </ul>

      <h2>Keyboard shortcuts</h2>
      <p>
        Enable/disable shortcuts globally or per action, and remap any of them by
        clicking the chord and pressing a new combo. Full list and details on the{" "}
        <Link to="/docs/shortcuts">Keyboard shortcuts</Link> page.
      </p>

      <h2>Help &amp; support / Reset</h2>
      <p>
        The Help section links to these docs, the website, the GitHub repo, and
        the issue tracker. Reset restores all options to their defaults (it does
        not touch your library, folders, or stars).
      </p>

      <h2>Permissions &amp; privacy</h2>
      <ul>
        <li>
          <strong>storage</strong> — saves your settings, library, and recents
          locally.
        </li>
        <li>
          <strong>file URLs</strong> — a per-extension toggle in{" "}
          <code>chrome://extensions</code> for rendering local files.
        </li>
        <li>
          <strong>remote host access</strong> — optional, opt-in, revocable.
        </li>
      </ul>
      <Note tone="tip" title="100% local">
        Filemark runs entirely client-side — no server, no telemetry, no
        uploads. Manifest V3 with a strict CSP (no remote code). See the{" "}
        <Link to="/privacy">privacy page</Link>.
      </Note>

      <NextPrev
        prev={{ to: "/docs/local-remote", label: "Local & remote files" }}
        next={{ to: "/docs/shortcuts", label: "Keyboard shortcuts" }}
      />
    </article>
  );
}
