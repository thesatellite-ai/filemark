import type { StorageAdapter } from "@filemark/core";
import type { FilemarkBridge } from "../../../preload";

declare global {
  interface Window {
    filemark: FilemarkBridge;
  }
}

// The desktop StorageAdapter. Phase 2 parity with chrome-ext idbStorage:
// same async get/set/delete contract, so every viewer that persists
// state (task checkboxes, datagrid sort/filter, scroll memory) works
// unchanged — the bytes just land in libsql instead of IndexedDB.
export const sqlStorage: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    return (await window.filemark.storage.get(key)) as T | null;
  },
  async set<T>(key: string, value: T): Promise<void> {
    await window.filemark.storage.set(key, value);
  },
  async delete(key: string): Promise<void> {
    await window.filemark.storage.delete(key);
  },
};
