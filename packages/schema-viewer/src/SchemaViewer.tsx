import { useEffect, useMemo, useState } from "react";
import type { ViewerProps } from "@filemark/core";
import { Mermaid, CodeBlock } from "@filemark/mdx";

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
    | { phase: "fallback"; message: string }
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
            phase: "fallback",
            message: "No tables detected — showing raw source.",
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
        setState({
          phase: "fallback",
          message: `Couldn't parse schema (${String((e as Error)?.message ?? e)}) — showing raw source.`,
        });
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
  if (state.phase === "fallback") {
    const lang = extToLang(file.ext);
    return (
      <div className="fv-schema-root">
        <div className="fv-schema-notice" role="status">
          <span className="fv-schema-notice-dot" aria-hidden="true" />
          <span>{state.message}</span>
        </div>
        <CodeBlock className={`language-${lang}`}>{content}</CodeBlock>
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

function extToLang(ext: string): string {
  const e = (ext || "").toLowerCase().replace(/^\./, "");
  if (e === "sql") return "sql";
  if (e === "prisma") return "prisma";
  if (e === "dbml") return "dbml";
  return "text";
}
