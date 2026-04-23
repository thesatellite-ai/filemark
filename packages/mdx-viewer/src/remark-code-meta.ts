/**
 * react-markdown (via mdast-util-to-hast) drops the info-string that follows
 * the lang tag on fenced code blocks. ```csv filter=false → lang="csv", but
 * "filter=false" is lost. This plugin copies `node.meta` onto the hast code
 * element as `data-meta`, so custom `code` component handlers can read it.
 *
 * Types are inlined to avoid pulling in `@types/mdast` / `unified` just for
 * a 10-line visitor.
 */

interface MdastLike {
  type?: string;
  meta?: string | null;
  data?: {
    hProperties?: Record<string, unknown>;
  };
  children?: MdastLike[];
}

type RemarkPlugin = () => (tree: unknown) => void;

export const remarkCodeMeta: RemarkPlugin = () => {
  return (tree) => {
    walk(tree as MdastLike);
  };
};

function walk(node: MdastLike) {
  if (node.type === "code" && typeof node.meta === "string" && node.meta) {
    const data = (node.data ??= {});
    const hProps = (data.hProperties ??= {});
    if (hProps["data-meta"] === undefined) {
      hProps["data-meta"] = node.meta;
    }
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child);
  }
}
