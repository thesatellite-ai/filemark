import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { useLibrary } from "../store";
import { DEFAULT_THEME } from "@filemark/core";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const MODES = ["light", "dark", "sepia"] as const;
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
            <Label>Mode</Label>
            <Segmented
              options={MODES}
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

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="bg-muted grid h-7 grid-flow-col auto-cols-fr rounded-md p-0.5">
      {options.map((o) => (
        <Button
          key={o}
          variant="ghost"
          size="sm"
          className={cn(
            "h-full rounded-sm px-2 text-xs font-normal capitalize",
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
