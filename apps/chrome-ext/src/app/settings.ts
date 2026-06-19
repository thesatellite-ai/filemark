import { create } from "zustand";
import { idbStorage } from "./adapters/idbStorage";
import type { SiteRule } from "@/lib/siteRules";

/**
 * User-configurable settings surfaced on the options page. Persisted via
 * `chrome.storage.sync` when available (syncs across Chrome profiles and
 * survives a reinstall), falling back to IndexedDB otherwise.
 */

export type ShortcutId =
  | "search"
  | "toggleSidebar"
  | "toggleToc"
  | "toggleFullscreen"
  | "toggleReadingMode"
  | "toggleRaw"
  | "focusFilter"
  | "nextTab"
  | "prevTab"
  | "closeTab"
  | "jumpToTab";

export const ALL_SHORTCUTS: Array<{
  id: ShortcutId;
  label: string;
  chord: string;
  description: string;
  /** Default `KeyboardEvent.code` — physical key position, layout-
   *  independent. Used by handlers + remap UI. `null` = special-case
   *  handler (jumpToTab matches the Digit1–Digit9 range, not a single
   *  code). Modifier combos use a "Mod+<code>" string. */
  defaultCode: string | null;
}> = [
  { id: "search", label: "Search", chord: "⌘K", defaultCode: "Mod+KeyK", description: "Open search palette" },
  { id: "toggleSidebar", label: "Toggle sidebar", chord: "⌘B", defaultCode: "Mod+KeyB", description: "Show / hide the library sidebar" },
  { id: "toggleToc", label: "Toggle table of contents", chord: "\\", defaultCode: "Backslash", description: "Show / hide the right TOC" },
  { id: "toggleFullscreen", label: "Fullscreen viewer", chord: "F", defaultCode: "KeyF", description: "Maximize the viewer; hides topbar and sidebar" },
  { id: "toggleReadingMode", label: "Reading mode", chord: "⇧F", defaultCode: "Shift+KeyF", description: "Distraction-free reading; keeps topbar + tabs, hides sidebar + tasks panel" },
  { id: "toggleRaw", label: "Toggle rendered / raw", chord: "R", defaultCode: "KeyR", description: "Switch the active file between its rendered view and syntax-highlighted source" },
  { id: "nextTab", label: "Next tab", chord: "]", defaultCode: "BracketRight", description: "Activate the next tab. Plain key — Chrome reserves every Ctrl/⌘ tab shortcut." },
  { id: "prevTab", label: "Previous tab", chord: "[", defaultCode: "BracketLeft", description: "Activate the previous tab." },
  { id: "closeTab", label: "Close tab", chord: "X", defaultCode: "KeyX", description: "Close the active tab. Plain key — ⌘W closes the Chrome tab, not ours." },
  { id: "jumpToTab", label: "Jump to tab 1–9", chord: "1…9", defaultCode: null, description: "Activate the tab at that position. Bare digit keys — modifier combos conflict with Chrome." },
  { id: "focusFilter", label: "Focus filter", chord: "/", defaultCode: "Slash", description: "Focus the first visible folder filter" },
];

export const ALL_FORMATS = [
  "md",
  "mdx",
  "json",
  "jsonc",
  "csv",
  "tsv",
  "sql",
  "prisma",
  "dbml",
] as const;
export type FormatId = (typeof ALL_FORMATS)[number];

export const JSON_THEMES = [
  "githubDark",
  "githubLight",
  "nord",
  "vscode",
  "basic",
  "dark",
  "light",
  "monokai",
  "gruvbox",
] as const;
export type JsonThemeId = (typeof JSON_THEMES)[number];

export interface Settings {
  /** Which file extensions the viewer will render. Disabling an extension
   *  makes the content script ignore it (so Chrome's default viewer takes
   *  over) and drops of that type are skipped. */
  formats: Record<FormatId, boolean>;

  /** JSON viewer customization mapping directly to react-json-view props. */
  json: {
    theme: JsonThemeId;
    /** Initial collapse depth. `false` = expand all. */
    collapsedDepth: number | false;
    displayDataTypes: boolean;
    displayObjectSize: boolean;
    enableClipboard: boolean;
    shortenTextAfterLength: number;
    /** Indentation space count. Applied when re-serializing JSON (e.g. copy). */
    indent: number;
  };

  /** Shortcut id → enabled. Missing = enabled (default). */
  shortcuts: Partial<Record<ShortcutId, boolean>>;

