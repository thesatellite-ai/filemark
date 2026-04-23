import Papa from "papaparse";
import type {
  CellValue,
  Column,
  ColumnType,
  ColumnTypeSpec,
  DataGridTable,
  Row,
} from "./types";
import { inferTypes } from "./inferTypes";

export interface ParseCSVInput {
  text: string;
  delimiter?: string;
  header?: boolean;
  typeSpecs?: Record<string, ColumnTypeSpec>;
  alignHints?: Record<string, NonNullable<Column["align"]>>;
  hide?: string[];
}

export function parseCSV(input: ParseCSVInput): DataGridTable {
  const {
    text,
    delimiter,
    header = true,
    typeSpecs = {},
    alignHints,
    hide,
  } = input;

  const cleaned = text.replace(/^﻿/, "");

  const result = Papa.parse<string[]>(cleaned, {
    delimiter: delimiter ?? "",
    skipEmptyLines: "greedy",
    header: false,
    dynamicTyping: false,
    transform: (v) => v,
  });

  const data = result.data.filter(
    (r): r is string[] => Array.isArray(r) && r.length > 0,
  );

  if (!data.length) return { columns: [], rows: [] };

  let headerRow: string[];
  let bodyRows: string[][];
  if (header) {
    headerRow = data[0]!;
    bodyRows = data.slice(1);
  } else {
    const width = Math.max(...data.map((r) => r.length));
    headerRow = Array.from({ length: width }, (_, i) => `col_${i}`);
    bodyRows = data;
  }

  const hideSet = new Set(hide ?? []);
  const keys = headerRow.map((h, i) => {
    const key = (h ?? "").trim() || `col_${i}`;
    return { key, label: key, index: i, hidden: hideSet.has(key) };
  });

  const rawRows: Row[] = bodyRows.map((cells) => {
    const row: Row = {};
    for (const { key, index } of keys) {
      const raw = cells[index];
      row[key] = raw === undefined || raw === "" ? null : raw;
    }
    return row;
  });

  const typeHints = Object.fromEntries(
    Object.entries(typeSpecs).map(([k, v]) => [k, v.type]),
  );

  const inferredColumns = inferTypes(
    keys.map(({ key, label, hidden }) => ({ key, label, hidden })),
    rawRows,
    typeHints,
  );

  const columns: Column[] = inferredColumns.map((c) => ({
    ...c,
    align: alignHints?.[c.key] ?? defaultAlign(c.type),
    args: typeSpecs[c.key]?.args,
  }));

  const rows: Row[] = rawRows.map((r) => {
    const out: Row = {};
    for (const c of columns) {
      out[c.key] = coerce(r[c.key], c.type);
    }
    return out;
  });

  return { columns, rows };
}

function defaultAlign(type: ColumnType): Column["align"] {
  if (
    type === "number" ||
    type === "currency" ||
    type === "percentage" ||
    type === "filesize"
  ) {
    return "right";
  }
  if (
    type === "bool" ||
    type === "checkmark" ||
    type === "checkbox" ||
    type === "rating" ||
    type === "color"
  ) {
    return "center";
  }
  return "left";
}

function coerce(v: CellValue | undefined, type: ColumnType): CellValue {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  const s = String(v);
  if (
    type === "number" ||
    type === "currency" ||
    type === "percentage" ||
    type === "filesize" ||
    type === "progress" ||
    type === "rating"
  ) {
    const n = Number(s.replace(/[$,%\s_]/g, ""));
    return Number.isFinite(n) ? n : s;
  }
  if (type === "bool" || type === "checkmark" || type === "checkbox") {
    const low = s.toLowerCase();
    if (low === "true" || low === "yes" || low === "1") return true;
    if (low === "false" || low === "no" || low === "0") return false;
    return s;
  }
  return s;
}
