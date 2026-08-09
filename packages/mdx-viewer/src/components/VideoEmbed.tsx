/**
 * VideoEmbed — privacy-conscious iframe wrapper for YouTube / Vimeo /
 * Loom. Auto-detects the provider from the URL.
 *
 *     <VideoEmbed src="https://youtu.be/aqz-KE-bpKQ" />
 *     <VideoEmbed src="https://vimeo.com/76979871" title="Trailer" />
 *     <VideoEmbed src="https://www.loom.com/share/abc123…" />
 *
 * YouTube uses `youtube-nocookie.com` (no tracking until play). Vimeo
 * + Loom use their standard embed paths. Aspect ratio defaults to
 * 16:9; pass `aspect="4:3"` / `aspect="1:1"` to override.
 *
 * ── YouTube + non-web host origins ──────────────────────────────────────
 * YouTube's player refuses to run (Error 153 "Video player configuration
 * error") unless the EMBEDDING PAGE sends a valid http(s) `Referer`. All of
 * filemark's non-website hosts are non-web origins — the Chrome extension
 * (`chrome-extension://`), the VS Code webview (`vscode-webview://`), and a
 * local `file://` doc — so a direct YouTube iframe there always 153s,
 * regardless of the video (the video's own `playableInEmbed` flag is irrelevant
 * — 153 is a Referer/handshake failure, not a permission one; 150/101 are the
 * permission errors). Vimeo/Loom send no such requirement.
 *
 * Fix: on a non-web origin the YouTube branch iframes a tiny https HELPER page
 * (YT_EMBED_HELPER, served from the filemark website) which in turn iframes
 * YouTube. YouTube then sees a real `https://khanakia.com` Referer and plays.
 * This is the one technique that works across extension / webview / file://
 * alike (a `srcdoc`/`data:` shim does NOT work — it inherits the null origin).
 * On the website itself (https) YouTube is embedded directly, no helper needed.
 */
export function VideoEmbed(props: Record<string, unknown>) {
  const src = asString(props.src);
  const title = asString(props.title) || "Embedded video";
  const aspect = asString(props.aspect) || "16:9";
  const video = parseVideo(src);

  if (!video) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>VideoEmbed</strong> — unrecognized provider; pass a
        YouTube, Vimeo, or Loom URL via <code>src=</code>.
      </div>
    );
  }

  const ratio = parseAspect(aspect);

  // On a non-web origin, YouTube can't play directly (Error 153) — route it
  // through the https helper page, which supplies the Referer YouTube needs.
  // Everything else (and YouTube on the website) embeds directly.
  const iframeSrc = youtubeNeedsHelper(video.provider, currentProtocol())
    ? youtubeHelperUrl(video.id)
    : video.embedUrl;

  return (
    <figure
      className="fv-videoembed bg-card my-6 overflow-hidden rounded-lg border shadow-sm"
      style={{ aspectRatio: ratio }}
    >
      <iframe
        src={iframeSrc}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        className="block h-full w-full"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </figure>
  );
}

/** Providers VideoEmbed can render. Closed set — the CSP `frame-src` allow-list
 *  in the VS Code host (apps/vscode/src/extension.ts VIDEO_EMBED_ORIGINS) must
 *  cover every origin these produce. */
export type VideoProvider = "youtube" | "vimeo" | "loom";

export interface ParsedVideo {
  provider: VideoProvider;
  /** The provider-native id (YouTube 11-char id, Vimeo numeric, Loom share id). */
  id: string;
  /** iframe `src` — the privacy/standard embed URL (direct embed). */
  embedUrl: string;
  /** Canonical watch page. */
  watchUrl: string;
}

/**
 * The https helper page that re-embeds YouTube with a valid Referer, served
 * from the filemark website (public/embed/youtube.html under vite base
 * `/apps/filemark/`). Non-web hosts iframe `${YT_EMBED_HELPER}?v=<id>` so
 * YouTube receives a real https Referer and plays. See the component header.
 */
export const YT_EMBED_HELPER =
  "https://khanakia.com/apps/filemark/embed/youtube.html";

/** Build the helper URL for a YouTube id. `base` is injectable for tests. */
export function youtubeHelperUrl(id: string, base = YT_EMBED_HELPER): string {
  return `${base}?v=${encodeURIComponent(id)}`;
}

/**
 * Parse a share/watch URL into its provider + embed + watch URLs.
 * Returns null for unrecognized inputs so the caller can show a hint card.
 */
export function parseVideo(src: string): ParsedVideo | null {
  if (!src) return null;

  // YouTube — youtu.be, watch?v=, embed/, shorts/ (nocookie or not).
  let m = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/.exec(
    src,
  );
  if (m) {
    const id = m[1];
    return {
      provider: "youtube",
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
    };
  }

  // Vimeo
  m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(src);
  if (m) {
    return {
      provider: "vimeo",
      id: m[1],
      embedUrl: `https://player.vimeo.com/video/${m[1]}`,
      watchUrl: `https://vimeo.com/${m[1]}`,
    };
  }

  // Loom
  m = /loom\.com\/share\/([\w-]+)/.exec(src);
  if (m) {
    return {
      provider: "loom",
      id: m[1],
      embedUrl: `https://www.loom.com/embed/${m[1]}`,
      watchUrl: `https://www.loom.com/share/${m[1]}`,
    };
  }

  return null;
}

/**
 * Whether the YouTube branch must route through the https helper page instead
 * of embedding directly. True only for YouTube AND a KNOWN non-web protocol
 * (`chrome-extension:`, `vscode-webview:`, `file:`, …). An `undefined` protocol
 * (SSR — no `location`) is treated as web so the server-rendered markup embeds
 * directly and hydrates on the https client. Vimeo/Loom never need the helper —
 * they embed cross-origin from any host.
 */
export function youtubeNeedsHelper(
  provider: VideoProvider,
  protocol: string | undefined,
): boolean {
  if (provider !== "youtube") return false;
  if (protocol === undefined) return false;
  return protocol !== "http:" && protocol !== "https:";
}

/** The current top-level protocol, or undefined under SSR (no `location`). */
function currentProtocol(): string | undefined {
  return typeof location === "undefined" ? undefined : location.protocol;
}

/**
 * Resolve the `src` for a RAW `<iframe>` authored directly in markdown (the
 * copy-paste-from-YouTube "Share → Embed" case, which never goes through the
 * <VideoEmbed> component). A YouTube src on a non-web host origin is rerouted
 * through the https helper (same Error-153 fix as the component); every other
 * src — Vimeo, Loom, CodePen, YouTube on the website — is returned unchanged.
 * `protocol` is injectable for tests; defaults to the live top-level protocol.
 */
export function resolveIframeSrc(
  src: string,
  protocol: string | undefined = currentProtocol(),
): string {
  const v = parseVideo(src);
  if (v && youtubeNeedsHelper(v.provider, protocol)) {
    return youtubeHelperUrl(v.id);
  }
  return src;
}

function parseAspect(s: string): string {
  const m = /^(\d+):(\d+)$/.exec(s.trim());
  if (m) return `${m[1]} / ${m[2]}`;
  return "16 / 9";
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