  /** Per-shortcut user override of the physical key code. Missing entry =
   *  use `defaultCode` from `ALL_SHORTCUTS`. Lets users on non-US layouts
   *  (Turkish, AZERTY, Dvorak, …) rebind shortcuts whose default chord
   *  would require an awkward AltGr combo on their keyboard. Value shape
   *  matches `defaultCode`: `"KeyX"` for bare keys, `"Mod+KeyK"` when the
   *  combo includes ⌘/Ctrl. */
  shortcutBindings: Partial<Record<ShortcutId, string>>;

  /** Disable every keyboard shortcut at once. */
  allShortcutsDisabled: boolean;

  /** Per-site activation rules (skip/allow overlay). `exclude` = don't run on
   *  match; `include` = run on match (carve-out from a broader exclude).
   *  include wins over exclude; rules never override the ext/content-type
   *  eligibility check. See lib/siteRules.ts + docsi/SITE_RULES_PLAN.md. */
  siteRules: SiteRule[];
}

export const DEFAULT_SETTINGS: Settings = {
  formats: {
    md: true,
    mdx: true,
    json: true,
    jsonc: true,
    csv: true,
    tsv: true,
    sql: true,
    prisma: true,
    dbml: true,
  },
  json: {
    theme: "githubDark",
    collapsedDepth: 2,
    displayDataTypes: false,
    displayObjectSize: true,
    enableClipboard: true,
    shortenTextAfterLength: 140,
    indent: 2,
  },
  shortcuts: {},
  shortcutBindings: {},
  allShortcutsDisabled: false,
  siteRules: [],
};

const SYNC_KEY = "fv:settings";

/** Thin wrapper that prefers chrome.storage.sync, falls back to IDB. */
const sync = {
  async get(): Promise<Settings | null> {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.sync) {
        const bag = await chrome.storage.sync.get(SYNC_KEY);
        if (bag[SYNC_KEY]) return bag[SYNC_KEY] as Settings;
      }
    } catch {
      /* fall through */
    }
    return idbStorage.get<Settings>(SYNC_KEY);
  },
  async set(value: Settings): Promise<void> {
    try {
      if (typeof chrome !== "undefined" && chrome.storage?.sync) {
        await chrome.storage.sync.set({ [SYNC_KEY]: value });
      }
    } catch {
      /* ignore */
    }
    await idbStorage.set(SYNC_KEY, value);
  },
};

interface SettingsStore {
  settings: Settings;
  hydrated: boolean;
  hydrate(): Promise<void>;
  patch(delta: Partial<Settings>): Promise<void>;
  patchJson(delta: Partial<Settings["json"]>): Promise<void>;
  setFormat(format: FormatId, enabled: boolean): Promise<void>;
  setShortcut(id: ShortcutId, enabled: boolean): Promise<void>;
  setShortcutBinding(id: ShortcutId, code: string | null): Promise<void>;
  setAllShortcutsDisabled(disabled: boolean): Promise<void>;
  addSiteRule(rule: SiteRule): Promise<void>;
  removeSiteRule(id: string): Promise<void>;
  toggleSiteRule(id: string): Promise<void>;
  reset(): Promise<void>;
}

// Merge partial settings with defaults defensively — older stored shapes
// are upgraded transparently as new fields are added.
function merge(stored: Partial<Settings> | null | undefined): Settings {
  const s = stored ?? {};
  return {
    formats: { ...DEFAULT_SETTINGS.formats, ...(s.formats ?? {}) },
    json: { ...DEFAULT_SETTINGS.json, ...(s.json ?? {}) },
    shortcuts: { ...(s.shortcuts ?? {}) },
    shortcutBindings: { ...(s.shortcutBindings ?? {}) },
    allShortcutsDisabled: s.allShortcutsDisabled ?? false,
    siteRules: Array.isArray(s.siteRules) ? s.siteRules : [],
  };
}

