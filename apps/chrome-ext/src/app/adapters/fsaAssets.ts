import type { AssetResolver } from "@filemark/core";

/**
 * Resolves relative paths inside a markdown file against the directory
 * handle it came from. Used for rendering embedded images referenced with
 * relative paths like `./screenshot.png`.
 *
 * Each blob URL is cached so repeated renders don't create new URLs.
 */
export function createFSAAssetResolver(
  dirHandle: FileSystemDirectoryHandle | null,
  basePath: string
): AssetResolver {
  const cache = new Map<string, string>();

  return {
    async resolve(rel: string): Promise<string | null> {
      if (!dirHandle || !rel) return null;
      if (/^(https?:|data:|blob:|chrome-extension:)/.test(rel)) return rel;

      const key = basePath + "|" + rel;
      if (cache.has(key)) return cache.get(key)!;

      // Resolve the relative path against the base path.
      const baseParts = basePath.split("/").filter(Boolean).slice(0, -1);
      const relParts = rel.split("/");
      const abs: string[] = [...baseParts];
      for (const part of relParts) {
        if (part === "." || part === "") continue;
        if (part === "..") abs.pop();
        else abs.push(part);
      }
      if (abs.length === 0) return null;

      try {
        let cur: FileSystemDirectoryHandle = dirHandle;
        for (let i = 0; i < abs.length - 1; i++) {
          cur = await cur.getDirectoryHandle(abs[i]);
        }
        const fileHandle = await cur.getFileHandle(abs[abs.length - 1]);
        const file = await fileHandle.getFile();
        const url = URL.createObjectURL(file);
        cache.set(key, url);
        return url;
      } catch {
        return null;
      }
    },
  };
}
