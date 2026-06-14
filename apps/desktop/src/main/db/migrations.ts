import type { Client } from "@libsql/client";

// Linear, forward-only migration runner keyed on SQLite's PRAGMA
// user_version. Deliberately hand-rolled DDL instead of drizzle-kit
// codegen: the generated-migration approach couples the build to a
// codegen step that unit tests skip (see global rule on codegen-driven
// libs). Each entry is the SQL to advance from version i to i+1; the
// runner applies only the unapplied tail, in order, in one transaction.
const MIGRATIONS: string[] = [
  // v0 -> v1: StorageAdapter backing + Phase 3 baseline tables.
  `
  CREATE TABLE IF NOT EXISTS kv (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS projects (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    root_path      TEXT NOT NULL,
    added_at       INTEGER NOT NULL DEFAULT (unixepoch()),
    last_opened_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS files (
    id             TEXT PRIMARY KEY,
    project_id     TEXT REFERENCES projects(id),
    rel_path       TEXT NOT NULL,
    ext            TEXT NOT NULL,
    last_opened_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
  `,
];

export async function runMigrations(client: Client): Promise<number> {
  const cur = Number(
    (await client.execute("PRAGMA user_version")).rows[0]?.user_version ?? 0,
  );
  if (cur >= MIGRATIONS.length) return cur;

  for (let v = cur; v < MIGRATIONS.length; v++) {
    const stmts = MIGRATIONS[v]
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    await client.batch(stmts, "write");
    // PRAGMA can't be parameterized; v+1 is a trusted integer literal.
    await client.execute(`PRAGMA user_version = ${v + 1}`);
  }
  return MIGRATIONS.length;
}
