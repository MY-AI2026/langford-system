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
