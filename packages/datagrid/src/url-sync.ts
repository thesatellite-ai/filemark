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
/**
 * "Meaningful" state — anything the user could have changed deliberately.
 * Column sizes get excluded because they're auto-measured from canvas at
 * mount time; persisting them to the URL on every fresh open turns shared
 * links into noise. They still go to per-grid IndexedDB storage so resizes
 * survive reload — just not in the URL fragment.
 */
function hasMeaningfulState(state: UrlState): boolean {
  if (state.sorting && state.sorting.length > 0) return true;
  if (state.columnFilters && state.columnFilters.length > 0) return true;
  if (state.grouping && state.grouping.length > 0) return true;
  if (state.globalFilter && state.globalFilter.length > 0) return true;
  if (state.density && state.density !== "comfy") return true;
  if (
    state.columnVisibility &&
    Object.values(state.columnVisibility).some((v) => v === false)
  ) {
    return true;
  }
  if (state.expanded && Object.keys(state.expanded).length > 0) return true;
  return false;
}

export function writeUrlState(state: UrlState) {
  if (typeof window === "undefined") return;
  const meaningful = hasMeaningfulState(state);
  const current = window.location.hash.replace(/^#/, "");
  const parts = current
    .split("&")
    .filter((p) => p && !p.startsWith(`${HASH_KEY}=`));
  let newHash: string;
  if (meaningful) {
    const json = JSON.stringify(state);
    const encoded = btoa(encodeURIComponent(json));
    newHash = `#${[...parts, `${HASH_KEY}=${encoded}`].join("&")}`;
  } else {
    newHash = parts.length ? `#${parts.join("&")}` : "";
  }
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
