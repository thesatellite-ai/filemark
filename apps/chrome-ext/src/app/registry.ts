import { MDXViewer } from "@filemark/mdx";
import { JSONViewer } from "@filemark/json";
import { SchemaViewer } from "@filemark/schema";
import { CSVViewer } from "@filemark/csv";
import type { Renderer } from "@filemark/core";

const EXT_MAP: Record<string, Renderer> = {
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

export function getRenderer(ext: string): Renderer | null {
  return EXT_MAP[ext.toLowerCase().replace(/^\./, "")] ?? null;
}

export function isSupported(ext: string): boolean {
  return getRenderer(ext) !== null;
}

export const SUPPORTED_EXTS = Object.keys(EXT_MAP);
