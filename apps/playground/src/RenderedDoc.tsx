import { MDXViewer } from "@filemark/mdx";
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
