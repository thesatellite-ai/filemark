import { useMemo } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
// GitHub renders :shortcode: emoji in markdown, so keep gemoji. We do NOT
// pull in the filemark-proprietary emoji, math, breaks, or code-meta plugins —
// GitHub's .md renderer has none of those.
import remarkGemoji from "remark-gemoji";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import type { ViewerProps } from "@filemark/core";
import { remarkSourceLine } from "./remarkSourceLine";
import { normalizeMathFences } from "./normalizeMath";
import { extractFrontmatter } from "./frontmatterParse";

import { Mermaid } from "./Mermaid";
import { SmartLink } from "./SmartLink";
import { SmartImage } from "./SmartImage";

// NOTE: the `.markdown-body` styling lives in ./github.css and is shipped as a
// SEPARATE copied export (@filemark/mdx/github.css). It is intentionally NOT
// imported here — this package never routes .css through the JS bundle (see
// tsup.config.ts). The host imports `@filemark/mdx/github.css` when it mounts
// GitHub mode. Without that import the render is unstyled (plain), not broken.

// GitHub's own sanitization schema is what hast-util-sanitize ships as its
// default — so `defaultSchema` already mirrors GitHub. We only widen it enough
// that our reused pieces survive the pass:
//  - `className` on <code>/<span> for shiki-highlighted output (the default
//    schema already allows `language-*` on <code>; shiki adds more classes +
//    inline styles, so allow className broadly on code/span and keep `style`).
//  - <pre>/<code> style attributes (shiki writes inline colors).
// Everything else stays at GitHub's defaults: unknown component tags
// (<callout>, <chart>, <datagrid>, …) are stripped, exactly like GitHub.
// data-line / data-line-end are stamped by remarkSourceLine (below) so a host
// can map the rendered DOM back to source lines (scroll sync / jump-to-source).
// They arrive as literal hyphenated hast properties; allow both the hyphenated
// and camelCased forms on every element so sanitize keeps them.
const SOURCE_LINE_ATTRS = ["data-line", "dataLine", "data-line-end", "dataLineEnd"];
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [...(defaultSchema.attributes?.["*"] ?? []), ...SOURCE_LINE_ATTRS],
    code: [...(defaultSchema.attributes?.code ?? []), "className", "style"],
    span: [...(defaultSchema.attributes?.span ?? []), "className", "style"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className", "style"],
  },
};

/**
 * GitHub-flavored preview of a Markdown document — renders as close as an
 * offline pipeline can to how GitHub renders a `.md` file in a repo:
 *
 *  - plain GFM only (tables, task lists, strikethrough, autolinks, footnotes),
 *  - SOFT line breaks (single newline = space) — NO `remark-breaks`, which is
 *    the single biggest reason a filemark render looks different from GitHub,
 *  - GitHub's sanitization schema, so filemark component tags vanish just like
 *    they would on GitHub (no <Callout>/<Chart>/<Datagrid>/… rendering here),
 *  - ```mermaid fences still draw a diagram (GitHub renders mermaid),
 *  - `.markdown-body` styling from github-markdown-css.
 *
 * Intentionally omitted vs MDXViewer: the TOC, reading-time, glossary, every
 * custom block/inline component, math, and the datagrid/chart/kanban fences
 * (GitHub shows those fences as plain code, which is what happens here).
 *
 * Frontmatter is stripped (GitHub shows it as a table; we hide it for now —
 * see M-GHPREVIEW in docsi/TASKS.md).
 */
export function GithubMarkdown(props: ViewerProps) {
  const { content, assets, onNavigate } = props;

  // Strip frontmatter (same helper as MDXViewer, so both viewers agree on what
  // counts as frontmatter), then repair non-canonical block-math fences (see
  // normalizeMath) so a `$$ …multi-line… $$` block can't swallow the doc.
  const body = useMemo(
    () => normalizeMathFences(extractFrontmatter(content).body),
    [content],
  );

  const components = useMemo(
    () =>
      ({
        // GitHub renders fenced code as a PLAIN <pre><code> styled by
        // github-markdown-css — no language-label header, no wrap toggle, no
        // shiki theme (that's filemark's CodeBlock chrome, which looks nothing
        // like GitHub). So we render the raw <code> and let the sheet style it.
        // `csv` / `bar` / `kanban` fences therefore show as plain code too,
        // exactly like GitHub. Exception: ```mermaid still draws a diagram.
        code: ({
          className,
          children,
          node: _node,
          ...rest
        }: {
          className?: string;
          children?: React.ReactNode;
          node?: unknown;
        } & React.HTMLAttributes<HTMLElement>) => {
          const langMatch = /language-([a-zA-Z0-9_+\-]+)/.exec(className ?? "");
          if (langMatch?.[1]?.toLowerCase() === "mermaid") {
            return <Mermaid source={String(children ?? "").replace(/\n$/, "")} />;
          }
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          );
        },
        // Keep the real <pre> (github-markdown-css styles `.markdown-body pre`)
        // — unless it wraps a ```mermaid fence, whose <code> already rendered a
        // diagram above; then drop the <pre> so the diagram isn't boxed as code.
        pre: ({
          node,
          children,
        }: {
          node?: { children?: Array<{ properties?: { className?: string[] } }> };
          children?: React.ReactNode;
        }) => {
          const codeCls =
            node?.children?.[0]?.properties?.className?.join(" ") ?? "";
          if (codeCls.includes("language-mermaid")) return <>{children}</>;
          return <pre>{children}</pre>;
        },
        a: ({
          node: _n,
          ...p
        }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
          node?: unknown;
        }) => <SmartLink {...p} onNavigate={onNavigate} />,
        img: ({
          node: _n,
          ...p
        }: React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown }) => (
          <SmartImage {...p} assets={assets} />
        ),
      }) as never,
    [onNavigate, assets]
  );

  return (
    <div className="fv-github-root">
      <article className="markdown-body">
        <ReactMarkdown
          // remarkSourceLine LAST so data-line reflects the final mdast (lets a
          // host sync scroll / jump-to-source in GitHub mode too).
          remarkPlugins={[remarkGfm, remarkGemoji, remarkSourceLine]}
          urlTransform={(url) =>
            url.startsWith("data:image/") ? url : defaultUrlTransform(url)
          }
          rehypePlugins={[
            rehypeRaw,
            [rehypeSanitize, SANITIZE_SCHEMA],
            rehypeSlug,
          ]}
          components={components}
        >
          {body}
        </ReactMarkdown>
      </article>
    </div>
  );
}

