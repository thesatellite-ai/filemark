import type { CellValue, Column, ColumnType, Row } from "./types";

const SAMPLE = 50;

type ColSeed = Pick<Column, "key" | "label"> & { hidden?: boolean };

export function inferTypes(
  seeds: ColSeed[],
  rows: Row[],
  hints?: Record<string, ColumnType>,
): Column[] {
  const sample = rows.slice(0, SAMPLE);
  return seeds.map((s) => {
    const forced = hints?.[s.key];
    if (forced) return { ...s, type: forced };
    const values = sample
      .map((r) => r[s.key])
      .filter((v): v is CellValue => v !== null && v !== undefined && v !== "");
    return { ...s, type: detect(values) };
  });
}

function detect(values: CellValue[]): ColumnType {
  if (!values.length) return "string";
  let allNumeric = true;
  let allBool = true;
  let allDate = true;
  for (const v of values) {
    const s = String(v);
    if (allNumeric && !NUM_RE.test(s)) allNumeric = false;
    if (allBool && !isBool(s)) allBool = false;
    if (allDate && !isDate(s)) allDate = false;
    if (!allNumeric && !allBool && !allDate) break;
  }
  if (allBool) return "bool";
  if (allNumeric) return "number";
  if (allDate) return "date";
  return "string";
}

const NUM_RE = /^-?(\d+|\d{1,3}(,\d{3})+)(\.\d+)?([eE][+-]?\d+)?%?$/;

function isBool(s: string): boolean {
  const low = s.toLowerCase();
  return low === "true" || low === "false" || low === "yes" || low === "no";
}

function isDate(s: string): boolean {
  if (s.length < 4) return false;
  // ISO-ish or common local formats; let Date do the heavy lifting
  if (!/\d/.test(s)) return false;
  const t = Date.parse(s);
  return !Number.isNaN(t);
}
