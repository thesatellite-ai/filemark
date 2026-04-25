import type { ReactNode } from "react";
import { TONE_CLASS, type StatusTone } from "@filemark/datagrid";

/**
 * Badge — tiny inline tone pill.
 *
 *     <Badge>default</Badge>
 *     <Badge tone="warn">beta</Badge>
 *     <Badge tone="success">stable</Badge>
 *
 * Six tones: default · info · success · warn · danger · muted. Compact
 * size meant to sit next to a heading or a feature name.
 */
export function Badge(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const toneRaw = String(props.tone ?? "muted").trim().toLowerCase();
  const tone: StatusTone =
    toneRaw === "info" ||
    toneRaw === "success" ||
    toneRaw === "warn" ||
    toneRaw === "danger" ||
    toneRaw === "muted"
      ? toneRaw
      : "muted";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide align-middle",
        TONE_CLASS[tone],
      ].join(" ")}
    >
      {props.children}
    </span>
  );
}
