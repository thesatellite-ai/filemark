import { useEffect, useState, type SelectHTMLAttributes } from "react";
import {
  Ban,
  BookOpen,
  Bug,
  ChevronDown,
  Database,
  ExternalLink,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Globe,
  HelpCircle,
  Keyboard,
  PanelLeft,
  Plus,
  RotateCcw,
  Settings as SettingsIcon,
  Trash2,
} from "lucide-react";
import { ThemeProvider } from "@filemark/core";
import { useLibrary } from "../app/store";
import {
  useSettings,
  DEFAULT_SETTINGS,
  ALL_SHORTCUTS,
  ALL_FORMATS,
  JSON_THEMES,
  getShortcutCode,
  type FormatId,
  type ShortcutId,
  type JsonThemeId,
} from "../app/settings";
import {
  getKeyboardLabels,
  type KeyboardLabels,
} from "../app/keyboardLabels";
import {
  isValidPattern,
  normalizePattern,
  type SiteRuleMode,
} from "@/lib/siteRules";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FORMAT_META: Record<FormatId, { label: string; icon: typeof FileText; description: string }> = {
  md: { label: ".md", icon: FileText, description: "Markdown (CommonMark + GFM)" },
  mdx: { label: ".mdx", icon: FileText, description: "MDX — markdown with HTML-style components" },
  json: { label: ".json", icon: FileJson, description: "JSON — strict syntax" },
  jsonc: { label: ".jsonc", icon: FileJson, description: "JSON with comments + trailing commas (VS Code, tsconfig)" },
  csv: { label: ".csv", icon: FileSpreadsheet, description: "CSV — comma-separated values, rendered as an interactive sortable grid" },
  tsv: { label: ".tsv", icon: FileSpreadsheet, description: "TSV — tab-separated values, rendered as an interactive sortable grid" },
  sql: { label: ".sql", icon: Database, description: "SQL — PostgreSQL, MySQL, SQLite, ClickHouse, and more — rendered as an interactive ER diagram" },
  prisma: { label: ".prisma", icon: Database, description: "Prisma schema — rendered as an interactive ER diagram" },
  dbml: { label: ".dbml", icon: Database, description: "DBML schema definitions — rendered as an interactive ER diagram" },
};

// Options is a left-nav settings shell: one section visible at a time (the page
// got too long as a single scroll). NAV drives both the sidebar links and which
// section component renders on the right.
type SectionId =
  | "formats"
  | "sidebar"
  | "remote"
  | "siterules"
  | "json"
  | "shortcuts"
  | "help"
  | "reset";

