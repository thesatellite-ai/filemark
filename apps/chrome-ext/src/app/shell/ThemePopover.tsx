import type { ReactNode } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useLibrary } from "../store";
import { DEFAULT_THEME } from "@filemark/core";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxIcon,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

/**
 * Theme registry — metadata for every theme exposed in the picker.
 *
 * Structure is open to arbitrary growth (10, 50, 100 themes) because
 * the picker renders as a scrollable dropdown grouped by `category`.
 *
 * Adding your own theme:
 *   1. Write examples/themes/<name>.css with an `html[data-theme="<name>"]`
 *      override block (see examples/themes/neon.css for a template).
 *   2. Import it once from apps/chrome-ext/src/app/main.tsx +
 *      apps/playground/src/main.tsx (Vite bundles it into the final CSS).
 *   3. Append an entry to THEMES below.
 *   4. Users see it in the Theme dropdown and pick it → data-theme is
 *      set on <html> → every component reads the new --fm-* tokens.
 *
 * Spec: docsi/THEMING.md — §3 (contract), §6 (token catalog).
 */
interface ThemeOption {
  /** Value written to html[data-theme="…"]. */
  id: string;
  /** Display name in the picker. */
  label: string;
  /** Category for <optgroup> grouping. */
  category: "Built-in" | "Demo" | "Custom";
  /** One-liner shown below the dropdown when this theme is selected. */
  description?: string;
}

const THEMES: ThemeOption[] = [
  {
    id: "light",
    label: "Light",
    category: "Built-in",
    description: "Default light mode.",
  },
  {
    id: "dark",
    label: "Dark",
    category: "Built-in",
    description: "Default dark mode.",
  },
  {
    id: "sepia",
    label: "Sepia",
    category: "Built-in",
    description: "Warm paper tones for long-form reading.",
  },
  {
    id: "neon",
    label: "Neon",
    category: "Demo",
    description: "Electric violet canvas with vivid chip accents.",
  },
  {
    id: "solarized",
    label: "Solarized",
    category: "Demo",
    description: "Ethan Schoonover's palette — warm paper, muted teal accents, serif prose.",
  },
];

const FONTS = ["sans", "serif", "mono"] as const;

