// Filemark — tiny classic bootstrap script.
// Injected via chrome.scripting.executeScript (must be a classic script,
// not an ES module — Chrome's executeScript doesn't accept module files).
// All this script does is dynamic-import the real entry as an ES module
// from a chrome-extension:// URL, so the full app can be split into
// chunks the same way the standalone viewer is. Each chunk loads on
// demand, well under any size limit.

(async () => {
  try {
    const url = chrome.runtime.getURL("content/main.js");
    await import(/* @vite-ignore */ url);
  } catch (e) {
    console.error("Filemark: content bootstrap failed", e);
  }
})();
