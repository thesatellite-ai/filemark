// Filemark — Background Service Worker
// Three jobs: (1) dev auto-reload via WS, (2) open the viewer tab on icon
// click, (3) register dynamic declarativeNetRequest rules so file:// URLs
// for formats Chrome would otherwise download (CSV/TSV) get redirected
// into the viewer instead.

import { shouldRun, type SiteRule } from "@/lib/siteRules";

function connectDevReload() {
  try {
    const ws = new WebSocket("ws://localhost:8791");
    ws.onmessage = (e) => {
      if (e.data === "reload") {
        console.log("Filemark: reloading extension...");
        chrome.runtime.reload();
      }
    };
    ws.onclose = () => setTimeout(connectDevReload, 2000);
  } catch {
    /* prod or server offline */
  }
}

if (import.meta.env.MODE === "development") connectDevReload();

// Icon click → open the viewer app in a new tab (or focus existing).
chrome.action.onClicked.addListener(async () => {
  const url = chrome.runtime.getURL("src/app/index.html");
  const tabs = await chrome.tabs.query({ url });
  if (tabs[0]?.id) {
    await chrome.tabs.update(tabs[0].id, { active: true });
    if (tabs[0].windowId) await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    await chrome.tabs.create({ url });
  }
});

// =============================================================================
// File interception — two strategies depending on whether the browser would
// render or download the URL:
//
// 1. Browser-would-DOWNLOAD formats (.csv, .tsv) → declarativeNetRequest
//    redirect. The page never loads, so no content script can fire — we
//    must intercept at the network layer and send the URL to the viewer.
//
// 2. Browser-would-RENDER formats (.md, .mdx, .json, .jsonc, .sql, .prisma,
//    .dbml) → content-script iframe overlay. The tab loads as text; our
//    script (content/handler.ts) replaces the page body with an iframe
//    pointing at the viewer. The tab URL is preserved — back / forward /
//    bookmark all work normally.
//
//    For file:// the content script auto-runs (manifest content_scripts).
//    For http(s):// we inject manually via chrome.scripting.executeScript
//    from tabs.onUpdated, gated on the optional "*://*/*" host permission
//    granted via the Options page.
// =============================================================================

const SETTINGS_KEY = "fv:settings";
const REMOTE_PERMISSION_ORIGIN = "*://*/*";

// DNR rule ids — stable across reloads so updateDynamicRules can swap
// surgically without nuking unrelated dynamic rules.
const FILE_DOWNLOAD_FORMATS: Record<string, number> = {
  csv: 1,
  tsv: 2,
};
const HTTPS_DOWNLOAD_FORMATS: Record<string, number> = {
  csv: 11,
  tsv: 12,
};

// Formats that get the iframe-overlay treatment on http(s) tabs. file:// is
// handled by manifest content_scripts auto-injection — kept in sync with
// handler.ts.
const INJECT_FORMATS = new Set([
  "md",
  "mdx",
  "markdown",
  "json",
  "jsonc",
  "sql",
  "prisma",
  "dbml",
]);

type StoredSettings = {
  formats?: Record<string, boolean>;
  siteRules?: SiteRule[];
};

async function readEnabledSet(known: string[]): Promise<Set<string>> {
  try {
    const bag = await chrome.storage.sync.get(SETTINGS_KEY);
    const settings = bag[SETTINGS_KEY] as StoredSettings | undefined;
    const formats = settings?.formats;
    return new Set(known.filter((f) => formats?.[f] !== false));
  } catch {
    return new Set(known);
  }
}

async function readSiteRules(): Promise<SiteRule[]> {
  try {
    const bag = await chrome.storage.sync.get(SETTINGS_KEY);
    const settings = bag[SETTINGS_KEY] as StoredSettings | undefined;
    return Array.isArray(settings?.siteRules) ? settings.siteRules : [];
  } catch {
    return [];
  }
}

async function hasRemotePermission(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: [REMOTE_PERMISSION_ORIGIN] });
  } catch {
    return false;
  }
}

function buildRule(
  id: number,
  fmt: string,
  scheme: "file" | "https",
  viewerUrl: string,
): chrome.declarativeNetRequest.Rule {
  const regex =
    scheme === "file"
      ? `^file:///.*\\.${fmt}(\\?.*)?$`
      : `^https?://.*\\.${fmt}(\\?.*)?$`;
  return {
    id,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
      redirect: { regexSubstitution: `${viewerUrl}?openFile=\\0` },
    },
    condition: {
      regexFilter: regex,
      resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME],
    },
  };
}

