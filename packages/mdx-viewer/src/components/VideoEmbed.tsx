/**
 * VideoEmbed — privacy-conscious iframe wrapper for YouTube / Vimeo /
 * Loom. Auto-detects the provider from the URL.
 *
 *     <VideoEmbed src="https://youtu.be/dQw4w9WgXcQ" />
 *     <VideoEmbed src="https://vimeo.com/76979871" title="Trailer" />
 *     <VideoEmbed src="https://www.loom.com/share/abc123…" />
 *
 * YouTube uses `youtube-nocookie.com` (no tracking until play). Vimeo
 * + Loom use their standard embed paths. Aspect ratio defaults to
 * 16:9; pass `aspect="4:3"` / `aspect="1:1"` to override.
 */
export function VideoEmbed(props: Record<string, unknown>) {
  const src = asString(props.src);
  const title = asString(props.title) || "Embedded video";
  const aspect = asString(props.aspect) || "16:9";
  const embed = providerEmbed(src);

  if (!embed) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>VideoEmbed</strong> — unrecognized provider; pass a
        YouTube, Vimeo, or Loom URL via <code>src=</code>.
      </div>
    );
  }

  const ratio = parseAspect(aspect);
  return (
    <figure
      className="fv-videoembed bg-card my-6 overflow-hidden rounded-lg border shadow-sm"
      style={{ aspectRatio: ratio }}
    >
      <iframe
        src={embed}
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

function providerEmbed(src: string): string | null {
  if (!src) return null;
  // YouTube
  let m = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/.exec(
    src
  );
  if (m) {
    const id = m[1];
    return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  // Vimeo
  m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(src);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  // Loom
  m = /loom\.com\/share\/([\w-]+)/.exec(src);
  if (m) return `https://www.loom.com/embed/${m[1]}`;
  return null;
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
