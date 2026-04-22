import { useEffect, useState } from "react";
import {
  Database,
  FileCode2,
  FileJson,
  FileText,
  Keyboard,
  RotateCcw,
  Settings as SettingsIcon,
} from "lucide-react";
import { ThemeProvider } from "@filemark/core";
import { useLibrary } from "../app/store";
import {
  useSettings,
  ALL_SHORTCUTS,
  ALL_FORMATS,
  JSON_THEMES,
  type FormatId,
  type ShortcutId,
  type JsonThemeId,
} from "../app/settings";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

const FORMAT_META: Record<FormatId, { label: string; icon: typeof FileText; description: string }> = {
  md: { label: ".md", icon: FileText, description: "Markdown (CommonMark + GFM)" },
  mdx: { label: ".mdx", icon: FileText, description: "MDX — markdown with HTML-style components" },
  json: { label: ".json", icon: FileJson, description: "JSON — strict syntax" },
  jsonc: { label: ".jsonc", icon: FileJson, description: "JSON with comments + trailing commas (VS Code, tsconfig)" },
  sql: { label: ".sql", icon: Database, description: "SQL — PostgreSQL, MySQL, SQLite, ClickHouse, and more — rendered as an interactive ER diagram" },
  prisma: { label: ".prisma", icon: Database, description: "Prisma schema — rendered as an interactive ER diagram" },
  dbml: { label: ".dbml", icon: Database, description: "DBML schema definitions — rendered as an interactive ER diagram" },
};

export function OptionsApp() {
  const hydrateLib = useLibrary((s) => s.hydrate);
  const theme = useLibrary((s) => s.theme);
  const setTheme = useLibrary((s) => s.setTheme);

  const hydrateSettings = useSettings((s) => s.hydrate);
  const hydrated = useSettings((s) => s.hydrated);

  useEffect(() => {
    Promise.all([hydrateLib(), hydrateSettings()]);
  }, [hydrateLib, hydrateSettings]);

  if (!hydrated) {
    return (
      <ThemeProvider value={theme} onChange={setTheme}>
        <div className="bg-background text-muted-foreground grid h-screen place-items-center text-sm">
          Loading…
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={theme} onChange={setTheme}>
      <div className="bg-background text-foreground min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <header className="mb-8 flex items-center gap-3">
            <SettingsIcon className="text-muted-foreground size-6" />
            <div>
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                Filemark
              </h1>
              <p className="text-muted-foreground text-sm">
                Options · sync across Chrome profiles
              </p>
            </div>
          </header>

          <FormatsSection />
          <Divider />
          <JsonSection />
          <Divider />
          <ShortcutsSection />
          <Divider />
          <DangerZone />
        </div>
      </div>
    </ThemeProvider>
  );
}

function Divider() {
  return <Separator className="my-8" />;
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof FileText;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <Icon className="text-muted-foreground mt-0.5 size-5 shrink-0" />
      <div>
        <h2 className="text-foreground text-base font-semibold">{title}</h2>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </div>
    </div>
  );
}

/* ─── Formats ──────────────────────────────────────────────────────────── */

