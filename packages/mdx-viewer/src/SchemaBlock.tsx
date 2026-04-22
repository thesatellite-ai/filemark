import { useEffect, useState } from "react";
import { Mermaid } from "./Mermaid";

/**
 * Inline schema block inside markdown / MDX. Triggered by fences:
 *
 *   ```schema    — auto-detect format (SQL / Prisma / DBML / ORM files)
 *   ```prisma    — explicit Prisma schema
 *   ```dbml      — explicit DBML
 *
 * Parses via `db-schema-toolkit` (lazy-imported so docs without schema
 * blocks don't pay the bundle cost), exports the diagram to Mermaid
 * `erDiagram`, and hands it to our existing `<Mermaid>` component for
 * pan / zoom / fullscreen for free.
 *
 * Falls back to a styled error card when the block can't be parsed.
 */
export function SchemaBlock({
  source,
  lang,
}: {
  source: string;
  lang: "schema" | "prisma" | "dbml";
}) {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "ready"; mermaid: string }
    | { phase: "error"; message: string }
  >({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [toolkit, exp] = await Promise.all([
          import("db-schema-toolkit"),
          import("db-schema-toolkit/export"),
        ]);
        // `parseSchemaFile` dispatches by detected format. We give it a
        // synthetic filename so the auto-detect picks the right parser
        // even for the ambiguous `schema` fence — which is effectively
        // "let the toolkit figure it out".
        const filename =
          lang === "prisma"
            ? "block.prisma"
            : lang === "dbml"
              ? "block.dbml"
              : "block.sql";
        const diagram = toolkit.parseSchemaFile(source, filename);
        if (cancelled) return;
        if (!diagram || !diagram.tables || diagram.tables.length === 0) {
          setState({
            phase: "error",
            message:
              "No tables detected. Use a fenced block with `schema`, `prisma`, or `dbml` and valid schema source.",
          });
          return;
        }
        const mermaid = exp.exportDiagramToMermaid(diagram);
        setState({ phase: "ready", mermaid });
      } catch (e) {
        if (cancelled) return;
        setState({
          phase: "error",
          message: String((e as Error)?.message ?? e),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, lang]);

  if (state.phase === "loading") {
    return <div className="fv-mermaid-loading">Parsing schema…</div>;
  }
  if (state.phase === "error") {
    return (
      <div className="fv-mermaid-error">
        <div className="fv-mermaid-error-title">
          Couldn't parse the {lang} block
        </div>
        <pre className="fv-mermaid-error-body">{state.message}</pre>
        <details>
          <summary>Source</summary>
          <pre>{source}</pre>
        </details>
      </div>
    );
  }
  return <Mermaid source={state.mermaid} />;
}
