// Filemark — Direct DOM injection viewer.
//
// Runs as a content script in the page's tab via chrome.scripting.executeScript
// (bootstrapped by bootstrap.ts, which dynamic-imports this module). Replaces
// the page body with the FULL Filemark Shell — same component used by the
// standalone viewer — so all features work in-place: TopBar, raw-source
// toggle, theme switcher, keyboard shortcuts, TOC, search palette.
//
// Why direct DOM injection (not iframe): pages served with
// `Content-Security-Policy: sandbox` (raw.githubusercontent.com, gists,
// gitlab raw, …) propagate sandbox restrictions to nested chrome-extension
// iframes — scripts are blocked inside. Direct injection runs in Chrome's
// isolated world, which is exempt from page CSP for script execution.
//
// Tab URL is preserved (no redirect), so back / forward / bookmark work.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@filemark/core";
import { useLibrary } from "../app/store";
import { useSettings } from "../app/settings";
import { Shell } from "../app/shell/Shell";
import { setInjectMode } from "../app/urlSync";
import { recordWebRecent } from "../app/webRecents";
import { shouldRun, type SiteRule } from "@/lib/siteRules";
import type { LibraryFile } from "../app/store";

// Mark inject mode globally so useUrlSync skips writing ?file=<id> to the
// host page's URL — the tab URL belongs to the host site.
setInjectMode(true);

// CSS — Vite's ?inline returns the compiled CSS as a string; we inject it
// via a <style> tag in the page's <head>. Required because content-script
// stylesheet links from chrome-extension:// would inherit the parent
// document's CSP and may not load reliably.
import filemarkBaseCss from "@filemark/mdx/styles.css?inline";
// GitHub-flavored preview styling — REQUIRED here too. The inject viewer mounts
// the full Shell (incl. the GitHub view-mode toggle), so without this the
// GitHub mode renders an unstyled `.markdown-body` (no font/width/spacing).
import githubCss from "@filemark/mdx/github.css?inline";
import shellCss from "../styles/index.css?inline";
import katexCss from "katex/dist/katex.min.css?inline";

const ALL_INJECT_FORMATS = new Set([
  "md",
  "mdx",
  "markdown",
  "json",
  "jsonc",
  "sql",
  "prisma",
  "dbml",
]);

const SYNC_KEY = "fv:settings";
const SENTINEL = "data-filemark-injected";

function extOf(url: string): string | null {
  const bare = url.split("#")[0].split("?")[0];
  const m = /\.([a-z0-9]+)$/i.exec(bare);
  return m ? m[1].toLowerCase() : null;
}

async function isEnabledFormat(ext: string): Promise<boolean> {
  const normalized = ext === "markdown" ? "md" : ext;
  if (!ALL_INJECT_FORMATS.has(normalized)) return false;
  try {
    const bag = await chrome.storage.sync.get(SYNC_KEY);
    const settings = bag[SYNC_KEY] as { formats?: Record<string, boolean> } | undefined;
    if (!settings?.formats) return true;
    return settings.formats[normalized] !== false;
  } catch {
    return true;
  }
}

async function readSiteRules(): Promise<SiteRule[]> {
  try {
    const bag = await chrome.storage.sync.get(SYNC_KEY);
    const settings = bag[SYNC_KEY] as { siteRules?: SiteRule[] } | undefined;
    return Array.isArray(settings?.siteRules) ? settings.siteRules : [];
  } catch {
    return [];
  }
}

async function readContent(url: string): Promise<string> {
  try {
    const r = await fetch(url);
    if (r.ok) {
      const text = await r.text();
      if (text.trim()) return text;
    }
  } catch {
    /* fall through */
  }
  const pre = document.querySelector("pre");
  if (pre?.textContent?.trim()) return pre.textContent;
  return document.body?.innerText ?? "";
}

function App() {
  const theme = useLibrary((s) => s.theme);
  const setTheme = useLibrary((s) => s.setTheme);
  return (
    <ThemeProvider value={theme} onChange={(t) => setTheme(t)}>
      <Shell />
    </ThemeProvider>
  );
}

