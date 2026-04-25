/**
 * Sparkline — tiny inline trend visual.
 *
 *     <Sparkline data="3,5,4,7,6,8,9" />
 *     <Sparkline data="3,5,4,7,6,8,9" type="bar" color="emerald" />
 *
 * Renders a 80×20 inline SVG of either a polyline (default) or
 * vertical bars. Auto-scales to data range. Use inline next to a
 * label or value.
 */
export function Sparkline(props: Record<string, unknown>) {
  const data = parseData(asString(props.data));
  const type = (asString(props.type) || "line").toLowerCase();
  const color = asString(props.color) || "primary";
  const width = numOr(props.width, 80);
  const height = numOr(props.height, 20);
  const stroke = colorVar(color);

  if (data.length === 0) {
    return (
      <span className="text-muted-foreground text-[10px] italic">no data</span>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;

  if (type === "bar") {
    const barW = width / data.length - 1;
    return (
      <svg
        width={width}
        height={height}
        className="inline-block align-text-bottom"
        aria-label={`Sparkline bars: ${data.join(", ")}`}
      >
        {data.map((v, i) => {
          const h = ((v - min) / range) * (height - 2) + 1;
          return (
            <rect
              key={i}
              x={i * (width / data.length)}
              y={height - h}
              width={Math.max(1, barW)}
              height={h}
              fill={stroke}
              opacity={0.85}
            />
          );
        })}
      </svg>
    );
  }

  // Default: line
  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className="inline-block align-text-bottom"
      aria-label={`Sparkline: ${data.join(", ")}`}
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* Final dot — emphasises the latest value. */}
      {data.length > 0 && (
        <circle
          cx={(data.length - 1) * stepX}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 2) - 1}
          r="1.8"
          fill={stroke}
        />
      )}
    </svg>
  );
}

function parseData(s: string): number[] {
  return s
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => !Number.isNaN(n));
}

function colorVar(name: string): string {
  switch (name.toLowerCase()) {
    case "primary":
      return "var(--primary)";
    case "blue":
      return "#3b82f6";
    case "emerald":
    case "green":
      return "#10b981";
    case "amber":
    case "yellow":
      return "#f59e0b";
    case "rose":
    case "red":
      return "#ef4444";
    case "violet":
    case "purple":
      return "#8b5cf6";
    default:
      return name.startsWith("#") || name.startsWith("var(")
        ? name
        : "var(--primary)";
  }
}

function numOr(v: unknown, fallback: number): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