function FormatsSection() {
  const settings = useSettings((s) => s.settings);
  const setFormat = useSettings((s) => s.setFormat);

  return (
    <section>
      <SectionHeading
        icon={FileCode2}
        title="File formats"
        subtitle="Which extensions the viewer intercepts on file:// and accepts on drop. Disabled formats fall back to Chrome's default handling."
      />
      <div className="space-y-0.5">
        {ALL_FORMATS.map((id) => {
          const meta = FORMAT_META[id];
          const Icon = meta.icon;
          const enabled = settings.formats[id];
          return (
            <label
              key={id}
              className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm"
            >
              <Icon className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-foreground font-medium">{meta.label}</div>
                <div className="text-muted-foreground text-xs">
                  {meta.description}
                </div>
              </div>
              <Toggle
                checked={enabled}
                onChange={(v) => setFormat(id, v)}
                label={enabled ? "Enabled" : "Disabled"}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}

/* ─── JSON customization ───────────────────────────────────────────────── */

function JsonSection() {
  const settings = useSettings((s) => s.settings);
  const patchJson = useSettings((s) => s.patchJson);
  const j = settings.json;

  return (
    <section>
      <SectionHeading
        icon={FileJson}
        title="JSON viewer"
        subtitle="Customize how @uiw/react-json-view renders your JSON / JSONC files."
      />
      <div className="space-y-5">
        <Row label="Theme" hint="'Auto' tracks the app's light/dark mode.">
          <select
            value={j.theme}
            onChange={(e) => patchJson({ theme: e.target.value as JsonThemeId })}
            className="bg-background h-8 min-w-[180px] rounded-md border px-2 text-sm"
          >
            {JSON_THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Row>

        <Row label="Collapse depth" hint="How deep to expand by default. 'All' collapses everything below the root.">
          <select
            value={j.collapsedDepth === false ? "none" : String(j.collapsedDepth)}
            onChange={(e) =>
              patchJson({
                collapsedDepth:
                  e.target.value === "none" ? false : Number(e.target.value),
              })
            }
            className="bg-background h-8 min-w-[140px] rounded-md border px-2 text-sm"
          >
            <option value="none">None — expand all</option>
            <option value="1">1 — root only</option>
            <option value="2">2 — default</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </Row>

        <Row label="Shorten strings after" hint="Values longer than this are truncated with a toggle; 0 disables truncation.">
          <div className="flex min-w-[220px] items-center gap-3">
            <Slider
              value={[j.shortenTextAfterLength]}
              min={0}
              max={400}
              step={10}
              onValueChange={(v) => {
                const n = Array.isArray(v) ? v[0] : v;
                if (typeof n === "number") patchJson({ shortenTextAfterLength: n });
              }}
            />
            <span className="text-foreground w-10 text-right text-xs tabular-nums">
              {j.shortenTextAfterLength || "off"}
            </span>
          </div>
        </Row>

        <Row label="Indent (copy)" hint="Spaces per level when you click a copy button.">
          <Input
            type="number"
            min={0}
            max={8}
            value={j.indent}
            onChange={(e) => patchJson({ indent: Number(e.target.value) || 0 })}
            className="h-8 w-20"
          />
        </Row>

        <Row label="Show data types" hint="Render 'string', 'number', etc. next to values.">
          <Toggle
            checked={j.displayDataTypes}
            onChange={(v) => patchJson({ displayDataTypes: v })}
            label={j.displayDataTypes ? "On" : "Off"}
          />
        </Row>

        <Row label="Show object size" hint="Show item counts next to collapsed objects/arrays.">
          <Toggle
            checked={j.displayObjectSize}
            onChange={(v) => patchJson({ displayObjectSize: v })}
            label={j.displayObjectSize ? "On" : "Off"}
          />
        </Row>

        <Row label="Clipboard icons" hint="Show copy icons on each value in the tree.">
          <Toggle
            checked={j.enableClipboard}
            onChange={(v) => patchJson({ enableClipboard: v })}
            label={j.enableClipboard ? "On" : "Off"}
          />
        </Row>
      </div>
    </section>
  );
}

/* ─── Shortcuts ────────────────────────────────────────────────────────── */

function ShortcutsSection() {
  const settings = useSettings((s) => s.settings);
  const setShortcut = useSettings((s) => s.setShortcut);
  const setAll = useSettings((s) => s.setAllShortcutsDisabled);

  return (
    <section>
      <SectionHeading
        icon={Keyboard}
        title="Keyboard shortcuts"
        subtitle="Disable individual shortcuts or turn them all off. Custom key binding is a v0.3 feature."
      />
      <div className="mb-3">
        <label className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm">
          <div>
            <div className="text-foreground font-medium">Disable all shortcuts</div>
            <div className="text-muted-foreground text-xs">
              Useful while the extension fights with another app for the same keys.
            </div>
          </div>
          <Toggle
            checked={settings.allShortcutsDisabled}
            onChange={(v) => setAll(v)}
            label={settings.allShortcutsDisabled ? "Disabled" : "Enabled"}
            invert
          />
        </label>
      </div>

      <div className="space-y-0.5 opacity-100 transition-opacity">
        {ALL_SHORTCUTS.map((s) => {
          const enabled = settings.shortcuts[s.id as ShortcutId] !== false;
          const effective = enabled && !settings.allShortcutsDisabled;
          return (
            <div
              key={s.id}
              className={`hover:bg-muted/50 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${effective ? "" : "opacity-50"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-foreground font-medium">{s.label}</div>
                <div className="text-muted-foreground text-xs">
                  {s.description}
                </div>
              </div>
              <code className="bg-muted rounded border px-2 py-0.5 text-xs font-mono tabular-nums">
                {s.chord}
              </code>
              <Toggle
                checked={enabled}
                onChange={(v) => setShortcut(s.id as ShortcutId, v)}
                label={enabled ? "On" : "Off"}
                disabled={settings.allShortcutsDisabled}
              />
            </div>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-3 text-[11px]">
        Custom key bindings (VS Code-style chord capture) are planned for v0.3.
        For now, this page toggles shortcuts on/off.
      </p>
    </section>
  );
}

/* ─── Danger zone ──────────────────────────────────────────────────────── */

function DangerZone() {
  const reset = useSettings((s) => s.reset);
  return (
    <section>
      <SectionHeading
        icon={RotateCcw}
        title="Reset settings"
        subtitle="Restore every option on this page to its default. Your library (files, folders, stars) is not touched."
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (confirm("Reset all Filemark options to defaults?")) reset();
        }}
      >
        <RotateCcw className="size-3.5" />
        Reset to defaults
      </Button>
    </section>
  );
}

/* ─── Primitives ───────────────────────────────────────────────────────── */

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-md px-3 py-1">
      <div className="min-w-0 flex-1">
        <div className="text-foreground text-sm font-medium">{label}</div>
        {hint && <div className="text-muted-foreground text-xs">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
  invert,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  invert?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const on = invert ? !checked : checked;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        (on ? "bg-primary" : "bg-muted border")
      }
      title={label}
    >
      <span
        className={
          "inline-block size-3.5 transform rounded-full bg-white transition-transform " +
          (on ? "translate-x-[18px]" : "translate-x-[2px]")
        }
      />
      {hovered && (
        <span className="absolute right-full mr-2 text-[10px] text-muted-foreground whitespace-nowrap">
          {label}
        </span>
      )}
      {!hovered && null /* quiet linter */}
    </button>
  );
}

