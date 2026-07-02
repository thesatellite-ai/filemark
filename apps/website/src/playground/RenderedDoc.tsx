import { useEffect, useState } from "react";
import { MDXViewer, GithubMarkdown } from "@filemark/mdx";
import { localStorageAdapter } from "./adapters/LocalStorageAdapter";
import { bundledAssetResolver } from "./adapters/BundledAssetResolver";

// On-demand loader for the GitHub-preview stylesheet (~220KB incl. the bundled
// font) — mirrors the extension's app/githubCss.ts. Loaded only when the
// playground's "GitHub" tab is first opened, never on the default path.
const GITHUB_STYLE_ID = "fv-github-css";
let githubCssPromise: Promise<void> | null = null;

function ensureGithubCss(): Promise<void> {
  if (
    typeof document !== "undefined" &&
    document.getElementById(GITHUB_STYLE_ID)
  ) {
    return Promise.resolve();
  }
  return (githubCssPromise ??= import("@filemark/mdx/github.css?inline").then(
    (mod) => {
      if (document.getElementById(GITHUB_STYLE_ID)) return;
      const style = document.createElement("style");
      style.id = GITHUB_STYLE_ID;
      style.textContent = mod.default;
      document.head.appendChild(style);
    },
  ));
}

export function RenderedDoc({
  content,
  fileId,
  name,
}: {
  content: string;
  fileId: string;
  name: string;
}) {
  return (
    <div
      className="px-6 py-6"
      // `data-toc="closed"` hides the MDXViewer's TOC rail in the web
      // demo — we don't have the sidebar room for it on smaller widths.
      data-toc="closed"
    >
      <MDXViewer
        content={content}
        file={{ id: fileId, name, ext: "md" }}
        storage={localStorageAdapter}
        assets={bundledAssetResolver}
      />
    </div>
  );
}

/**
 * GitHub-flavored preview of the same doc — plain GFM the way GitHub renders a
 * `.md` in a repo (no filemark components, soft line breaks, github-markdown-css
 * bound to the active theme). Uses the same adapters as RenderedDoc.
 */
export function GithubDoc({
  content,
  fileId,
  name,
}: {
  content: string;
  fileId: string;
  name: string;
}) {
  // Load github.css on demand (first GitHub-tab open) and gate render on it so
  // the doc never paints unstyled for a frame.
  const [ready, setReady] = useState(
    () =>
      typeof document !== "undefined" &&
      document.getElementById(GITHUB_STYLE_ID) !== null,
  );
  useEffect(() => {
    let alive = true;
    void ensureGithubCss().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    // No horizontal padding — GithubMarkdown's `.markdown-body` owns the exact
    // GitHub column width. github.css uses var(--fv-content-width, 902px); the
    // playground has no width control, so pin it to GitHub's 902px column.
    <div className="py-6" style={{ ["--fv-content-width" as string]: "902px" }}>
      {ready ? (
        <GithubMarkdown
          content={content}
          file={{ id: fileId, name, ext: "md" }}
          storage={localStorageAdapter}
          assets={bundledAssetResolver}
        />
      ) : null}
    </div>
  );
}
