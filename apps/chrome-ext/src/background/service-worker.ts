// Filemark — Background Service Worker
// Two jobs: (1) dev auto-reload via WS, (2) open the viewer tab on icon click.

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
