// Filemark — tiny classic bootstrap script.
// Injected via chrome.scripting.executeScript (must be a classic script,
// not an ES module — Chrome's executeScript doesn't accept module files).
// All this script does is dynamic-import the real entry as an ES module
// from a chrome-extension:// URL, so the full app can be split into
// chunks the same way the standalone viewer is. Each chunk loads on
// demand, well under any size limit.

(async () => {
  // Only take over documents Chrome is actually displaying as raw text/data
  // (file:// text, raw markdown, JSON, …). Many web apps have a supported
  // extension in their URL but are full HTML pages — e.g.
  // github.com/<o>/<r>/blob/<b>/X.md is served as text/html, NOT raw markdown.
  // `document.contentType` is the page's MIME label (text/html for web apps,
  // text/plain for raw files, application/json for JSON). Bailing here — in the
  // tiny bootstrap, before importing the heavy renderer bundle — skips those
  // pages cheaply. (Verified: file:// JSON reports "application/json", so it
  // still loads; only HTML is excluded.)
  const ct = document.contentType;
  if (ct === "text/html" || ct === "application/xhtml+xml") return;
  try {
    const url = chrome.runtime.getURL("content/main.js");
    await import(/* @vite-ignore */ url);
  } catch (e) {
    console.error("Filemark: content bootstrap failed", e);
  }
})();
