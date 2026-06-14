import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// `kv` backs the StorageAdapter — the renderer's StorageAdapter contract
// is a plain async key/value store (mirrors chrome-ext idb-keyval, whose
// KEYS are lib:files / lib:recent / lib:tabs / lib:ui / lib:theme / …).
// Backing those with one table = true parity with the extension's
// persistence model; the structured tables below are the Phase 3+
// baseline (projects/files), laid down now so migrations stay linear.
export const kv = sqliteTable("kv", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // JSON string
  updatedAt: integer("updated_at")
    .notNull()
    .default(sql`(unixepoch())`),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  rootPath: text("root_path").notNull(), // absolute — Electron has real paths
  addedAt: integer("added_at").notNull().default(sql`(unixepoch())`),
  lastOpenedAt: integer("last_opened_at"),
});

export const files = sqliteTable("files", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  relPath: text("rel_path").notNull(),
  ext: text("ext").notNull(),
  lastOpenedAt: integer("last_opened_at"),
});

export type KvRow = typeof kv.$inferSelect;
