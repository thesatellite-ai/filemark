// Webview side of editor↔preview scroll sync.
//
// The MDXViewer stamps every block-level element with `data-line` (the 1-based
// source line, via @filemark/mdx's remarkSourceLine plugin). We use those as
// anchors: the top of the viewport maps to a source line by finding the two
// bracketing `[data-line]` elements and interpolating between them — and the
// reverse, mapping a source line back to a scroll offset. This is the same
// technique VS Code's built-in Markdown preview uses.
//
// Two feedback loops to avoid:
//   • editor → preview → (our scroll fires a scroll event) → back to editor.
//     Guarded by `programmatic`: set while we drive window.scrollTo, so our own
//     scroll handler ignores the resulting event.
//   • preview → editor → (editor reveal shifts visible range) → back to preview.
//     Guarded on the HOST side (see extension.ts suppressEditorSync).

import { topForLine, lineAtY, type LineMark } from "./scrollMath";

/** ms to keep ignoring scroll events after a programmatic scroll settles. */
const PROGRAMMATIC_RELEASE_MS = 200;

/**
 * After an editor-driven scroll or a restore, keep re-applying the target line
 * while the document height changes. Async content (video iframes, images,
 * mermaid/charts, shiki highlighting) lays out AFTER we measure — sometimes a
 * couple of seconds later on a heavy doc — shifting the target; without this the
 * preview lands short. Long enough to cover slow async render, and harmless when
 * idle (a stable layout costs one height read per frame); a genuine user scroll
 * ends it early. */
const RESYNC_WINDOW_MS = 2500;

export interface ScrollSyncController {
  /** Enable/disable both directions (mirrors the filemark.scrollSync setting). */
  setEnabled(on: boolean): void;
  /**
   * Frontmatter line offset for the current doc. The rendered `data-line`
   * anchors are relative to the post-frontmatter body, but the host speaks in
   * whole-file line numbers — so we subtract this when scrolling to a host line
   * and add it back when reporting a line to the host. See
   * `frontmatterLineOffset` in @filemark/mdx.
   */
  setLineOffset(offset: number): void;
  /** Editor → preview: scroll so `line` (1-based whole-file, may be fractional)
   *  is at the top. */
  scrollToLine(line: number): void;
  /** Restore a saved position on (re)open. Works even when sync is disabled —
   *  it's a one-shot restore, not continuous mirroring. */
  restoreToLine(line: number): void;
  /** Detach listeners. */
  dispose(): void;
}

export interface ScrollSyncHandlers {
  /** Fires (rAF-throttled) with the 1-based source line at the top of the
   *  viewport whenever the USER scrolls the preview — never our own scrolls. */
  onScrolled: (line: number) => void;
  /** Fires when the user double-clicks a block; the 1-based source line of the
   *  nearest `[data-line]` ancestor (host jumps the editor there + focuses). */
  onRevealSource: (line: number) => void;
}

/**
 * Wire up editor↔preview linking: continuous scroll sync (both directions) plus
 * double-click → jump-to-source. Both respect `setEnabled` (the
 * filemark.scrollSync setting).
 */
