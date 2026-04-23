import { useTheme, type ThemeMode } from "@filemark/core";

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "sepia", label: "Sepia" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-background p-0.5 text-[11px]">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => setTheme({ mode: m.id })}
          className={[
            "rounded-full px-2.5 py-1 font-medium transition-colors",
            theme.mode === m.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
