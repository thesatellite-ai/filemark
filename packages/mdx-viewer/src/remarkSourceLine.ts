// Consumed by the chrome-ext AI-review notes feature (app/notes/NotesLayer.tsx
// reads the stamped data-line). See docsi/NOTES_FEATURE.md.
//
// remark plugin: stamp block-level nodes with their source line via
// `data.hProperties['data-line']` / `['data-line-end']`. This is the OFFICIAL
// mdast→hast attribute mechanism (remark-rehype copies `data.hProperties` onto
// the produced hast element), so it's safe — unlike an earlier rehype plugin
// that mutated the hast tree before rehype-raw and crashed the renderer.
//
// The host's notes feature reads the nearest `[data-line]` ancestor of a
// selection to report "line N" / "line N–M".
//
// Only block-level nodes are stamped (enough to locate any selection, and a
// small mutation surface). Wrapped in try/catch so it can NEVER break a render.

interface MdastNode {
  type: string;
  position?: { start?: { line?: number }; end?: { line?: number } };
  data?: { hProperties?: Record<string, unknown> };
  children?: MdastNode[];
}

const STAMP = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "code",
  "table",
  "tableRow",
  "tableCell",
  "thematicBreak",
  "html",
  "definition",
  "footnoteDefinition",
]);

export function remarkSourceLine() {
  return (tree: MdastNode) => {
    try {
      const walk = (node: MdastNode) => {
        const line = node.position?.start?.line;
        if (line != null && STAMP.has(node.type)) {
          node.data = node.data ?? {};
          node.data.hProperties = node.data.hProperties ?? {};
          node.data.hProperties["data-line"] = String(line);
          const end = node.position?.end?.line;
          if (end != null) {
            node.data.hProperties["data-line-end"] = String(end);
          }
        }
        if (Array.isArray(node.children)) node.children.forEach(walk);
      };
      walk(tree);
    } catch {
      /* never let line-stamping break rendering */
    }
    return tree;
  };
}
