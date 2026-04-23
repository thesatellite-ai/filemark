import type { AssetResolver } from "@filemark/core";

/**
 * Resolves relative `./foo.csv` references inside a bundled example by
 * looking up a static asset map. Vite `import.meta.glob` discovers every
 * file under `../examples/assets/**` at build time; we return its URL.
 *
 * For absolute URLs (`http(s)://…`), the datagrid short-circuits the
 * resolver and fetches directly — so we don't need to handle those here.
 */
const assetModules = import.meta.glob(
  "../examples/assets/**",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;

const byRelative: Record<string, string> = {};
for (const [path, url] of Object.entries(assetModules)) {
  // Drop the "../examples/assets/" prefix so keys match `./<filename>`
  // and `<filename>` after normalization.
  const name = path.replace(/^.*\/examples\/assets\//, "");
  byRelative[name] = url;
  byRelative[`./${name}`] = url;
}

export const bundledAssetResolver: AssetResolver = {
  async resolve(relativePath: string): Promise<string | null> {
    const clean = relativePath.replace(/^\.\//, "");
    return byRelative[`./${clean}`] ?? byRelative[clean] ?? null;
  },
};