export function createScrollSync(
  { onScrolled, onRevealSource }: ScrollSyncHandlers,
): ScrollSyncController {
  let enabled = true;
  // Whole-file line N ↔ body/anchor line (N - lineOffset). See setLineOffset.
  let lineOffset = 0;
  // True while we are the ones scrolling (editor-driven) — suppresses the echo.
  let programmatic = false;
  let releaseTimer: ReturnType<typeof setTimeout> | undefined;
  let rafPending = false;
  // The most recent editor-driven target line + the settle loop watching for
  // late layout shifts above it (see RESYNC_WINDOW_MS).
  let lastTargetLine: number | null = null;
  let resyncRaf: number | undefined;

  // ── Scroll container resolution ─────────────────────────────────────
  // The content does NOT necessarily scroll on `window` — in the VS Code
  // webview an inner element owns the overflow. So we resolve the actual
  // scroller and express all positions in ITS content coordinates. `null`
  // means the document/window scrolls.
  let scrollerEl: HTMLElement | null = null;

  function isScrollable(el: HTMLElement): boolean {
    const overflowY = getComputedStyle(el).overflowY;
    return (
      (overflowY === "auto" || overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight + 1
    );
  }

  /** The element that actually scrolls the content, or null for window/document.
   *  Cached while valid; re-resolved when detached or no longer scrollable. */
  function scroller(): HTMLElement | null {
    if (scrollerEl && scrollerEl.isConnected && isScrollable(scrollerEl)) {
      return scrollerEl;
    }
    scrollerEl = null;
    const anchor = document.querySelector<HTMLElement>("[data-line]");
    let el: HTMLElement | null = anchor?.parentElement ?? document.body;
    while (el && el !== document.documentElement) {
      if (isScrollable(el)) {
        scrollerEl = el;
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  function scrollTopOf(): number {
    const s = scroller();
    return s ? s.scrollTop : window.scrollY;
  }

  function scrollHeightOf(): number {
    const s = scroller();
    return s ? s.scrollHeight : document.documentElement.scrollHeight;
  }

  function setScrollTop(top: number): void {
    const s = scroller();
    if (s) s.scrollTop = top;
    else window.scrollTo({ top, behavior: "auto" });
  }

  /** Viewport-relative Y (getBoundingClientRect / clientY) → scroller content Y. */
  function toContentY(clientTop: number): number {
    const s = scroller();
    if (s) return clientTop - s.getBoundingClientRect().top + s.scrollTop;
    return clientTop + window.scrollY;
  }

  // Anchor positions in scroller-content coordinates are scroll-INDEPENDENT —
  // they only move when the layout reflows. So we cache them and recompute only
  // when a cheap fingerprint (content height + anchor count) changes. On a busy
  // scroll this turns N getBoundingClientRect() reads per frame into one
  // scrollHeight read on the hit path — the big win on long docs. A reflow that
  // keeps both height and count identical (rare) is the only staleness window.
  let cachedMarks: LineMark[] | null = null;
  let cacheHeight = -1;
  let cacheCount = -1;

  function collectMarks(): LineMark[] {
    const els = document.querySelectorAll<HTMLElement>("[data-line]");
    const height = scrollHeightOf();
    if (cachedMarks && height === cacheHeight && els.length === cacheCount) {
      return cachedMarks;
    }
    const marks: LineMark[] = [];
    els.forEach((el) => {
      const line = Number(el.getAttribute("data-line"));
      if (!Number.isFinite(line)) return;
      marks.push({ line, top: toContentY(el.getBoundingClientRect().top) });
    });
    marks.sort((a, b) => a.top - b.top || a.line - b.line);
    cachedMarks = marks;
    cacheHeight = height;
    cacheCount = els.length;
    return marks;
  }

  function markProgrammatic(): void {
    programmatic = true;
    if (releaseTimer) clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
      programmatic = false;
    }, PROGRAMMATIC_RELEASE_MS);
  }

  function applyScroll(line: number): void {
    const top = topForLine(collectMarks(), line);
    if (top == null) return;
    markProgrammatic();
    setScrollTop(Math.max(0, top));
  }

  // Re-apply the target line while the document height keeps changing (async
  // content settling), for up to RESYNC_WINDOW_MS. Only reacts to height
  // changes, so a stable layout costs one idle rAF then stops.
  function scheduleResync(): void {
    if (resyncRaf !== undefined) cancelAnimationFrame(resyncRaf);
    const deadline = performance.now() + RESYNC_WINDOW_MS;
    let prevHeight = scrollHeightOf();
    const tick = (): void => {
      // No `!enabled` guard: restore-on-open must work even when scroll SYNC is
      // off. A user scroll (reportScroll) nulls lastTargetLine to end this early.
      if (lastTargetLine == null || performance.now() > deadline) {
        resyncRaf = undefined;
        return;
      }
      const height = scrollHeightOf();
      if (height !== prevHeight) {
        prevHeight = height;
        applyScroll(lastTargetLine);
      }
      resyncRaf = requestAnimationFrame(tick);
    };
    resyncRaf = requestAnimationFrame(tick);
  }

  function scrollToLine(line: number): void {
    if (!enabled) return;
    restoreToLine(line);
  }

  // Shared by scrollToLine (sync) and restoreToLine (one-shot). The host speaks
  // whole-file lines; anchors are body-relative.
  function restoreToLine(line: number): void {
    const bodyLine = line - lineOffset;
    lastTargetLine = bodyLine;
    applyScroll(bodyLine);
    scheduleResync();
  }

  function reportScroll(): void {
    // No `!enabled` guard: we still report the position so the host can REMEMBER
    // it (scroll memory works even when sync is off). The host only mirrors the
    // editor when sync is on. `programmatic` still suppresses our own scrolls.
    if (programmatic) return;
    // A genuine user scroll ends any in-flight editor-driven settle loop.
    lastTargetLine = null;
    if (resyncRaf !== undefined) {
      cancelAnimationFrame(resyncRaf);
      resyncRaf = undefined;
    }
    const line = lineAtY(collectMarks(), scrollTopOf());
    // Report in whole-file coordinates for the host.
    if (line != null) onScrolled(Math.max(1, line + lineOffset));
  }

  function onScroll(): void {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      reportScroll();
    });
  }

  // Double-click any rendered block → jump the editor to the source line at that
  // vertical position. We map by click Y (not DOM ancestry) so multi-line HTML
  // component blocks — which CommonMark fragments at blank lines, scattering
  // data-line anchors — still resolve to what the user visually clicked. We use
  // dblclick (not click) so single clicks on links / checkboxes / chart controls
  // and ordinary text selection are never hijacked.
  function onDblClick(event: MouseEvent): void {
    if (!enabled) return;
    // Prefer the exact source line of the element actually under the cursor —
    // headings/paragraphs/cards carry their own data-line, so this lands on the
    // real block (no interpolation drift into the gap above it). Fall back to
    // vertical-position mapping only for dead-space clicks (e.g. the gaps inside
    // a multi-line <Cards> grid, whose fragments have no anchor under the point).
    const hit = document.elementFromPoint(event.clientX, event.clientY);
    const anchor = hit?.closest?.<HTMLElement>("[data-line]");
    const raw = anchor ? Number(anchor.getAttribute("data-line")) : NaN;
    const line = Number.isFinite(raw)
      ? raw
      : lineAtY(collectMarks(), toContentY(event.clientY));
    // Anchors are body-relative; report whole-file line to the host.
    if (line != null) onRevealSource(Math.max(1, line + lineOffset));
  }

  // Capture phase so we receive scroll events from WHICHEVER element scrolls
  // (scroll events don't bubble; the inner scroller wouldn't reach a window
  // listener on the bubble phase).
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("dblclick", onDblClick);

  return {
    setEnabled(on: boolean): void {
      enabled = on;
    },
    setLineOffset(offset: number): void {
      lineOffset = offset;
    },
    scrollToLine,
    restoreToLine,
    dispose(): void {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("dblclick", onDblClick);
      if (releaseTimer) clearTimeout(releaseTimer);
      if (resyncRaf !== undefined) cancelAnimationFrame(resyncRaf);
    },
  };
}
