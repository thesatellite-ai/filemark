// Recent remote URLs we've rendered with Filemark (raw markdown / json / sql
// links on the web). Stored in chrome.storage.local so it's shared across
// every Filemark surface — the standalone viewer's sidebar shows it, and
// every injected viewer reads + writes the same list.
//
// Storage shape:
//   { "fv:web-recents": [{ url, name, ext, lastOpenedAt }, …] }
//
// Cap: 30 entries, newest first. URL is the dedupe key.

import { useEffect, useState } from "react";

export interface WebRecent {
  url: string;
  name: string;
  ext: string;
  lastOpenedAt: number;
}

const KEY = "fv:web-recents";
const CAP = 30;

async function getRaw(): Promise<WebRecent[]> {
  try {
    const bag = await chrome.storage.local.get(KEY);
    const list = bag?.[KEY];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function setRaw(list: WebRecent[]): Promise<void> {
  try {
    await chrome.storage.local.set({ [KEY]: list });
  } catch {
    /* storage denied (sandboxed context, etc.) — silently skip */
  }
}

export async function recordWebRecent(entry: Omit<WebRecent, "lastOpenedAt">): Promise<void> {
  if (!entry.url) return;
  if (!/^https?:/i.test(entry.url)) return; // file:// already in the library
  const now = Date.now();
  const current = await getRaw();
  const without = current.filter((r) => r.url !== entry.url);
  const next = [{ ...entry, lastOpenedAt: now }, ...without].slice(0, CAP);
  await setRaw(next);
}

export async function readWebRecents(): Promise<WebRecent[]> {
  return getRaw();
}

export async function removeWebRecent(url: string): Promise<void> {
  const current = await getRaw();
  await setRaw(current.filter((r) => r.url !== url));
}

export async function clearWebRecents(): Promise<void> {
  await setRaw([]);
}

/**
 * Reactive hook — returns the current recents list and refreshes whenever
 * chrome.storage.local changes (so another tab adding a recent updates
 * every sidebar live).
 */
export function useWebRecents(): WebRecent[] {
  const [list, setList] = useState<WebRecent[]>([]);

  useEffect(() => {
    let cancelled = false;
    void readWebRecents().then((r) => {
      if (!cancelled) setList(r);
    });
    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local") return;
      if (!changes[KEY]) return;
      const next = changes[KEY].newValue;
      if (Array.isArray(next)) setList(next);
    };
    chrome.storage?.onChanged?.addListener(onChange);
    return () => {
      cancelled = true;
      chrome.storage?.onChanged?.removeListener(onChange);
    };
  }, []);

  return list;
}
