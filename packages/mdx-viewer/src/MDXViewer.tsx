import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { parse as parseYaml } from "yaml";
import type { ViewerProps } from "@filemark/core";

import { Callout } from "./components/Callout";
import { Tabs, Tab } from "./components/Tabs";
import { Details } from "./components/Details";
import { CodeBlock } from "./CodeBlock";
import { TaskCheckbox } from "./TaskCheckbox";
import { SmartLink } from "./SmartLink";
import { SmartImage } from "./SmartImage";
import { Frontmatter } from "./Frontmatter";
import { Mermaid } from "./Mermaid";
import { SchemaBlock } from "./SchemaBlock";

interface TocItem {
  id: string;
  text: string;
  depth: number;
}

export function MDXViewer(props: ViewerProps) {
  const { content, file, storage, assets, onNavigate } = props;
  const rootRef = useRef<HTMLDivElement>(null);
  const [toc, setToc] = useState<TocItem[]>([]);

  // Frontmatter extraction. Browser-friendly: match `---\n…\n---\n` at the
  // very start, parse the YAML body with the `yaml` package (pure JS), and
  // strip from the body. Falls back to the unchanged content on any failure.
  const { frontData, body } = useMemo(
    () => extractFrontmatter(content),
    [content]
  );

  const components = useMemo(
    () =>
      ({
        // Built-in MDX-style components (via HTML tags thanks to rehype-raw)
        callout: Callout,
        tabs: Tabs,
        tab: Tab,
        details: Details,

        // Code + interactive renderers. `node` is injected by react-markdown;
        // strip it so it doesn't leak onto the DOM. Multi-line content is
        // promoted to block rendering regardless of whether the author used a
        // fenced ```code``` block — backtick-wrapped prose that happens to
        // span lines should still preserve its newlines.
        //
        // `language-mermaid` is routed to the Mermaid renderer instead of
        // the Shiki-highlighted CodeBlock, so ```mermaid fences draw a
        // diagram. Mermaid is lazy-loaded inside that component.
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
          const raw = String(children ?? "");
          const langMatch = /language-([a-zA-Z0-9_+\-]+)/.exec(className ?? "");
          const lang = langMatch?.[1]?.toLowerCase();
          if (lang === "mermaid") {
            return <Mermaid source={raw.replace(/\n$/, "")} />;
          }
          // Schema blocks — parse via db-schema-toolkit (lazy), render as
          // Mermaid ER diagram. `schema` auto-detects (SQL-ish); `prisma`
          // and `dbml` are explicit so the toolkit takes the right parser.
          if (lang === "schema" || lang === "prisma" || lang === "dbml") {
            return (
              <SchemaBlock
                source={raw.replace(/\n$/, "")}
                lang={lang as "schema" | "prisma" | "dbml"}
              />
            );
          }
          const hasLangClass = !!langMatch;
          const isMultiline = raw.includes("\n");
          const isBlock = hasLangClass || isMultiline;
          return (
            <CodeBlock inline={!isBlock} className={className} {...rest}>
              {children}
            </CodeBlock>
          );
        },
        pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
        a: ({ node: _n, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: unknown }) => (
          <SmartLink {...p} onNavigate={onNavigate} />
        ),
        img: ({ node: _n, ...p }: React.ImgHTMLAttributes<HTMLImageElement> & { node?: unknown }) => (
          <SmartImage {...p} assets={assets} />
        ),
        input: ({ node: _n, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { node?: unknown }) => {
          if (p.type === "checkbox") {
            return <TaskCheckbox {...p} file={file} storage={storage} />;
          }
          return <input {...p} />;
        },
      }) as never,
    [onNavigate, assets, storage, file]
  );

  useEffect(() => {
    if (!rootRef.current) return;
    const hs = Array.from(
      rootRef.current.querySelectorAll<HTMLHeadingElement>("h1,h2,h3,h4")
    );
    setToc(
      hs.map((h) => ({
        id: h.id || slugify(h.textContent ?? ""),
        text: h.textContent ?? "",
        depth: Number(h.tagName.slice(1)),
      }))
    );

    // If the page was loaded (or the file just changed) with a URL hash,
    // scroll the matching heading into view once the body is in the DOM.
    // Run in a microtask so the browser has painted the new headings.
    if (typeof location !== "undefined" && location.hash.length > 1) {
      const id = decodeURIComponent(location.hash.slice(1));
      queueMicrotask(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: "start", behavior: "auto" });
      });
    }
  }, [body]);

  return (
    <div className="fv-mdx-root">
      <article ref={rootRef} className="fv-mdx-body">
        <Frontmatter data={frontData as Record<string, unknown>} />
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
          rehypePlugins={[rehypeRaw, rehypeSlug, rehypeKatex]}
          components={components}
        >
          {body}
        </ReactMarkdown>
      </article>
      {toc.length > 1 && (
        <nav className="fv-toc" aria-label="Table of contents">
          <div className="fv-toc-title">On this page</div>
          <ul>
            {toc.map((t, i) => (
              <li key={i} data-depth={t.depth}>
                <a
                  href={`#${t.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById(t.id);
                    el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    // Mirror the heading into the URL hash so the whole
                    // view is copy-paste shareable, without adding a
                    // history entry for every click.
                    if (typeof history !== "undefined") {
                      history.replaceState(null, "", `#${t.id}`);
                    }
                  }}
                >
                  {t.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

const FRONT_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function extractFrontmatter(content: string): {
  frontData: Record<string, unknown>;
  body: string;
} {
  const match = FRONT_RE.exec(content);
  if (!match) return { frontData: {}, body: content };
  const yamlSrc = match[1];
  try {
    const data = parseYaml(yamlSrc);
    if (data && typeof data === "object" && !Array.isArray(data)) {
      return {
        frontData: data as Record<string, unknown>,
        body: content.slice(match[0].length),
      };
    }
  } catch {
    /* fall through — treat as body */
  }
  return { frontData: {}, body: content };
}
