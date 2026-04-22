interface Props {
  data: Record<string, unknown>;
}

/**
 * Rendered above the MDX body when the source has YAML frontmatter between
 * `---` delimiters. Keeps the main body clean of the `--- … ---` block and
 * surfaces metadata as a compact card.
 *
 * Values are rendered in the order they appear in the source. Arrays render
 * as tag-style pills; objects render as JSON; everything else as plain text.
 */
export function Frontmatter({ data }: Props) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  const title = pickString(data, ["title", "name"]);
  const description = pickString(data, ["description", "summary"]);
  const tags = Array.isArray(data.tags) ? (data.tags as unknown[]) : null;
  const otherEntries = entries.filter(
    ([k]) => !["title", "name", "description", "summary", "tags"].includes(k)
  );

  return (
    <aside className="fv-frontmatter">
      {title && <div className="fv-frontmatter-title">{title}</div>}
      {description && (
        <div className="fv-frontmatter-desc">{description}</div>
      )}
      {tags && tags.length > 0 && (
        <div className="fv-frontmatter-tags">
          {tags.map((t, i) => (
            <span key={i} className="fv-frontmatter-tag">
              {String(t)}
            </span>
          ))}
        </div>
      )}
      {otherEntries.length > 0 && (
        <dl className="fv-frontmatter-grid">
          {otherEntries.map(([k, v]) => (
            <div key={k} className="fv-frontmatter-row">
              <dt>{k}</dt>
              <dd>{formatValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}

function pickString(
  data: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const k of keys) {
    const v = data[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.map(String).join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
