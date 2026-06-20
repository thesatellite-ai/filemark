import { createFileRoute } from "@tanstack/react-router";
import { pageScripts } from "../lib/schema";

const SITE = "https://khanakia.com/apps/filemark";

export const Route = createFileRoute("/privacy")({
  head: () => {
    const title = "Privacy policy — Filemark";
    const desc =
      "Filemark privacy policy: zero data collection, zero analytics, zero remote code. Full disclosure of every permission used by the Chrome extension and why.";
    const url = `${SITE}/privacy`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { name: "robots", content: "index,follow" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: pageScripts({
        name: title,
        description: desc,
        url,
        // PrivacyPolicy co-type — valid WebPage subtype, aids compliance /
        // answer-engine context.
        extraType: "PrivacyPolicy",
        crumbs: [
          { name: "Filemark", url: `${SITE}/` },
          { name: "Privacy policy", url },
        ],
      }),
    };
  },
  component: Privacy,
});

// Public privacy policy URL used by the Chrome Web Store listing.
// Drafted for CWS review: covers every CWS-required disclosure block —
// extension identification, data-collected ("none"), per-permission
// justification, Limited Use compliance, sub-processors (none),
// retention, children, GDPR/CCPA, security, updates.
function Privacy(): React.ReactElement {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          Effective: 2026-06-14 · Last updated: 2026-06-14
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          The short version: Filemark runs entirely in your browser. It does
          not collect, transmit, or share your files, browsing activity, or
          any personal information — ever. The long version, with the level
          of detail Chrome Web Store reviewers expect, is below.
        </p>
      </div>

      <Section title="1. Who this policy applies to">
        <p>
          This policy describes the data handling practices of{" "}
          <strong>Filemark</strong>, a free, open-source Chrome browser
          extension (Manifest V3) published by the Filemark project,
          maintainer khanakia. It applies to the extension distributed via
          the Chrome Web Store and the equivalent source build available at{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            github.com/thesatellite-ai/filemark
          </a>
          .
        </p>
        <p>
          This policy also covers the marketing website at{" "}
          <code>khanakia.com/apps/filemark</code>, which is a static
          single-page application served from Cloudflare Workers Static
          Assets. The website has no analytics, no cookies, no forms, and no
          backend.
        </p>
      </Section>

      <Section title="2. What personal data we collect">
        <p>
          <strong>None.</strong> Filemark does not collect, transmit, log,
          observe, infer, sell, share, profile, or otherwise process any
          personal information from any user.
        </p>
        <p>
          This includes — but is not limited to — names, email addresses,
          IP addresses, geolocation, device identifiers, browsing history,
          search queries, file contents, file names, file paths, folder
          structure, authentication tokens, analytics, telemetry, crash
          reports, performance metrics, A/B-test variant assignments, or
          behavioral usage statistics.
        </p>
        <p>
          We are unable to identify, contact, recognize, count, or remarket
          to any user of Filemark, because we have no information about any
          user. There is no account system, no signup, no login.
        </p>
      </Section>

      <Section title="3. Local-only data Filemark stores on your device">
        <p>
          To make the extension work across browser restarts, Filemark
          stores the following <strong>on your device only</strong>, inside
          the browser's IndexedDB and <code>chrome.storage</code> APIs:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Your file library: recently opened files, open tabs, and File
            System Access folder handles you have granted Filemark access to
          </li>
          <li>
            Theme + typography preferences: mode (light / dark / sepia),
            font family, font size, line height, content width
          </li>
          <li>
            Per-file UI state: task-checkbox state, datagrid sort and filter
            choices, sidebar / panel collapse state, scroll position
          </li>
          <li>
            Settings: which file formats are enabled, JSON-viewer options
            (theme, depth, formatting), keyboard-shortcut bindings, sidebar
            width
          </li>
        </ul>
        <p>
          This data never leaves your browser. We have no way to read it.
          Uninstalling the extension or clearing extension data through{" "}
          <code>chrome://extensions</code> removes it completely.
        </p>
      </Section>

      <Section title="4. The files you open">
        <p>
          When you point Filemark at a local file or folder — by dragging it
          into the viewer, picking it through the OS folder picker, or
          opening a <code>file://</code> URL with the content script — the
          extension reads the file bytes directly from your disk through the
          browser's File System Access API, <code>FileReader</code>, or
          (for intercepted <code>file://</code> URLs) Chrome's native
          file-system access.
        </p>
        <p>
          Filemark uses the bytes only to render the file inside your
          browser tab. The file contents are <strong>never</strong> sent to
          any server controlled by Filemark, the website, the maintainer, or
          any third party. There is no upload step, no cloud sync, no
          background transmission.
        </p>
        <p>
          When you navigate away from a file or close its tab, the file
          contents are released by the browser. Only the small metadata
          described in section 3 (filename, scroll position, etc.) persists
          locally so that the file can be re-opened later.
        </p>
      </Section>

      <Section title="5. Permissions Filemark requests, and exactly why">
        <p>
          The full Manifest V3 manifest is public source at{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark/blob/main/apps/chrome-ext/public/manifest.json"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            apps/chrome-ext/public/manifest.json
          </a>
          . Each permission is requested for the single, narrow purpose
          described below; nothing else is done with it.
        </p>
        <ul className="space-y-4">
          <li>
            <strong className="font-mono text-sm">storage</strong>
            <p className="mt-1">
              Required to persist your file library, preferences, and
              per-file UI state across browser sessions using Chrome's local
              storage and IndexedDB APIs. Data is written to and read from
              your browser only.
            </p>
          </li>
          <li>
            <strong className="font-mono text-sm">
              declarativeNetRequest
            </strong>
            <p className="mt-1">
              Required to register dynamic redirect rules that intercept
              navigations to local <code>.csv</code> and <code>.tsv</code>{" "}
              files. Without this permission, Chrome triggers a file
              download when you visit a CSV; with it, Filemark redirects the
              navigation to its built-in datagrid renderer. The
              declarativeNetRequest API is a <em>declarative</em> rule
              system — Filemark cannot observe, log, or modify network
              traffic itself. Rules are scoped to local{" "}
              <code>file://</code> URLs only.
            </p>
          </li>
          <li>
            <strong className="font-mono text-sm">
              host_permissions: &lt;all_urls&gt;
            </strong>
            <p className="mt-1">
              Required by the Chrome platform to register
              declarativeNetRequest redirect rules whose <em>target</em> is
              a <code>chrome-extension://</code> URL inside the extension.
              This is a platform constraint of MV3 dynamic redirects, not a
              data-collection mechanism. Filemark does <strong>not</strong>{" "}
              read, scrape, or modify the content of any web page, does{" "}
              <strong>not</strong> inject scripts into pages you visit, and
              does <strong>not</strong> observe any cross-site browsing
              behavior. You can verify this in Chrome DevTools: Filemark
              issues zero outbound network requests during normal use.
            </p>
          </li>
          <li>
            <strong>Allow access to file URLs</strong> (user-toggled,
            <em> not</em> declared in the manifest)
            <p className="mt-1">
              This toggle lives on each extension's details page in{" "}
              <code>chrome://extensions</code>; you choose whether to enable
              it. When enabled, it allows the content script to read the
              bytes of a local file you have actively navigated to (e.g. you
              double-click a <code>.md</code> file in Finder and Chrome
              opens <code>file:///…/notes.md</code>), so Filemark can render
              it in place. Without this toggle, Filemark still works for
              files you explicitly drag in or open through the folder
              picker.
            </p>
          </li>
        </ul>
        <p>
          Filemark does <strong>not</strong> request the{" "}
          <code>tabs</code>, <code>history</code>, <code>cookies</code>,{" "}
          <code>activeTab</code> (beyond MV3 defaults), <code>identity</code>
          , <code>webRequest</code>, <code>scripting</code> (other than the
          file-URL content script), <code>bookmarks</code>,{" "}
          <code>downloads</code>, or any other sensitive permission.
        </p>
      </Section>

      <Section title="6. Single purpose">
        <p>
          Filemark has a single purpose: <strong>render local files</strong>{" "}
          (Markdown, MDX, JSON, JSONC, CSV, TSV, SQL, Prisma schema, DBML)
          that Chrome would otherwise download or display as plain text.
          Every feature in the extension — the file library sidebar, search
          palette, themes, tabs, kanban from tasks — exists to make
          rendering those files more useful. The extension does not do
          anything outside that purpose.
        </p>
      </Section>

      <Section title="7. Things we explicitly do not do">
        <ul className="list-disc space-y-1 pl-5">
          <li>We do not run analytics or tracking scripts.</li>
          <li>
            We do not include third-party SDKs, telemetry libraries, or any
            code that contacts a remote server.
          </li>
          <li>
            We do not download or execute remote code at runtime. The
            Manifest V3 Content Security Policy is strict (no{" "}
            <code>unsafe-eval</code>) by design.
          </li>
          <li>
            We do not read, scrape, modify, or observe the content of any
            web page outside the extension's own viewer pages.
          </li>
          <li>
            We do not transmit your file contents, file names, file paths,
            folder structure, search queries, settings, preferences, or
            behavior to any server.
          </li>
          <li>
            We do not use Google user data, Google account information, or
            any data covered by the Google API Services User Data Policy /
            Limited Use rules. We do not integrate with Gmail, Drive,
            Calendar, Photos, or any other Google service.
          </li>
          <li>
            We do not set cookies. We do not use localStorage for tracking.
          </li>
          <li>
            We do not share, rent, sell, license, or otherwise disclose any
            information about any user to anyone, because we have no such
            information to disclose.
          </li>
        </ul>
      </Section>

      <Section title="8. Sub-processors and third parties">
        <p>
          Filemark uses <strong>no</strong> sub-processors and{" "}
          <strong>no</strong> third-party services that receive your data.
          The Chrome Web Store listing itself, and the website hosting
          (Cloudflare Workers Static Assets), receive only the standard
          web-server request metadata (IP address, user-agent, requested
          URL) generated by your browser when it loads the page — Filemark
          and its maintainer do not collect, store, or have access to those
          logs beyond what Cloudflare's standard edge logging retains for
          its own operational purposes. Cloudflare's privacy practices are
          described at{" "}
          <a
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            cloudflare.com/privacypolicy
          </a>
          .
        </p>
      </Section>

      <Section title="9. Data retention">
        <p>
          Because Filemark collects no personal data, there is no data to
          retain. The local-only data described in section 3 is retained on
          your device until you uninstall the extension or clear its data,
          at which point it is removed by the browser. We have no copy
          anywhere.
        </p>
      </Section>

      <Section title="10. Security">
        <p>
          Filemark is shipped as a Manifest V3 extension with a strict
          Content Security Policy that forbids inline scripts and{" "}
          <code>unsafe-eval</code>. All rendering libraries are bundled at
          build time; no code is fetched from a remote origin at runtime.
          Local-only data is stored using the browser's native, sandboxed
          storage APIs (IndexedDB and <code>chrome.storage</code>) and is
          isolated to the extension's own origin.
        </p>
        <p>
          The full source code is open source under the MIT license and
          available for audit at{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            github.com/thesatellite-ai/filemark
          </a>
          . You can verify the network behavior in Chrome DevTools' Network
          tab: during normal use Filemark produces zero outbound requests.
        </p>
      </Section>

      <Section title="11. Children's privacy">
        <p>
          Filemark is a developer-oriented tool and is not directed at
          children under 13 (or under 16, where the higher EU age applies).
          Because Filemark does not collect any personal information from
          any user, it does not collect any personal information from
          children, and no parental consent mechanism is required or
          applicable.
        </p>
      </Section>

      <Section title="12. GDPR (EU / UK) and CCPA (California)">
        <p>
          <strong>GDPR / UK GDPR:</strong> Filemark does not process
          personal data within the meaning of the EU GDPR or UK GDPR, so
          there is no controller, no processor, no lawful basis to declare,
          and no data-subject rights (access, rectification, erasure,
          portability, restriction, objection) that can be exercised
          against Filemark — because Filemark holds no personal data to
          access, rectify, erase, port, restrict, or object to.
        </p>
        <p>
          <strong>CCPA / CPRA (California):</strong> Filemark does not
          collect, sell, or share personal information of California
          residents as defined by the CCPA / CPRA. We have no consumer
          information to disclose, delete, correct, or limit the use of.
          Filemark does not engage in cross-context behavioral advertising.
        </p>
        <p>
          If, in the future, Filemark adds an optional feature that
          processes personal data (e.g. an opt-in cloud sync), this policy
          will be updated to describe the lawful basis, retention, rights,
          and data-handling practices for that specific feature{" "}
          <em>before</em> it ships, and the feature will be off by default.
        </p>
      </Section>

      <Section title="13. Open source and verifiability">
        <p>
          Filemark is open source under the MIT license. Every claim in this
          policy is independently verifiable by reading the source at{" "}
          <a
            href="https://github.com/thesatellite-ai/filemark"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            github.com/thesatellite-ai/filemark
          </a>
          , reviewing the manifest, or watching the network panel in Chrome
          DevTools while using the extension.
        </p>
      </Section>

      <Section title="14. Changes to this policy">
        <p>
          If this policy changes substantively — for example, if Filemark
          adds a feature that handles data in a new way — the updated
          policy will be published on this page with a new "Effective"
          date, and the change will be called out explicitly in the
          extension's release notes (<code>/changelog</code>) before the
          new behavior reaches users. Cosmetic edits to wording without
          substantive change will bump only the "Last updated" date.
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
