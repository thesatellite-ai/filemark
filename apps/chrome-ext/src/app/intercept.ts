import type { LibraryFile } from "./store";

/**
 * Pick up an intercepted file from `chrome.storage.session` and materialize
 * it as a one-off drop-file. The content script redirects here with
 * `?intercept=<key>` after capturing the raw text from a file:// page.
 *
 * Also handles the `#fv-inline=<b64>` fallback for browsers where
 * `chrome.storage.session` isn't available.
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
