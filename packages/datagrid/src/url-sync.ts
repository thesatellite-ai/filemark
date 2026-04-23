import type {
  ColumnFiltersState,
  ExpandedState,
  GroupingState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import type { Density } from "./types";

export interface UrlState {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  columnVisibility?: VisibilityState;
  density?: Density;
  grouping?: GroupingState;
  expanded?: ExpandedState;
  globalFilter?: string;
}

const HASH_KEY = "g";

/**
 * Read the grid's URL-synced state from `location.hash`. Hash format:
 *   #g=<base64-url-encoded-json>
 * Non-matching or malformed hashes return null — callers should skip
 * hydration in that case.
 */
export function readUrlState(): UrlState | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return null;
  // Allow either `#g=...` or a bare `#...` payload.
  const pair = raw.split("&").find((p) => p.startsWith(`${HASH_KEY}=`));
  if (!pair) return null;
  try {
    const encoded = pair.slice(HASH_KEY.length + 1);
    const json = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") return parsed as UrlState;
    return null;
  } catch {
    return null;
  }
}

/**
 * Write the grid state to `location.hash`. Non-destructive — only touches
 * the `g=` fragment, preserves every other hash fragment so heading anchors
 * still work.
 */
export function writeUrlState(state: UrlState) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(state);
  const encoded = btoa(encodeURIComponent(json));
  const current = window.location.hash.replace(/^#/, "");
  const parts = current
    .split("&")
    .filter((p) => p && !p.startsWith(`${HASH_KEY}=`));
  const next = [...parts, `${HASH_KEY}=${encoded}`].join("&");
  const newHash = `#${next}`;
  if (window.location.hash === newHash) return;
  history.replaceState(null, "", newHash);
}

export function clearUrlState() {
  if (typeof window === "undefined") return;
  const current = window.location.hash.replace(/^#/, "");
  const parts = current
    .split("&")
    .filter((p) => p && !p.startsWith(`${HASH_KEY}=`));
  const newHash = parts.length ? `#${parts.join("&")}` : "";
  history.replaceState(null, "", newHash);
}
