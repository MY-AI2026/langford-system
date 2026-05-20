/**
 * PDF exporter for the registration-module reports.
 *
 * Strategy: build a fully self-contained HTML document (Arabic fonts +
 * RTL + inline CSS), open it in a new window, and trigger the browser's
 * native print dialog so the admin can "Save as PDF". This sidesteps the
 * Arabic-font headaches that plague client-side PDF libraries — every
 * modern browser renders Arabic + RTL perfectly out of the box.
 *
 * Pros: zero new dependencies, perfect Arabic, perfect RTL, identical
 * preview to the printed PDF.
 *
 * Trade-off: requires a user gesture (the print dialog). Acceptable for
 * a back-office admin tool — they're already clicking "Export PDF".
 */

import { ReportResult } from "@/lib/services/reg-report-service";
import { REG_STUDENT_STATUS_LABELS } from "@/lib/registration/constants";

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
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

function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(report: ReportResult): string {
  const fromStr = formatDate(report.range.from);
  const toStr = formatDate(report.range.to);
  const generatedStr = report.generatedAt.toLocaleString("en-GB");
  const currency = escapeHtml(report.totals.currency);

  const studentRows = report.students
    .map(
      (s) => `
      <tr>
        <td>${escapeHtml(s.fullName)}</td>
        <td dir="ltr">${escapeHtml(s.phone)}</td>
        <td>${escapeHtml(s.courseName)}</td>
        <td>${escapeHtml(s.createdByName)}</td>
        <td>${escapeHtml(REG_STUDENT_STATUS_LABELS[s.status]?.ar ?? s.status)}</td>
        <td dir="ltr">${formatNumber(s.courseFee ?? 0)} ${escapeHtml(s.currency)}</td>
        <td dir="ltr"><strong>${formatNumber(s.commissionAmount ?? 0)} ${escapeHtml(s.currency)}</strong></td>
        <td dir="ltr">${formatDate(s.createdAt)}</td>
      </tr>
    `
    )
    .join("");

  const agentRows = report.byAgent
    .map(
      (a) => `
      <tr>
        <td>${escapeHtml(a.agentName)}</td>
        <td>${a.studentCount}</td>
        <td dir="ltr">${formatNumber(a.totalFees)} ${escapeHtml(a.currency)}</td>
        <td dir="ltr"><strong>${formatNumber(a.totalCommission)} ${escapeHtml(a.currency)}</strong></td>
      </tr>
    `
    )
    .join("");

  const courseRows = report.byCourse
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.courseName)}</td>
        <td>${c.studentCount}</td>
        <td dir="ltr">${formatNumber(c.totalFees)} ${escapeHtml(c.currency)}</td>
        <td dir="ltr"><strong>${formatNumber(c.totalCommission)} ${escapeHtml(c.currency)}</strong></td>
      </tr>
    `
    )
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<title>تقرير Langford × Acceptix — ${fromStr} → ${toStr}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

  * { box-sizing: border-box; }
  body {
    font-family: 'Cairo', 'Helvetica Neue', Arial, sans-serif;
    color: #111827;
    margin: 0;
    padding: 24px;
    background: white;
    line-height: 1.5;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 2px solid #ef4444;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  header h1 {
    font-size: 22px;
    margin: 0;
  }
  header .meta {
    font-size: 12px;
    color: #6b7280;
  }
  .range {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 16px;
  }

  .summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  .summary .card {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    background: #f9fafb;
  }
  .summary .card.primary {
    background: #fef2f2;
    border-color: #fecaca;
  }
  .summary .card .label {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 4px;
  }
  .summary .card .value {
    font-size: 20px;
    font-weight: 700;
  }
  .summary .card.primary .value { color: #b91c1c; }

  section { margin-bottom: 28px; page-break-inside: avoid; }
  section h2 {
    font-size: 15px;
    margin: 0 0 8px;
    color: #111827;
    border-right: 4px solid #ef4444;
    padding-right: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead { background: #f3f4f6; }
  th, td {
    text-align: right;
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }
  th { font-weight: 600; color: #374151; }
  tbody tr:nth-child(even) { background: #fafafa; }

  footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 11px;
    color: #6b7280;
    text-align: center;
  }

  @media print {
    body { padding: 12mm; }
    header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .summary .card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<header>
  <h1>تقرير Langford × Acceptix</h1>
  <div class="meta">صدر في ${escapeHtml(generatedStr)}</div>
</header>

<div class="range">الفترة: ${escapeHtml(fromStr)} → ${escapeHtml(toStr)}</div>

<div class="summary">
  <div class="card">
    <div class="label">عدد الطلبة</div>
    <div class="value">${report.totals.studentCount}</div>
  </div>
  <div class="card">
    <div class="label">إجمالي الرسوم</div>
    <div class="value" dir="ltr">${formatNumber(report.totals.totalFees)} ${currency}</div>
  </div>
  <div class="card primary">
    <div class="label">إجمالي العمولة (10%)</div>
    <div class="value" dir="ltr">${formatNumber(report.totals.totalCommission)} ${currency}</div>
  </div>
</div>

<section>
  <h2>ملخص الموظفين</h2>
  <table>
    <thead>
      <tr>
        <th>الموظف</th>
        <th>عدد الطلبة</th>
        <th>إجمالي الرسوم</th>
        <th>إجمالي العمولة</th>
      </tr>
    </thead>
    <tbody>${agentRows || `<tr><td colspan="4" style="text-align:center;color:#6b7280;">لا يوجد</td></tr>`}</tbody>
  </table>
</section>

<section>
  <h2>ملخص الكورسات</h2>
  <table>
    <thead>
      <tr>
        <th>الكورس</th>
        <th>عدد الطلبة</th>
        <th>إجمالي الرسوم</th>
        <th>إجمالي العمولة</th>
      </tr>
    </thead>
    <tbody>${courseRows || `<tr><td colspan="4" style="text-align:center;color:#6b7280;">لا يوجد</td></tr>`}</tbody>
  </table>
</section>

<section>
  <h2>تفاصيل الطلبة</h2>
  <table>
    <thead>
      <tr>
        <th>الاسم</th>
        <th>التليفون</th>
        <th>الكورس</th>
        <th>الموظف</th>
        <th>الحالة</th>
        <th>الرسوم</th>
        <th>العمولة</th>
        <th>التاريخ</th>
      </tr>
    </thead>
    <tbody>${studentRows || `<tr><td colspan="8" style="text-align:center;color:#6b7280;">لا يوجد</td></tr>`}</tbody>
  </table>
</section>

<footer>
  Langford International Institute × Acceptix — تقرير العمولات الشهري
</footer>

<script>
  // Wait for fonts then trigger the print dialog.
  window.addEventListener('load', () => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(() => window.print(), 250));
    } else {
      setTimeout(() => window.print(), 500);
    }
  });
</script>
</body>
</html>`;
}

/**
 * Open the report in a new window and trigger print-to-PDF. Pop-up
 * blockers may stop the new window — caller should surface a friendly
 * toast if `null` comes back.
 */
export function exportReportToPdf(report: ReportResult): boolean {
  const html = buildHtml(report);
  const win = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!win) {
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
