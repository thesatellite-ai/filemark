import type { AssetResolver } from "@filemark/core";

/**
 * Resolves a Markdown image's relative path to a webview-loadable URI.
 *
 * The host posts `docBaseUri` = `webview.asWebviewUri(<document directory>)` —
 * VS Code's secure scheme for loading local files into a webview (only paths
 * under the panel's `localResourceRoots` resolve). We resolve the relative path
 * against it with `URL`, which handles `./` and `../` correctly. Absolute URLs
 * (http/https/data/blob) pass through untouched.
 */
export function createWebviewAssetResolver(docBaseUri: string): AssetResolver {
  const base = docBaseUri.endsWith("/") ? docBaseUri : `${docBaseUri}/`;
  return {
    async resolve(relativePath: string): Promise<string | null> {
      if (!relativePath) return null;
      if (/^(https?:|data:|blob:|vscode-webview:)/i.test(relativePath)) {
        return relativePath;
      }
      try {
        return new URL(relativePath, base).toString();
      } catch {
        return null;
      }
    },
  };
}
