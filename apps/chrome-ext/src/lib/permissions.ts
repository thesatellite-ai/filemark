// Shared helpers for the two Chromium permission gates that Filemark needs
// but cannot enable itself:
//
//  1. "Allow access to file URLs" — a user-only toggle on the extension's
//     details page (chrome://extensions). No manifest key or API can flip it;
//     enterprise policy aside, the user must do it manually. We can only
//     detect its state and deep-link the user to the page.
//  2. The optional "*://*/*" host permission — needed to render remote
//     (http/https) files. This one CAN be requested via a user gesture with
//     chrome.permissions.request.
//
// Both default OFF, which is the root cause of the "I opened a file and it
// showed raw text" first-run failure. The welcome page and the action popup
// use these helpers to show live status and guide the user through enabling.

export const REMOTE_ORIGIN = "*://*/*";

/** True when the user has enabled "Allow access to file URLs" for Filemark. */
export function isFileAccessAllowed(): Promise<boolean> {
  try {
    // Promise form is supported in MV3; fall back to callback just in case.
    const maybe = chrome.extension.isAllowedFileSchemeAccess();
    if (maybe && typeof (maybe as Promise<boolean>).then === "function") {
      return maybe as Promise<boolean>;
    }
  } catch {
    /* fall through to callback */
  }
  return new Promise((resolve) => {
    try {
      chrome.extension.isAllowedFileSchemeAccess((allowed) => resolve(!!allowed));
    } catch {
      resolve(false);
    }
  });
}

/** True when the optional all-sites host permission is granted. */
export async function isRemoteAllowed(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: [REMOTE_ORIGIN] });
  } catch {
    return false;
  }
}

/** Request the all-sites host permission (must be called from a user gesture). */
export async function requestRemote(): Promise<boolean> {
  try {
    return await chrome.permissions.request({ origins: [REMOTE_ORIGIN] });
  } catch {
    return false;
  }
}

/** Open Filemark's own details page, where the file-URL toggle lives. */
export function openExtensionDetails(): void {
  try {
    void chrome.tabs.create({
      url: `chrome://extensions/?id=${chrome.runtime.id}`,
    });
  } catch {
    /* ignore — popup will still show the manual instructions */
  }
}

/** Open the standalone Filemark viewer app (works with zero permissions). */
export function openApp(): void {
  try {
    void chrome.tabs.create({ url: chrome.runtime.getURL("src/app/index.html") });
  } catch {
    /* ignore */
  }
}

/** Open the welcome / setup guide page. */
export function openWelcome(): void {
  const url = chrome.runtime.getURL("src/welcome/index.html");
  try {
    void chrome.tabs.create({ url });
  } catch {
    try {
      window.open(url, "_blank");
    } catch {
      /* ignore */
    }
  }
}
