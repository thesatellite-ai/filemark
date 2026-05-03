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
const ZOOM_MIN = 0.2;
// Cap raised from 6 → 16 so wide schemas (db-schema-toolkit dumps a
// 30+ table ER diagram into a single SVG) stay readable when zoomed in.
// At 1600% a 12px label is ~192px, comfortable on a 4K display.
const ZOOM_MAX = 16;

// LRU-bounded SVG cache keyed by source+theme. Mermaid render is the
// slowest single piece in a typical doc (200ms–1.5s for big ER diagrams).
// Cache hits skip the entire mermaid load + render path.
const SVG_CACHE = new Map<string, string>();
const SVG_CACHE_MAX = 30;

function svgCacheKey(source: string, theme: string): string {
  return `${theme}:${fnv1a(source)}`;
}
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
function getCachedSvg(source: string, theme: string): string | null {
  const k = svgCacheKey(source, theme);
  const hit = SVG_CACHE.get(k);
  if (hit === undefined) return null;
  SVG_CACHE.delete(k);
  SVG_CACHE.set(k, hit);
  return hit;
}
function setCachedSvg(source: string, theme: string, svg: string): void {
  const k = svgCacheKey(source, theme);
  SVG_CACHE.set(k, svg);
  if (SVG_CACHE.size > SVG_CACHE_MAX) {
    const oldest = SVG_CACHE.keys().next().value;
    if (oldest !== undefined) SVG_CACHE.delete(oldest);
  }
}

