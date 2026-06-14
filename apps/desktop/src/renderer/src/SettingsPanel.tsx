import { useEffect } from "react";
import { X as XIcon, RotateCcw } from "lucide-react";

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

export interface JsonOptions {
  theme: JsonThemeId;
  collapsedDepth: number;
  displayDataTypes: boolean;
  displayObjectSize: boolean;
  enableClipboard: boolean;
  indent: number;
}

export interface Settings {
  formats: Record<FormatId, boolean>;
  json: JsonOptions;
}

export const DEFAULT_SETTINGS: Settings = {
  formats: Object.fromEntries(ALL_FORMATS.map((f) => [f, true])) as Record<
    FormatId,
    boolean
  >,
  json: {
    theme: "githubDark",
    collapsedDepth: 2,
    displayDataTypes: false,
    displayObjectSize: true,
    enableClipboard: true,
    indent: 2,
  },
};

// Shortcut catalog — display-only here; matches chrome-ext ALL_SHORTCUTS.
// Rebind UI is a future addition; defaults are wired in App.tsx.
const SHORTCUTS: { chord: string; label: string; description: string }[] = [
  { chord: "⌘K", label: "Search", description: "Open search palette" },
  { chord: "⌘B", label: "Toggle sidebar", description: "Show / hide the library sidebar" },
  { chord: "\\", label: "Toggle TOC", description: "Show / hide the table of contents" },
  { chord: "F", label: "Fullscreen", description: "Maximize viewer; hides everything else" },
  { chord: "⇧F", label: "Reading mode", description: "Distraction-free; hides sidebar + TOC, keeps tabs" },
  { chord: "R", label: "Toggle raw / rendered", description: "Switch between rendered and source view" },
  { chord: "⌘E", label: "Edit / Preview", description: "Toggle the in-app editor" },
  { chord: "⌘S", label: "Save", description: "Save the active file (editing mode)" },
  { chord: "]", label: "Next tab", description: "Cycle to the next open tab" },
  { chord: "[", label: "Previous tab", description: "Cycle to the previous open tab" },
  { chord: "X", label: "Close tab", description: "Close the active tab" },
  { chord: "1…9", label: "Jump to tab", description: "Activate the tab at that position" },
  { chord: "/", label: "Focus filter", description: "Focus the sidebar file filter" },
  { chord: "Esc", label: "Dismiss", description: "Close palette → exit fullscreen → exit reading mode" },
];

export function SettingsPanel({
  settings,
  setSettings,
  onClose,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  onClose: () => void;
}): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const patch = (p: Partial<Settings>): void => setSettings({ ...settings, ...p });
  const patchJson = (p: Partial<JsonOptions>): void =>
    setSettings({ ...settings, json: { ...settings.json, ...p } });
  const patchFormat = (f: FormatId, on: boolean): void =>
    setSettings({ ...settings, formats: { ...settings.formats, [f]: on } });

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start overflow-auto bg-black/50 pt-[8vh]"
      onClick={onClose}
    >
      <div
        className="mx-auto w-[720px] max-w-[92vw] overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Close"
          >
            <XIcon size={15} />
          </button>
        </header>

        <div className="space-y-8 px-5 py-5">
          {/* Formats */}
          <Section
            title="File formats"
            subtitle="Disable a format to skip rendering — the file shows raw text."
          >
            <div className="grid grid-cols-3 gap-2">
              {ALL_FORMATS.map((f) => (
                <label
                  key={f}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={settings.formats[f]}
                    onChange={(e) => patchFormat(f, e.target.checked)}
                    className="accent-primary"
                  />
                  <span className="font-mono text-xs">.{f}</span>
                </label>
              ))}
            </div>
          </Section>

          {/* JSON viewer */}
          <Section
            title="JSON viewer"
            subtitle="Controls how .json / .jsonc files render."
            onReset={() => patch({ json: DEFAULT_SETTINGS.json })}
            isDefault={
              JSON.stringify(settings.json) ===
              JSON.stringify(DEFAULT_SETTINGS.json)
            }
          >
            <Row label="Theme">
              <select
                value={settings.json.theme}
                onChange={(e) =>
                  patchJson({ theme: e.target.value as JsonThemeId })
                }
                className="h-8 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              >
                {JSON_THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="Collapsed depth">
              <NumberInput
                value={settings.json.collapsedDepth}
                min={0}
                max={20}
                onChange={(v) => patchJson({ collapsedDepth: v })}
              />
            </Row>
            <Row label="Indent (spaces)">
              <NumberInput
                value={settings.json.indent}
                min={0}
                max={8}
                onChange={(v) => patchJson({ indent: v })}
              />
            </Row>
            <Row label="Display data types">
              <Toggle
                on={settings.json.displayDataTypes}
                onChange={(v) => patchJson({ displayDataTypes: v })}
              />
            </Row>
            <Row label="Display object sizes">
              <Toggle
                on={settings.json.displayObjectSize}
                onChange={(v) => patchJson({ displayObjectSize: v })}
              />
            </Row>
            <Row label="Enable copy-to-clipboard">
              <Toggle
                on={settings.json.enableClipboard}
                onChange={(v) => patchJson({ enableClipboard: v })}
              />
            </Row>
          </Section>

          {/* Shortcuts (read-only catalog) */}
          <Section
            title="Keyboard shortcuts"
            subtitle="Plain-key shortcuts (R / F / X / digits / brackets / slash) are ignored while typing in inputs."
          >
            <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
              {SHORTCUTS.map((s) => (
                <div
                  key={s.chord + s.label}
                  className="flex items-center gap-3 px-3 py-2 text-sm"
                >
                  <kbd className="min-w-[56px] rounded border border-border bg-muted px-2 py-0.5 text-center font-mono text-[11px]">
                    {s.chord}
                  </kbd>
                  <span className="font-medium">{s.label}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">
                    {s.description}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  onReset,
  isDefault,
  children,
}: {
  title: string;
  subtitle?: string;
  onReset?: () => void;
  isDefault?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-[13px] font-semibold">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {onReset && (
          <button
            onClick={onReset}
            disabled={isDefault}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw size={11} />
            Reset
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}): React.ReactElement {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 w-20 rounded-md border border-border bg-background px-2 text-right text-sm tabular-nums outline-none focus:ring-1 focus:ring-ring"
    />
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}): React.ReactElement {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-5 w-9 rounded-full transition-colors ${
        on ? "bg-primary" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-0.5 size-4 rounded-full bg-background shadow transition-transform ${
          on ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
