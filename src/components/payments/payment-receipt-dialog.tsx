"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Payment } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { PAYMENT_METHOD_LABELS } from "@/lib/utils/constants";
import { renderTermsPageHtml, TERMS_PRINT_CSS } from "@/lib/utils/terms";
import { Printer, X } from "lucide-react";
import Image from "next/image";

interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  studentName: string;
  studentPhone: string;
  studentCivilId?: string;
}

export function PaymentReceiptDialog({
  open,
  onOpenChange,
  payment,
  studentName,
  studentPhone,
  studentCivilId,
}: PaymentReceiptDialogProps) {
  if (!payment) return null;

  // Escape every user-controlled value before injecting into the print window
  // HTML — student name/notes/etc. are attacker-controllable (stored XSS).
  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=794,height=1123");
    if (!printWindow) return;

    const logoUrl = `${window.location.origin}/logo.png`;

    const detailRow = (label: string, value: string) =>
      `<div class="row"><span class="label">${esc(label)}</span><span class="value">${value}</span></div>`;

    const frontRows = [
      detailRow("Receipt No / رقم الإيصال", esc(payment!.receiptNumber)),
      detailRow("Date / التاريخ", formatDate(payment!.paymentDate)),
      detailRow("Student Name / اسم الطالب", esc(studentName)),
      detailRow("Phone / التليفون", esc(studentPhone)),
      studentCivilId ? detailRow("Civil ID / الرقم المدني", esc(studentCivilId)) : "",
      detailRow(
        "Payment Method / طريقة الدفع",
        esc(PAYMENT_METHOD_LABELS[payment!.method] ?? payment!.method)
      ),
      payment!.courseName ? detailRow("Course / الدورة", esc(payment!.courseName)) : "",
      payment!.isInstallment && payment!.installmentNumber
        ? detailRow("Installment # / رقم القسط", String(payment!.installmentNumber))
        : "",
      payment!.notes ? detailRow("Notes / ملاحظات", esc(payment!.notes)) : "",
    ].join("");

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${esc(payment!.receiptNumber)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; color: #111; font-family: Arial, sans-serif; }

    .page { width: 210mm; min-height: 297mm; padding: 20mm 18mm; }
    .page.front { display: flex; flex-direction: column; }

    .invoice {
      max-width: 160mm;
      width: 100%;
      margin: 0 auto;
      border: 1px solid #e2e2e2;
      border-radius: 10px;
      padding: 16mm 14mm;
    }

    .header { text-align: center; margin-bottom: 18px; }
    .logo { width: 300px; max-width: 75%; height: auto; display: block; margin: 0 auto; }

    .receipt-title {
      font-size: 14px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #fff;
      background: #1a1a1a;
      text-align: center;
      padding: 8px 0;
      margin: 14px 0 18px;
      border-radius: 4px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 9px 2px;
      border-bottom: 1px dashed #e0e0e0;
    }
    .label { color: #666; font-size: 13px; }
    .value { font-size: 13px; font-weight: 600; text-align: right; max-width: 60%; }

    .total-box {
      background: #f9f9f9;
      border: 2px solid #1a1a1a;
      border-radius: 6px;
      padding: 14px 16px;
      margin: 20px 0;
    }
    .total-row { display: flex; justify-content: space-between; font-size: 20px; font-weight: 900; }
    .total-amount { color: #E31E24; }

    .signatures { display: flex; justify-content: space-between; gap: 40px; margin-top: 30px; }
    .sign { flex: 1; text-align: center; font-size: 12px; color: #555; }
    .sign .line { border-top: 1px solid #999; margin-bottom: 6px; padding-top: 28px; }

    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 18px; border-top: 1px dashed #bbb; padding-top: 10px; }
    .terms-note { margin-top: 6px; font-size: 11px; color: #E31E24; font-weight: 600; }

    ${TERMS_PRINT_CSS}
  </style>
</head>
<body>
  <div class="page front">
    <div class="invoice">
      <div class="header">
        <img src="${logoUrl}" class="logo" alt="Langford International Institute" crossorigin="anonymous" />
      </div>

      <div class="receipt-title">✦ Official Payment Receipt — إيصال دفع رسمي ✦</div>

      ${frontRows}

      <div class="total-box">
        <div class="total-row">
          <span>AMOUNT PAID</span>
          <span class="total-amount">${formatCurrency(payment!.amount)}</span>
        </div>
      </div>

      <div class="signatures">
        <div class="sign"><div class="line"></div>توقيع المحصِّل / Cashier</div>
        <div class="sign"><div class="line"></div>توقيع الطالب / Student</div>
      </div>

      <div class="footer">
        <p>✔ Thank you for choosing Langford!</p>
        <p style="margin-top:4px; font-size:11px;">This is an official receipt. Please keep it for your records.</p>
        <p class="terms-note">الشروط والأحكام مطبوعة في ظهر هذا الإيصال — Terms &amp; Conditions are printed on the back.</p>
      </div>
    </div>
  </div>

  ${renderTermsPageHtml()}
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Payment Receipt</DialogTitle>
        </DialogHeader>

        {/* Receipt Preview */}
        <div className="rounded-lg border bg-white p-4 text-sm space-y-3">
          {/* Header with logo (the logo already carries the institute name) */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="Langford International Institute"
                width={200}
                height={74}
                className="h-auto w-44 object-contain"
              />
            </div>
            <div className="bg-[#1a1a1a] text-white text-[10px] font-bold tracking-wider py-1 rounded">
              OFFICIAL PAYMENT RECEIPT
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Receipt #:</span>
              <span className="font-semibold">{payment.receiptNumber}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Date:</span>
              <span>{formatDate(payment.paymentDate)}</span>
            </div>
          </div>

          <div className="border-t border-dashed pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Student:</span>
              <span className="font-semibold">{studentName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Phone:</span>
              <span>{studentPhone}</span>
            </div>
            {studentCivilId && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Civil ID:</span>
                <span>{studentCivilId}</span>
              </div>
            )}
          </div>

          <div className="border-t border-dashed pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Method:</span>
              <span>{PAYMENT_METHOD_LABELS[payment.method]}</span>
            </div>
            {payment.courseName && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Course:</span>
                <span className="font-semibold">{payment.courseName}</span>
              </div>
            )}
            {payment.isInstallment && payment.installmentNumber && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Installment:</span>
                <span>#{payment.installmentNumber}</span>
              </div>
            )}
            {payment.notes && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Notes:</span>
                <span className="max-w-36 text-right">{payment.notes}</span>
              </div>
            )}
          </div>

          <div className="border-2 border-[#1a1a1a] rounded p-2 bg-gray-50">
            <div className="flex justify-between font-black text-sm">
              <span>AMOUNT PAID:</span>
              <span className="text-[#E31E24]">{formatCurrency(payment.amount)}</span>
            </div>
          </div>

          <div className="text-center text-xs text-muted-foreground border-t border-dashed pt-2">
            <p>✔ Thank you for choosing Langford!</p>
          </div>
        </div>

        <p className="rounded-md bg-muted/50 px-3 py-2 text-center text-[11px] leading-relaxed text-muted-foreground">
          يُطبع على ورق <b>A4</b>، والشروط والأحكام في <b>ظهر الإيصال</b>. فعّل
          الطباعة على الوجهين (Double-sided / Print on both sides) عشان تطلع في الضهر.
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
