// Filemark — Background Service Worker
// Three jobs: (1) dev auto-reload via WS, (2) open the viewer tab on icon
// click, (3) register dynamic declarativeNetRequest rules so file:// URLs
// for formats Chrome would otherwise download (CSV/TSV) get redirected
// into the viewer instead.

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
// declarativeNetRequest — file:// CSV/TSV redirect
// =============================================================================
// Chrome treats .csv / .tsv as octet-stream and downloads them, so the
// content script never gets a chance to fire (the page never loads). We
// install a dynamic DNR rule that catches these URLs at the network layer
// and redirects them to the viewer with `?openFile=<original-url>`. The
// app's intercept pickup (apps/chrome-ext/src/app/intercept.ts) handles
// the query param by fetching the file content and adding a one-off file.
//
// Dynamic rules (not static `declarative_net_request.rule_resources`)
// because the redirect URL needs `chrome.runtime.getURL(...)` which embeds
// the per-install extension ID — not knowable at build time.
//
// Settings-aware: each format gets its own rule id. When the user disables
// a format in the options page (`fv:settings.formats.csv = false`) the
// corresponding rule is removed and Chrome falls back to its default
// behavior (download). We re-evaluate on install, on startup, and on any
// `chrome.storage.onChanged` for the settings key.

const SETTINGS_KEY = "fv:settings";

// Format → DNR rule id. Stable across reloads so updateDynamicRules can
// surgically swap rules without nuking unrelated dynamic rules a future
// caller might add.
const REDIRECT_FORMATS: Record<string, number> = {
  csv: 1,
  tsv: 2,
};

type StoredSettings = {
  formats?: Record<string, boolean>;
};

async function readEnabledFormats(): Promise<Set<string>> {
  try {
    const bag = await chrome.storage.sync.get(SETTINGS_KEY);
    const settings = bag[SETTINGS_KEY] as StoredSettings | undefined;
    const formats = settings?.formats;
    // Default policy: when the settings haven't been written yet, every
    // redirect format is enabled (matches DEFAULT_SETTINGS).
    return new Set(
      Object.keys(REDIRECT_FORMATS).filter((f) => formats?.[f] !== false),
    );
  } catch {
    return new Set(Object.keys(REDIRECT_FORMATS));
  }
}

async function syncRedirectRules() {
  const viewerUrl = chrome.runtime.getURL("src/app/index.html");
  const enabled = await readEnabledFormats();

  const addRules: chrome.declarativeNetRequest.Rule[] = [];
  for (const [fmt, id] of Object.entries(REDIRECT_FORMATS)) {
    if (!enabled.has(fmt)) continue;
    addRules.push({
      id,
      priority: 1,
      action: {
        type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
        redirect: {
          regexSubstitution: `${viewerUrl}?openFile=\\0`,
        },
      },
      condition: {
        // Anchor to file:// + this exact extension at the end (allowing a
        // trailing query string). One rule per format keeps removal
        // surgical when the user toggles a single format off.
        regexFilter: `^file:///.*\\.${fmt}(\\?.*)?$`,
        resourceTypes: [
          chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        ],
      },
    });
  }

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: Object.values(REDIRECT_FORMATS),
      addRules,
    });
  } catch (err) {
    console.warn("Filemark: failed to update DNR redirect rules", err);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  syncRedirectRules();
});
chrome.runtime.onStartup.addListener(() => {
  syncRedirectRules();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  if (!changes[SETTINGS_KEY]) return;
  syncRedirectRules();
});