// Settings hydrate may fail on sandboxed pages (IDB denied) — that's fine,
// defaults apply.
try {
  void useSettings
    .getState()
    .hydrate?.()
    ?.catch?.(() => {});
} catch {
  /* sandboxed-page denial: defaults will apply */
}

(async () => {
  const url = location.href;
  const ext = extOf(url);
  if (!ext) return;
  // Defense-in-depth (bootstrap.ts already bails on this before importing us):
  // never take over a full HTML web app whose URL merely ends in a supported
  // extension, e.g. github.com/<o>/<r>/blob/<b>/X.md (served as text/html).
  // Raw files are text/plain; JSON is application/json — both pass.
  if (
    document.contentType === "text/html" ||
    document.contentType === "application/xhtml+xml"
  )
    return;
  const normalizedExt = ext === "markdown" ? "md" : ext;
  if (!(await isEnabledFormat(ext))) return;

  // Per-site rules — backup gate (the service worker is the primary one).
  if (!shouldRun(url, await readSiteRules())) return;

  if (document.documentElement.getAttribute(SENTINEL) === url) return;
  document.documentElement.setAttribute(SENTINEL, url);

  const content = await readContent(url);
  if (!content.trim()) return;

  const name = decodeURIComponent(url.split("/").pop()?.split("?")[0] ?? `file.${normalizedExt}`);
  const fileId = `inject:${url}`;
  const file: LibraryFile = {
    id: fileId,
    name,
    ext: normalizedExt,
    path: name,
    folderId: null,
    size: content.length,
    content,
    sourceUrl: url,
    lastOpenedAt: Date.now(),
  };

  // Persist this URL in the shared "Web Docs" recents so it shows up in
  // every Filemark sidebar (standalone + injected) for quick re-open.
  void recordWebRecent({ url, name, ext: normalizedExt });

  // Skip the regular hydrate (uses IndexedDB which is denied on sandboxed
  // pages) — seed the store state directly with this single intercepted
  // file as active. Shell + Viewer read everything they need from here.
  useLibrary.setState({
    hydrated: true,
    files: { [fileId]: file },
    activeFileId: fileId,
    openTabs: [fileId],
    recentIds: [fileId],
    // Slim chrome — sidebar collapsed, tasks panel off — to keep the
    // viewer feeling like a full-window reader, not the full app.
    sidebarOpen: false,
    tocOpen: true,
    fullscreen: false,
    readingMode: false,
    tasksOpen: false,
  });

  // The seed above skips the full IDB hydrate, so the persisted theme (mode,
  // font, content width) would otherwise reset to defaults on every reload of
  // an injected viewer. Restore it from chrome.storage.local, which — unlike
  // IDB — is extension-global and survives across origins and sandboxed pages.
  void useLibrary.getState().hydrateTheme();

  // Restore the persisted view mode too, so if the user turned on GitHub (or
  // raw) preview it applies to every injected file:// doc they open next.
  void useLibrary.getState().hydrateViewMode();

  // Inject CSS into <head> (safer than replacing — keep host meta tags).
  const style = document.createElement("style");
  style.setAttribute("data-filemark", "css");
  style.textContent = [filemarkBaseCss, githubCss, katexCss, shellCss].join(
    "\n\n",
  );
  document.head.appendChild(style);

  // Replace page chrome with a full-viewport root. Shell's flex layout
  // expects every ancestor up to <html> to fill the viewport — without it
  // the sidebar collapses to its content height instead of stretching to
  // the page edge.
  const html = document.documentElement;
  const body = document.body || document.createElement("body");
  html.style.cssText = "margin:0;padding:0;height:100%;background:transparent;";
  body.style.cssText = "margin:0;padding:0;height:100%;width:100%;overflow:hidden;";
  body.innerHTML = "";
  if (!body.isConnected) html.appendChild(body);

  const root = document.createElement("div");
  root.id = "filemark-root";
  root.style.cssText = "height:100%;width:100%;";
  body.appendChild(root);

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
})();
