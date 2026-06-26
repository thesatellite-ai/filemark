// @vitest-environment jsdom
//
// Regression coverage for the highlight-clear path. The bug that shipped:
// NotesContext's repaint effect early-returned `if (notes.length === 0)` BEFORE
// calling rebuild(), so deleting the last note (or Clear) left the CSS highlight
// painted forever — only adding a fresh note (which replaces the highlight set)
// appeared to "move" it. These tests lock in: removing the last note and
// clearing both un-paint the highlight; removing one of several repaints the
// rest.

import { createElement as h } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { NotesProvider, useNotes } from "./NotesContext";
import { HIGHLIGHT_NAME, BODY_SELECTOR } from "./constants";
import type { NotesApi } from "./types";

// React 19 requires this flag for act() outside a test renderer.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Minimal CSS Custom Highlight API mock (jsdom has none) -----------------
// A Map satisfies the .set(name, hl) / .delete(name) / .has(name) we use.
class FakeHighlight {
  ranges: Range[];
  constructor(...ranges: Range[]) {
    this.ranges = ranges;
  }
}
function installHighlightApi() {
  (globalThis as unknown as { Highlight: unknown }).Highlight = FakeHighlight;
  (globalThis as unknown as { CSS: unknown }).CSS = { highlights: new Map() };
}
const highlights = () =>
  (globalThis as unknown as { CSS: { highlights: Map<string, unknown> } }).CSS.highlights;

// requestAnimationFrame is only used by the MutationObserver path; polyfill so
// the effect's cleanup (cancelAnimationFrame) doesn't throw in jsdom.
if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0) as unknown as number) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) =>
    clearTimeout(id)) as typeof cancelAnimationFrame;
}

let container: HTMLElement;
let root: Root;
let api: NotesApi;

function Capture() {
  api = useNotes();
  return null;
}

function mount() {
  // Body the highlight engine reads quotes from.
  document.body.innerHTML =
    `<article class="${BODY_SELECTOR.slice(1)}"><p>alpha beta gamma delta epsilon</p></article>` +
    `<div id="root"></div>`;
  container = document.getElementById("root")!;
  root = createRoot(container);
  act(() => {
    root.render(
      h(NotesProvider, {
        fileId: "f1",
        fileName: "f1.md",
        children: h(Capture),
      }),
    );
  });
}

beforeEach(() => {
  installHighlightApi();
  mount();
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

describe("NotesContext — highlight clears when notes empty", () => {
  it("removing the LAST note un-paints the highlight", () => {
    let id = "";
    act(() => {
      id = api.add({ quote: "beta gamma", heading: "", line: "", anchorIndex: 0 });
    });
    expect(highlights().has(HIGHLIGHT_NAME)).toBe(true);

    act(() => api.remove(id));
    expect(highlights().has(HIGHLIGHT_NAME)).toBe(false);
  });

  it("Clear un-paints the highlight even with multiple notes", () => {
    act(() => {
      api.add({ quote: "alpha", heading: "", line: "", anchorIndex: 0 });
      api.add({ quote: "delta epsilon", heading: "", line: "", anchorIndex: 12 });
    });
    expect(highlights().has(HIGHLIGHT_NAME)).toBe(true);

    act(() => api.clear());
    expect(highlights().has(HIGHLIGHT_NAME)).toBe(false);
  });

  it("removing ONE of several keeps the highlight painted for the rest", () => {
    let first = "";
    act(() => {
      first = api.add({ quote: "alpha", heading: "", line: "", anchorIndex: 0 });
      api.add({ quote: "gamma", heading: "", line: "", anchorIndex: 11 });
    });
    expect(highlights().has(HIGHLIGHT_NAME)).toBe(true);

    act(() => api.remove(first));
    // Still one note left → highlight stays.
    expect(highlights().has(HIGHLIGHT_NAME)).toBe(true);
  });
});
