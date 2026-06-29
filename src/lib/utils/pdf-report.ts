/**
 * Generic branded PDF exporter (Langford).
 *
 * Strategy: build a self-contained HTML document, open it in a new window, and
 * trigger the browser's native print dialog so the user can "Save as PDF".
 * This avoids heavy client-side PDF libraries and renders Arabic + Latin text
 * perfectly (the browser does the work). Direction follows the live document so
 * Arabic reports come out RTL automatically.
 */

export interface PdfSummaryItem {
  label: string;
  value: string;
  tone?: "default" | "primary" | "green" | "amber" | "red";
}

export interface PdfColumn {
  label: string;
  align?: "start" | "end" | "center";
}

export interface PdfSection {
  title: string;
  columns: PdfColumn[];
  rows: Array<Array<string | number>>;
  /** Optional "no data" message when rows is empty. */
  emptyText?: string;
}

export interface PdfReportInput {
  title: string;
  subtitle?: string;
  /** Small meta line, e.g. a date range or filter description. */
  meta?: string;
  summary?: PdfSummaryItem[];
  sections: PdfSection[];
  /** Override direction; defaults to the live document's dir. */
  dir?: "ltr" | "rtl";
  /** File/window title; defaults to `title`. */
  documentTitle?: string;
}

function escapeHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const TONE_CLASS: Record<string, string> = {
  default: "",
  primary: "primary",
  green: "green",
  amber: "amber",
  red: "red",
};

function buildHtml(input: PdfReportInput, origin: string, dir: string): string {
  const langfordLogo = `${origin}/logo.png`;
  const generatedStr = new Date().toLocaleString(
    dir === "rtl" ? "ar-EG" : "en-GB"
  );

  const summaryHtml = (input.summary ?? [])
    .map(
      (s) => `
      <div class="card ${TONE_CLASS[s.tone ?? "default"]}">
        <div class="label">${escapeHtml(s.label)}</div>
        <div class="value">${escapeHtml(s.value)}</div>
      </div>`
    )
    .join("");

  const sectionsHtml = input.sections
    .map((sec) => {
      const head = sec.columns
        .map(
          (c) =>
            `<th class="${c.align === "end" ? "num" : c.align === "center" ? "ctr" : ""}">${escapeHtml(c.label)}</th>`
        )
        .join("");
      const body = sec.rows.length
        ? sec.rows
            .map(
              (r) =>
                `<tr>${r
                  .map((cell, i) => {
                    const align = sec.columns[i]?.align;
                    return `<td class="${align === "end" ? "num" : align === "center" ? "ctr" : ""}">${escapeHtml(cell)}</td>`;
                  })
                  .join("")}</tr>`
            )
            .join("")
        : `<tr><td colspan="${sec.columns.length}" class="empty">${escapeHtml(sec.emptyText ?? "—")}</td></tr>`;
      return `
      <section>
        <h2>${escapeHtml(sec.title)}</h2>
        <table>
          <thead><tr>${head}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${dir === "rtl" ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(input.documentTitle ?? input.title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
  * { box-sizing: border-box; }
  body {
    font-family: ${dir === "rtl" ? "'Cairo'" : "'Inter'"}, 'Helvetica Neue', Arial, sans-serif;
    color: #111827; margin: 0; padding: 24px; background: #fff; line-height: 1.5;
  }
  header {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 3px solid #E31E24; padding-bottom: 14px; margin-bottom: 18px;
  }
  header .text h1 { margin: 0; font-size: 22px; color: #111827; letter-spacing: -0.02em; }
  header .text p { margin: 2px 0 0; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
  header img { width: 48px; height: 48px; object-fit: contain; }
  .meta { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #6b7280; margin-bottom: 16px; }
  .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 22px; }
  .summary .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; background: #f9fafb; }
  .summary .card .label { font-size: 11px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
  .summary .card .value { font-size: 20px; font-weight: 700; }
  .summary .card.primary { background: #fef2f2; border-color: #fecaca; }
  .summary .card.primary .value { color: #E31E24; }
  .summary .card.green { background: #ecfdf5; border-color: #a7f3d0; }
  .summary .card.green .value { color: #047857; }
  .summary .card.amber { background: #fffbeb; border-color: #fde68a; }
  .summary .card.amber .value { color: #b45309; }
  .summary .card.red { background: #fef2f2; border-color: #fecaca; }
  .summary .card.red .value { color: #b91c1c; }
  section { margin-bottom: 26px; page-break-inside: avoid; }
  section h2 {
    font-size: 15px; margin: 0 0 8px; color: #111827;
    border-inline-start: 4px solid #E31E24; padding-inline-start: 8px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead { background: #f3f4f6; }
  th, td { text-align: ${dir === "rtl" ? "right" : "left"}; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  th { font-weight: 600; color: #374151; }
  td.num, th.num { text-align: ${dir === "rtl" ? "left" : "right"}; }
  td.ctr, th.ctr { text-align: center; }
  td.empty { text-align: center; color: #6b7280; }
  tbody tr:nth-child(even) { background: #fafafa; }
  footer {
    margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb;
    font-size: 11px; color: #6b7280; text-align: center;
    display: flex; justify-content: center; align-items: center; gap: 8px;
  }
  footer img { width: 16px; height: 16px; object-fit: contain; opacity: 0.6; }
  @media print {
    body { padding: 12mm; }
    header, .summary .card, thead { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<header>
  <div class="text">
    <h1>${escapeHtml(input.title)}</h1>
    <p>${escapeHtml(input.subtitle ?? "Langford International Institute · Kuwait")}</p>
  </div>
  <img src="${escapeHtml(langfordLogo)}" alt="Langford" />
</header>
<div class="meta">
  <span>${escapeHtml(input.meta ?? "")}</span>
  <span>${escapeHtml(generatedStr)}</span>
</div>
${input.summary && input.summary.length ? `<div class="summary">${summaryHtml}</div>` : ""}
${sectionsHtml}
<footer>
  <img src="${escapeHtml(langfordLogo)}" alt="" />
  <span>Powered by ENG.Ahmad Alsayed · Langford</span>
</footer>
<script>
  window.addEventListener('load', () => {
    const ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    ready.then(() => setTimeout(() => window.print(), 400));
  });
</script>
</body>
</html>`;
}

/**
 * Open the report in a new window and trigger print-to-PDF.
 * Returns false if the pop-up was blocked.
 */
export function exportToPdf(input: PdfReportInput): boolean {
  if (typeof window === "undefined") return false;
  const origin = window.location?.origin ?? "";
  const dir =
    input.dir ??
    (document.documentElement.getAttribute("dir") === "rtl" ? "rtl" : "ltr");
  const html = buildHtml(input, origin, dir);
  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
