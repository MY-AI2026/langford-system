/**
 * Full-system data export for backup / migration (admin only).
 *
 * Pulls the top-level collections via the Firestore REST helpers and offers
 * two outputs:
 *   • Excel workbook — one flattened sheet per collection (human-readable)
 *   • JSON file      — raw dump of every collection (machine restore)
 *
 * Subcollections (payments, enrollments, activityLog, …) live under each
 * student; a per-student fan-out would be an N+1 storm, so this export covers
 * the flat collections that back the app's core records. Subcollection backup
 * can be layered on later behind an explicit "deep export" toggle.
 */

import * as XLSX from "xlsx";
import { fetchCollection } from "@/lib/firebase/rest-helpers";

// Flat, single-query collections safe to export in one pass each.
export const EXPORTABLE_COLLECTIONS = [
  "students",
  "courses",
  "users",
  "schedules",
  "summerClubStudents",
  "embassyPayments",
] as const;

export type ExportBundle = Record<string, Record<string, unknown>[]>;

export async function fetchAllCollections(): Promise<ExportBundle> {
  const entries = await Promise.all(
    EXPORTABLE_COLLECTIONS.map(async (name) => {
      try {
        const rows = (await fetchCollection(name)) as Record<string, unknown>[];
        return [name, rows] as const;
      } catch (e) {
        console.error(`[data-export] failed to fetch ${name}:`, e);
        return [name, []] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

// Turn nested/date values into flat cell-friendly strings for a spreadsheet.
function cellValue(value: unknown): string | number {
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function sheetFromRows(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return XLSX.utils.aoa_to_sheet([["(no records)"]]);
  }
  // Union of keys across all rows so no field is dropped.
  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );
  const header = keys;
  const body = rows.map((row) => keys.map((k) => cellValue(row[k])));
  return XLSX.utils.aoa_to_sheet([header, ...body]);
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build a multi-sheet Excel workbook and trigger a download. */
export function bundleToExcel(bundle: ExportBundle, filenameBase = "langford-backup") {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(bundle)) {
    // Sheet names are capped at 31 chars by the spec.
    const sheetName = name.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), sheetName);
  }
  XLSX.writeFile(wb, `${filenameBase}_${stamp()}.xlsx`);
}

/** Serialise the whole bundle to a downloadable JSON file. */
export function bundleToJson(bundle: ExportBundle, filenameBase = "langford-backup") {
  const payload = {
    exportedAt: new Date().toISOString(),
    collections: bundle,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}_${stamp()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function countRecords(bundle: ExportBundle): number {
  return Object.values(bundle).reduce((sum, rows) => sum + rows.length, 0);
}
