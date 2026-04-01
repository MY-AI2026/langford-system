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

  function handlePrint() {
    const printWindow = window.open("", "_blank", "width=460,height=720");
    if (!printWindow) return;

    const logoUrl = `${window.location.origin}/logo.png`;

    printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${payment!.receiptNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #111;
      max-width: 360px;
      margin: 0 auto;
      padding: 24px 20px;
      background: #fff;
    }
    .header { text-align: center; margin-bottom: 12px; }
    .logo { width: 90px; height: 90px; object-fit: contain; margin-bottom: 6px; }
    .institute-name { font-size: 20px; font-weight: 900; letter-spacing: 3px; color: #E31E24; }
    .institute-sub { font-size: 11px; color: #555; margin-top: 2px; }
    .receipt-title {
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #fff;
      background: #1a1a1a;
      text-align: center;
      padding: 5px 0;
      margin: 10px 0;
    }
    .divider { border-top: 1px dashed #bbb; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; margin: 6px 0; }
    .label { color: #666; font-size: 12px; }
    .value { font-size: 12px; font-weight: 600; text-align: right; max-width: 200px; }
    .total-box {
      background: #f9f9f9;
      border: 2px solid #1a1a1a;
      border-radius: 4px;
      padding: 10px 12px;
      margin: 12px 0;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: 900;
    }
    .total-amount { color: #E31E24; }
    .footer {
      text-align: center;
      font-size: 11px;
      color: #888;
      margin-top: 10px;
      border-top: 1px dashed #bbb;
      padding-top: 10px;
    }
    @media print {
      body { padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="${logoUrl}" class="logo" alt="Langford Logo" crossorigin="anonymous" />
    <div class="institute-name">LANGFORD</div>
    <div class="institute-sub">International Language Institute – Kuwait</div>
  </div>

  <div class="receipt-title">✦ Official Payment Receipt ✦</div>

  <div class="row">
    <span class="label">Receipt No:</span>
    <span class="value">${payment!.receiptNumber}</span>
  </div>
  <div class="row">
    <span class="label">Date:</span>
    <span class="value">${formatDate(payment!.paymentDate)}</span>
  </div>

  <div class="divider"></div>

  <div class="row">
    <span class="label">Student Name:</span>
    <span class="value">${studentName}</span>
  </div>
  <div class="row">
    <span class="label">Phone:</span>
    <span class="value">${studentPhone}</span>
  </div>
  ${studentCivilId
    ? `<div class="row"><span class="label">Civil ID:</span><span class="value">${studentCivilId}</span></div>`
    : ""}

  <div class="divider"></div>

  <div class="row">
    <span class="label">Payment Method:</span>
    <span class="value">${PAYMENT_METHOD_LABELS[payment!.method] ?? payment!.method}</span>
  </div>
  ${payment!.courseName
    ? `<div class="row"><span class="label">Course:</span><span class="value">${payment!.courseName}</span></div>`
    : ""}
  ${payment!.isInstallment && payment!.installmentNumber
    ? `<div class="row"><span class="label">Installment #:</span><span class="value">${payment!.installmentNumber}</span></div>`
    : ""}
  ${payment!.notes
    ? `<div class="row"><span class="label">Notes:</span><span class="value">${payment!.notes}</span></div>`
    : ""}

  <div class="total-box">
    <div class="total-row">
      <span>AMOUNT PAID</span>
      <span class="total-amount">${formatCurrency(payment!.amount)}</span>
    </div>
  </div>

  <div class="footer">
    <p>✔ Thank you for choosing Langford!</p>
    <p style="margin-top:4px; font-size:10px;">This is an official receipt. Please keep it for your records.</p>
  </div>
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
          {/* Header with logo */}
          <div className="text-center space-y-1">
            <div className="flex justify-center">
              <Image src="/logo.png" alt="Langford Logo" width={60} height={60} className="object-contain" />
            </div>
            <p className="font-black text-base tracking-widest text-[#E31E24]">LANGFORD</p>
            <p className="text-xs text-muted-foreground">International Language Institute – Kuwait</p>
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
