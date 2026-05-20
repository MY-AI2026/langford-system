/**
 * Excel exporter for the registration-module reports.
 *
 * Three sheets in one workbook:
 *   1. تفاصيل الطلبة  — row per regStudent (name, phone, course, agent, fee, commission, date)
 *   2. ملخص الموظفين — per-agent aggregate (count, fees, commission)
 *   3. ملخص الكورسات — per-course aggregate (count, fees, commission)
 *
 * RTL sheets, Arabic-first headers, column widths chosen to look right
 * out-of-the-box in Excel / Numbers / Google Sheets. Uses the SheetJS
 * (xlsx) dep that's already in the main app.
 */

import * as XLSX from "xlsx";
import { ReportResult } from "@/lib/services/reg-report-service";
import { REG_STUDENT_STATUS_LABELS } from "@/lib/registration/constants";

function rtlSheetFromAOA(data: (string | number)[][], colWidths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  ws["!sheetView"] = { RTL: true };
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
    "اسم الطالب",
    "التليفون",
    "الإيميل",
    "الكورس",
    "الموظف",
    "الحالة",
    "الرسوم",
    "العمولة",
    "العملة",
    "تاريخ التسجيل",
  ];
  const studentRows = report.students.map((s) => [
    s.fullName ?? "",
    s.phone ?? "",
    s.email ?? "",
    s.courseName ?? "",
    s.createdByName ?? "",
    REG_STUDENT_STATUS_LABELS[s.status]?.ar ?? s.status,
    s.courseFee ?? 0,
    s.commissionAmount ?? 0,
    s.currency ?? "",
    formatDate(s.createdAt),
  ]);
  // Totals footer
  const studentFooter = [
    "الإجمالي",
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
  const ws1 = rtlSheetFromAOA(
    [studentHeader, ...studentRows, [], studentFooter],
    [22, 14, 24, 24, 18, 12, 12, 12, 8, 14]
  );
  XLSX.utils.book_append_sheet(wb, ws1, "تفاصيل الطلبة");

  // ── Sheet 2: Agent breakdown ────────────────────────────────────────────
  const agentHeader = ["الموظف", "عدد الطلبة", "إجمالي الرسوم", "إجمالي العمولة", "العملة"];
  const agentRows = report.byAgent.map((a) => [
    a.agentName,
    a.studentCount,
    a.totalFees,
    a.totalCommission,
    a.currency,
  ]);
  const ws2 = rtlSheetFromAOA(
    [agentHeader, ...agentRows],
    [22, 12, 16, 16, 8]
  );
  XLSX.utils.book_append_sheet(wb, ws2, "ملخص الموظفين");

  // ── Sheet 3: Course breakdown ───────────────────────────────────────────
  const courseHeader = ["الكورس", "عدد الطلبة", "إجمالي الرسوم", "إجمالي العمولة", "العملة"];
  const courseRows = report.byCourse.map((c) => [
    c.courseName,
    c.studentCount,
    c.totalFees,
    c.totalCommission,
    c.currency,
  ]);
  const ws3 = rtlSheetFromAOA(
    [courseHeader, ...courseRows],
    [28, 12, 16, 16, 8]
  );
  XLSX.utils.book_append_sheet(wb, ws3, "ملخص الكورسات");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${filenameBase}_${stamp}.xlsx`);
}
