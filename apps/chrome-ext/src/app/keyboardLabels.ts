/**
 * Keyboard label helper — translate `KeyboardEvent.code` values into the
 * character the user sees printed on their physical key, given their
 * current OS keyboard layout.
 *
 * Backed by the experimental `navigator.keyboard.getLayoutMap()` API
 * (Chromium-only, perfect for an MV3 extension). Falls back to a static
 * US-QWERTY map when the API isn't available.
 *
 * Why: an unmapped shortcut hint shows `[` even though a Turkish-Q user
 * physically presses the `ğ`-labeled key to fire it. Discoverability dies.
 *
 * Usage:
 *   const labels = await getKeyboardLabels();
 *   labels.codeToChar("BracketRight"); // "ğ" on Turkish-Q, "]" on US
 */

const FALLBACK_US: Record<string, string> = {
  Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5",
  Digit6: "6", Digit7: "7", Digit8: "8", Digit9: "9", Digit0: "0",
  KeyA: "a", KeyB: "b", KeyC: "c", KeyD: "d", KeyE: "e", KeyF: "f",
  KeyG: "g", KeyH: "h", KeyI: "i", KeyJ: "j", KeyK: "k", KeyL: "l",
  KeyM: "m", KeyN: "n", KeyO: "o", KeyP: "p", KeyQ: "q", KeyR: "r",
  KeyS: "s", KeyT: "t", KeyU: "u", KeyV: "v", KeyW: "w", KeyX: "x",
  KeyY: "y", KeyZ: "z",
  Minus: "-", Equal: "=", BracketLeft: "[", BracketRight: "]",
  Backslash: "\\", Semicolon: ";", Quote: "'", Backquote: "`",
  Comma: ",", Period: ".", Slash: "/",
  Space: "space", Tab: "Tab", Enter: "Enter", Escape: "Esc",
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
  Backspace: "⌫", Delete: "Del",
};

export interface KeyboardLabels {
  /** Char shown on the physical key for the given `KeyboardEvent.code`.
   *  Returns the raw code if no mapping is known. */
  codeToChar(code: string): string;
  /** Pretty label for a stored shortcut binding (`"Mod+KeyK"` →
   *  `"⌘ K"` on macOS / `"Ctrl K"` elsewhere). */
  prettyChord(code: string | null): string;
}

let cached: KeyboardLabels | null = null;

export async function getKeyboardLabels(): Promise<KeyboardLabels> {
  if (cached) return cached;
  const map = await loadMap();
  cached = makeLabels(map);
  return cached;
}

async function loadMap(): Promise<Map<string, string>> {
  type KbdNav = Navigator & {
    keyboard?: {
      getLayoutMap(): Promise<Map<string, string>>;
    };
  };
  try {
    const kbd = (navigator as KbdNav).keyboard;
    if (kbd?.getLayoutMap) {
      return await kbd.getLayoutMap();
    }
  } catch {
    /* fall through */
  }
  return new Map(Object.entries(FALLBACK_US));
}

function makeLabels(map: Map<string, string>): KeyboardLabels {
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform);
  const modGlyph = isMac ? "⌘" : "Ctrl";

  const codeToChar = (code: string): string => {
    const fromMap = map.get(code);
    if (fromMap) return fromMap.length === 1 ? fromMap.toUpperCase() : fromMap;
    return FALLBACK_US[code] ?? code;
  };

  const prettyChord = (code: string | null): string => {
    if (!code) return "—";
    if (code.startsWith("Mod+")) {
      return `${modGlyph} ${codeToChar(code.slice(4))}`;
    }
    return codeToChar(code);
  };

  return { codeToChar, prettyChord };
}
