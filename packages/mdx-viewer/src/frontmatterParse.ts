// Pure YAML-frontmatter helpers, split out of MDXViewer so they can be reused
// (chrome-ext notes, the VS Code host's line mapping) and unit tested without
// importing the React viewer. No DOM, no React.

import { parse as parseYaml } from "yaml";

// Leading `---\n … \n---\n` block. `\r?` tolerates CRLF; the trailing `\n?`
// tolerates a file that ends immediately after the closing fence.
const FRONT_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Split a document into its parsed frontmatter object and the remaining body.
 * Browser-friendly (uses the pure-JS `yaml` package, no Node). Frontmatter is
 * accepted ONLY when the leading fence parses to a YAML object; on no-match or
 * any parse failure the whole input is returned as `body` (frontData `{}`), so a
 * stray `---` never eats content.
 */
export function extractFrontmatter(content: string): {
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

/**
 * Number of leading lines {@link MDXViewer} strips as frontmatter before
 * parsing. The rendered `data-line` anchors (from remarkSourceLine) are relative
 * to the post-frontmatter body, so a host mapping anchors back to original file
 * lines must ADD this offset (and subtract it going the other way). Returns 0
 * when there's no frontmatter — and by delegating to {@link extractFrontmatter}
 * it honours the exact same accept/reject decision (invalid YAML → body, 0), so
 * the render strip and the line math can never drift.
 */
export function frontmatterLineOffset(content: string): number {
  const { body } = extractFrontmatter(content);
  if (body === content) return 0;
  const removed = content.slice(0, content.length - body.length);
  let lines = 0;
  for (let i = 0; i < removed.length; i++) {
    if (removed[i] === "\n") lines++;
  }
  return lines;
}
