// =============================================================================
// Filemark — Content Script: auto-render local files on file:// URLs
// =============================================================================
// Intercepts file:// URLs for formats the user has enabled in the options
// page, fetches the raw source, stashes it in chrome.storage.session, and
// redirects the tab to the extension's viewer app.
//
// Requires: "Allow access to file URLs" enabled on the extension.
// =============================================================================

const ALL_FORMATS = [
  "md",
  "mdx",
  "markdown",
  "json",
  "jsonc",
  "sql",
  "prisma",
  "dbml",
] as const;
type Format = (typeof ALL_FORMATS)[number];

const SYNC_KEY = "fv:settings";

function extOf(url: string): string | null {
  const bare = url.split("#")[0].split("?")[0];
  const m = /\.([a-z0-9]+)$/i.exec(bare);
  return m ? m[1].toLowerCase() : null;
}

async function isEnabledFormat(ext: string): Promise<boolean> {
  const normalized = ext === "markdown" ? "md" : ext;
  if (!(ALL_FORMATS as readonly string[]).includes(normalized)) return false;
  try {
    const bag = await chrome.storage.sync.get(SYNC_KEY);
    const settings = bag[SYNC_KEY] as { formats?: Record<Format, boolean> } | undefined;
    if (!settings?.formats) return true; // default: enabled
    return settings.formats[normalized as Format] !== false;
  } catch {
    return true;
  }
}

(async () => {
  const url = location.href;
  if (!url.startsWith("file://")) return;
  const ext = extOf(url);
  if (!ext) return;

  if (!(await isEnabledFormat(ext))) return;

  if (sessionStorage.getItem("fv-handled") === url) return;
  sessionStorage.setItem("fv-handled", url);

  let content: string | null = null;
  try {
    const r = await fetch(url);
    if (r.ok) content = await r.text();
  } catch {
    /* fall through to DOM fallback */
  }

  if (!content) {
    const pre = document.querySelector("pre");
    content = pre?.textContent ?? document.body?.innerText ?? "";
  }
  if (!content.trim()) return;

  const key = `fv:intercept:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  try {
    await chrome.storage.session.set({
      [key]: {
        url,
        content,
        name: decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? "file"),
        t: Date.now(),
      },
    });
  } catch (e) {
    console.warn("Filemark: session storage unavailable, falling back to hash.", e);
    const app = chrome.runtime.getURL("src/app/index.html");
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify({ url, content }))));
    location.replace(`${app}#fv-inline=${encoded}`);
    return;
  }

  const app = chrome.runtime.getURL("src/app/index.html");
  location.replace(`${app}?intercept=${encodeURIComponent(key)}`);
})();
