import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Built-in theme modes are `light` / `dark` / `sepia`. The `(string & {})`
 * intersection widens the union to accept arbitrary custom theme names
 * (e.g. `neon`, `solarized`, `brand-b`) at runtime while still offering
 * autocomplete for the built-ins. Consumers register custom themes by
 * shipping a CSS file with an `html[data-theme="<name>"]` block and
 * feeding `<name>` to `setTheme({ mode: "<name>" })`. See
 * `docsi/THEMING.md` for the full theming contract.
 */
export type ThemeMode = "light" | "dark" | "sepia" | (string & {});

export interface ThemeSettings {
  mode: ThemeMode;
  fontSize: number;
  lineHeight: number;
  contentWidth: number;
  fontFamily: "sans" | "serif" | "mono";
}

export const DEFAULT_THEME: ThemeSettings = {
  mode: "light",
  fontSize: 16,
  lineHeight: 1.65,
  contentWidth: 760,
  fontFamily: "sans",
};

interface ThemeContextValue {
  theme: ThemeSettings;
  setTheme: (patch: Partial<ThemeSettings>) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Two modes:
 *  - Uncontrolled: pass `initial`, component owns state.
 *  - Controlled: pass `value` + `onChange`, host owns state.
 */
export function ThemeProvider({
  children,
  initial,
  value,
  onChange,
}: {
  children: ReactNode;
  initial?: Partial<ThemeSettings>;
  value?: ThemeSettings;
  onChange?: (theme: ThemeSettings) => void;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<ThemeSettings>({
    ...DEFAULT_THEME,
    ...initial,
  });
  const theme = controlled ? value! : internal;

  const setTheme = useCallback(
    (patch: Partial<ThemeSettings>) => {
      const next = { ...theme, ...patch };
      if (!controlled) setInternal(next);
      onChange?.(next);
    },
    [theme, controlled, onChange]
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.mode;

    const fontFamily =
      theme.fontFamily === "serif"
        ? 'Georgia, "Times New Roman", serif'
        : theme.fontFamily === "mono"
          ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
          : 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

    // Write the CSS variable for any consumer that reads it.
    root.style.setProperty("--fv-font-family", fontFamily);
    root.style.setProperty("--fv-font-size", `${theme.fontSize}px`);
    root.style.setProperty("--fv-line-height", String(theme.lineHeight));
    root.style.setProperty("--fv-content-width", `${theme.contentWidth}px`);

    // Also set font-family directly on <html> and <body>. This bypasses the
    // CSS-variable indirection (and Tailwind v4 preflight's own
    // --default-font-family) so the font reliably cascades everywhere,
    // including under strict Chrome-extension CSP where some CSS layers
    // can resolve differently than on a plain webpage.
    root.style.fontFamily = fontFamily;
    if (document.body) document.body.style.fontFamily = fontFamily;
  }, [theme]);

  const ctx = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={ctx}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/**
 * Like `useTheme` but returns `null` when no provider is present, so viewers
 * can fall back to a default appearance when used in hosts that don't ship
 * the ThemeProvider.
 */
export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
