// REVISION MODE — lightweight markdown renderer for the reading diff.
//
// A focused react-markdown instance (GFM + breaks + raw HTML), NOT the full
// MDXViewer. We deliberately avoid MDXViewer here: it strips frontmatter,
// renders a TOC, and runs task-indexing side effects against storage — none of
// which we want firing per-block inside a diff, and nesting many would be both
// heavy and destructive. This mirrors aicoder's Streamdown-per-block approach,
// swapped to react-markdown (Filemark's underlying engine).
//
// remark-breaks is included to match Filemark's own config (single newlines →
// hard breaks), so a block renders the same here as in the live viewer.
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];
const REHYPE_PLUGINS = [rehypeRaw];

/** A full markdown block — wrapped in `.fv-mdx-body` so it inherits Filemark's
 *  prose typography (the same stylesheet the live viewer uses). */
export function BlockMarkdown({ content }: { content: string }) {
  return (
    <div className="fv-mdx-body max-w-none text-[0.92em]">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

/** Inline markdown for a single table cell — block margins flattened so cells
 *  stay compact, but inline code / bold / links still render. Empty → em dash. */
export function CellMarkdown({ content, className }: { content: string; className?: string }) {
  if (!content.trim()) return <span className="text-muted-foreground">—</span>;
  return (
    <div
      className={cn(
        "fv-mdx-body max-w-none text-[0.9em]",
        "[&_p]:m-0 [&_pre]:my-1 [&_ul]:my-0 [&_ol]:my-0 [&_h1]:m-0 [&_h2]:m-0 [&_h3]:m-0",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} rehypePlugins={REHYPE_PLUGINS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
