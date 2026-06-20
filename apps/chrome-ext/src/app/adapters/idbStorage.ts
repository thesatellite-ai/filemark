import { createStore, del, get, set } from "idb-keyval";
import type { StorageAdapter } from "@filemark/core";

const store = createStore("filemark", "kv");

// IndexedDB is denied on pages with an opaque origin — e.g. a host page whose
// CSP includes the `sandbox` directive without `allow-same-origin` (raw GitHub
// / gist), where the injected viewer runs. `indexedDB.open()` throws
// `SecurityError` there. These methods degrade gracefully (get → null, set /
// delete → no-op) instead of leaking an uncaught promise rejection. The
// extension's own pages and file:// always have IDB; chrome.storage is the
// primary store for settings/theme anyway, with IDB only a fallback.
export const idbStorage: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const v = await get(key, store);
      return (v as T) ?? null;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      await set(key, value, store);
    } catch {
      /* IDB unavailable (sandboxed page) — drop silently */
    }
  },
  async delete(key: string): Promise<void> {
    try {
      await del(key, store);
    } catch {
      /* IDB unavailable — drop silently */
    }
  },
};