export function ThemePopover({ children }: { children: ReactNode }) {
  const theme = useLibrary((s) => s.theme);
  const setTheme = useLibrary((s) => s.setTheme);
  const resetTheme = useLibrary((s) => s.resetTheme);

  const isDefault =
    theme.mode === DEFAULT_THEME.mode &&
    theme.fontFamily === DEFAULT_THEME.fontFamily &&
    theme.fontSize === DEFAULT_THEME.fontSize &&
    theme.lineHeight === DEFAULT_THEME.lineHeight &&
    theme.contentWidth === DEFAULT_THEME.contentWidth;

  return (
    <Popover>
      <PopoverTrigger render={children as React.ReactElement} />
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Theme</Label>
            {/* Dropdown so the theme list scales to any number of
                entries. Native <select> + <optgroup> for zero new UI
                primitives; follows the GroupSelect pattern used by
                TaskPanel. See THEMES registry above for the list. */}
            <ThemeDropdown
              value={theme.mode}
              onChange={(m) => setTheme({ mode: m })}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label>Font</Label>
            <Segmented
              options={FONTS}
              value={theme.fontFamily}
              onChange={(f) => setTheme({ fontFamily: f })}
            />
          </div>

          <SliderRow
            label="Size"
            value={theme.fontSize}
            unit="px"
            min={12}
            max={22}
            step={1}
            onChange={(v) => setTheme({ fontSize: v })}
          />
          <SliderRow
            label="Line height"
            value={theme.lineHeight}
            min={1.3}
            max={2}
            step={0.05}
            formatter={(v) => v.toFixed(2)}
            onChange={(v) => setTheme({ lineHeight: v })}
          />
          <SliderRow
            label="Width"
            value={theme.contentWidth}
            unit="px"
            min={560}
            max={1080}
            step={20}
            onChange={(v) => setTheme({ contentWidth: v })}
          />

          <Separator />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full justify-start gap-1.5 px-2 text-xs font-normal"
            onClick={() => resetTheme()}
            disabled={isDefault}
          >
            <RotateCcw className="size-3" />
            {isDefault ? "Already at defaults" : "Reset to defaults"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
      {children}
    </div>
  );
}

/**
 * Theme dropdown — shadcn-style combobox built on @base-ui/react's
 * Combobox primitive.
 *
 * Searchable, keyboard-navigable, grouped by category, scales to 100+
 * themes. Each entry shows its label + description.
 *
 * Value flow:
 *   Combobox tracks `value` (the theme id string) + `onValueChange`.
 *   ComboboxItem's `value` prop matches the theme id. Base UI handles
 *   filtering against `items` internally using the search input.
 *
 * The registry (THEMES above) provides both the list + metadata.
 * Grouping is computed on render because it's <10 entries at our scale.
 */
function ThemeDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // Build groups in Base UI's expected shape: `{ label, items }[]`.
  // Passing this array to Root tells the Combobox about grouping; the
  // List / Collection render props receive the FILTERED subset so
  // search actually hides non-matching items.
  const groupShape = (() => {
    const map = new Map<string, string[]>();
    for (const t of THEMES) {
      const list = map.get(t.category);
      if (list) list.push(t.id);
      else map.set(t.category, [t.id]);
    }
    return [...map.entries()].map(([label, items]) => ({ label, items }));
  })();

  const current = THEMES.find((t) => t.id === value);

  return (
    <div className="space-y-1.5">
      <Combobox
        items={groupShape}
        value={value}
        onValueChange={(v) => {
          if (typeof v === "string") onChange(v);
        }}
        // Custom filter — match the query against label + description +
        // id + category. Without this, Base UI matches the query against
        // the item's string value (the id), so typing "paper" wouldn't
        // find Solarized by its description.
        filter={(itemValue, query) => {
          if (!query) return true;
          const t = THEMES.find((x) => x.id === itemValue);
          if (!t) return false;
          const q = query.toLowerCase();
          return (
            t.label.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            (t.description?.toLowerCase().includes(q) ?? false) ||
            t.category.toLowerCase().includes(q)
          );
        }}
      >
        <ComboboxTrigger>
          <ComboboxValue>{current?.label ?? value}</ComboboxValue>
          <ComboboxIcon>
            <ChevronDown />
          </ComboboxIcon>
        </ComboboxTrigger>
        <ComboboxContent className="w-[260px]">
          <ComboboxInput placeholder="Search themes…" />
          {/* Empty state is a sibling of the list — ComboboxList only
              accepts the function child so filtering can auto-hide
              non-matches. Empty reads its own `filteredItems` context
              independently. */}
          <ComboboxEmpty>No theme matches.</ComboboxEmpty>
          <ComboboxList>
            {(group: { label: string; items: string[] }) => (
              <ComboboxGroup items={group.items}>
                <ComboboxGroupLabel>{group.label}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(id: string) => {
                    const t = THEMES.find((x) => x.id === id);
                    if (!t) return null;
                    return (
                      <ComboboxItem value={id}>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="text-sm capitalize">{t.label}</span>
                          {t.description && (
                            <span className="text-muted-foreground text-[11px] leading-snug">
                              {t.description}
                            </span>
                          )}
                        </div>
                      </ComboboxItem>
                    );
                  }}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  cols,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  /** Explicit grid column count. Omit for single-row auto-cols-fr.
   *  Use when options exceed ~4 to avoid text truncation. */
  cols?: number;
}) {
  const gridStyle = cols
    ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }
    : undefined;
  const classes = cols
    ? "bg-muted grid gap-0.5 rounded-md p-0.5"
    : "bg-muted grid h-7 grid-flow-col auto-cols-fr rounded-md p-0.5";
  return (
    <div className={classes} style={gridStyle}>
      {options.map((o) => (
        <Button
          key={o}
          variant="ghost"
          size="sm"
          className={cn(
            "h-7 rounded-sm px-2 text-xs font-normal capitalize",
            value === o
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => onChange(o)}
        >
          {o}
        </Button>
      ))}
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  formatter,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  formatter?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const shown = formatter ? formatter(value) : String(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-foreground text-xs tabular-nums">
          {shown}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => {
          const n = Array.isArray(v) ? v[0] : v;
          if (typeof n === "number") onChange(n);
        }}
      />
    </div>
  );
}
