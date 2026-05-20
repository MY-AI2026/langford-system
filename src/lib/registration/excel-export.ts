/**
 * Excel exporter for the Acceptix registration reports.
 *
 * Three sheets per workbook:
 *   1. Student Details — row per regStudent (name, phone, course, agent, fee, commission, date)
 *   2. Agent Summary   — per-agent aggregate (count, fees, commission)
 *   3. Course Summary  — per-course aggregate (count, fees, commission)
 *
 * LTR English sheets — column widths chosen to look right out of the box
 * in Excel / Numbers / Google Sheets. Uses the SheetJS (xlsx) dep that's
 * already in the main app.
 */

import * as XLSX from "xlsx";
import { ReportResult } from "@/lib/services/reg-report-service";
import { REG_STUDENT_STATUS_LABELS } from "@/lib/registration/constants";

function sheetFromAOA(data: (string | number)[][], colWidths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  return ws;
}

function formatDate(value: unknown): string {
  if (!value) return "";
  let d: Date;
  if (value instanceof Date) d = value;
  else if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    d = (value as { toDate: () => Date }).toDate();
  } else if (typeof value === "string") {
    d = new Date(value);
  } else {
    return "";
  }
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function exportReportToExcel(report: ReportResult, filenameBase = "acceptix-report") {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Student details ─────────────────────────────────────────────
  const studentHeader = [
    "Student Name",
    "Phone",
    "Email",
    "Course",
    "Agent",
    "Status",
    "Fee",
    "Commission",
    "Currency",
    "Registration Date",
  ];
  const studentRows = report.students.map((s) => [
    s.fullName ?? "",
    s.phone ?? "",
    s.email ?? "",
    s.courseName ?? "",
    s.createdByName ?? "",
    REG_STUDENT_STATUS_LABELS[s.status]?.en ?? s.status,
    s.courseFee ?? 0,
    s.commissionAmount ?? 0,
    s.currency ?? "",
    formatDate(s.createdAt),
  ]);
  // Totals footer
  const studentFooter = [
    "Total",
    "",
    "",
    "",
    "",
    "",
    report.totals.totalFees,
    report.totals.totalCommission,
    report.totals.currency,
    "",
  ];
  const ws1 = sheetFromAOA(
    [studentHeader, ...studentRows, [], studentFooter],
    [22, 14, 24, 24, 18, 12, 12, 12, 8, 14]
  );
  XLSX.utils.book_append_sheet(wb, ws1, "Student Details");

  // ── Sheet 2: Agent breakdown ────────────────────────────────────────────
  const agentHeader = ["Agent", "Students", "Total Fees", "Total Commission", "Currency"];
  const agentRows = report.byAgent.map((a) => [
    a.agentName,
    a.studentCount,
    a.totalFees,
    a.totalCommission,
    a.currency,
  ]);
  const ws2 = sheetFromAOA(
    [agentHeader, ...agentRows],
    [22, 12, 16, 16, 8]
  );
  XLSX.utils.book_append_sheet(wb, ws2, "Agent Summary");

  // ── Sheet 3: Course breakdown ───────────────────────────────────────────
  const courseHeader = ["Course", "Students", "Total Fees", "Total Commission", "Currency"];
  const courseRows = report.byCourse.map((c) => [
    c.courseName,
    c.studentCount,
    c.totalFees,
    c.totalCommission,
    c.currency,
  ]);
  const ws3 = sheetFromAOA(
    [courseHeader, ...courseRows],
    [28, 12, 16, 16, 8]
  );
  XLSX.utils.book_append_sheet(wb, ws3, "Course Summary");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenameBase}_${stamp}.xlsx`);
}
