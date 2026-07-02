import { MDXViewer, GithubMarkdown } from "@filemark/mdx";
import { localStorageAdapter } from "./adapters/LocalStorageAdapter";
import { bundledAssetResolver } from "./adapters/BundledAssetResolver";

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
  return (
    // No horizontal padding — GithubMarkdown's `.markdown-body` owns the exact
    // GitHub column width. github.css uses var(--fv-content-width, 902px); the
    // playground has no width control, so pin it to GitHub's 902px column.
    <div className="py-6" style={{ ["--fv-content-width" as string]: "902px" }}>
      <GithubMarkdown
        content={content}
        file={{ id: fileId, name, ext: "md" }}
        storage={localStorageAdapter}
        assets={bundledAssetResolver}
      />
    </div>
  );
}
