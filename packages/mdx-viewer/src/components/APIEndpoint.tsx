import type { ReactNode } from "react";
import { useState } from "react";

/**
 * APIEndpoint — REST endpoint reference card.
 *
 *     <APIEndpoint method="POST" path="/v1/orders" auth="bearer" title="Create order">
 *
 *     ### Body
 *
 *     ```json
 *     { "items": [{ "sku": "ABC", "qty": 1 }] }
 *     ```
 *
 *     ### Response 201
 *
 *     ```json
 *     { "id": "ord_…", "status": "pending" }
 *     ```
 *
 *     </APIEndpoint>
 *
 * Method chip (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS), monospace
 * path, optional auth chip, optional title. Body content is plain
 * markdown — author writes whatever sections they want with H3s
 * (Body / Response / Headers / Errors / Examples).
 *
 * Includes a copy-curl button that builds a `curl` string from
 * method + path + a `base=` URL prop.
 */

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

const METHOD_TONE: Record<Method, string> = {
  GET: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  POST: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  PUT: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  PATCH: "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  DELETE: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  HEAD: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
  OPTIONS: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30",
};

export function APIEndpoint(
  props: Record<string, unknown> & { children?: ReactNode }
) {
  const method = normalizeMethod(props.method);
  const path = asString(props.path) || "/";
  const auth = asString(props.auth);
  const title = asString(props.title);
  const base = asString(props.base);
  const fullUrl = base ? `${base.replace(/\/+$/, "")}${path}` : path;
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    const curl = `curl -X ${method} '${fullUrl}'${
      auth === "bearer" ? " \\\n  -H 'Authorization: Bearer YOUR_TOKEN'" : ""
    }${
      method === "POST" || method === "PUT" || method === "PATCH"
        ? " \\\n  -H 'Content-Type: application/json' \\\n  -d '{}'"
        : ""
    }`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(curl).then(
        () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        },
        () => {}
      );
    }
  };

  return (
    <section className="bg-card my-6 overflow-hidden rounded-lg border shadow-sm">
      <header className="border-b p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={[
              "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
              METHOD_TONE[method],
            ].join(" ")}
          >
            {method}
          </span>
          <code className="text-foreground bg-muted/40 flex-1 truncate rounded px-2 py-0.5 font-mono text-[13px]">
            {path}
          </code>
          {auth && (
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              🔒 {auth}
            </span>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/60 ml-auto inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] transition-colors"
            title="Copy as curl"
          >
            {copied ? "✓ copied" : "copy curl"}
          </button>
        </div>
        {title && (
          <h3 className="text-foreground mt-2 mb-0 text-[15px] font-semibold leading-tight">
            {title}
          </h3>
        )}
        {base && (
          <div className="text-muted-foreground mt-1 font-mono text-[10px]">
            base: {base}
          </div>
        )}
      </header>
      <div className="fv-apiendpoint-body p-4 text-sm leading-relaxed">
        {props.children}
      </div>
    </section>
  );
}

function normalizeMethod(v: unknown): Method {
  const s = String(v ?? "GET").trim().toUpperCase();
  if (
    s === "GET" ||
    s === "POST" ||
    s === "PUT" ||
    s === "PATCH" ||
    s === "DELETE" ||
    s === "HEAD" ||
    s === "OPTIONS"
  )
    return s;
  return "GET";
}

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return "";
}
