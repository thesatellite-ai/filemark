import { useRef, type ReactNode } from "react";
import type { ChartOptions } from "../types";
import { chartAriaLabel } from "../core/ariaLabel";

/**
 * Outer frame every chart sits inside. Owns:
 *   - aria-label (derived from options.title or a deterministic summary)
 *   - optional title bar + toolbar (SVG export)
 *   - rounded border + shadow consistent with the datagrid's frame
 *
 * The renderer is free to fill `children` with whatever recharts
 * components it wants; this container has zero chart-type-specific
 * knowledge.
 */
export function ChartContainer({
  options,
  children,
  footer,
  fullscreen = false,
  onToggleFullscreen,
}: {
  options: ChartOptions;
  children: ReactNode;
  footer?: ReactNode;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const label = chartAriaLabel(options);
  const rootRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  const onExportSvg = () => {
    // Scope the SVG lookup to the chart BODY — the toolbar above has
    // its own download-icon SVG that would otherwise match first via
    // `querySelector("svg")`. Recharts renders its chart inside
    // `.recharts-wrapper > svg.recharts-surface`; target that directly.
    const body = bodyRef.current;
    if (!body) return;
    const svg =
      body.querySelector<SVGElement>("svg.recharts-surface") ??
      body.querySelector<SVGElement>("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    // Inline the computed text color so exported SVGs don't lose
    // their styling when opened outside the page.
    const computed = getComputedStyle(body);
    clone.setAttribute(
      "style",
      `color: ${computed.color}; background: ${computed.backgroundColor};`,
    );
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename(options.title ?? options.type ?? "chart")}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const wrapperClass = fullscreen
    ? "not-prose fixed inset-4 z-50 flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card text-[12.5px] shadow-2xl"
    : "group/chart not-prose my-4 w-full overflow-hidden rounded-lg border border-border/60 bg-card text-[12.5px] shadow-sm";

  const bodyClass = fullscreen
    ? "flex-1 min-h-0 p-3 [&_.recharts-responsive-container]:!h-full"
    : "p-3";

  // When fullscreen, toolbar buttons need to be always-visible (not
  // hover-revealed) since the chart sits over a backdrop.
  const toolbarButtonClass = fullscreen
    ? "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-medium text-muted-foreground opacity-80 transition-colors hover:bg-accent/60 hover:text-foreground"
    : "inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-medium text-muted-foreground opacity-0 transition-opacity transition-colors hover:bg-accent/60 hover:text-foreground group-hover/chart:opacity-100 focus-visible:opacity-100";

  return (
    <>
      {fullscreen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
          onClick={onToggleFullscreen}
          aria-hidden="true"
        />
      )}
      <figure
        ref={rootRef}
        role="figure"
        aria-label={label}
        className={wrapperClass}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5">
          <figcaption className="truncate text-[11.5px] font-medium text-foreground/80 tracking-tight">
            {options.title ?? (
              <span className="text-muted-foreground uppercase tracking-wider text-[10.5px]">
                {options.type}
              </span>
            )}
          </figcaption>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onExportSvg}
              title="Download this chart as SVG"
              aria-label="Download chart as SVG"
              className={toolbarButtonClass}
            >
              <svg viewBox="0 0 14 14" width="11" height="11" aria-hidden="true">
                <path
                  d="M7 2 L7 9 M4 6.5 L7 9.5 L10 6.5 M2.5 11.5 L11.5 11.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              SVG
            </button>
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                title={
                  fullscreen ? "Exit fullscreen (Esc)" : "Expand to fullscreen"
                }
                aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                className={toolbarButtonClass}
              >
                {fullscreen ? (
                  <svg
                    viewBox="0 0 12 12"
                    width="11"
                    height="11"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 1 L5 5 L1 5 M7 1 L7 5 L11 5 M5 11 L5 7 L1 7 M7 11 L7 7 L11 7"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 12 12"
                    width="11"
                    height="11"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 4 L1 1 L4 1 M8 1 L11 1 L11 4 M1 8 L1 11 L4 11 M8 11 L11 11 L11 8"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
        <div ref={bodyRef} className={bodyClass}>
          {children}
        </div>
        {footer && (
          <div className="border-t border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] text-muted-foreground">
            {footer}
          </div>
        )}
      </figure>
    </>
  );
}

function safeFilename(s: string): string {
  return (s.trim() || "chart")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+|^-|-$/g, "-");
}
