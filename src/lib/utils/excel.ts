/**
 * Excel export helpers (XLSX). Uses SheetJS — works fully client-side,
 * no server roundtrip, opens the saved file in Excel / Numbers / Google Sheets.
 *
 * Why both xlsx + csv: Excel renders Arabic + UTF-8 natively from .xlsx but
 * frequently mojibake'd CSV without the BOM. CSV is kept as a fallback for
 * older spreadsheet apps.
 */

import * as XLSX from "xlsx";

export interface ExcelColumn<T> {
  /** Header label (Arabic supported) */
  label: string;
  /** Function that extracts the value from a row */
  get: (row: T) => string | number | boolean | null | undefined;
  /** Optional column width (in characters) */
  width?: number;
}

export function exportToExcel<T>(opts: {
  filename: string; // without extension
  sheetName?: string;
  columns: ExcelColumn<T>[];
  rows: T[];
}): void {
  const headers = opts.columns.map((c) => c.label);
  const dataRows = opts.rows.map((row) =>
    opts.columns.map((col) => {
      const v = col.get(row);
      return v === undefined || v === null ? "" : v;
    })
  );

  const wsData = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = opts.columns.map((c) => ({ wch: c.width ?? 18 }));

  // Right-to-left sheet for Arabic-first content
  ws["!sheetView"] = { RTL: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName ?? "Sheet1");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${opts.filename}_${stamp}.xlsx`);
}

// ─── Import ──────────────────────────────────────────────────────────────────

/** A parsed row keyed by the header label, with every cell coerced to string. */
export type ParsedRow = Record<string, string>;

/**
 * Read the first sheet of an uploaded workbook (xlsx / xls / csv) into an
 * array of header-keyed string rows. Empty cells become "". Header keys are
 * trimmed but kept verbatim (Arabic supported) so callers can map columns.
 */
export async function parseWorkbookRows(file: File): Promise<ParsedRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) return [];
  const ws = wb.Sheets[firstSheetName];

  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false, // format everything as display strings (keeps phone leading zeros)
  });

  return raw.map((row) => {
    const out: ParsedRow = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.trim()] = value === null || value === undefined ? "" : String(value).trim();
    }
    return out;
  });
}

/**
 * Pick the first matching column value from a parsed row, trying each of the
 * given header aliases (case-insensitive). Returns "" when none match.
 */
export function pickColumn(row: ParsedRow, aliases: string[]): string {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const target = alias.trim().toLowerCase();
    const hit = entries.find(([k]) => k.trim().toLowerCase() === target);
    if (hit && hit[1]) return hit[1];
  }
  return "";
}
