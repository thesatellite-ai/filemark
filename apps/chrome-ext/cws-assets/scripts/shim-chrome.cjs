// Minimal chrome.* shim — enough surface for apps/chrome-ext/dist to
// render its UI inside Electron's offscreen renderer without crashing
// on missing chrome APIs. We don't try to simulate the extension's
// runtime semantics; we just give every call something to return so
// React renders the visual chrome we need to screenshot.
//
// Runs as a preload (contextIsolation=false) so window.chrome is
// defined before any page script executes.

const mem = new Map();

const storageArea = {
  get(keys, cb) {
    const out = {};
    if (keys == null) {
      for (const [k, v] of mem) out[k] = v;
    } else if (typeof keys === "string") {
      if (mem.has(keys)) out[keys] = mem.get(keys);
    } else if (Array.isArray(keys)) {
      for (const k of keys) if (mem.has(k)) out[k] = mem.get(k);
    } else if (typeof keys === "object") {
      for (const k of Object.keys(keys)) out[k] = mem.has(k) ? mem.get(k) : keys[k];
    }
    if (cb) cb(out);
    return Promise.resolve(out);
  },
  set(items, cb) {
    for (const [k, v] of Object.entries(items || {})) mem.set(k, v);
    if (cb) cb();
    return Promise.resolve();
  },
  remove(keys, cb) {
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => mem.delete(k));
    if (cb) cb();
    return Promise.resolve();
  },
  clear(cb) {
    mem.clear();
    if (cb) cb();
    return Promise.resolve();
  },
};

const noopEvent = { addListener() {}, removeListener() {}, hasListener: () => false };

window.chrome = {
  runtime: {
    id: "filemark-cws-shot",
    getURL: (p) => `chrome-extension://filemark-cws-shot/${p.replace(/^\//, "")}`,
    sendMessage(_msg, cb) { if (cb) cb(); },
    onMessage: noopEvent,
    onInstalled: noopEvent,
    onStartup: noopEvent,
    connect: () => ({ postMessage() {}, onMessage: noopEvent, onDisconnect: noopEvent, disconnect() {} }),
    openOptionsPage(cb) { if (cb) cb(); },
  },
  storage: {
    local: storageArea,
    session: storageArea, // share the same in-mem map; fine for screenshots
    sync: storageArea,
    onChanged: noopEvent,
  },
  action: {
    setBadgeText(_o, cb) { if (cb) cb(); },
    setBadgeBackgroundColor(_o, cb) { if (cb) cb(); },
    onClicked: noopEvent,
  },
  declarativeNetRequest: {
    updateDynamicRules(_o, cb) { if (cb) cb(); },
    getDynamicRules(cb) { if (cb) cb([]); return Promise.resolve([]); },
  },
  tabs: {
    query(_q, cb) { if (cb) cb([]); return Promise.resolve([]); },
    create(_o, cb) { if (cb) cb({}); return Promise.resolve({}); },
    update(_id, _o, cb) { if (cb) cb({}); return Promise.resolve({}); },
  },
};
