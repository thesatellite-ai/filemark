import { describe, it, expect } from "vitest";
import {
  parseVideo,
  youtubeNeedsHelper,
  youtubeHelperUrl,
  resolveIframeSrc,
  YT_EMBED_HELPER,
} from "./VideoEmbed";

describe("parseVideo", () => {
  it("parses youtu.be short links to id + nocookie embed + canonical watch URL", () => {
    expect(parseVideo("https://youtu.be/aqz-KE-bpKQ")).toEqual({
      provider: "youtube",
      id: "aqz-KE-bpKQ",
      embedUrl: "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
      watchUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    });
  });

  it("captures the FULL hyphenated id from watch?v= (not truncated at the first '-')", () => {
    const v = parseVideo("https://www.youtube.com/watch?v=aqz-KE-bpKQ");
    expect(v?.provider).toBe("youtube");
    expect(v?.id).toBe("aqz-KE-bpKQ");
  });

  it("parses vimeo watch + video paths", () => {
    expect(parseVideo("https://vimeo.com/76979871")).toEqual({
      provider: "vimeo",
      id: "76979871",
      embedUrl: "https://player.vimeo.com/video/76979871",
      watchUrl: "https://vimeo.com/76979871",
    });
  });

  it("parses loom share links", () => {
    const v = parseVideo("https://www.loom.com/share/abc123def456");
    expect(v?.provider).toBe("loom");
    expect(v?.id).toBe("abc123def456");
    expect(v?.embedUrl).toBe("https://www.loom.com/embed/abc123def456");
  });

  it("returns null for unrecognized / empty input", () => {
    expect(parseVideo("")).toBeNull();
    expect(parseVideo("https://example.com/video.mp4")).toBeNull();
  });
});

describe("youtubeNeedsHelper", () => {
  // The crux of the Error-153 fix: YouTube needs a valid http(s) Referer, which
  // non-web host origins can't provide — so route through the https helper.
  it("routes YouTube via the helper on non-web host origins", () => {
    expect(youtubeNeedsHelper("youtube", "chrome-extension:")).toBe(true);
    expect(youtubeNeedsHelper("youtube", "vscode-webview:")).toBe(true);
    expect(youtubeNeedsHelper("youtube", "file:")).toBe(true);
  });

  it("embeds YouTube directly on web origins (the website)", () => {
    expect(youtubeNeedsHelper("youtube", "https:")).toBe(false);
    expect(youtubeNeedsHelper("youtube", "http:")).toBe(false);
  });

  it("never uses the helper for Vimeo / Loom — they embed cross-origin fine", () => {
    expect(youtubeNeedsHelper("vimeo", "chrome-extension:")).toBe(false);
    expect(youtubeNeedsHelper("loom", "file:")).toBe(false);
  });

  it("treats undefined protocol (SSR, no location) as web → direct embed, hydrates on https", () => {
    expect(youtubeNeedsHelper("youtube", undefined)).toBe(false);
  });
});

describe("youtubeHelperUrl", () => {
  it("appends the id as a ?v= param on the deployed helper", () => {
    expect(youtubeHelperUrl("aqz-KE-bpKQ")).toBe(`${YT_EMBED_HELPER}?v=aqz-KE-bpKQ`);
  });

  it("url-encodes the id (defense in depth — parseVideo already constrains it)", () => {
    expect(youtubeHelperUrl("a b", "https://h/e.html")).toBe("https://h/e.html?v=a%20b");
  });
});

describe("resolveIframeSrc (raw pasted <iframe>)", () => {
  const YT = "https://www.youtube.com/embed/qdbHsZKNukI?si=xyz";

  it("reroutes a raw YouTube iframe through the helper on non-web origins", () => {
    expect(resolveIframeSrc(YT, "chrome-extension:")).toBe(
      `${YT_EMBED_HELPER}?v=qdbHsZKNukI`,
    );
    expect(resolveIframeSrc(YT, "vscode-webview:")).toBe(
      `${YT_EMBED_HELPER}?v=qdbHsZKNukI`,
    );
  });

  it("leaves a YouTube iframe untouched on the website (https)", () => {
    expect(resolveIframeSrc(YT, "https:")).toBe(YT);
  });

  it("never touches non-YouTube iframes (Vimeo / Loom / arbitrary)", () => {
    const vimeo = "https://player.vimeo.com/video/76979871";
    const cp = "https://codepen.io/foo/embed/bar";
    expect(resolveIframeSrc(vimeo, "chrome-extension:")).toBe(vimeo);
    expect(resolveIframeSrc(cp, "chrome-extension:")).toBe(cp);
  });
});
