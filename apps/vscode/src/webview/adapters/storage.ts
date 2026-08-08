import type { StorageAdapter } from "@filemark/core";
import { vscode } from "../vscodeApi";

// ViewerProps.storage backed by the webview's persisted state
// (`vscode.getState/setState`). Holds per-doc UI state (tree collapse, datagrid
// sort/filter, task-checkbox display, …). Survives hide/show and reveals of the
// panel (retainContextWhenHidden). Namespaced under `store` so it doesn't clash
// with other webview state (e.g. the theme).

const STORE_KEY = "store";

function readAll(): Record<string, unknown> {
  const state = vscode.getState();
  if (state && typeof state === "object" && STORE_KEY in state) {
    const store = (state as Record<string, unknown>)[STORE_KEY];
    if (store && typeof store === "object") return store as Record<string, unknown>;
  }
  return {};
}

function writeAll(store: Record<string, unknown>): void {
  const state = vscode.getState();
  const base =
    state && typeof state === "object" ? (state as Record<string, unknown>) : {};
  vscode.setState({ ...base, [STORE_KEY]: store });
}

/**
 * StorageAdapter for the viewer, backed by the webview's persisted state
 * (getState/setState) under a single namespaced key. Survives tab-hide
 * (retainContextWhenHidden) and reload; scoped per preview panel. Used for
 * component UI state (e.g. datagrid preferences) — task checkboxes are NOT
 * persisted here; they write back to the source file (see extension.ts).
 */
export const webviewStorage: StorageAdapter = {
  async get<T>(key: string): Promise<T | null> {
    const v = readAll()[key];
    return v === undefined ? null : (v as T);
  },
  async set<T>(key: string, value: T): Promise<void> {
    const all = readAll();
    all[key] = value;
    writeAll(all);
  },
  async delete(key: string): Promise<void> {
    const all = readAll();
    delete all[key];
    writeAll(all);
  },
};
