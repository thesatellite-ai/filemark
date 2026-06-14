import type { AssetResolver } from "@filemark/core";

const ABSOLUTE = /^(https?:|data:|blob:|file:)/;

// Resolves a markdown file's relative image/link paths to file:// URLs.
// Electron has real absolute paths (no FSA blob dance), and the renderer
// CSP allows img-src file: — so resolution is pure string work, no IPC.
export function makeFsAssets(rootPath: string, fileRelDir: string): AssetResolver {
  return {
    async resolve(rel: string): Promise<string | null> {
      if (!rel) return null;
      if (ABSOLUTE.test(rel)) return rel;
      const clean = rel.replace(/^\.\//, "");
      const parts = `${rootPath}/${fileRelDir}/${clean}`
        .split("/")
        .filter((s) => s && s !== ".");
      const stack: string[] = [];
      for (const p of parts) {
        if (p === "..") stack.pop();
        else stack.push(p);
      }
      return "file:///" + stack.join("/");
    },
  };
}
