import type { ReactNode } from "react";
import { collectMarkers, isMarker } from "./markerWalk";

/**
 * EnvVarsTable — list every env var your app reads, with type, default,
 * required-flag, secret-mask flag.
 *
 *     <EnvVarsTable>
 *
 *     <Env name="DATABASE_URL" type="url" required secret>
 *     Postgres connection string. Format `postgres://user:pass@host/db`.
 *     </Env>
 *
 *     <Env name="LOG_LEVEL" type="string" default="info">
 *     One of `debug` / `info` / `warn` / `error`.
 *     </Env>
 *
 *     </EnvVarsTable>
 */
export function EnvVarsTable(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const rows = collectMarkers(props.children, isMarker("Env", "env")).map(
    (el) => {
      const p = el.props as Record<string, unknown>;
      return {
        name: asString(p.name),
        type: asString(p.type) || "string",
        defaultV: asString(p.default),
        required: p.required !== undefined && p.required !== false,
        secret: p.secret !== undefined && p.secret !== false,
        body: (p as { children?: ReactNode }).children,
      };
    }
  );

  if (rows.length === 0) {
    return (
      <div className="bg-muted/30 my-4 rounded-md border p-4 text-sm">
        <strong>EnvVarsTable</strong> — needs `&lt;Env&gt;` rows.
      </div>
    );
  }

  return (
    <div className="fv-envvars bg-card my-6 overflow-x-auto rounded-lg border">
      <table className="w-full text-[13px]">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">
              Variable
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">
              Type
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">
              Default
            </th>
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2 align-top">
                <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-[12px] font-semibold">
                  {r.name}
                </code>
                <div className="mt-1 flex gap-1">
                  {r.required && (
                    <span className="text-rose-600 bg-rose-500/10 inline-flex rounded-full border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                      required
                    </span>
                  )}
                  {r.secret && (
                    <span className="text-amber-600 bg-amber-500/10 inline-flex rounded-full border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase">
                      🔒 secret
                    </span>
                  )}
                </div>
              </td>
              <td className="text-muted-foreground px-3 py-2 align-top font-mono text-[11px]">
                {r.type}
              </td>
              <td className="text-muted-foreground px-3 py-2 align-top font-mono text-[11px]">
                {r.defaultV ? (
                  r.secret ? (
                    <span aria-label="Secret">••••••</span>
                  ) : (
                    r.defaultV
                  )
                ) : (
                  <span className="opacity-50">—</span>
                )}
              </td>
              <td className="px-3 py-2 align-top">{r.body}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Env(_p: Record<string, unknown>) {
  return null;
}
Env.displayName = "Env";

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
