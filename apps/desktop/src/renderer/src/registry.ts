import type { ComponentType } from "react";
import type { ViewerProps } from "@filemark/core";
import { MDXViewer } from "@filemark/mdx";
import { JSONViewer } from "@filemark/json";
import { CSVViewer } from "@filemark/csv";
import { SchemaViewer } from "@filemark/schema";

// Mirrors apps/chrome-ext/src/app/registry.ts — ext → renderer, no
// plugin ceremony. Phase 4: all shipped viewers wired.
const EXT_MAP: Record<string, ComponentType<ViewerProps>> = {
  md: MDXViewer,
  mdx: MDXViewer,
  markdown: MDXViewer,
  json: JSONViewer,
  jsonc: JSONViewer,
  csv: CSVViewer,
  tsv: CSVViewer,
  sql: SchemaViewer,
  prisma: SchemaViewer,
  dbml: SchemaViewer,
};

export function getRenderer(ext: string): ComponentType<ViewerProps> | null {
  return EXT_MAP[ext.toLowerCase()] ?? null;
}