async function syncRedirectRules() {
  const viewerUrl = chrome.runtime.getURL("src/app/index.html");
  const fileEnabled = await readEnabledSet(Object.keys(FILE_DOWNLOAD_FORMATS));
  const httpsEnabled = await readEnabledSet(Object.keys(HTTPS_DOWNLOAD_FORMATS));
  const remoteOk = await hasRemotePermission();

  const addRules: chrome.declarativeNetRequest.Rule[] = [];
  for (const [fmt, id] of Object.entries(FILE_DOWNLOAD_FORMATS)) {
    if (fileEnabled.has(fmt)) addRules.push(buildRule(id, fmt, "file", viewerUrl));
  }
  if (remoteOk) {
    for (const [fmt, id] of Object.entries(HTTPS_DOWNLOAD_FORMATS)) {
      if (httpsEnabled.has(fmt)) addRules.push(buildRule(id, fmt, "https", viewerUrl));
    }
  }

  try {
    // Remove EVERY existing dynamic rule, not just the IDs we currently
    // generate. DNR dynamic rules persist in Chrome across extension
    // reloads, so a rule registered by an earlier/intermediate build under an
    // ID we no longer track would otherwise live forever and keep redirecting
    // by URL alone (no content-type check) — e.g. a stale `.json` rule turning
    // a github.com/.../X.json HTML blob into a blank viewer redirect. Nuking
    // the full set each sync guarantees only the current formats redirect.
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existing.map((r) => r.id);
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (err) {
    console.warn("Filemark: failed to update DNR redirect rules", err);
  }
}

// ---------------------------------------------------------------------------
// http(s) inject — listen for tab navigations, inject content.js when the
// URL matches a render-format AND the user has granted the remote perm.

function extOf(url: string): string | null {
  try {
    const u = new URL(url);
    const path = u.pathname;
    const m = /\.([a-z0-9]+)$/i.exec(path);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

// True when the user has enabled "Allow access to file URLs" for Filemark.
async function isFileAccessAllowed(): Promise<boolean> {
  try {
    return await chrome.extension.isAllowedFileSchemeAccess();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Setup nudge — the core trap: when "Allow access to file URLs" is OFF, our
// content script can't run on the file:// page AND the service worker can't
// even read that tab's URL (no file host access → tab.url is empty), so we
// can't detect the blocked page per-tab. The escape: don't depend on the
// blocked tab at all. `isAllowedFileSchemeAccess()` is queryable directly,
// regardless of any tab — so we drive a GLOBAL toolbar badge + a setup popup
// off the gate state itself.
//
//   - Setup incomplete (file access off, not dismissed) → "!" badge + the
//     setup popup is attached to the action. Clicking the icon opens the
//     popup, which explains both gates and links the fixes.
//   - Setup done (or dismissed) → no popup, no badge; the icon click falls
//     through to onClicked and opens the app (normal behavior).
//
// There is no Chrome event for the file-URL toggle flipping, so we re-check
// on install/startup, on permission changes, on storage changes (dismiss),
// and cheaply on every tab load.

const SETUP_DISMISS_KEY = "fv:setupDismissed";

async function refreshSetupBadge() {
  try {
    const [fileOk, remoteOk] = await Promise.all([
      isFileAccessAllowed(),
      hasRemotePermission(),
    ]);
    let dismissed = false;
    try {
      const bag = await chrome.storage.local.get(SETUP_DISMISS_KEY);
      dismissed = bag[SETUP_DISMISS_KEY] === true;
    } catch {
      /* default not dismissed */
    }
    // Either gate being off means some files won't render (local OR remote),
    // so keep the badge until both are configured — or the user dismisses it
    // (drag/drop-only users who want neither). This is also how the remote
    // gate gets surfaced: after enabling file access the badge persists
    // because remote is still off, so the next icon click reveals it.
    const needsSetup = (!fileOk || !remoteOk) && !dismissed;
    if (needsSetup) {
      await chrome.action.setPopup({ popup: "src/popup/index.html" });
      await chrome.action.setBadgeText({ text: "!" });
      await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
      await chrome.action.setTitle({ title: "Filemark — finish setup" });
    } else {
      await chrome.action.setPopup({ popup: "" });
      await chrome.action.setBadgeText({ text: "" });
      await chrome.action.setTitle({ title: "Open Filemark" });
    }
  } catch {
    /* ignore */
  }
}

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  // 'complete' fires after the page DOM is built and any browser-default
  // text/plain rendering of a .md is in place — we read that text and
  // hand it to the viewer.
  if (info.status !== "complete") return;
  // Cheap opportunity to keep the setup badge in sync (no event exists for
  // the file-URL toggle flipping).
  void refreshSetupBadge();

  const url = tab.url;
  // tab.url is only populated when we hold host permission for the tab
  // (file:///* once file access is granted; *://*/* once remote is granted).
  // When a gate is off we can't see the URL — that's exactly why the badge
  // above is gate-driven rather than tab-driven.
  if (!url) return;

  const isFile = url.startsWith("file://");
  const isHttp = /^https?:/i.test(url);
  if (!isFile && !isHttp) return;

  const ext = extOf(url);
  if (!ext || !INJECT_FORMATS.has(ext === "markdown" ? "md" : ext)) return;

  if (isFile && !(await isFileAccessAllowed())) return;
  if (isHttp && !(await hasRemotePermission())) return;

  // Per-site rules — skip/allow overlay (include wins, then exclude, then
  // default-run). Primary enforcement point: don't even inject when skipped.
  if (!shouldRun(url, await readSiteRules())) return;

  console.log("[Filemark] inject candidate:", { tabId, url });
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["bootstrap.js"],
    });
    console.log("[Filemark] inject OK:", url);
  } catch (e) {
    console.error("[Filemark] inject FAILED:", url, e);
  }
});

