import { join } from "node:path";
import { app } from "electron";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { runMigrations } from "./migrations";

let client: Client | null = null;
let db: LibSQLDatabase<typeof schema> | null = null;

// Single file DB under the OS app-data dir (libsql `file:` URL). Opened
// once at startup; migrations run before any IPC handler can touch it.
export async function initDb(): Promise<void> {
  const file = join(app.getPath("userData"), "library.db");
  client = createClient({ url: `file:${file}` });
  await runMigrations(client);
  db = drizzle(client, { schema });
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!db) throw new Error("DB not initialized — call initDb() first");
  return db;
}
