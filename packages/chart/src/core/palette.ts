import type { PaletteResolver } from "../types";

/**
 * Default palette — semantic tones mapped to shadcn CSS vars where
 * possible (so theme switches re-skin charts automatically), with
 * oklch fallbacks for tones the shadcn palette doesn't ship.
 *
 * Series cycle walks `DEFAULT_SEQUENCE`; authors can override per-series
 * via `colors=` or swap the whole palette by registering another one
 * and passing its name via `palette=brand`.
 */

const TONES: Record<string, string> = {
  primary: "var(--color-primary)",
  secondary: "var(--color-secondary-foreground)",
  muted: "var(--color-muted-foreground)",
  success: "oklch(0.72 0.17 160)",
  warn: "oklch(0.78 0.17 80)",
  danger: "oklch(0.63 0.22 25)",
  info: "oklch(0.7 0.16 260)",
};

const DEFAULT_SEQUENCE: readonly string[] = [
  "primary",
  "success",
  "warn",
  "info",
  "danger",
  "secondary",
];

export const DEFAULT_PALETTE: PaletteResolver = {
  series(i: number): string {
    const toneName = DEFAULT_SEQUENCE[i % DEFAULT_SEQUENCE.length]!;
    return TONES[toneName]!;
  },
  tone(name: string): string {
    return TONES[name] ?? name; // unknown → assume caller passed a hex
  },
  tones(): string[] {
    return Object.keys(TONES);
  },
};

/**
 * Color-blind-safe palette (Okabe-Ito 2008) — reliably distinguishable
 * for every color-vision deficiency. Use via `palette=colorblind`.
 */
const CB_COLORS = [
  "#0072B2", // blue
  "#E69F00", // orange
  "#009E73", // green
  "#D55E00", // vermilion
  "#CC79A7", // reddish purple
  "#56B4E9", // sky blue
  "#F0E442", // yellow
  "#000000", // black
] as const;

const CB_TONES: Record<string, string> = {
  primary: CB_COLORS[0]!,
  success: CB_COLORS[2]!,
  warn: CB_COLORS[1]!,
  danger: CB_COLORS[3]!,
  info: CB_COLORS[5]!,
  secondary: CB_COLORS[4]!,
  muted: "var(--color-muted-foreground)",
};

export const COLORBLIND_PALETTE: PaletteResolver = {
  series(i: number): string {
    return CB_COLORS[i % CB_COLORS.length]!;
  },
  tone(name: string): string {
    return CB_TONES[name] ?? name;
  },
  tones(): string[] {
    return Object.keys(CB_TONES);
  },
};

const registry = new Map<string, PaletteResolver>([
  ["default", DEFAULT_PALETTE],
  ["colorblind", COLORBLIND_PALETTE],
]);

export function registerPalette(name: string, palette: PaletteResolver): void {
  registry.set(name, palette);
}

export function getPalette(name: string = "default"): PaletteResolver {
  return registry.get(name) ?? DEFAULT_PALETTE;
}

/**
 * Build a PaletteResolver that honors an author's explicit `colors=`
 * list but falls back to the named palette for the remaining slots.
 * Each entry in `colors` can be a tone name OR a hex color.
 */
export function withOverrides(
  base: PaletteResolver,
  overrides: string[] | undefined,
): PaletteResolver {
  if (!overrides || overrides.length === 0) return base;
  return {
    series(i) {
      if (i < overrides.length) {
        const raw = overrides[i]!;
        return /^#|^rgb|^oklch|^hsl|^var/.test(raw) ? raw : base.tone(raw);
      }
      return base.series(i);
    },
    tone: base.tone,
    tones: base.tones,
  };
}
