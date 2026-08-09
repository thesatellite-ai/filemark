import { describe, it, expect } from "vitest";
import {
  ZOOM_MIN,
  ZOOM_MAX,
  clampZoom,
  CSV_EXTENSIONS,
  isCsvExtension,
  pickPreviewRenderer,
} from "./constants";

describe("clampZoom", () => {
  it("passes an in-range value through (snapped)", () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(1.2)).toBe(1.2);
  });

  it("clamps below the minimum", () => {
    expect(clampZoom(0.1)).toBe(ZOOM_MIN);
    expect(clampZoom(-5)).toBe(ZOOM_MIN);
  });

  it("clamps above the maximum", () => {
    expect(clampZoom(99)).toBe(ZOOM_MAX);
  });

  it("snaps to one-decimal steps so 100% is always reachable", () => {
    expect(clampZoom(1.04)).toBe(1);
    expect(clampZoom(1.06)).toBe(1.1);
  });
});

describe("isCsvExtension", () => {
  it("matches csv/tsv case-insensitively (no leading dot)", () => {
    expect(isCsvExtension("csv")).toBe(true);
    expect(isCsvExtension("tsv")).toBe(true);
    expect(isCsvExtension("CSV")).toBe(true);
    expect(isCsvExtension("Tsv")).toBe(true);
  });

  it("rejects markdown and other extensions", () => {
    expect(isCsvExtension("md")).toBe(false);
    expect(isCsvExtension("markdown")).toBe(false);
    expect(isCsvExtension("json")).toBe(false);
    expect(isCsvExtension("")).toBe(false);
  });

  it("does not match substrings / dotted forms", () => {
    // Guards against a loose `includes`-on-string bug: these must NOT match.
    expect(isCsvExtension(".csv")).toBe(false);
    expect(isCsvExtension("csvx")).toBe(false);
    expect(isCsvExtension("tsvfile")).toBe(false);
  });

  it("CSV_EXTENSIONS is exactly the two supported grid formats", () => {
    expect([...CSV_EXTENSIONS]).toEqual(["csv", "tsv"]);
  });
});

describe("pickPreviewRenderer", () => {
  it("renders CSV/TSV as the data grid when enabled (any view mode)", () => {
    expect(pickPreviewRenderer("csv", "filemark", true)).toBe("csv");
    expect(pickPreviewRenderer("tsv", "filemark", true)).toBe("csv");
    // The view mode is irrelevant to a data grid — github mode must NOT leak in.
    expect(pickPreviewRenderer("csv", "github", true)).toBe("csv");
    expect(pickPreviewRenderer("CSV", "github", true)).toBe("csv");
  });

  it("shows the disabled note for CSV/TSV when enableCsv is off", () => {
    expect(pickPreviewRenderer("csv", "filemark", false)).toBe("csv-disabled");
    expect(pickPreviewRenderer("tsv", "github", false)).toBe("csv-disabled");
  });

  it("routes markdown to github only in github view mode, else markdown", () => {
    expect(pickPreviewRenderer("md", "github", true)).toBe("github");
    expect(pickPreviewRenderer("md", "filemark", true)).toBe("markdown");
    // enableCsv must not affect non-CSV files.
    expect(pickPreviewRenderer("md", "github", false)).toBe("github");
    expect(pickPreviewRenderer("md", "filemark", false)).toBe("markdown");
  });

  it("treats unknown extensions as markdown-ish (host only offers md/csv/tsv)", () => {
    expect(pickPreviewRenderer("txt", "filemark", true)).toBe("markdown");
    expect(pickPreviewRenderer("txt", "github", true)).toBe("github");
  });
});
