import { useEffect, useMemo, useState } from "react";
import type { ViewerProps } from "@filemark/core";
import { Mermaid } from "@filemark/mdx";

/**
 * Database schema viewer.
 *
 * Delegates parsing to `db-schema-toolkit` (by maxgfr), which handles
 * SQL (Postgres / MySQL / SQLite / Supabase / CockroachDB / ClickHouse /
 * BigQuery / Snowflake / MariaDB), Prisma, DBML, Drizzle, TypeORM,
 * Sequelize, MikroORM, and Kysely. The parsed `Diagram` is exported to
 * a Mermaid `erDiagram` and handed off to our existing Mermaid renderer
 * (which already ships pan / zoom / fullscreen).
 *
 * The toolkit is lazy-imported so files that don't render as schemas
 * (most files) don't pay the bundle cost.
 */
export function SchemaViewer({ content, file }: ViewerProps) {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "ready"; mermaid: string; tableCount: number; relCount: number; databaseType?: string }
    | { phase: "error"; message: string }
  >({ phase: "loading" });

  // Key on content so edits to the active file re-parse.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [toolkit, exportMod] = await Promise.all([
          import("db-schema-toolkit"),
          import("db-schema-toolkit/export"),
        ]);
        const filename = file.path || file.name || `schema.${file.ext}`;
        const diagram = toolkit.parseSchemaFile(content, filename);
        if (cancelled) return;
        if (!diagram || !diagram.tables || diagram.tables.length === 0) {
          setState({
            phase: "error",
            message:
              "Couldn't detect any tables in this file. If this is a schema file the parser didn't recognize, try renaming to .sql / .prisma / .dbml explicitly.",
          });
          return;
        }
        const mermaid = exportMod.exportDiagramToMermaid(diagram);
        setState({
          phase: "ready",
          mermaid,
          tableCount: diagram.tables.length,
          relCount: diagram.relationships?.length ?? 0,
          databaseType: diagram.databaseType,
        });
      } catch (e) {
        if (cancelled) return;
        setState({ phase: "error", message: String((e as Error)?.message ?? e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [content, file.path, file.name, file.ext]);

  const header = useMemo(() => {
    if (state.phase !== "ready") return null;
    return (
      <div className="fv-schema-toolbar">
        <span className="fv-schema-tag">{file.ext.toUpperCase()}</span>
        {state.databaseType && (
          <span className="fv-schema-pill">{state.databaseType}</span>
        )}
        <span className="fv-schema-meta">
          {state.tableCount} table{state.tableCount === 1 ? "" : "s"} ·{" "}
          {state.relCount} relation{state.relCount === 1 ? "" : "s"}
        </span>
      </div>
    );
  }, [state, file.ext]);

  if (state.phase === "loading") {
    return <div className="fv-schema-loading">Parsing schema…</div>;
  }
  if (state.phase === "error") {
    return (
      <div className="fv-schema-error">
        <div className="fv-schema-error-title">Couldn't render schema</div>
        <pre className="fv-schema-error-body">{state.message}</pre>
      </div>
    );
  }

  return (
    <div className="fv-schema-root">
      {header}
      <Mermaid source={state.mermaid} />
    </div>
  );
}