export function Mermaid({ source }: { source: string }) {
  const appTheme = useThemeOptional()?.theme ?? null;
  const mode = appTheme?.mode ?? "light";
  const mermaidTheme =
    mode === "dark" ? "dark" : mode === "sepia" ? "neutral" : "default";

  // Synchronous cache hit on first render → no "Rendering diagram…" flash
  // when returning to a tab that already rendered this diagram.
  const [svg, setSvg] = useState<string | null>(() =>
    getCachedSvg(source, mermaidTheme),
  );
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const idRef = useRef<string>(nextId());

  useEffect(() => {
    const cached = getCachedSvg(source, mermaidTheme);
    if (cached !== null) {
      if (cached !== svg) setSvg(cached);
      setError(null);
      return;
    }
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
        const { svg: rendered } = await mermaid.render(idRef.current, source);
        if (cancelled) return;
        setCachedSvg(source, mermaidTheme, rendered);
        setSvg(rendered);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setSvg(null);
        setError(String((e as Error)?.message ?? e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <SharedCanvas
      svg={svg}
      source={source}
      fullscreen={fullscreen}
      onRequestFullscreen={() => setFullscreen((v) => !v)}
    />
  );
}

/**
 * Hoists scale + translate state above the inline ↔ fullscreen split so
 * a zoom level entered in one carries into the other. Without this, going
 * fullscreen mounted a fresh MermaidCanvas with `useState(1)` and wiped
 * the user's zoom.
 *
 * Both views render the same SVG string. We render only the active one
 * (inline OR fullscreen), not both — keeps the DOM small and avoids
 * paying for an off-screen second SVG copy.
 */
// Per-source pan/zoom state. Survives unmount/remount so a tab switch
// back to a doc that contains a mermaid diagram restores the user's
// last zoom + pan instead of resetting to 100% / 0,0. Keyed by source
// hash so it works regardless of which file the diagram lives in.
const VIEW_STATE = new Map<
  string,
  { scale: number; translate: { x: number; y: number } }
>();
const VIEW_STATE_MAX = 50;

function viewStateKey(source: string): string {
  return fnv1a(source);
}
function getViewState(
  source: string,
): { scale: number; translate: { x: number; y: number } } {
  const k = viewStateKey(source);
  const hit = VIEW_STATE.get(k);
  if (hit) {
    VIEW_STATE.delete(k);
    VIEW_STATE.set(k, hit);
    return hit;
  }
  return { scale: 1, translate: { x: 0, y: 0 } };
}
function saveViewState(
  source: string,
  scale: number,
  translate: { x: number; y: number },
): void {
  const k = viewStateKey(source);
  VIEW_STATE.set(k, { scale, translate });
  if (VIEW_STATE.size > VIEW_STATE_MAX) {
    const oldest = VIEW_STATE.keys().next().value;
    if (oldest !== undefined) VIEW_STATE.delete(oldest);
  }
}

function SharedCanvas({
  svg,
  source,
  fullscreen,
  onRequestFullscreen,
}: {
  svg: string;
  source: string;
  fullscreen: boolean;
  onRequestFullscreen: () => void;
}) {
  const initial = getViewState(source);
  const [scale, setScale] = useState(initial.scale);
  const [translate, setTranslate] = useState(initial.translate);

  // Persist on every state change (cheap — Map.set on a string key).
  useEffect(() => {
    saveViewState(source, scale, translate);
  }, [source, scale, translate]);

  return (
    <MermaidCanvas
      svg={svg}
      source={source}
      fullscreen={fullscreen}
      onRequestFullscreen={onRequestFullscreen}
      scale={scale}
      setScale={setScale}
      translate={translate}
      setTranslate={setTranslate}
    />
  );
}

function MermaidCanvas({
  svg,
  fullscreen,
  onRequestFullscreen,
  source,
  scale,
  setScale,
  translate,
  setTranslate,
}: {
  svg: string;
  fullscreen: boolean;
  onRequestFullscreen: () => void;
  source: string;
  scale: number;
  setScale: React.Dispatch<React.SetStateAction<number>>;
  translate: { x: number; y: number };
  setTranslate: React.Dispatch<
    React.SetStateAction<{ x: number; y: number }>
  >;
}) {
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  // Live transform state — mutated imperatively in wheel/drag handlers
  // so we don't pay React reconciliation per pointer event. The toolbar
  // % display reads from React `scale` state, which we sync via rAF.
  const liveRef = useRef({ x: translate.x, y: translate.y, s: scale });
  const rafRef = useRef<number | null>(null);

  const writeStyle = useCallback(() => {
    rafRef.current = null;
    const el = innerRef.current;
    if (!el) return;
    const { x, y, s } = liveRef.current;
    el.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }, []);

  const queueStyle = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(writeStyle);
  }, [writeStyle]);

  // Sync the React-tracked scale (toolbar %) on a coarser cadence —
  // rAF-debounced setScale so we re-render the toolbar at most once per
  // frame instead of once per wheel tick.
  const syncScaleRef = useRef<number | null>(null);
  const syncScaleSoon = useCallback(() => {
    if (syncScaleRef.current != null) return;
    syncScaleRef.current = requestAnimationFrame(() => {
      syncScaleRef.current = null;
      setScale(liveRef.current.s);
      setTranslate({ x: liveRef.current.x, y: liveRef.current.y });
    });
  }, [setScale, setTranslate]);

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

  // Sync React-driven changes (toolbar buttons, reset, parent re-mount)
  // back into the imperative live ref + DOM.
  useEffect(() => {
    liveRef.current = { x: translate.x, y: translate.y, s: scale };
    queueStyle();
  }, [scale, translate, queueStyle]);

  // Cleanup any pending rAF on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (syncScaleRef.current != null)
        cancelAnimationFrame(syncScaleRef.current);
    };
  }, []);

  const zoomBy = useCallback(
    (delta: number) => {
      const cur = liveRef.current.s;
      const next = clamp(cur + delta * (cur > 1 ? cur : 1), ZOOM_MIN, ZOOM_MAX);
      liveRef.current.s = next;
      queueStyle();
      syncScaleSoon();
    },
    [queueStyle, syncScaleSoon],
  );

  const reset = useCallback(() => {
    liveRef.current = { x: 0, y: 0, s: 1 };
    queueStyle();
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [queueStyle, setScale, setTranslate]);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      // Pinch / ctrl-wheel or plain wheel both zoom. preventDefault keeps
      // the page from scrolling while the user is zooming a diagram.
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * ZOOM_STEP * 0.5;
      const cur = liveRef.current.s;
      const next = clamp(cur + delta * (cur > 1 ? cur : 1), ZOOM_MIN, ZOOM_MAX);
      liveRef.current.s = next;
      queueStyle();
      syncScaleSoon();
    },
    [queueStyle, syncScaleSoon],
  );

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = {
      x: e.clientX - liveRef.current.x,
      y: e.clientY - liveRef.current.y,
    };
    if (innerRef.current) innerRef.current.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return;
      liveRef.current.x = e.clientX - dragRef.current.x;
      liveRef.current.y = e.clientY - dragRef.current.y;
      queueStyle();
    },
    [queueStyle],
  );

  const endDrag = useCallback(() => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (innerRef.current) innerRef.current.style.cursor = "grab";
    syncScaleSoon();
  }, [syncScaleSoon]);

  const onDoubleClick = useCallback(() => reset(), [reset]);

  // Static style — no scale/translate here. The transform is applied
  // imperatively by writeStyle(); React re-renders only on toolbar
  // events (rAF-debounced via syncScaleSoon).
  const innerStyle: CSSProperties = useMemo(
    () => ({
      transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
      transformOrigin: "center center",
      cursor: "grab",
    }),
    // Only React state, not the live ref — this style runs at mount /
    // toolbar-event sync. Pointer-driven updates bypass it entirely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
        <MermaidBtn
          onClick={reset}
          title="Fit to viewport (0). Resets pan + scale=1, which CSS-fits the SVG to the container — for wide schemas that's much smaller than natural size, so zoom in (+) to read tables."
        >
          Fit
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
          ref={innerRef}
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
