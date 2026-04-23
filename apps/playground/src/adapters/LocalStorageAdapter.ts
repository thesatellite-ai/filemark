import type { StorageAdapter } from "@filemark/core";

/**
 * Trivial StorageAdapter backed by `localStorage`. Async API so it
 * matches the adapter interface; all operations are actually sync.
 * 5 MB per-origin quota is plenty for demo-scale persistence
 * (sort / filter / grid state, task checkbox states, etc.).
 */
export const localStorageAdapter: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota exceeded → silently drop; the user will lose some state */
    }
  },
  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  },
};
