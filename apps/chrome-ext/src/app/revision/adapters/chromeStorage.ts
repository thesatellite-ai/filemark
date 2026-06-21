// REVISION MODE — chrome.storage adapter (feature map: revision/RevisionProvider.tsx).
//
// The host-specific binding for the portable revision store. This is the ONLY
// file in the feature that references chrome.* — swap it for a different adapter
// (localStorage, VS Code Memento, in-memory) to run the same feature elsewhere.
//
// chrome.storage.local (NOT IndexedDB): the injected viewer renders on host
// pages, and a sandboxed page (raw gist / GitHub) has an opaque origin where
// indexedDB.open() throws SecurityError — chrome.storage works there and in the
// standalone app. See ADR REV-1 in docsi/REVISION_PLAN.md.
import type { RevisionStorageAdapter } from "../types";

/**
 * A RevisionStorageAdapter backed by `chrome.storage.local`. Used by the host
 * to build the store: `createRevisionStore(createChromeRevisionStorage())`.
 * The store wraps every call in try/catch, but the adapter resolves `undefined`
 * for a missing key per the adapter contract.
 */
export function createChromeRevisionStorage(): RevisionStorageAdapter {
  return {
    async get(key) {
      const bag = await chrome.storage.local.get(key);
      return bag?.[key];
    },
    async set(key, value) {
      await chrome.storage.local.set({ [key]: value });
    },
    async remove(key) {
      await chrome.storage.local.remove(key);
    },
  };
}
