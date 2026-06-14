import { useEffect, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { useTheme } from "@filemark/core";

interface MonacoPaneProps {
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
  language?: string;
  /** Optional wrapper class for sizing. */
  className?: string;
}

/**
 * Monaco wrapper that
 *   - re-themes on ThemeProvider changes (light / dark / sepia → vs / vs-dark),
 *   - defaults to Markdown syntax,
 *   - turns off the minimap and tightens the UI for sidebar usage,
 *   - exposes a read-only mode for the Raw-source view in the Gallery.
 */
export function MonacoPane({
  value,
  onChange,
  readOnly = false,
  language = "markdown",
  className = "",
}: MonacoPaneProps) {
  const { theme } = useTheme();
  const [monaco, setMonaco] = useState<Monaco | null>(null);

  useEffect(() => {
    if (!monaco) return;
    monaco.editor.setTheme(theme.mode === "dark" ? "vs-dark" : "vs");
  }, [monaco, theme.mode]);

  return (
    <div className={`h-full min-h-0 w-full ${className}`}>
      <Editor
        value={value}
        onChange={(v) => onChange?.(v ?? "")}
        language={language}
        theme={theme.mode === "dark" ? "vs-dark" : "vs"}
        beforeMount={(m) => setMonaco(m)}
        options={{
          readOnly,
          minimap: { enabled: false },
          wordWrap: "on",
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          renderWhitespace: "none",
          smoothScrolling: true,
          tabSize: 2,
          contextmenu: !readOnly,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            alwaysConsumeMouseWheel: false,
          },
        }}
        loading={
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            loading editor…
          </div>
        }
      />
    </div>
  );
}