const NAV: { id: SectionId; label: string; icon: typeof FileText }[] = [
  { id: "formats", label: "File formats", icon: FileCode2 },
  { id: "sidebar", label: "Sidebar", icon: PanelLeft },
  { id: "remote", label: "Remote URLs", icon: Globe },
  { id: "siterules", label: "Site rules", icon: Ban },
  { id: "json", label: "JSON viewer", icon: FileJson },
  { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
  { id: "help", label: "Help & support", icon: HelpCircle },
  { id: "reset", label: "Reset", icon: RotateCcw },
];

// External destinations for the Help section. Single source so the section +
// any future surface stay in sync.
const HELP_LINKS = {
  docs: "https://khanakia.com/apps/filemark/docs",
  website: "https://khanakia.com/apps/filemark/",
  github: "https://github.com/thesatellite-ai/filemark",
  issues: "https://github.com/thesatellite-ai/filemark/issues",
} as const;

export function OptionsApp() {
  const hydrateLib = useLibrary((s) => s.hydrate);
  const theme = useLibrary((s) => s.theme);
  const setTheme = useLibrary((s) => s.setTheme);

  const hydrateSettings = useSettings((s) => s.hydrate);
  const hydrated = useSettings((s) => s.hydrated);
  const [active, setActive] = useState<SectionId>("formats");

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
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-8 md:py-10">
          {/* Left nav — full-width horizontal scroll strip on mobile, vertical
              rail on md+. */}
          <nav className="w-full shrink-0 md:w-52">
            <div className="mb-5 flex items-center gap-2 px-2">
              <SettingsIcon className="text-muted-foreground size-5 shrink-0" />
              <div className="min-w-0">
                <div className="text-foreground text-sm font-semibold leading-tight">
                  Filemark
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Options · syncs across profiles
                </div>
              </div>
            </div>
            <div className="-mx-1 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] md:mx-0 md:block md:space-y-0.5 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
              {NAV.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActive(s.id)}
                    className={cn(
                      "flex w-auto shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition-colors md:w-full md:shrink",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground/80 hover:bg-muted/60",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <main className="min-w-0 flex-1">
            {active === "formats" && <FormatsSection />}
            {active === "sidebar" && <SidebarSection />}
            {active === "remote" && <RemoteUrlsSection />}
            {active === "siterules" && <SiteRulesSection />}
            {active === "json" && <JsonSection />}
            {active === "shortcuts" && <ShortcutsSection />}
            {active === "help" && <HelpSection />}
            {active === "reset" && <DangerZone />}
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

// Sleek native <select>: appearance-none + lucide chevron so it matches the
// h-7 Input height (raw <select> ships OS chrome that breaks row alignment).
function NativeSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative inline-block shrink-0">
      <select
        className={cn(
          "border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring h-7 w-full cursor-pointer appearance-none rounded-md border pl-2.5 pr-7 text-[12px] outline-none focus-visible:ring-1",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2"
      />
    </div>
  );
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
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-4 shrink-0" />
        <h2 className="text-foreground text-base font-semibold">{title}</h2>
      </div>
      <p className="text-muted-foreground mt-0.5 text-xs">{subtitle}</p>
    </div>
  );
}

/* ─── Sidebar ──────────────────────────────────────────────────────────── */

function SidebarSection() {
  const settings = useSettings((s) => s.settings);
  const patch = useSettings((s) => s.patch);
  const s = settings.sidebar;
  return (
    <section>
      <SectionHeading
        icon={PanelLeft}
        title="Sidebar"
        subtitle="How the library file tree is ordered and grouped."
      />
      <div className="space-y-5">
        <Row label="Folders on top" hint="Group folders before files (like macOS Finder). Off: folders and files are mixed, sorted by name.">
          <Toggle
            checked={s.foldersFirst}
            onChange={(v) => void patch({ sidebar: { foldersFirst: v } })}
            label={s.foldersFirst ? "On" : "Off"}
          />
        </Row>
      </div>
    </section>
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

/* ─── Remote URLs ──────────────────────────────────────────────────────── */

const REMOTE_ORIGIN = "*://*/*";

function RemoteUrlsSection() {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    chrome.permissions
      .contains({ origins: [REMOTE_ORIGIN] })
      .then(setGranted)
      .catch(() => setGranted(false));
    const onChange = () =>
      chrome.permissions
        .contains({ origins: [REMOTE_ORIGIN] })
        .then(setGranted)
        .catch(() => setGranted(false));
    chrome.permissions.onAdded.addListener(onChange);
    chrome.permissions.onRemoved.addListener(onChange);
    return () => {
      chrome.permissions.onAdded.removeListener(onChange);
      chrome.permissions.onRemoved.removeListener(onChange);
    };
  }, []);

  const toggle = async (v: boolean) => {
    if (v) {
      const ok = await chrome.permissions.request({ origins: [REMOTE_ORIGIN] });
      setGranted(ok);
    } else {
      await chrome.permissions.remove({ origins: [REMOTE_ORIGIN] });
      setGranted(false);
    }
  };

  return (
    <section>
      <SectionHeading
        icon={Globe}
        title="Render remote files"
        subtitle="Let Filemark render supported formats on any website (e.g. https://raw.githubusercontent.com/…/README.md). Disabled by default — Chrome will prompt you once on enable."
      />
      <label className="hover:bg-muted/50 flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm">
        <div>
          <div className="text-foreground font-medium">
            Enable on all sites
          </div>
          <div className="text-muted-foreground text-xs">
            Required for remote .md / .json / .csv / .sql URLs. The extension never sends your traffic anywhere — verify in DevTools' Network tab.
          </div>
        </div>
        <Toggle
          checked={granted === true}
          onChange={(v) => void toggle(v)}
          label={granted === true ? "Granted" : "Not granted"}
          disabled={granted === null}
        />
      </label>
    </section>
  );
}

/* ─── Site rules ───────────────────────────────────────────────────────── */

const SITE_RULE_EXAMPLES = [
  "*://*.github.com/*",
  "https://docs.example.com/*",
  "file:///Users/me/notes/*",
  "*://*/*",
];

const SITE_RULE_RECIPES: { mode: SiteRuleMode; pattern: string; label: string }[] =
  [
    { mode: "exclude", pattern: "*://news.ycombinator.com/*", label: "Turn off on one site" },
    { mode: "exclude", pattern: "*://*.github.com/*", label: "Turn off on a domain + its subdomains" },
    { mode: "exclude", pattern: "file:///Users/me/private/*", label: "Turn off for local files in a folder" },
    { mode: "exclude", pattern: "*://*/*", label: "Turn off everywhere (kill switch)" },
    { mode: "include", pattern: "*://gist.githubusercontent.com/*", label: "Force-allow one host (carve-out)" },
  ];

// Per-site rules editor. Lets users add Exclude/Include rules (Chrome match
// patterns) controlling where Filemark runs, with live pattern validation,
// clickable examples + recipes, and a table to enable/disable/delete each rule.
// The actual skip/allow decision lives in lib/siteRules.ts (shouldRun); this is
// purely the management UI. See docsi/SITE_RULES_PLAN.md.
function SiteRulesSection() {
  const settings = useSettings((s) => s.settings);
  const addSiteRule = useSettings((s) => s.addSiteRule);
  const removeSiteRule = useSettings((s) => s.removeSiteRule);
  const toggleSiteRule = useSettings((s) => s.toggleSiteRule);
  const [pattern, setPattern] = useState("");
  const [mode, setMode] = useState<SiteRuleMode>("exclude");
  const [showHelp, setShowHelp] = useState(false);

  const rules = settings.siteRules;
  const normalized = normalizePattern(pattern);
  const valid = normalized.length > 0 && isValidPattern(normalized);

  const add = () => {
    if (!valid) return;
    void addSiteRule({
      id: crypto.randomUUID(),
      pattern: normalized,
      mode,
      enabled: true,
    });
    setPattern("");
  };

  return (
    <section>
      <SectionHeading
        icon={Ban}
        title="Site rules"
        subtitle="Control where Filemark runs. Exclude = never run here; Include = run here (carve-out from a broader exclude — Include wins). Rendering still requires a supported file type + content."
      />

      <div className="flex items-center gap-2">
        <NativeSelect
          value={mode}
          onChange={(e) => setMode(e.target.value as SiteRuleMode)}
          aria-label="Rule mode"
        >
          <option value="exclude">Exclude</option>
          <option value="include">Include</option>
        </NativeSelect>
        <Input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="*://*.github.com/*"
          className="h-7 flex-1 font-mono text-[12px]"
          aria-label="Match pattern"
        />
        <Button
          size="sm"
          className="h-7 shrink-0 px-3 text-[12px]"
          disabled={!valid}
          onClick={add}
        >
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
      {pattern.trim() && !valid && (
        <p className="text-destructive mt-1.5 text-xs">
          Invalid match pattern. Try a host (github.com) or a pattern like
          *://*.github.com/*.
        </p>
      )}
      {pattern.trim() && valid && normalized !== pattern.trim() && (
        <p className="text-muted-foreground mt-1.5 text-xs">
          Saves as <code className="text-foreground">{normalized}</code>
        </p>
      )}

      {/* Clickable example patterns — fill the input on click. */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">Examples:</span>
        {SITE_RULE_EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => setPattern(ex)}
            className="border-border bg-muted/40 hover:bg-muted text-foreground rounded border px-1.5 py-0.5 font-mono"
          >
            {ex}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="text-primary ml-auto inline-flex items-center gap-1 hover:underline"
        >
          <HelpCircle className="size-3.5" />
          {showHelp ? "Hide help" : "Recipes & help"}
        </button>
      </div>

      {showHelp && (
        <div className="border-border bg-muted/30 mt-2 space-y-2 rounded-md border p-3 text-xs">
          <p className="text-muted-foreground">
            Click a recipe to fill the form, then press Add. Patterns use Chrome
            match syntax: <code className="text-foreground">scheme://host/path</code>{" "}
            with <code className="text-foreground">*</code> wildcards.
          </p>
          <div className="space-y-1">
            {SITE_RULE_RECIPES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => {
                  setMode(r.mode);
                  setPattern(r.pattern);
                  setShowHelp(false);
                }}
                className="hover:bg-muted/60 flex w-full items-center gap-2 rounded px-2 py-1 text-left"
              >
                <span
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                    r.mode === "include"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                  )}
                >
                  {r.mode === "include" ? "Include" : "Exclude"}
                </span>
                <code className="text-foreground shrink-0 font-mono">
                  {r.pattern}
                </code>
                <span className="text-muted-foreground truncate">{r.label}</span>
              </button>
            ))}
          </div>
          <p className="text-muted-foreground border-border border-t pt-2">
            <strong className="text-foreground">Include wins over Exclude</strong>{" "}
            — combine a broad Exclude with a narrow Include to carve out an
            exception (e.g. exclude <code>*://*.github.com/*</code> but include{" "}
            <code>*://gist.githubusercontent.com/*</code>). Rules only decide
            skip-or-not — a page still needs a supported file type to render.
          </p>
        </div>
      )}

      <div className="border-border mt-3 overflow-hidden rounded-md border">
        <table className="w-full table-fixed text-[12px]">
          <thead className="bg-muted/50 border-border border-b">
            <tr className="text-muted-foreground text-left">
              <th className="w-20 px-3 py-1.5 font-semibold">Mode</th>
              <th className="px-3 py-1.5 font-semibold">Pattern</th>
              <th className="w-12 px-2 py-1.5 text-center font-semibold">On</th>
              <th className="w-10 px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {rules.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="text-muted-foreground px-3 py-3 text-center"
                >
                  No rules — Filemark runs on every supported file.
                </td>
              </tr>
            )}
            {rules.map((r) => (
              <tr
                key={r.id}
                className={cn(
                  "even:bg-muted/25 hover:bg-muted/60 transition-colors",
                  r.enabled === false && "opacity-55",
                )}
              >
                <td className="px-3 py-1.5 align-middle">
                  <span
                    className={cn(
                      "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                      r.mode === "include"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {r.mode === "include" ? "Include" : "Exclude"}
                  </span>
                </td>
                <td className="px-3 py-1.5 align-middle">
                  <code className="text-foreground block truncate font-mono">
                    {r.pattern}
                  </code>
                </td>
                <td className="px-2 py-1.5 text-center align-middle">
                  <Toggle
                    checked={r.enabled !== false}
                    onChange={() => void toggleSiteRule(r.id)}
                    label={r.enabled === false ? "Disabled" : "Enabled"}
                  />
                </td>
                <td className="px-2 py-1 text-right align-middle">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive size-7"
                    onClick={() => void removeSiteRule(r.id)}
                    aria-label="Delete rule"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <NativeSelect
            value={j.theme}
            onChange={(e) => patchJson({ theme: e.target.value as JsonThemeId })}
            className="min-w-[180px]"
          >
            {JSON_THEMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </Row>

        <Row label="Collapse depth" hint="How deep to expand by default. 'All' collapses everything below the root.">
          <NativeSelect
            value={j.collapsedDepth === false ? "none" : String(j.collapsedDepth)}
            onChange={(e) =>
              patchJson({
                collapsedDepth:
                  e.target.value === "none" ? false : Number(e.target.value),
              })
            }
            className="min-w-[140px]"
          >
            <option value="none">None — expand all</option>
            <option value="1">1 — root only</option>
            <option value="2">2 — default</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </NativeSelect>
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
            className="w-20"
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

        <Row label="Hide array indices" hint="Hide the 0: 1: 2: … index labels on array items, showing just their values.">
          <Toggle
            checked={j.hideArrayIndices}
            onChange={(v) => patchJson({ hideArrayIndices: v })}
            label={j.hideArrayIndices ? "On" : "Off"}
          />
        </Row>

        <Row label="Bare view" hint="Hide the JSON viewer's toolbar + frame and show just the tree, full-width — like a raw browser JSON view.">
          <Toggle
            checked={j.bareView}
            onChange={(v) => patchJson({ bareView: v })}
            label={j.bareView ? "On" : "Off"}
          />
        </Row>

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            // Restore every JSON viewer option to its shipped default (Classic
            // theme, bare view, hidden indices, …).
            onClick={() => void patchJson({ ...DEFAULT_SETTINGS.json })}
            disabled={
              JSON.stringify(j) === JSON.stringify(DEFAULT_SETTINGS.json)
            }
          >
            Reset to defaults
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ─── Shortcuts ────────────────────────────────────────────────────────── */

function ShortcutsSection() {
  const settings = useSettings((s) => s.settings);
  const setShortcut = useSettings((s) => s.setShortcut);
  const setShortcutBinding = useSettings((s) => s.setShortcutBinding);
  const setAll = useSettings((s) => s.setAllShortcutsDisabled);
  const [labels, setLabels] = useState<KeyboardLabels | null>(null);
  const [capturingId, setCapturingId] = useState<ShortcutId | null>(null);

  useEffect(() => {
    let cancelled = false;
    getKeyboardLabels().then((l) => {
      if (!cancelled) setLabels(l);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Active capture: listen at the document level for the next keydown,
  // accept it as the new binding, release the listener.
  useEffect(() => {
    if (!capturingId) return;
    const onKey = (e: KeyboardEvent) => {
      // Cancel keys
      if (e.key === "Escape") {
        e.preventDefault();
        setCapturingId(null);
        return;
      }
      // Ignore raw modifier keypresses — wait for a "real" key.
      if (
        e.code === "MetaLeft" ||
        e.code === "MetaRight" ||
        e.code === "ControlLeft" ||
        e.code === "ControlRight" ||
        e.code === "AltLeft" ||
        e.code === "AltRight" ||
        e.code === "ShiftLeft" ||
        e.code === "ShiftRight" ||
        !e.code
      ) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const usesMod = e.metaKey || e.ctrlKey;
      const usesShift = e.shiftKey;
      const next =
        (usesMod ? "Mod+" : "") + (usesShift ? "Shift+" : "") + e.code;
      void setShortcutBinding(capturingId, next);
      setCapturingId(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [capturingId, setShortcutBinding]);

  // Build a lookup of which IDs are currently bound to each code, so we
  // can warn about conflicts inline.
  const boundCodes = new Map<string, ShortcutId[]>();
  for (const s of ALL_SHORTCUTS) {
    const code = getShortcutCode(settings, s.id);
    if (!code) continue;
    const list = boundCodes.get(code) ?? [];
    list.push(s.id);
    boundCodes.set(code, list);
  }

  return (
    <section>
      <SectionHeading
        icon={Keyboard}
        title="Keyboard shortcuts"
        subtitle="Click any chord to rebind. Bindings match the physical key position so they work on every layout (Turkish Q, AZERTY, Dvorak, …)."
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
          const code = getShortcutCode(settings, s.id);
          const isCustom =
            settings.shortcutBindings[s.id] !== undefined &&
            settings.shortcutBindings[s.id] !== null;
          const isCapturing = capturingId === s.id;
          const conflicts =
            code && (boundCodes.get(code)?.length ?? 0) > 1
              ? boundCodes.get(code)!.filter((x) => x !== s.id)
              : [];
          const chordLabel = labels
            ? labels.prettyChord(code)
            : (code ?? s.chord);
          // jumpToTab is range-bound, not single-key — disable rebind for it.
          const rebindable = s.defaultCode !== null;
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
                {conflicts.length > 0 && (
                  <div className="mt-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    Conflicts with: {conflicts.join(", ")}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!rebindable) return;
                  setCapturingId(isCapturing ? null : s.id);
                }}
                disabled={!rebindable || settings.allShortcutsDisabled}
                title={
                  !rebindable
                    ? "This shortcut binds a range of keys and can't be remapped."
                    : isCapturing
                      ? "Press a key (Esc to cancel)…"
                      : "Click, then press the key combo you want"
                }
                className={[
                  "rounded border px-2 py-0.5 text-xs font-mono tabular-nums transition-colors",
                  isCapturing
                    ? "animate-pulse border-primary bg-primary/15 text-primary"
                    : "bg-muted hover:border-ring hover:bg-background",
                  !rebindable && "cursor-not-allowed opacity-60",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {isCapturing ? "Press key…" : chordLabel}
              </button>
              {isCustom && rebindable && (
                <button
                  type="button"
                  onClick={() => void setShortcutBinding(s.id, null)}
                  title="Reset to default"
                  className="text-muted-foreground hover:text-foreground text-[11px]"
                >
                  Reset
                </button>
              )}
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
        Bindings use the physical key position (<code>KeyboardEvent.code</code>),
        so a shortcut bound to the "<kbd>]</kbd>"-position key still fires when
        that key produces a different character on a non-US layout. The label
        shown above reflects what's actually printed on your keyboard.
      </p>
    </section>
  );
}

/* ─── Help & support ───────────────────────────────────────────────────── */

const HELP_ROWS: {
  href: string;
  icon: typeof FileText;
  title: string;
  description: string;
}[] = [
  {
    href: HELP_LINKS.docs,
    icon: BookOpen,
    title: "Documentation",
    description: "How every feature works — viewers, revision mode, AI notes, and more.",
  },
  {
    href: HELP_LINKS.website,
    icon: Globe,
    title: "Website",
    description: "Filemark home — features, demo, and downloads.",
  },
  {
    href: HELP_LINKS.github,
    icon: FileCode2,
    title: "GitHub",
    description: "Source code, releases, and the changelog.",
  },
  {
    href: HELP_LINKS.issues,
    icon: Bug,
    title: "Report an issue",
    description: "Hit a bug or have a feature request? Open an issue.",
  },
];

function HelpSection() {
  return (
    <section>
      <SectionHeading
        icon={HelpCircle}
        title="Help & support"
        subtitle="Docs, source, and where to reach us if something's not working."
      />
      <div className="space-y-0.5">
        {HELP_ROWS.map((row) => {
          const Icon = row.icon;
          return (
            <a
              key={row.href}
              href={row.href}
              target="_blank"
              rel="noreferrer"
              className="hover:bg-muted/50 flex items-center gap-3 rounded-md px-3 py-2 text-sm"
            >
              <Icon className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-foreground font-medium">{row.title}</div>
                <div className="text-muted-foreground text-xs">
                  {row.description}
                </div>
              </div>
              <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
            </a>
          );
        })}
      </div>
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

// Shared compact switch (h-4 w-7) used by every toggle on the options page —
// formats, remote, shortcut-disable, and per-rule enable/disable. `invert`
// flips the visual on/off vs the stored value (e.g. an "enabled" toggle backed
// by an "allShortcutsDisabled" field).
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
        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
        (on ? "bg-primary" : "bg-muted border")
      }
      title={label}
    >
      <span
        className={
          "inline-block size-3 transform rounded-full bg-white shadow-sm transition-transform " +
          (on ? "translate-x-[14px]" : "translate-x-[2px]")
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

