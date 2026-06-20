// remark plugin: render GitHub-proprietary custom emoji (:bowtie:, :octocat:,
// :trollface:, …) that have no Unicode equivalent, so remark-gemoji can't
// handle them. We replace each matching `:shortcode:` text run with an inline
// image node whose src is a locally-bundled base64 data URI — ZERO network
// requests, so Filemark's "100% local" guarantee holds. Standard gemoji are
// handled separately by remark-gemoji (run this AFTER it).
//
// Inline code (`:bowtie:`) is left untouched: it's an `inlineCode` node with a
// `.value` (not `text` children), and we skip `inlineCode` / `code` — so the
// cheat-sheet's "code next to the glyph" columns keep showing the literal
// shortcode. Walks the tree manually to avoid a unist-util-visit dependency.
import { GITHUB_CUSTOM_EMOJI } from "./githubEmojiData";

const SHORTCODE = /:([a-z0-9_+-]+):/gi;

// Split a text value into a mix of text + image nodes for any custom-emoji
// shortcodes it contains. Returns null when there's nothing to replace.
function splitText(value: string): unknown[] | null {
  SHORTCODE.lastIndex = 0;
  const out: unknown[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let found = false;
  while ((m = SHORTCODE.exec(value))) {
    const name = m[1].toLowerCase();
    const url = GITHUB_CUSTOM_EMOJI[name];
    if (!url) continue;
    found = true;
    if (m.index > last) {
      out.push({ type: "text", value: value.slice(last, m.index) });
    }
    // Inline image with the bundled base64 data URI. Renders everywhere
    // except host pages with a strict `default-src 'none'`/`img-src` CSP (raw
    // GitHub/gist), where it gracefully falls back to the `:shortcode:` alt
    // text. (A <canvas> renderer could bypass that CSP but isn't worth the
    // complexity for ~16 emoji on a handful of locked pages.)
    out.push({
      type: "image",
      url,
      title: null,
      alt: `:${name}:`,
      data: {
        hProperties: { className: ["emoji"], alt: `:${name}:`, draggable: "false" },
      },
    });
    last = m.index + m[0].length;
  }
  if (!found) return null;
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

function transform(node: { type?: string; value?: string; children?: any[] }) {
  const children = node.children;
  if (!Array.isArray(children)) return;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.type === "text") {
      const replacement = splitText(child.value ?? "");
      if (replacement) {
        children.splice(i, 1, ...replacement);
        i += replacement.length - 1;
      }
    } else if (child.type !== "inlineCode" && child.type !== "code") {
      transform(child);
    }
  }
}

export function remarkGithubEmoji() {
  return (tree: unknown) => {
    transform(tree as { children?: any[] });
  };
}
