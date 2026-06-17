/**
 * PDF exporter for Acceptix registration reports.
 *
 * Strategy: build a fully self-contained HTML document (English, LTR,
 * dual-brand header with the Acceptix + Langford logos), open it in a new
 * window, and trigger the browser's native print dialog so the admin can
 * "Save as PDF". This sidesteps the Arabic/Latin-font headaches that
 * plague client-side PDF libraries — every modern browser renders
 * print-to-PDF perfectly.
 */

import { ReportResult } from "@/lib/services/reg-report-service";
import { commissionStatusOf } from "@/lib/services/reg-student-service";
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

function buildHtml(report: ReportResult, origin: string): string {
  const fromStr = formatDate(report.range.from);
  const toStr = formatDate(report.range.to);
  const generatedStr = report.generatedAt.toLocaleString("en-GB");
  const currency = escapeHtml(report.totals.currency);

  // Absolute URLs so the logos render when the doc lives in a fresh
  // pop-up window (relative `/acceptix-logo.png` would resolve against
  // about:blank otherwise).
  const acceptixLogo = `${origin}/acceptix-logo.png`;
  const langfordLogo = `${origin}/logo.png`;

  const studentRows = report.students
    .map((s) => {
      const disbursed = commissionStatusOf(s) === "disbursed";
      return `
      <tr>
        <td>${escapeHtml(s.fullName)}</td>
        <td>${escapeHtml(s.phone)}</td>
        <td>${escapeHtml(s.courseName)}</td>
        <td>${escapeHtml(s.createdByName)}</td>
        <td>${escapeHtml(REG_STUDENT_STATUS_LABELS[s.status]?.en ?? s.status)}</td>
        <td class="num">${formatNumber(s.courseFee ?? 0)} ${escapeHtml(s.currency)}</td>
        <td class="num"><strong>${formatNumber(s.commissionAmount ?? 0)} ${escapeHtml(s.currency)}</strong></td>
        <td><span class="${disbursed ? "pill paid" : "pill due"}">${disbursed ? "Disbursed" : "Pending"}</span></td>
        <td>${formatDate(s.createdAt)}</td>
      </tr>
    `;
    })
    .join("");

  const agentRows = report.byAgent
    .map(
      (a) => `
      <tr>
        <td>${escapeHtml(a.agentName)}</td>
        <td class="num">${a.studentCount}</td>
        <td class="num">${formatNumber(a.totalFees)} ${escapeHtml(a.currency)}</td>
        <td class="num"><strong>${formatNumber(a.totalCommission)} ${escapeHtml(a.currency)}</strong></td>
        <td class="num">${formatNumber(a.disbursedCommission)} ${escapeHtml(a.currency)}</td>
        <td class="num"><strong>${formatNumber(a.outstandingCommission)} ${escapeHtml(a.currency)}</strong></td>
      </tr>
    `
    )
    .join("");

  const courseRows = report.byCourse
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(c.courseName)}</td>
        <td class="num">${c.studentCount}</td>
        <td class="num">${formatNumber(c.totalFees)} ${escapeHtml(c.currency)}</td>
        <td class="num"><strong>${formatNumber(c.totalCommission)} ${escapeHtml(c.currency)}</strong></td>
      </tr>
    `
    )
    .join("");

  return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8">
<title>Langford × Acceptix Report — ${fromStr} to ${toStr}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    color: #111827;
    margin: 0;
    padding: 24px;
    background: white;
    line-height: 1.5;
  }

  /* ── Branded header — dual logo ─────────────────────────────────── */
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 3px solid #1e40af;
    padding-bottom: 14px;
    margin-bottom: 20px;
  }
  header .brand-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  header .brand-left img.acceptix {
    width: 52px;
    height: 52px;
    object-fit: contain;
  }
  header .brand-left .text h1 {
    margin: 0;
    font-size: 22px;
    color: #1e40af;
    letter-spacing: -0.02em;
  }
  header .brand-left .text p {
    margin: 2px 0 0;
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  header .brand-right {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: #6b7280;
  }
  header .brand-right img.langford {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }
  header .brand-right .stack {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }
  header .brand-right .stack .powered {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #9ca3af;
  }
  header .brand-right .stack .langford-name {
    font-size: 13px;
    font-weight: 600;
    color: #b91c1c;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 16px;
  }

  /* ── Summary cards ───────────────────────────────────────────────── */
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
    background: #eff6ff;
    border-color: #bfdbfe;
  }
  .summary .card .label {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .summary .card .value {
    font-size: 20px;
    font-weight: 700;
  }
  .summary .card.primary .value { color: #1e40af; }
  .summary .card.disbursed { background: #ecfdf5; border-color: #a7f3d0; }
  .summary .card.disbursed .value { color: #047857; }
  .summary .card.outstanding { background: #fffbeb; border-color: #fde68a; }
  .summary .card.outstanding .value { color: #b45309; }

  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
  }
  .pill.paid { background: #ecfdf5; color: #047857; }
  .pill.due { background: #fffbeb; color: #b45309; }

  section { margin-bottom: 28px; page-break-inside: avoid; }
  section h2 {
    font-size: 15px;
    margin: 0 0 8px;
    color: #111827;
    border-left: 4px solid #1e40af;
    padding-left: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  thead { background: #f3f4f6; }
  th, td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
  }
  th { font-weight: 600; color: #374151; }
  td.num { text-align: right; }
  th.num { text-align: right; }
  tbody tr:nth-child(even) { background: #fafafa; }

  footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 11px;
    color: #6b7280;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
  }
  footer img {
    width: 18px;
    height: 18px;
    object-fit: contain;
    opacity: 0.6;
  }

  @media print {
    body { padding: 12mm; }
    header,
    .summary .card,
    thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<header>
  <div class="brand-left">
    <img class="acceptix" src="${escapeHtml(acceptixLogo)}" alt="Acceptix" />
    <div class="text">
      <h1>Acceptix Registration Report</h1>
      <p>Langford International Institute · Kuwait</p>
    </div>
  </div>
  <div class="brand-right">
    <div class="stack">
      <span class="powered">Powered by</span>
      <span class="langford-name">Langford</span>
    </div>
    <img class="langford" src="${escapeHtml(langfordLogo)}" alt="Langford" />
  </div>
</header>

<div class="meta">
  <span>Range: ${escapeHtml(fromStr)} → ${escapeHtml(toStr)}</span>
  <span>Generated at ${escapeHtml(generatedStr)}</span>
</div>

<div class="summary">
  <div class="card">
    <div class="label">Total Students</div>
    <div class="value">${report.totals.studentCount}</div>
  </div>
  <div class="card">
    <div class="label">Total Fees</div>
    <div class="value">${formatNumber(report.totals.totalFees)} ${currency}</div>
  </div>
  <div class="card primary">
    <div class="label">Total Commission (10%)</div>
    <div class="value">${formatNumber(report.totals.totalCommission)} ${currency}</div>
  </div>
  <div class="card disbursed">
    <div class="label">Commission Disbursed</div>
    <div class="value">${formatNumber(report.totals.disbursedCommission)} ${currency}</div>
  </div>
  <div class="card outstanding">
    <div class="label">Commission Outstanding</div>
    <div class="value">${formatNumber(report.totals.outstandingCommission)} ${currency}</div>
  </div>
</div>

<section>
  <h2>Agent Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Agent</th>
        <th class="num">Students</th>
        <th class="num">Total Fees</th>
        <th class="num">Total Commission</th>
        <th class="num">Disbursed</th>
        <th class="num">Outstanding</th>
      </tr>
    </thead>
    <tbody>${agentRows || `<tr><td colspan="6" style="text-align:center;color:#6b7280;">No data</td></tr>`}</tbody>
  </table>
</section>

<section>
  <h2>Course Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Course</th>
        <th class="num">Students</th>
        <th class="num">Total Fees</th>
        <th class="num">Total Commission</th>
      </tr>
    </thead>
    <tbody>${courseRows || `<tr><td colspan="4" style="text-align:center;color:#6b7280;">No data</td></tr>`}</tbody>
  </table>
</section>

<section>
  <h2>Student Details</h2>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Phone</th>
        <th>Course</th>
        <th>Agent</th>
        <th>Status</th>
        <th class="num">Fee</th>
        <th class="num">Commission</th>
        <th>Payout</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody>${studentRows || `<tr><td colspan="9" style="text-align:center;color:#6b7280;">No data</td></tr>`}</tbody>
  </table>
</section>

<footer>
  <img src="${escapeHtml(acceptixLogo)}" alt="" />
  <span>Acceptix × Langford — Monthly Commission Report</span>
  <img src="${escapeHtml(langfordLogo)}" alt="" />
</footer>

<script>
  // Wait for fonts + images then trigger the print dialog.
  window.addEventListener('load', () => {
    const ready = document.fonts && document.fonts.ready
      ? document.fonts.ready
      : Promise.resolve();
    ready.then(() => setTimeout(() => window.print(), 400));
  });
</script>
</body>
</html>`;
}

/**
 * Open the report in a new window and trigger print-to-PDF. Returns
 * false if the popup was blocked.
 */
export function exportReportToPdf(report: ReportResult): boolean {
  const origin =
    typeof window !== "undefined" && window.location
      ? window.location.origin
      : "";
  const html = buildHtml(report, origin);
  const win = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!win) {
    return false;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