export const useSettings = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  async hydrate() {
    const stored = await sync.get();
    set({ settings: merge(stored), hydrated: true });

    // Cross-tab live updates: when the options page changes settings, the
    // viewer tab reflects them without a reload.
    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== "sync") return;
        const c = changes[SYNC_KEY];
        if (!c) return;
        set({ settings: merge(c.newValue as Settings | null) });
      });
    }
  },

  async patch(delta) {
    const next = { ...get().settings, ...delta };
    set({ settings: next });
    await sync.set(next);
  },

  async patchJson(delta) {
    const next = {
      ...get().settings,
      json: { ...get().settings.json, ...delta },
    };
    set({ settings: next });
    await sync.set(next);
  },

  async setFormat(format, enabled) {
    const next = {
      ...get().settings,
      formats: { ...get().settings.formats, [format]: enabled },
    };
    set({ settings: next });
    await sync.set(next);
  },

  async setShortcut(id, enabled) {
    const next = {
      ...get().settings,
      shortcuts: { ...get().settings.shortcuts, [id]: enabled },
    };
    set({ settings: next });
    await sync.set(next);
  },

  async setShortcutBinding(id, code) {
    const bindings = { ...get().settings.shortcutBindings };
    if (code === null || code === "") {
      delete bindings[id];
    } else {
      bindings[id] = code;
    }
    const next = { ...get().settings, shortcutBindings: bindings };
    set({ settings: next });
    await sync.set(next);
  },

  async setAllShortcutsDisabled(disabled) {
    const next = { ...get().settings, allShortcutsDisabled: disabled };
    set({ settings: next });
    await sync.set(next);
  },

  async addSiteRule(rule) {
    // De-dupe identical pattern+mode so repeated quick-toggles don't pile up.
    const existing = get().settings.siteRules.filter(
      (r) => !(r.pattern === rule.pattern && r.mode === rule.mode),
    );
    const next = { ...get().settings, siteRules: [...existing, rule] };
    set({ settings: next });
    await sync.set(next);
  },

  async removeSiteRule(id) {
    const next = {
      ...get().settings,
      siteRules: get().settings.siteRules.filter((r) => r.id !== id),
    };
    set({ settings: next });
    await sync.set(next);
  },

  // Flip a rule's enabled flag in place — lets users temporarily disable a
  // rule (to test) without deleting and re-adding it. `enabled === false` is
  // the only "off" state; undefined/true both mean on.
  async toggleSiteRule(id) {
    const next = {
      ...get().settings,
      siteRules: get().settings.siteRules.map((r) =>
        r.id === id ? { ...r, enabled: r.enabled === false } : r,
      ),
    };
    set({ settings: next });
    await sync.set(next);
  },

  async reset() {
    set({ settings: { ...DEFAULT_SETTINGS } });
    await sync.set(DEFAULT_SETTINGS);
  },
}));

export function isShortcutEnabled(settings: Settings, id: ShortcutId): boolean {
  if (settings.allShortcutsDisabled) return false;
  return settings.shortcuts[id] !== false;
}

/**
 * Resolve the active key code for a shortcut: user override (if present)
 * else the catalog default. Returns `null` for special-case shortcuts
 * (`jumpToTab`) that match a range of keys, not a single one.
 *
 * Format: bare keys are the raw `KeyboardEvent.code` (`"KeyX"`,
 * `"BracketRight"`, `"Slash"`). Modifier-combined codes prefix `"Mod+"`,
 * meaning ⌘ on macOS or Ctrl elsewhere — e.g. `"Mod+KeyK"`.
 */
export function getShortcutCode(
  settings: Settings,
  id: ShortcutId,
): string | null {
  const override = settings.shortcutBindings[id];
  if (override !== undefined) return override;
  const def = ALL_SHORTCUTS.find((s) => s.id === id);
  return def?.defaultCode ?? null;
}

/** Split `"Mod+Shift+KeyK"` (etc.) into `{ mod, shift, code }`. */
export function parseShortcutCode(
  code: string | null,
): { mod: boolean; shift: boolean; code: string } | null {
  if (!code) return null;
  let mod = false;
  let shift = false;
  let rest = code;
  while (true) {
    if (rest.startsWith("Mod+")) {
      mod = true;
      rest = rest.slice(4);
    } else if (rest.startsWith("Shift+")) {
      shift = true;
      rest = rest.slice(6);
    } else {
      break;
    }
  }
  return { mod, shift, code: rest };
}

/**
 * Match a `KeyboardEvent` against a stored shortcut code. Compares by
 * physical key position (`event.code`) so the binding works on any
 * keyboard layout. The `Mod+` prefix requires ⌘ (macOS) OR Ctrl
 * (Win/Linux). The `Shift+` prefix requires Shift. Bare bindings
 * (no prefix) tolerate Shift to keep behavior consistent with the
 * pre-Shift-prefix era — callers must order Shift+ checks before
 * bare checks to disambiguate (e.g. Shift+F vs F).
 */
export function matchShortcut(
  e: KeyboardEvent,
  code: string | null,
): boolean {
  const parsed = parseShortcutCode(code);
  if (!parsed) return false;
  if (e.code !== parsed.code) return false;
  if (parsed.mod) {
    if (!(e.metaKey || e.ctrlKey)) return false;
  } else {
    if (e.metaKey || e.ctrlKey || e.altKey) return false;
  }
  if (parsed.shift && !e.shiftKey) return false;
  return true;
}

export function isFormatEnabled(settings: Settings, ext: string): boolean {
  const lower = ext.toLowerCase().replace(/^\./, "");
  if (lower === "markdown") return settings.formats.md;
  if ((ALL_FORMATS as readonly string[]).includes(lower)) {
    return settings.formats[lower as FormatId];
  }
  return false;
}
