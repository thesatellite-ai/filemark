import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
});

// Public privacy policy URL used by the Chrome Web Store listing.
// Keep wording precise and conservative — CWS reviewers read this.
function Privacy(): React.ReactElement {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Last updated: 2026-05-25
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          The short version: Filemark runs entirely in your browser. It does
          not send your files, browsing activity, or any personal information
          to anyone, ever. The long version is below.
        </p>
      </div>

      <Section title="1. What data we collect">
        <p>
          <strong>None.</strong> Filemark does not collect, transmit, or share
          any personal information, file contents, telemetry, analytics, crash
          reports, or usage statistics. There is no account system, no signup,
          no login.
        </p>
      </Section>

      <Section title="2. Where your data lives">
        <p>
          Filemark stores the following on <strong>your device only</strong>,
          inside the browser's IndexedDB and <code>chrome.storage</code>:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Your file library (recent files, open tabs, folder handles you've
            granted access to)
          </li>
          <li>
            Theme + typography preferences (light / dark / sepia, font,
            size, line height, content width)
          </li>
          <li>
            Per-file UI state: task-checkbox state, datagrid sort and filter
            choices, sidebar collapse state, scroll position
          </li>
          <li>
            Settings: which file formats are enabled, JSON-viewer options,
            keyboard-shortcut bindings
          </li>
        </ul>
        <p>
          All of this is local. Uninstalling the extension or clearing
          extension data removes it. None of it leaves your browser.
        </p>
      </Section>

      <Section title="3. Permissions and why we need them">
        <ul className="space-y-3">
          <li>
            <strong className="font-mono text-sm">storage</strong> — to
            persist your library, preferences, and per-file UI state across
            sessions, in your browser's local storage.
          </li>
          <li>
            <strong className="font-mono text-sm">declarativeNetRequest</strong>{" "}
            — to intercept navigations to local <code>.csv</code> and{" "}
            <code>.tsv</code> files so Filemark renders them in its datagrid
            instead of Chrome triggering a download. Rules are created at
            runtime, scoped to file URLs, and never observe or modify network
            traffic.
          </li>
          <li>
            <strong className="font-mono text-sm">
              host_permissions: &lt;all_urls&gt;
            </strong>{" "}
            — required by Chrome's platform to register{" "}
            <code>declarativeNetRequest</code> redirect rules whose target is
            a <code>chrome-extension://</code> URL. Filemark does not read
            page content on any website and does not communicate with any
            external server.
          </li>
          <li>
            <strong>Allow access to file URLs</strong> — you enable this
            yourself on the extension's details page. It lets Filemark read
            the bytes of the local files you ask it to open.
          </li>
        </ul>
      </Section>

      <Section title="4. What we do NOT do">
        <ul className="list-disc space-y-1 pl-5">
          <li>We do not run analytics or tracking scripts.</li>
          <li>We do not include third-party SDKs that phone home.</li>
          <li>We do not download or execute remote code at runtime.</li>
          <li>We do not read or modify the content of any web page.</li>
          <li>
            We do not transmit your file contents, file names, file paths,
            search queries, settings, or behavior to any server.
          </li>
          <li>
            We do not share or sell any information about you, because we
            don't have any.
          </li>
        </ul>
      </Section>

      <Section title="5. Open source">
        <p>
          Filemark is open source under the MIT license. The full source code,
          including the manifest with every permission declared, is at{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            github.com/thesatellite-ai/filemark
          </a>
          . You can audit the network behavior yourself in Chrome's DevTools —
          you will see zero outbound requests.
        </p>
      </Section>

      <Section title="6. Children">
        <p>
          Filemark is a developer tool. We do not knowingly collect any data
          from anyone, including children, because we do not collect data at
          all. The extension is suitable for any age but does not market to
          children.
        </p>
      </Section>

      <Section title="7. Changes to this policy">
        <p>
          If this policy ever changes (for example, if we add an optional sync
          feature), the new version will be published on this page and the
          extension's release notes will call it out explicitly. Existing
          users will be notified before any new data-handling behavior takes
          effect.
        </p>
      </Section>

      <Section title="8. Contact">
        <p>
          Questions, concerns, or bug reports about privacy: email{" "}
          <a
            href="mailto:khanakia@gmail.com"
            className="underline underline-offset-2"
          >
            khanakia@gmail.com
          </a>{" "}
          or file an issue at{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark/issues"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            github.com/thesatellite-ai/filemark/issues
          </a>
          .
        </p>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="mt-10 space-y-3 text-[15px] leading-relaxed text-foreground/90">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