// ---------------------------------------------------------------------------
// Quick toggle — right-click the toolbar icon to add a per-site rule for the
// current tab's host, without changing left-click (which opens the app).
async function addSiteRuleForHost(host: string, mode: "exclude" | "include") {
  const pattern = `*://${host}/*`;
  try {
    const bag = await chrome.storage.sync.get(SETTINGS_KEY);
    const settings = (bag[SETTINGS_KEY] as StoredSettings | undefined) ?? {};
    const rules = Array.isArray(settings.siteRules) ? settings.siteRules : [];
    // De-dupe identical pattern+mode; an include/exclude flip is allowed.
    const next = rules.filter(
      (r) => !(r.pattern === pattern && r.mode === mode),
    );
    next.push({ id: crypto.randomUUID(), pattern, mode });
    await chrome.storage.sync.set({
      [SETTINGS_KEY]: { ...settings, siteRules: next },
    });
  } catch (e) {
    console.warn("Filemark: failed to add site rule", e);
  }
}

function setupContextMenus() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    const mk = (id: string, title: string) =>
      chrome.contextMenus.create({ id, title, contexts: ["action"] });
    mk("fv-exclude-site", "Don't render this site");
    mk("fv-include-site", "Always render this site");
    chrome.contextMenus.create({ id: "fv-sep", type: "separator", contexts: ["action"] });
    mk("fv-manage-rules", "Manage site rules…");
  });
}

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "fv-manage-rules") {
    chrome.runtime.openOptionsPage();
    return;
  }
  let host = "";
  try {
    host = tab?.url ? new URL(tab.url).host : "";
  } catch {
    /* opaque/unsupported url */
  }
  if (!host) return;
  if (info.menuItemId === "fv-exclude-site") {
    await addSiteRuleForHost(host, "exclude");
  } else if (info.menuItemId === "fv-include-site") {
    await addSiteRuleForHost(host, "include");
  } else {
    return;
  }
  // Reload so the new rule takes effect on the current page immediately.
  if (tab?.id != null) chrome.tabs.reload(tab.id);
});

chrome.runtime.onInstalled.addListener((details) => {
  syncRedirectRules();
  void refreshSetupBadge();
  setupContextMenus();
  // First install → open the welcome / setup page so the two permission
  // gates get explained before the user hits a silent failure.
  if (details.reason === "install") {
    void chrome.tabs.create({
      url: chrome.runtime.getURL("src/welcome/index.html"),
    });
  }
});
chrome.runtime.onStartup.addListener(() => {
  syncRedirectRules();
  void refreshSetupBadge();
  setupContextMenus();
});

chrome.storage.onChanged.addListener((changes, area) => {
  // Re-evaluate the setup badge when the user dismisses the nudge.
  if (area === "local" && changes[SETUP_DISMISS_KEY]) {
    void refreshSetupBadge();
  }
  if (area !== "sync") return;
  if (!changes[SETTINGS_KEY]) return;
  syncRedirectRules();
});

chrome.permissions.onAdded.addListener(() => {
  syncRedirectRules();
  void refreshSetupBadge();
});
chrome.permissions.onRemoved.addListener(() => {
  syncRedirectRules();
  void refreshSetupBadge();
});

// Run on every service-worker cold start. Toggling "Allow access to file URLs"
// reloads the extension (restarting this worker) but fires no permission
// event, so this top-level call is what restores the badge after that toggle.
void refreshSetupBadge();

// Content scripts (injected file viewer) can't call chrome.runtime.openOptionsPage
// themselves — it's not exposed to content-script contexts — so they ask the
// service worker to open it.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "fv:open-options") {
    chrome.runtime.openOptionsPage();
  }
});
