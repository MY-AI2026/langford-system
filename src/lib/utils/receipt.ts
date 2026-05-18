/**
 * Printable receipt generator. Opens a styled HTML window with the receipt
 * and triggers the browser's print dialog — user can "Save as PDF" or send
 * to a thermal printer.
 *
 * Why not jsPDF: jsPDF + Arabic = shaping/RTL nightmare. The browser print
 * pipeline handles Arabic fonts perfectly out of the box, no extra deps.
 */

import { formatCurrency, formatDate } from "./format";

// Re-export of the date type formatDate accepts. Keeps the receipt API loose
// so callers don't have to cast Firestore Timestamps.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDate = any;

export interface ReceiptPayment {
  receiptNumber: string;
  amount: number;
  paymentDate: AnyDate;
  method: string;
  notes?: string;
  courseName?: string;
}

export interface ReceiptStudent {
  fullName: string;
  phone: string;
  civilId?: string;
}

export interface ReceiptInstitute {
  name: string;
  phone?: string;
  address?: string;
}

const DEFAULT_INSTITUTE: ReceiptInstitute = {
  name: "معهد لانجفورد للغات — Langford Institute",
  phone: "+965 ٢٢٢٢ ٢٢٢٢",
  address: "الكويت",
};

const PAYMENT_METHOD_AR: Record<string, string> = {
  cash: "كاش",
  card: "بطاقة",
  bank_transfer: "تحويل بنكي",
  online: "أونلاين",
};

export function printReceipt(opts: {
  payment: ReceiptPayment;
  student: ReceiptStudent;
  institute?: ReceiptInstitute;
  cashierName?: string;
}): void {
  const inst = opts.institute ?? DEFAULT_INSTITUTE;
  const p = opts.payment;
  const s = opts.student;

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<title>إيصال — ${p.receiptNumber}</title>
<style>
  @page { size: A5; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", "Tahoma", "Arial", sans-serif;
    color: #111;
    margin: 0;
    padding: 24px;
    max-width: 600px;
    margin-inline: auto;
  }
  .header { text-align: center; border-bottom: 2px solid #111; padding-bottom: 12px; }
  .header h1 { margin: 0 0 4px; font-size: 22px; }
  .header p { margin: 2px 0; font-size: 12px; color: #555; }
  h2 { margin: 16px 0 8px; font-size: 16px; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td { padding: 6px 8px; font-size: 14px; border-bottom: 1px dashed #ddd; }
  td.label { color: #666; width: 35%; }
  .amount-row td {
    background: #f6f9ff;
    font-weight: 700;
    font-size: 16px;
    color: #0050cd;
    border: none;
  }
  .footer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    font-size: 11px;
    color: #777;
    text-align: center;
  }
  .receipt-no {
    display: inline-block;
    background: #111;
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-family: monospace;
    margin-top: 8px;
  }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(inst.name)}</h1>
    ${inst.phone ? `<p>${escapeHtml(inst.phone)}</p>` : ""}
    ${inst.address ? `<p>${escapeHtml(inst.address)}</p>` : ""}
    <div class="receipt-no">إيصال رقم: ${escapeHtml(p.receiptNumber)}</div>
  </div>

  <h2>بيانات الطالب</h2>
  <table>
    <tr><td class="label">الاسم</td><td>${escapeHtml(s.fullName)}</td></tr>
    <tr><td class="label">التليفون</td><td>${escapeHtml(s.phone)}</td></tr>
    ${s.civilId ? `<tr><td class="label">الرقم المدني</td><td>${escapeHtml(s.civilId)}</td></tr>` : ""}
  </table>

  <h2>تفاصيل الدفعة</h2>
  <table>
    <tr><td class="label">التاريخ</td><td>${formatDate(p.paymentDate)}</td></tr>
    <tr><td class="label">طريقة الدفع</td><td>${PAYMENT_METHOD_AR[p.method] ?? escapeHtml(p.method)}</td></tr>
    ${p.courseName ? `<tr><td class="label">الدورة</td><td>${escapeHtml(p.courseName)}</td></tr>` : ""}
    ${p.notes ? `<tr><td class="label">ملاحظات</td><td>${escapeHtml(p.notes)}</td></tr>` : ""}
    ${opts.cashierName ? `<tr><td class="label">المحصِّل</td><td>${escapeHtml(opts.cashierName)}</td></tr>` : ""}
    <tr class="amount-row"><td>المبلغ المدفوع</td><td>${formatCurrency(p.amount)}</td></tr>
  </table>

  <div class="footer">
    شكراً لاختيارك معهد لانجفورد. هذا الإيصال إلكتروني — لا يحتاج توقيع.
  </div>

  <script>
    window.addEventListener('load', () => {
      window.print();
      // Don't auto-close — user might want to "Save as PDF" first
    });
  </script>
</body>
</html>`;

  const w = window.open("", "_blank", "width=700,height=900");
  if (!w) {
    alert("الـ pop-up محظور — اسمح بالنوافذ المنبثقة من إعدادات المتصفح");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
