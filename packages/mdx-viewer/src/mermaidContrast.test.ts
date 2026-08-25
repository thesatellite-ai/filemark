// @vitest-environment jsdom
//
// jsdom is required for the `recolorMermaidLabels` DOM-shell tests (DOMParser +
// XMLSerializer). The pure-core tests below are DOM-free and would pass in the
// node env too; they run here alongside the shell tests for one cohesive file.
import { describe, it, expect } from "vitest";
import {
  parseColor,
  relativeLuminance,
  readableLabelColor,
  fillFromStyle,
  classFillsFromStyleBlock,
  toneDownDarkEdgeLabels,
  recolorMermaidLabels,
  rgbToHsl,
  hslToRgb,
  toHex,
  deepenFillForDark,
  LABEL_DARK,
  LABEL_LIGHT,
  LUMINANCE_MIDPOINT,
  DARK_FILL_TARGET_L,
  DARK_FILL_MIN_SAT,
} from "./mermaidContrast";

describe("parseColor", () => {
  it("parses #rrggbb", () => {
    expect(parseColor("#e8f5e9")).toEqual({ r: 232, g: 245, b: 233 });
  });
  it("parses shorthand #rgb by channel-doubling", () => {
    expect(parseColor("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("#0a0")).toEqual({ r: 0, g: 170, b: 0 });
  });
  it("ignores alpha in #rrggbbaa and #rgba", () => {
    expect(parseColor("#11182780")).toEqual({ r: 17, g: 24, b: 39 });
    expect(parseColor("#abcf")).toEqual({ r: 170, g: 187, b: 204 });
  });
  it("parses rgb()/rgba() with commas, spaces, and percentages", () => {
    expect(parseColor("rgb(0, 128, 255)")).toEqual({ r: 0, g: 128, b: 255 });
    expect(parseColor("rgb(0 128 255)")).toEqual({ r: 0, g: 128, b: 255 });
    expect(parseColor("rgba(0,128,255,0.5)")).toEqual({ r: 0, g: 128, b: 255 });
    expect(parseColor("rgb(0% 50% 100% / 50%)")).toEqual({ r: 0, g: 128, b: 255 });
  });
  it("resolves the small named-color set", () => {
    expect(parseColor("white")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColor("BLACK")).toEqual({ r: 0, g: 0, b: 0 });
  });
  it("returns null for non-colors, keywords, and junk (the safe skip path)", () => {
    for (const v of ["none", "transparent", "inherit", "currentColor", "url(#g)", "", "  ", "#12", "notacolor", null, undefined]) {
      expect(parseColor(v as string)).toBeNull();
    }
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
  it("ranks a light pastel above the midpoint and a deep color below", () => {
    expect(relativeLuminance({ r: 232, g: 245, b: 233 })).toBeGreaterThan(0.5); // #e8f5e9
    expect(relativeLuminance({ r: 198, g: 40, b: 40 })).toBeLessThan(0.5); // #c62828
  });
});

describe("readableLabelColor", () => {
  it("gives dark text on the reported author light fills", () => {
    // The exact fills from sync_go/.lath/secrets/README.md that broke in dark mode.
    expect(readableLabelColor("#e8f5e9")).toBe(LABEL_DARK); // green
    expect(readableLabelColor("#fff8e1")).toBe(LABEL_DARK); // amber
    expect(readableLabelColor("#ffebee")).toBe(LABEL_DARK); // red
  });
  it("gives light text on a dark author fill (the light-mode mirror bug)", () => {
    expect(readableLabelColor("#1f2937")).toBe(LABEL_LIGHT);
    expect(readableLabelColor("#c62828")).toBe(LABEL_LIGHT);
  });
  it("returns null for a fill it cannot parse (node left untouched)", () => {
    expect(readableLabelColor("none")).toBeNull();
    expect(readableLabelColor("url(#grad)")).toBeNull();
  });
});

describe("fillFromStyle", () => {
  it("extracts fill from an inline style, stripping !important", () => {
    expect(fillFromStyle("fill:#e8f5e9 !important;stroke:#2e7d32")).toBe("#e8f5e9");
    expect(fillFromStyle("stroke:#2e7d32;fill: rgb(0,0,0)")).toBe("rgb(0,0,0)");
  });
  it("is case-insensitive and tolerant of spacing", () => {
    expect(fillFromStyle("FILL :  #ABC")).toBe("#ABC");
  });
  it("returns null when there is no fill", () => {
    expect(fillFromStyle("stroke:#000")).toBeNull();
    expect(fillFromStyle("")).toBeNull();
    expect(fillFromStyle(null)).toBeNull();
  });
  it("does not match `stroke-fill`-like decoys via the boundary anchor", () => {
    // Only a real `fill:` (start or after `;`) counts — guards against a
    // hypothetical `xfill:` custom prop bleeding through.
    expect(fillFromStyle("xfill:#fff")).toBeNull();
  });
});

describe("classFillsFromStyleBlock", () => {
  it("maps classDef fills of the `.name > *` shape mermaid emits", () => {
    const css = `.done > * { fill: #e8f5e9 !important; stroke: #2e7d32 !important; }
                 .warn > * { fill:#fff8e1 !important; }`;
    const map = classFillsFromStyleBlock(css);
    expect(map.get("done")).toBe("#e8f5e9");
    expect(map.get("warn")).toBe("#fff8e1");
  });
  it("also accepts the bare `.name { fill }` shape", () => {
    const map = classFillsFromStyleBlock(".hot { fill: #c62828; }");
    expect(map.get("hot")).toBe("#c62828");
  });
  it("ignores rules without a fill and non-single-class selectors", () => {
    const css = `.a .b { fill:#fff; } .node rect { stroke:#000; } .c > * { color:#111; }`;
    const map = classFillsFromStyleBlock(css);
    expect(map.size).toBe(0);
  });
  it("returns an empty map for empty/nullish input", () => {
    expect(classFillsFromStyleBlock("").size).toBe(0);
    expect(classFillsFromStyleBlock(null).size).toBe(0);
  });
});

describe("toneDownDarkEdgeLabels", () => {
  const gray = "hsl(0, 0%, 34.4117647059%)";

  it("repoints edgeLabel/labelBkg backgrounds to the card token", () => {
    const css =
      `#m .edgeLabel{background-color:${gray};text-align:center;}` +
      `#m .edgeLabel p{background-color:${gray};}` +
      `#m .edgeLabel rect{opacity:0.5;fill:${gray};}` +
      `#m .labelBkg{background-color:rgba(87,87,87,0.5);}`;
    const out = toneDownDarkEdgeLabels(css);
    expect(out).not.toContain(gray);
    expect(out).toContain("var(--card, #0d1117)");
    expect(out).toContain("opacity:1"); // mask rect made fully opaque
    expect(out).not.toMatch(/opacity:\s*0?\.5/);
  });

  it("does not touch node/cluster rules that merely contain 'label'", () => {
    const css = `#m .cluster-label span p{background-color:transparent;}#m .nodeLabel{color:#333;}`;
    expect(toneDownDarkEdgeLabels(css)).toBe(css);
  });

  it("returns '' for empty/nullish input", () => {
    expect(toneDownDarkEdgeLabels("")).toBe("");
    expect(toneDownDarkEdgeLabels(null)).toBe("");
  });
});

describe("HSL conversion", () => {
  it("round-trips primary colors rgb→hsl→rgb", () => {
    for (const c of [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 128, b: 0 },
      { r: 0, g: 0, b: 255 },
      { r: 232, g: 245, b: 233 },
      { r: 17, g: 24, b: 39 },
    ]) {
      const back = hslToRgb(rgbToHsl(c));
      expect(back.r).toBeCloseTo(c.r, -0.5);
      expect(back.g).toBeCloseTo(c.g, -0.5);
      expect(back.b).toBeCloseTo(c.b, -0.5);
    }
  });
  it("reports 0 saturation for grays", () => {
    expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
  });
  it("toHex serializes to #rrggbb", () => {
    expect(toHex({ r: 17, g: 24, b: 39 })).toBe("#111827");
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });
});

describe("deepenFillForDark", () => {
  it("turns a washed light pastel into a deep, same-hue color", () => {
    const original = rgbToHsl({ r: 232, g: 245, b: 233 }); // #e8f5e9 pale green
    const deep = deepenFillForDark({ r: 232, g: 245, b: 233 });
    const deepHsl = rgbToHsl(parseColor(deep)!);
    // Hue preserved (±2° accounts for 8-bit hex rounding), lightness pinned
    // deep, saturation floored.
    expect(Math.abs(deepHsl.h - original.h)).toBeLessThan(2);
    expect(deepHsl.l).toBeCloseTo(DARK_FILL_TARGET_L, 1);
    expect(deepHsl.s).toBeGreaterThanOrEqual(DARK_FILL_MIN_SAT - 0.01);
    // And it is now genuinely dark, so a light label reads on it.
    expect(relativeLuminance(parseColor(deep)!)).toBeLessThan(LUMINANCE_MIDPOINT);
  });
  it("keeps each of the reported hues distinct (green ≠ amber ≠ red)", () => {
    const g = rgbToHsl(parseColor(deepenFillForDark(parseColor("#e8f5e9")!))!).h;
    const a = rgbToHsl(parseColor(deepenFillForDark(parseColor("#fff8e1")!))!).h;
    const r = rgbToHsl(parseColor(deepenFillForDark(parseColor("#ffebee")!))!).h;
    expect(Math.abs(g - a)).toBeGreaterThan(20);
    expect(Math.abs(a - r)).toBeGreaterThan(20);
  });
  it("leaves a gray fill gray (no hue to saturate)", () => {
    const deep = parseColor(deepenFillForDark({ r: 240, g: 240, b: 240 }))!;
    expect(rgbToHsl(deep).s).toBe(0);
  });
});

describe("recolorMermaidLabels (DOM shell)", () => {
  // jsdom's text/html parser does NOT implement HTML's foreign-content (SVG)
  // insertion mode faithfully: it hoists HTML label elements (a `.nodeLabel`
  // <span>/<div> inside a <foreignObject>) OUT of the <svg>. Real Chromium
  // keeps them nested — verified live in a browser (before/after screenshots)
  // where mermaid's default htmlLabels recolor correctly. So the jsdom shell
  // tests use SVG-NATIVE <text> labels, which jsdom keeps nested; they exercise
  // the same fill-resolution + color-choice + label-paint code paths. The HTML
  // <span>/<br> label path is covered by the parse-safety test below plus the
  // documented browser verification.
  const textNodeSvg = (fill: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg"><g class="root">` +
    `<g class="node default" id="n1">` +
    `<rect class="basic label-container" style="fill:${fill} !important;stroke:#2e7d32"></rect>` +
    `<g class="label"><text class="nodeLabel">read env</text></g>` +
    `</g></g></svg>`;

  // Output is HTML-serialized (see recolorMermaidLabels parsing note), so
  // reparse the result with the same lenient text/html mode to read it back.
  const reparse = (out: string) =>
    new DOMParser().parseFromString(out, "text/html");

  it("paints a dark label onto a light-fill node", () => {
    const out = recolorMermaidLabels(textNodeSvg("#e8f5e9"));
    expect(reparse(out).querySelector("text")?.getAttribute("fill")).toBe(LABEL_DARK);
  });

  it("paints a light label onto a dark-fill node", () => {
    const out = recolorMermaidLabels(textNodeSvg("#1f2937"));
    expect(reparse(out).querySelector("text")?.getAttribute("fill")).toBe(LABEL_LIGHT);
  });

  it("does not throw and returns a non-empty string for HTML <br> labels (parse-safety regression)", () => {
    // The exact shape that broke the strict image/svg+xml parser: multi-line
    // labels with unclosed `<br>` inside a foreignObject. The lenient text/html
    // parse must not reject it (jsdom mangles the SVG nesting, so we assert only
    // that the call is safe + non-destructive; correct recolor of this path is
    // verified live in Chromium). The node fills still round-trip.
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g class="root">` +
      `<g class="node" id="n1"><rect style="fill:#e8f5e9 !important;stroke:#2e7d32"></rect>` +
      `<g class="label"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">` +
      `<span class="nodeLabel"><p>1 · read<br>env file</p></span></div></foreignObject></g></g>` +
      `<g class="node" id="n2"><rect style="fill:#ffebee !important"></rect>` +
      `<g class="label"><span class="nodeLabel"><p>4 · push<br>to GitHub</p></span></g></g>` +
      `</g></svg>`;
    let out = "";
    expect(() => {
      out = recolorMermaidLabels(svg);
    }).not.toThrow();
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain("read"); // label text survived past the first <br>
    // The <br>-containing HTML label was recolored, not aborted — the strict
    // parser would have dropped everything here. (jsdom drops the second,
    // foreignObject-less node; Chromium keeps both — see browser verification.)
    expect(out).toMatch(/color:\s*rgb\(17,\s*24,\s*39\)|#111827/);
  });

  it("recolors SVG <text> labels via the fill attribute", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g class="node" id="n">` +
      `<rect style="fill:#e8f5e9"></rect>` +
      `<g class="label"><text class="nodeLabel">hi</text></g></g></svg>`;
    const out = recolorMermaidLabels(svg);
    expect(reparse(out).querySelector("text")?.getAttribute("fill")).toBe(LABEL_DARK);
  });

  it("resolves fill from a classDef in the <style> block when no inline fill", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<style>.done > * { fill:#1f2937 !important; }</style>` +
      `<g class="node done" id="n"><rect class="basic"></rect>` +
      `<g class="label"><text class="nodeLabel">x</text></g></g></svg>`;
    const out = recolorMermaidLabels(svg);
    // #1f2937 is dark → light label. Proves the classDef fill (not an inline
    // shape fill) drove the choice.
    expect(reparse(out).querySelector("text")?.getAttribute("fill")).toBe(LABEL_LIGHT);
  });

  it("leaves theme-default nodes (no explicit fill) byte-for-byte untouched", () => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg"><g class="node" id="n">` +
      `<rect class="basic"></rect>` +
      `<g class="label"><text class="nodeLabel">x</text></g></g></svg>`;
    expect(recolorMermaidLabels(svg)).toBe(svg);
  });

  it("is a safe no-op for empty input", () => {
    expect(recolorMermaidLabels("")).toBe("");
  });

  // ── Dark mode (deepenLightFills: true) ────────────────────────────────────
  const darkTextNodeSvg = (fill: string) =>
    `<svg xmlns="http://www.w3.org/2000/svg"><g class="root">` +
    `<g class="node" id="n1"><rect id="shape" style="fill:${fill} !important;stroke:#2e7d32"></rect>` +
    `<g class="label"><text class="nodeLabel">x</text></g></g></g></svg>`;

  it("dark mode: deepens a light author fill and sets a light label", () => {
    const out = recolorMermaidLabels(darkTextNodeSvg("#e8f5e9"), {
      deepenLightFills: true,
    });
    const doc = reparse(out);
    const shapeFill = fillFromStyle(
      doc.querySelector("#shape")?.getAttribute("style"),
    );
    expect(shapeFill).toBeTruthy();
    // Fill is now dark (was light) and the label went light.
    expect(relativeLuminance(parseColor(shapeFill!)!)).toBeLessThan(LUMINANCE_MIDPOINT);
    expect(doc.querySelector("text")?.getAttribute("fill")).toBe(LABEL_LIGHT);
  });

  it("dark mode: leaves an already-dark author fill's color alone, label light", () => {
    const out = recolorMermaidLabels(darkTextNodeSvg("#1f2937"), {
      deepenLightFills: true,
    });
    const doc = reparse(out);
    const shapeFill = fillFromStyle(
      doc.querySelector("#shape")?.getAttribute("style"),
    );
    // Dark fill unchanged (still the authored #1f2937), label light.
    expect(parseColor(shapeFill!)).toEqual({ r: 31, g: 41, b: 55 });
    expect(doc.querySelector("text")?.getAttribute("fill")).toBe(LABEL_LIGHT);
  });

  it("dark mode: tones the gray edge-label background down to the card token", () => {
    const gray = "hsl(0, 0%, 34.4117647059%)";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<style>.edgeLabel{background-color:${gray};}.edgeLabel rect{opacity:0.5;fill:${gray};}</style>` +
      `<g class="node" id="n"><rect style="fill:#e8f5e9"></rect>` +
      `<g class="label"><text class="nodeLabel">x</text></g></g></svg>`;
    const out = recolorMermaidLabels(svg, { deepenLightFills: true });
    expect(out).toContain("var(--card, #0d1117)");
    expect(out).not.toContain(gray);
  });

  it("light mode: leaves the gray edge-label background alone", () => {
    const gray = "hsl(0, 0%, 34.4117647059%)";
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg">` +
      `<style>.edgeLabel{background-color:${gray};}</style>` +
      `<g class="node" id="n"><rect style="fill:#e8f5e9"></rect>` +
      `<g class="label"><text class="nodeLabel">x</text></g></g></svg>`;
    const out = recolorMermaidLabels(svg); // light mode
    expect(out).toContain(gray); // untouched
  });

  it("light mode (default) does NOT deepen the fill", () => {
    const out = recolorMermaidLabels(darkTextNodeSvg("#e8f5e9")); // no options
    const doc = reparse(out);
    const shapeFill = fillFromStyle(
      doc.querySelector("#shape")?.getAttribute("style"),
    );
    // Fill still the light author pastel; label dark for contrast.
    expect(parseColor(shapeFill!)).toEqual({ r: 232, g: 245, b: 233 });
    expect(doc.querySelector("text")?.getAttribute("fill")).toBe(LABEL_DARK);
  });
});
