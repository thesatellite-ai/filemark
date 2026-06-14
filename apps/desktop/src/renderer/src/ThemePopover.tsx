import { useEffect, useRef, useState } from "react";
import { RotateCcw, Type } from "lucide-react";
import { DEFAULT_THEME, type ThemeSettings } from "@filemark/core";

const MODES: { id: ThemeSettings["mode"]; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "sepia", label: "Sepia" },
];
const FONTS: ThemeSettings["fontFamily"][] = ["sans", "serif", "mono"];

// Native-HTML popover. Matches chrome-ext ThemePopover parity (mode +
// font family + size/line-height/width sliders w/ per-slider reset +
// reset-all) without pulling basecn/shadcn primitives into desktop.
export function ThemePopover({
  theme,
  setTheme,
}: {
  theme: ThemeSettings;
  setTheme: (t: ThemeSettings) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent): void => {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const patch = (p: Partial<ThemeSettings>): void =>
    setTheme({ ...theme, ...p });

  const isDefault =
    theme.mode === DEFAULT_THEME.mode &&
    theme.fontFamily === DEFAULT_THEME.fontFamily &&
    theme.fontSize === DEFAULT_THEME.fontSize &&
    theme.lineHeight === DEFAULT_THEME.lineHeight &&
    theme.contentWidth === DEFAULT_THEME.contentWidth;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        title="Appearance"
        className={`app-no-drag grid h-8 w-8 place-items-center rounded-md transition-colors ${
          open
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Type size={16} />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="app-no-drag absolute right-0 top-full z-50 mt-2 w-80 space-y-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-2xl"
        >
          <Section label="Theme">
            <select
              value={theme.mode}
              onChange={(e) =>
                patch({ mode: e.target.value as ThemeSettings["mode"] })
              }
              className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Section>

          <Separator />

          <Section label="Font">
            <Segmented
              options={FONTS}
              value={theme.fontFamily}
              onChange={(f) => patch({ fontFamily: f })}
            />
          </Section>

          <SliderRow
            label="Size"
            unit="px"
            value={theme.fontSize}
            min={12}
            max={22}
            step={1}
            onChange={(v) => patch({ fontSize: v })}
            onReset={
              theme.fontSize !== DEFAULT_THEME.fontSize
                ? () => patch({ fontSize: DEFAULT_THEME.fontSize })
                : undefined
            }
          />
          <SliderRow
            label="Line height"
            value={theme.lineHeight}
            min={1.3}
            max={2}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => patch({ lineHeight: v })}
            onReset={
              theme.lineHeight !== DEFAULT_THEME.lineHeight
                ? () => patch({ lineHeight: DEFAULT_THEME.lineHeight })
                : undefined
            }
          />
          <SliderRow
            label="Width"
            unit="px"
            value={theme.contentWidth}
            min={560}
            max={2400}
            step={40}
            onChange={(v) => patch({ contentWidth: v })}
            onReset={
              theme.contentWidth !== DEFAULT_THEME.contentWidth
                ? () => patch({ contentWidth: DEFAULT_THEME.contentWidth })
                : undefined
            }
          />

          <Separator />

          <button
            onClick={() => setTheme(DEFAULT_THEME)}
            disabled={isDefault}
            className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={12} />
            {isDefault ? "Already at defaults" : "Reset to defaults"}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}
function Separator(): React.ReactElement {
  return <div className="h-px bg-border" />;
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}): React.ReactElement {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-0.5 rounded-md bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`h-7 rounded-sm text-xs capitalize transition-colors ${
            value === o
              ? "bg-background font-medium text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o}
        </button>
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
  format,
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  onReset?: () => void;
}): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="flex items-center gap-1">
          <span className="text-xs tabular-nums text-foreground">
            {format ? format(value) : value}
            {unit}
          </span>
          {onReset && (
            <button
              onClick={onReset}
              title={`Reset ${label.toLowerCase()}`}
              className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  );
}
