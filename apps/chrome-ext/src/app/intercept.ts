import type { LibraryFile } from "./store";

/**
 * Pick up an intercepted file and materialize it as a one-off drop-file.
 * Three intake paths:
 *
 *   1. `?intercept=<key>` — content script (handler.ts) captured raw text
 *      from a file:// page Chrome rendered, stashed it in
 *      chrome.storage.session under <key>, and redirected here.
 *   2. `#fv-inline=<b64>` — same as above but inline-encoded fallback for
 *      browsers where chrome.storage.session is unavailable.
 *   3. `?openFile=<file-url>` — declarativeNetRequest rule redirected a
 *      file:// URL Chrome would otherwise download (CSV/TSV) here. We
 *      fetch the content ourselves using <all_urls> host permission.
 *      Requires "Allow access to file URLs" enabled on the extension.
 */
export async function pickupIntercept(): Promise<LibraryFile | null> {
  // Hash fallback first — doesn't require chrome APIs
  if (location.hash.startsWith("#fv-inline=")) {
    try {
      const encoded = location.hash.slice("#fv-inline=".length);
      const json = decodeURIComponent(escape(atob(encoded)));
      const { url, content } = JSON.parse(json) as { url: string; content: string };
      history.replaceState(null, "", location.pathname);
      return buildFile(url, content);
    } catch {
      /* fall through */
    }
  }

  const params = new URLSearchParams(location.search);

  // openFile intake — DNR redirected a file:// URL here. We own the fetch.
  const openFile = params.get("openFile");
  if (openFile) {
    try {
      const r = await fetch(openFile);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const content = await r.text();
      history.replaceState(null, "", location.pathname);
      return buildFile(openFile, content);
    } catch (e) {
      console.error(
        "Filemark: openFile fetch failed — is 'Allow access to file URLs' enabled on the extension?",
        e,
      );
      history.replaceState(null, "", location.pathname);
      return null;
    }
  }

  const key = params.get("intercept");
  if (!key) return null;

  try {
    const bag = await chrome.storage.session.get(key);
    const entry = bag?.[key] as
      | { url: string; content: string; name?: string }
      | undefined;
    await chrome.storage.session.remove(key).catch(() => {});

    // Clean the URL so refreshing doesn't try to re-load a gone key.
    history.replaceState(null, "", location.pathname);

    if (!entry) return null;
    return buildFile(entry.url, entry.content, entry.name);
  } catch (e) {
    console.error("Filemark: intercept pickup failed", e);
    return null;
  }
}

function buildFile(url: string, content: string, explicitName?: string): LibraryFile {
  const name = explicitName || decodeURIComponent(url.split("/").pop() ?? "file.md");
  const extMatch = /\.([^.]+)$/.exec(name);
  return {
    id: `intercept:${url}`,
    name,
    ext: (extMatch?.[1] ?? "md").toLowerCase(),
    path: name,
    folderId: null,
    size: content.length,
    content,
    sourceUrl: url,
    lastOpenedAt: Date.now(),
  };
}
