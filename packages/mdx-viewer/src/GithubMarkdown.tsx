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
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
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

  const body = useMemo(() => stripFrontmatter(content), [content]);

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
          remarkPlugins={[remarkGfm, remarkGemoji]}
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

// Minimal frontmatter strip — matches the `---\n…\n---` fence at the very start
// of the file. GitHub renders frontmatter as a table; filemark's rich viewer
// strips it, so we do the same here for parity. (See M-GHPREVIEW to render it
// as a table later.)
function stripFrontmatter(content: string): string {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(content);
  return m ? content.slice(m[0].length) : content;
}
