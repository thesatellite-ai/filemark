/**
 * Gauge — single-value dial 0–100 with optional target line + threshold
 * colours.
 *
 *     <Gauge value="72" />
 *     <Gauge value="38" target="70" label="Coverage" unit="%" />
 *     <Gauge value="91" min="0" max="100" thresholds="40,70" />
 *
 * thresholds="40,70" means [0..40)=danger, [40..70)=warn, [70..]=success.
 */
export function Gauge(props: Record<string, unknown>) {
  const value = num(props.value, 0);
  const min = num(props.min, 0);
  const max = num(props.max, 100);
  const target = props.target != null ? num(props.target, 0) : null;
  const label = asString(props.label);
  const unit = asString(props.unit);
  const thresholds = parseThresholds(asString(props.thresholds));

  const range = max - min || 1;
  const norm = Math.max(0, Math.min(1, (value - min) / range));
  const tone = pickTone(value, thresholds);

  // Semicircle SVG, 200×110, dial sweeps from 180° to 0°.
  const w = 200;
  const h = 110;
  const cx = 100;
  const cy = 100;
  const r = 80;

  const angle = Math.PI * (1 - norm); // 180° → 0°
  const px = cx + r * Math.cos(angle);
  const py = cy - r * Math.sin(angle);

  // Background arc (full semi-circle)
  const bgPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  // Value arc (start at left, sweep to value angle)
  const valuePath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${px} ${py}`;
  // Target tick
  let tickPath: string | null = null;
  if (target != null) {
    const tNorm = Math.max(0, Math.min(1, (target - min) / range));
    const tAngle = Math.PI * (1 - tNorm);
    const tx1 = cx + (r - 6) * Math.cos(tAngle);
    const ty1 = cy - (r - 6) * Math.sin(tAngle);
    const tx2 = cx + (r + 6) * Math.cos(tAngle);
    const ty2 = cy - (r + 6) * Math.sin(tAngle);
    tickPath = `M ${tx1} ${ty1} L ${tx2} ${ty2}`;
  }

  return (
    <figure className="fv-gauge bg-card my-6 inline-flex flex-col items-center rounded-lg border p-4 shadow-sm">
      <svg width={w} height={h} className="block">
        <path
          d={bgPath}
          stroke="var(--muted)"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={valuePath}
          stroke={tone}
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />
        {tickPath && (
          <path
            d={tickPath}
            stroke="var(--foreground)"
            strokeWidth="2"
          />
        )}
        <text
          x={cx}
          y={cy - 14}
          textAnchor="middle"
          className="fill-foreground"
          fontSize="22"
          fontWeight="700"
        >
          {value}
          {unit}
        </text>
        {label && (
          <text
            x={cx}
            y={cy + 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize="10"
          >
            {label}
          </text>
        )}
      </svg>
      {target != null && (
        <div className="text-muted-foreground mt-1 text-[11px]">
          target: <span className="text-foreground tabular-nums">{target}{unit}</span>
        </div>
      )}
    </figure>
  );
}

function pickTone(value: number, thresholds: number[]): string {
  if (thresholds.length === 0) return "var(--primary)";
  const sorted = [...thresholds].sort((a, b) => a - b);
  if (value < sorted[0]) return "#ef4444"; // rose / danger
  if (sorted.length >= 2 && value < sorted[1]) return "#f59e0b"; // amber / warn
  return "#10b981"; // emerald / success
}

function parseThresholds(s: string): number[] {
  return s
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => !Number.isNaN(n));
}

function num(v: unknown, fallback: number): number {
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
