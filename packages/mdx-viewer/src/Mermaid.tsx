import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useThemeOptional } from "@filemark/core";

/**
 * Mermaid diagram renderer with a mini viewport.
 *
 * - Lazy-loads `mermaid` on first use (~800 KB one-time chunk).
 * - Theme follows the host `ThemeProvider` (dark / neutral / default).
 * - Built-in toolbar: zoom in / out, reset (100%), fullscreen, copy SVG.
 * - Wheel to zoom, click-and-drag to pan, double-click to reset.
 * - Fullscreen renders a modal overlay; `Esc` or the ✕ button exits.
 * - Falls back to a styled error card on syntax errors.
 */

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}

let idCounter = 0;
const nextId = () => `fv-mermaid-${++idCounter}-${Date.now().toString(36)}`;

const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 6;

export function Mermaid({ source }: { source: string }) {
  const appTheme = useThemeOptional()?.theme ?? null;
  const mode = appTheme?.mode ?? "light";
  const mermaidTheme =
    mode === "dark" ? "dark" : mode === "sepia" ? "neutral" : "default";

  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const idRef = useRef<string>(nextId());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await loadMermaid();
        mermaid.initialize({
          startOnLoad: false,
          theme: mermaidTheme,
          securityLevel: "strict",
          fontFamily: "inherit",
        });
        await mermaid.parse(source);
        const { svg } = await mermaid.render(idRef.current, source);
        if (!cancelled) {
          setSvg(svg);
          setError(null);
        }
      } catch (e) {
        if (cancelled) return;
        setSvg(null);
        setError(String((e as Error)?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, mermaidTheme]);

  if (error) {
    return (
      <div className="fv-mermaid-error">
        <div className="fv-mermaid-error-title">Mermaid diagram error</div>
        <pre className="fv-mermaid-error-body">{error}</pre>
        <details>
          <summary>Source</summary>
          <pre>{source}</pre>
        </details>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="fv-mermaid-loading" aria-live="polite">
        Rendering diagram…
      </div>
    );
  }

  return (
    <>
      <MermaidCanvas
        svg={svg}
        fullscreen={false}
        onRequestFullscreen={() => setFullscreen(true)}
        source={source}
      />
      {fullscreen && (
        <MermaidCanvas
          svg={svg}
          fullscreen
          onRequestFullscreen={() => setFullscreen(false)}
          source={source}
        />
      )}
    </>
  );
}

function MermaidCanvas({
  svg,
  fullscreen,
  onRequestFullscreen,
  source,
}: {
  svg: string;
  fullscreen: boolean;
  onRequestFullscreen: () => void;
  source: string;
}) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Reset when entering or leaving fullscreen so each viewport starts at 1:1.
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [fullscreen]);

  // Close fullscreen on Esc.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestFullscreen();
      else if (e.key === "+" || e.key === "=") zoomBy(ZOOM_STEP);
      else if (e.key === "-" || e.key === "_") zoomBy(-ZOOM_STEP);
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => clamp(s + delta * (s > 1 ? s : 1), ZOOM_MIN, ZOOM_MAX));
  }, []);

  const reset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    // Pinch / ctrl-wheel or plain wheel both zoom. preventDefault keeps the
    // page from scrolling while the user is zooming a diagram.
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * ZOOM_STEP * 0.5;
    setScale((s) => clamp(s + delta * (s > 1 ? s : 1), ZOOM_MIN, ZOOM_MAX));
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      dragRef.current = { x: e.clientX - translate.x, y: e.clientY - translate.y };
    },
    [translate]
  );

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setTranslate({
      x: e.clientX - dragRef.current.x,
      y: e.clientY - dragRef.current.y,
    });
  }, []);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onDoubleClick = useCallback(() => reset(), [reset]);

  const innerStyle: CSSProperties = useMemo(
    () => ({
      transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
      transformOrigin: "center center",
      transition: dragRef.current ? "none" : "transform 120ms ease-out",
      cursor: dragRef.current ? "grabbing" : "grab",
    }),
    [translate, scale]
  );

  const container = (
    <div
      className={
        fullscreen
          ? "fv-mermaid fv-mermaid--fullscreen"
          : "fv-mermaid fv-mermaid--inline"
      }
    >
      <div className="fv-mermaid-toolbar">
        <MermaidBtn onClick={() => zoomBy(-ZOOM_STEP)} title="Zoom out (−)">
          −
        </MermaidBtn>
        <span className="fv-mermaid-scale" title="Current scale">
          {Math.round(scale * 100)}%
        </span>
        <MermaidBtn onClick={() => zoomBy(ZOOM_STEP)} title="Zoom in (+)">
          +
        </MermaidBtn>
        <MermaidBtn onClick={reset} title="Reset zoom and pan (0)">
          1:1
        </MermaidBtn>
        <MermaidBtn
          onClick={() => {
            navigator.clipboard?.writeText(source).catch(() => {});
          }}
          title="Copy Mermaid source"
        >
          Copy
        </MermaidBtn>
        <MermaidBtn
          onClick={onRequestFullscreen}
          title={fullscreen ? "Close fullscreen (Esc)" : "Fullscreen"}
        >
          {fullscreen ? "✕" : "⛶"}
        </MermaidBtn>
      </div>
      <div
        className="fv-mermaid-viewport"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onDoubleClick={onDoubleClick}
      >
        <div
          className="fv-mermaid-inner"
          style={innerStyle}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );

  return container;
}

function MermaidBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="fv-mermaid-btn"
      onClick={onClick}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
